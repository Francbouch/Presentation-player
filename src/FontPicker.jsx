import { useEffect, useRef, useState } from "react";
import { TEXT_FONTS } from "./textModel.js";
import { ensureFont } from "./fonts.js";
const KEY = "studio-font-preferences-v1";
function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      recent: Array.isArray(v.recent)
        ? v.recent.filter((id) => Object.hasOwn(TEXT_FONTS, id)).slice(0, 6)
        : [],
      favorites: Array.isArray(v.favorites)
        ? v.favorites.filter((id) => Object.hasOwn(TEXT_FONTS, id))
        : [],
    };
  } catch {
    return { recent: [], favorites: [] };
  }
}
function FontRow({ id, selected, favorite, choose, toggle }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    ensureFont(id).catch(() => {
      if (live) setFailed(true);
    });
    return () => {
      live = false;
    };
  }, [id]);
  return (
    <div className="font-choice">
      <button
        type="button"
        className="font-name"
        style={{ fontFamily: TEXT_FONTS[id].css }}
        aria-pressed={selected}
        onClick={() => choose(id)}
      >
        {TEXT_FONTS[id].name}
        <small>
          Élégance, matière & cœur{failed ? " — chargement indisponible" : ""}
        </small>
      </button>
      <button
        type="button"
        className="font-favorite"
        aria-label={`${favorite ? "Retirer" : "Ajouter"} ${TEXT_FONTS[id].name} ${favorite ? "des" : "aux"} favoris`}
        aria-pressed={favorite}
        onClick={() => toggle(id)}
      >
        {favorite ? "★" : "☆"}
      </button>
    </div>
  );
}
export default function FontPicker({ value, change, disabled }) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [prefs, setPrefs] = useState(read),
    root = useRef(null),
    trigger = useRef(null),
    search = useRef(null);
  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    function outside(e) {
      if (!root.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  function store(next) {
    setPrefs(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* préférences facultatives */
    }
  }
  function choose(id) {
    store({
      ...prefs,
      recent: [id, ...prefs.recent.filter((k) => k !== id)].slice(0, 6),
    });
    change(id);
    setOpen(false);
    if (open) trigger.current?.focus();
  }
  function toggle(id) {
    store({
      ...prefs,
      favorites: prefs.favorites.includes(id)
        ? prefs.favorites.filter((k) => k !== id)
        : [...prefs.favorites, id],
    });
  }
  const matches = (id) =>
    TEXT_FONTS[id].name
      .toLocaleLowerCase("fr")
      .includes(query.toLocaleLowerCase("fr"));
  const section = (title, ids) =>
    ids.filter(matches).length > 0 && (
      <section>
        <h4>{title}</h4>
        {ids.filter(matches).map((id) => (
          <FontRow
            key={id}
            id={id}
            selected={value === id}
            favorite={prefs.favorites.includes(id)}
            choose={choose}
            toggle={toggle}
          />
        ))}
      </section>
    );
  return (
    <div
      className="font-picker"
      ref={root}
      onKeyDown={(e) => {
        if (!open) return;
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          const list = [
              ...root.current.querySelectorAll(
                ".font-browser input,.font-browser button",
              ),
            ],
            index = list.indexOf(document.activeElement);
          e.preventDefault();
          list[
            (index + (e.key === "ArrowDown" ? 1 : -1) + list.length) %
              list.length
          ]?.focus();
        }
      }}
    >
      <label className="field">
        Police
        <select
          aria-label="Police du texte"
          disabled={disabled}
          value={value}
          style={{ fontFamily: TEXT_FONTS[value]?.css }}
          onChange={(e) => choose(e.target.value)}
        >
          {Object.entries(TEXT_FONTS).map(([id, font]) => (
            <option key={id} value={id} style={{ fontFamily: font.css }}>
              {font.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="ui-button"
        ref={trigger}
        disabled={disabled}
        aria-expanded={open}
        aria-controls="font-browser"
        onClick={() => setOpen(!open)}
      >
        Parcourir les polices
      </button>
      {open && (
        <div
          id="font-browser"
          className="font-browser"
          role="region"
          aria-label="Catalogue des polices"
        >
          <label className="field">
            Rechercher une police
            <input
              ref={search}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {section("Favoris", prefs.favorites)}
          {section("Polices récentes", prefs.recent)}
          {section("Toutes les polices", Object.keys(TEXT_FONTS))}
          {!Object.keys(TEXT_FONTS).some(matches) && (
            <p>Aucune police trouvée.</p>
          )}
        </div>
      )}
    </div>
  );
}
