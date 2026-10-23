import VisibilityGroupSettings, {
  StateGroupDefaults,
} from "./VisibilityGroupSettings.jsx";
import { useEffect, useMemo, useRef, useState } from "react";
import SlideView from "./SlideView.jsx";
import {
  StateSettings,
  addState,
  duplicateState,
  removeState,
} from "./ActionSettings.jsx";
import { orderedLayers, resolveBackground } from "./document.js";
import { stateView } from "./stateView.js";
import { thumbnail } from "./TimelineThumbnail.jsx";
export function stateIncoming(page, id) {
  return page.buttons.filter(
    (b) =>
      (b.action?.type === "state" && b.action.stateId === id) ||
      (b.action?.type === "video" &&
        b.action.end === "state" &&
        b.action.finalStateId === id),
  );
}
export function compareStates(page, left, right) {
  const a = stateView(page, left),
    b = stateView(page, right),
    differences = [];
  if (resolveBackground(page, a.target) !== resolveBackground(page, b.target))
    differences.push("Arrière-plan différent");
  for (const l of orderedLayers(page)) {
    const av = !l.folderHidden && (a.visibility[l.id] ?? l.visible),
      bv = !l.folderHidden && (b.visibility[l.id] ?? l.visible);
    if (av !== bv)
      differences.push(
        `${l.name} : ${av ? "visible" : "masqué"} → ${bv ? "visible" : "masqué"}`,
      );
  }
  if (a.buttonId !== b.buttonId) differences.push("Bouton actif différent");
  for (const g of page.visibilityGroups || [])
    if (
      (a.groupVisibility?.[g.id] ?? g.initialVisible) !==
      (b.groupVisibility?.[g.id] ?? g.initialVisible)
    )
      differences.push(`Groupe ${g.name} : configuration initiale différente`);
  return differences;
}
export function StateThumbnail({ page, stateId, media, total }) {
  const root = useRef(null),
    [visible, setVisible] = useState(false),
    [urls, setUrls] = useState({}),
    [width, setWidth] = useState(250);
  const view = useMemo(() => stateView(page, stateId), [page, stateId]);
  const ids = useMemo(
    () =>
      new Set(
        [
          resolveBackground(page, view.target),
          ...orderedLayers(page)
            .filter(
              (l) => !l.folderHidden && (view.visibility[l.id] ?? l.visible),
            )
            .flatMap((l) => [l.imageId, l.frameMedia?.mediaId]),
        ].filter(Boolean),
      ),
    [page, view],
  );
  useEffect(() => {
    const observer = new IntersectionObserver(
        ([e]) => setVisible(e.isIntersecting),
        { rootMargin: "150px" },
      ),
      resize = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    observer.observe(root.current);
    resize.observe(root.current);
    return () => {
      observer.disconnect();
      resize.disconnect();
    };
  }, []);
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    Promise.all(
      media
        .filter((m) => ids.has(m.id))
        .map(async (m) => {
          try {
            return [m.id, await thumbnail(m)];
          } catch {
            return [m.id, null];
          }
        }),
    ).then((entries) => {
      if (!cancelled) setUrls(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [visible, media, ids]);
  const staticPage = useMemo(
    () => ({
      ...page,
      layers: page.layers.map((l) =>
        l.frameMedia?.kind === "video"
          ? { ...l, frameMedia: { ...l.frameMedia, kind: "image" } }
          : l,
      ),
    }),
    [page],
  );
  const selectedGroups = Object.fromEntries(
    page.buttons
      .filter(
        (b) =>
          b.selectionGroup &&
          (b.id === view.buttonId ||
            (b.action?.type === "state" && b.action.stateId === stateId)),
      )
      .map((b) => [b.selectionGroup, b.id]),
  );
  return (
    <div
      ref={root}
      className="state-real-thumbnail"
      aria-label={`Miniature ${page.states.find((s) => s.id === stateId)?.name || "configuration de la page"}`}
      inert={true}
    >
      {visible && (
        <div
          className="stage"
          style={{
            width: 1920,
            height: 1080,
            transform: `scale(${width / 1920})`,
            transformOrigin: "0 0",
          }}
        >
          <SlideView
            page={staticPage}
            urls={urls}
            interaction={{
              ...view,
              activeButtonId: view.buttonId,
              selectedGroups,
              choose: () => {},
              activateButton: () => {},
            }}
            number={1}
            total={total}
          />
        </div>
      )}
    </div>
  );
}
export default function StateManager({
  page,
  document,
  changePage,
  busy,
  close,
  openState,
  activeStateId,
  previewTransition,
  extra,
}) {
  const dialog = useRef(null),
    [chosen, setChosen] = useState(
      page.initialStateId || page.states[0]?.id || "",
    ),
    [search, setSearch] = useState(""),
    [tab, setTab] = useState("states"),
    [compare, setCompare] = useState(false),
    [left, setLeft] = useState(""),
    [right, setRight] = useState("");
  useEffect(() => {
    const previous = window.document.activeElement;
    dialog.current.showModal();
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    if (chosen && !page.states.some((s) => s.id === chosen))
      setChosen(page.states[0]?.id || "");
  }, [chosen, page.states]);
  const current = page.states.find((s) => s.id === chosen),
    filtered = page.states.filter((s) =>
      s.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
    );
  function move(id, delta) {
    const states = [...page.states],
      index = states.findIndex((s) => s.id === id),
      to = index + delta;
    if (to < 0 || to >= states.length) return;
    [states[index], states[to]] = [states[to], states[index]];
    changePage(page.id, { states });
  }
  return (
    <dialog
      ref={dialog}
      className="state-manager"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      aria-label="Gestionnaire visuel des états"
    >
      <header>
        <div>
          <strong>États · {page.title}</strong>
          <p>
            La sélection pour modification est indépendante de l’état initial et
            de la lecture.
          </p>
        </div>
        <button className="ui-button" autoFocus onClick={close}>
          Retour à l’éditeur
        </button>
      </header>
      <div className="state-manager-toolbar">
        <button
          className="ui-button"
          role="tab"
          aria-selected={tab === "states"}
          onClick={() => setTab("states")}
        >
          États de la diapositive
        </button>
        <button
          className="ui-button"
          role="tab"
          aria-selected={tab === "groups"}
          onClick={() => setTab("groups")}
        >
          Groupes de visibilité
        </button>
        <label>
          Rechercher un état
          <input
            aria-label="Rechercher un état"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button
          className="ui-button"
          aria-pressed={compare}
          onClick={() => setCompare(!compare)}
        >
          Comparer les états
        </button>
        <span>
          Lecture :{" "}
          {page.states.find((s) => s.id === activeStateId)?.name ||
            "Configuration de la page"}
        </span>
      </div>
      {page.buttons
        .filter(
          (b) =>
            (b.action?.type === "state" &&
              !page.states.some((s) => s.id === b.action.stateId)) ||
            (b.action?.type === "video" &&
              b.action.end === "state" &&
              !page.states.some((s) => s.id === b.action.finalStateId)),
        )
        .map((b) => (
          <p role="status" className="editor-message" key={b.id}>
            ⚠ {b.name} : état cible absent ou non choisi.
          </p>
        ))}
      <div className="state-manager-body">
        <main>
          {tab === "groups" ? (
            <VisibilityGroupSettings
              page={page}
              changePage={changePage}
              busy={busy}
            />
          ) : (
            <>
              <div className="state-grid">
                {filtered.map((s, index) => (
                  <article
                    key={s.id}
                    className={`state-tile ${chosen === s.id ? "chosen" : ""}`}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setChosen(s.id);
                        }
                      }}
                      className="state-card-select"
                      aria-label={`Sélectionner l’état ${s.name}`}
                      aria-pressed={chosen === s.id}
                      onClick={() => setChosen(s.id)}
                      onDoubleClick={() => openState(s.id)}
                    >
                      <StateThumbnail
                        page={page}
                        stateId={s.id}
                        media={document.media}
                        total={document.pages.length}
                      />
                      <strong>{s.name}</strong>
                      <small>
                        {page.initialStateId === s.id ? "★ Initial · " : ""}
                        {chosen === s.id ? "Sélectionné · " : ""}
                        {stateIncoming(page, s.id).length} bouton(s) associé(s)
                      </small>
                    </div>
                    {!stateIncoming(page, s.id).length && (
                      <small>Sans action entrante connue</small>
                    )}
                    <details className="state-card-menu">
                      <summary>Actions de {s.name}</summary>
                      <button
                        onClick={() => {
                          setChosen(s.id);
                          requestAnimationFrame(() =>
                            dialog.current
                              .querySelector(
                                `[aria-label="Nom de l’état ${s.id}"]`,
                              )
                              ?.focus(),
                          );
                        }}
                      >
                        Renommer / Propriétés
                      </button>
                      <button onClick={() => openState(s.id)}>
                        Ouvrir dans le canevas
                      </button>
                      <button
                        disabled={busy}
                        onClick={() =>
                          changePage(page.id, { initialStateId: s.id })
                        }
                      >
                        Définir comme état initial
                      </button>
                      <button
                        disabled={busy || page.states.length >= 100}
                        onClick={() => duplicateState(page, s, changePage)}
                      >
                        Dupliquer
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => removeState(page, s, changePage)}
                      >
                        Supprimer
                      </button>
                      <button disabled={busy} onClick={() => move(s.id, -1)}>
                        Monter
                      </button>
                      <button disabled={busy} onClick={() => move(s.id, 1)}>
                        Descendre
                      </button>
                    </details>
                  </article>
                ))}
                <button
                  className="state-add-tile"
                  disabled={busy || page.states.length >= 100}
                  onClick={() => addState(page, changePage)}
                >
                  + Nouvel état
                </button>
              </div>
              {!filtered.length && (
                <p>
                  Aucun état correspondant. Utilisez « + Ajouter un état » dans
                  les propriétés.
                </p>
              )}
              {compare && (
                <section className="state-comparison">
                  <h3>Comparer les états</h3>
                  {[
                    ["Premier état", left, setLeft],
                    ["Deuxième état", right, setRight],
                  ].map(([label, value, set]) => (
                    <label key={label}>
                      {label}
                      <select
                        aria-label={label}
                        value={value}
                        onChange={(e) => set(e.target.value)}
                      >
                        <option value="">Configuration de la page</option>
                        {page.states.map((s) => (
                          <option value={s.id} key={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                  <div className="state-compare-images">
                    <StateThumbnail
                      page={page}
                      stateId={left}
                      media={document.media}
                      total={document.pages.length}
                    />
                    <StateThumbnail
                      page={page}
                      stateId={right}
                      media={document.media}
                      total={document.pages.length}
                    />
                  </div>
                  <ul>
                    {compareStates(page, left, right).map((v) => (
                      <li key={v}>{v}</li>
                    ))}
                  </ul>
                  {!compareStates(page, left, right).length && (
                    <p>
                      Aucune différence dans les propriétés d’état prises en
                      charge.
                    </p>
                  )}
                </section>
              )}
              {extra}
            </>
          )}
        </main>
        <aside aria-label="Propriétés de l’état sélectionné">
          <StateGroupDefaults
            page={page}
            stateId={current?.id}
            changePage={changePage}
            busy={busy}
          />
          <h3>{current?.name || "Configuration des états"}</h3>
          <StateSettings
            page={page}
            media={document.media}
            changePage={changePage}
            busy={busy}
            effectBusy={busy}
            stateFilter={current?.id || null}
            preview={previewTransition}
          />
        </aside>
      </div>
    </dialog>
  );
}
