import { useState } from "react";
import { uid } from "./document.js";
import { appearanceValues, deleteProjectStyle } from "./projectStyles.js";
export default function ProjectStylesSettings({
  document,
  page,
  items,
  update,
  busy,
}) {
  const [name, setName] = useState(""),
    [chosen, setChosen] = useState(""),
    styles = document.projectStyles || [],
    source = items[0],
    style = styles.find((s) => s.id === (chosen || source?.styleLink?.id)),
    ids = new Set(items.filter((i) => !i.locked).map((i) => i.id));
  const selected = (fn) =>
    update((before) => ({
      ...before,
      pages: before.pages.map((p) =>
        p.id === page.id
          ? {
              ...p,
              layers: p.layers.map((i) => (ids.has(i.id) ? fn(i) : i)),
              buttons: p.buttons.map((i) => (ids.has(i.id) ? fn(i) : i)),
            }
          : p,
      ),
    }));
  const edit = (id, patch) =>
    update((before) => ({
      ...before,
      projectStyles: before.projectStyles.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    }));
  function create() {
    const s = {
      id: uid(),
      name: name.trim() || "Nouveau style",
      values: appearanceValues(source),
    };
    update((before) => ({
      ...before,
      projectStyles: [...(before.projectStyles || []), s],
      pages: before.pages.map((p) =>
        p.id === page.id
          ? {
              ...p,
              layers: p.layers.map((i) =>
                i.id === source.id
                  ? { ...i, styleLink: { id: s.id, overrides: [] } }
                  : i,
              ),
              buttons: p.buttons.map((i) =>
                i.id === source.id
                  ? { ...i, styleLink: { id: s.id, overrides: [] } }
                  : i,
              ),
            }
          : p,
      ),
    }));
    setChosen(s.id);
    setName("");
  }
  return (
    <details className="property-section">
      <summary>Styles du projet</summary>
      <fieldset className="layer-property-fields" disabled={busy}>
        <label className="field">
          Nom du nouveau style
          <input
            aria-label="Nom du nouveau style"
            maxLength="80"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button
          className="ui-button"
          disabled={items.length !== 1 || source.locked || styles.length >= 500}
          onClick={create}
        >
          Créer un style depuis cet objet
        </button>
        <label className="field">
          Style du projet
          <select
            aria-label="Style du projet"
            value={style?.id || ""}
            onChange={(e) => setChosen(e.target.value)}
          >
            <option value="">Choisir un style</option>
            {styles.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        {style && (
          <>
            <label className="field">
              Nom du style
              <input
                aria-label="Nom du style"
                maxLength="80"
                value={style.name}
                onChange={(e) =>
                  edit(style.id, {
                    name: e.target.value.trim() ? e.target.value : "Style",
                  })
                }
              />
            </label>
            <button
              className="ui-button"
              disabled={!ids.size}
              onClick={() =>
                selected((i) => ({
                  ...i,
                  styleLink: { id: style.id, overrides: [] },
                }))
              }
            >
              Appliquer le style lié à la sélection
            </button>
            <button
              className="ui-button"
              disabled={styles.length >= 500}
              onClick={() => {
                const copy = {
                  ...structuredClone(style),
                  id: uid(),
                  name: `${style.name.slice(0, 70)} (copie)`,
                };
                update((before) => ({
                  ...before,
                  projectStyles: [...before.projectStyles, copy],
                }));
                setChosen(copy.id);
              }}
            >
              Dupliquer le style
            </button>
            <button
              className="ui-button"
              disabled={items.length !== 1 || source.locked}
              onClick={() => {
                if (
                  window.confirm(
                    "Mettre à jour ce style depuis cet objet ? Tous les objets liés seront mis à jour, en conservant leurs surcharges locales.",
                  )
                )
                  edit(style.id, { values: appearanceValues(source) });
              }}
            >
              Mettre à jour le style depuis cet objet
            </button>
            <button
              className="ui-button danger"
              onClick={() => {
                if (
                  window.confirm(
                    "Supprimer ce style ? Les objets liés seront détachés en conservant leur apparence actuelle.",
                  )
                ) {
                  update((before) => deleteProjectStyle(before, style.id));
                  setChosen("");
                }
              }}
            >
              Supprimer le style
            </button>
          </>
        )}
        {items.some((i) => i.styleLink) && (
          <>
            <p className="help">
              {source.styleLink?.overrides.length || 0} propriété(s) locale(s).
              Les réglages modifiés sur cet objet restent prioritaires.
            </p>
            <button
              className="ui-button"
              disabled={!ids.size}
              onClick={() =>
                selected((i) =>
                  i.styleLink
                    ? { ...i, styleLink: { ...i.styleLink, overrides: [] } }
                    : i,
                )
              }
            >
              Réinitialiser les modifications locales
            </button>
            <button
              className="ui-button"
              disabled={!ids.size}
              onClick={() =>
                selected((i) => {
                  const next = { ...i };
                  delete next.styleLink;
                  return next;
                })
              }
            >
              Détacher du style
            </button>
          </>
        )}
        <p className="help">
          Le style partage l’apparence compatible, jamais le contenu, les
          médias, les actions ou la géométrie. Pour le modifier : ajustez un
          objet, puis mettez le style à jour. Priorité : surcharge locale, style
          lié, valeurs de base.
        </p>
      </fieldset>
    </details>
  );
}
