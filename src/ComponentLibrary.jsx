import MilestoneTimelineThumbnail from './MilestoneTimelineThumbnail.jsx';
import { useState } from "react";
export default function ComponentLibrary({
  components,
  urls,
  insert,
  edit,
  rename,
  remove,
  busy,
}) {
  const [query, setQuery] = useState("");
  return (
    <section className="component-library">
      <label className="field">
        Rechercher un composant
        <input
          aria-label="Rechercher un composant"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {components
        .filter((c) =>
          c.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
        )
        .map((c) => (
          <article key={c.id} className="component-card">
            <div
              className="component-thumbnail"
              aria-label={`Aperçu ${c.name}`}
            >
              {c.layers.map((l) => (
                <span
                  key={l.id}
                  style={{
                    position: "absolute",
                    left: `${((l.x - c.bounds.x) / c.bounds.width) * 100}%`,
                    top: `${((l.y - c.bounds.y) / c.bounds.height) * 100}%`,
                    width: `${(l.width / c.bounds.width) * 100}%`,
                    height: `${(l.height / c.bounds.height) * 100}%`,
                    background:
                      ["text", "image"].includes(l.type) ||
                      l.appearance?.transparent
                        ? "transparent"
                        : l.appearance?.background || l.color || "#2a2339",
                    color:
                      l.type === "text"
                        ? l.color
                        : l.labelText?.color || l.appearance?.text || "#eee",
                    borderRadius:
                      l.type === "circle" ? "50%" : l.appearance?.radius || 0,
                    transform: `rotate(${l.rotation || 0}deg)`,
                  }}
                >
                  {l.type==='milestoneTimeline'?<MilestoneTimelineThumbnail item={l}/>:l.imageId && urls[l.imageId] ? (
                    <img src={urls[l.imageId]} alt="" loading="lazy" />
                  ) : (
                    <small>{l.content || l.labelText?.content || l.name}</small>
                  )}
                </span>
              ))}
            </div>
            <input
              maxLength={80}
              aria-label={`Nom du composant ${c.name}`}
              value={c.name}
              disabled={busy}
              onChange={(e) => rename(c.id, e.target.value)}
            />
            <div className="button-row">
              <button
                className="ui-button"
                disabled={busy}
                onClick={() => insert(c)}
              >
                Insérer une instance
              </button>
              <button
                className="ui-button"
                disabled={busy}
                onClick={() => edit(c)}
              >
                Modifier le maître
              </button>
              <button
                className="ui-button danger"
                disabled={busy}
                onClick={() => remove(c)}
              >
                Supprimer le composant
              </button>
            </div>
          </article>
        ))}
      {!components.length && (
        <p className="help">
          Sélectionnez un bouton ou un groupe, puis « Créer un composant » dans
          les propriétés.
        </p>
      )}
      <p className="help">
        Les actions et les états sont propres à chaque instance. Les composants
        imbriqués ne sont pas autorisés.
      </p>
    </section>
  );
}
