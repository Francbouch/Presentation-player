import { useState } from "react";
import { alignmentUnits, alignSelection } from "./visualGroups.js";
export default function SelectionTools({
  items,
  groups,
  change,
  group,
  ungroup,
  remove,
  duplicate,
  busy,
  rename,
  editingGroup,
}) {
  const units = alignmentUnits(items, groups, editingGroup);
  const [reference, setReference] = useState("selection");
  const active = groups.find(
    (g) =>
      g.children.length === items.length &&
      g.children.every((id) => items.some((l) => l.id === id)),
  );
  const opacities = new Set(items.map((l) => l.opacity ?? 1));
  return (
    <section className="selection-tools settings-panel">
      <h3>{active ? active.name : `${items.length} éléments sélectionnés`}</h3>
      {active && (
        <label className="field">
          Nom du groupe
          <input
            maxLength={80}
            aria-label="Nom du groupe"
            value={active.name}
            onChange={(e) => rename(active.id, e.target.value)}
          />
        </label>
      )}
      <details className="property-section" open>
        <summary>Alignement</summary>
        <label className="field">
          Référentiel
          <select
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            aria-label="Référentiel d’alignement"
          >
            <option value="selection">Sélection</option>
            <option value="slide">Diapositive</option>
          </select>
        </label>
        <div className="alignment-grid">
          {[
            ["left", "Aligner à gauche"],
            ["centerX", "Centrer horizontalement"],
            ["right", "Aligner à droite"],
            ["top", "Aligner en haut"],
            ["centerY", "Centrer verticalement"],
            ["bottom", "Aligner en bas"],
            ["distributeX", "Distribuer horizontalement"],
            ["distributeY", "Distribuer verticalement"],
          ].map(([key, label]) => (
            <button
              className="ui-button"
              key={key}
              disabled={
                busy ||
                items.some((l) => l.locked) ||
                (key.startsWith("distribute") && units.length < 3)
              }
              onClick={() =>
                change(
                  alignSelection(items, groups, key, reference, editingGroup),
                )
              }
            >
              {label}
            </button>
          ))}
        </div>
      </details>
      <label className="field">
        Opacité{" "}
        {opacities.size > 1
          ? "— Valeurs multiples"
          : `${Math.round([...opacities][0] * 100)} %`}
        <input
          aria-label="Opacité de la sélection"
          type="range"
          min="0"
          max="100"
          value={opacities.size > 1 ? 100 : [...opacities][0] * 100}
          disabled={busy}
          onChange={(e) =>
            change(
              Object.fromEntries(
                items.map((l) => [l.id, { opacity: +e.target.value / 100 }]),
              ),
            )
          }
        />
      </label>
      <div className="button-row">
        <button
          className="ui-button"
          disabled={
            busy ||
            items.length < 2 ||
            items.some((l) => l.locked) ||
            groups.some((g) =>
              g.children.some((id) => items.some((l) => l.id === id)),
            )
          }
          onClick={group}
        >
          Grouper
        </button>
        <button
          className="ui-button"
          disabled={busy || !active}
          onClick={() => ungroup(active.id)}
        >
          Dissocier
        </button>
        <button className="ui-button" disabled={busy} onClick={duplicate}>
          Dupliquer la sélection
        </button>
        <button className="ui-button danger" disabled={busy} onClick={remove}>
          Supprimer la sélection
        </button>
      </div>
      <p className="help">
        Maj + clic pour ajouter ou retirer un calque. Ctrl+G pour grouper.
        Double-cliquez pour modifier le contenu. Les groupes imbriqués ne sont
        pas proposés.
      </p>
    </section>
  );
}
