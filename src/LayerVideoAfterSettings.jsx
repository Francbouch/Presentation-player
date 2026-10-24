import { afterPlaybackEnabled } from "./layerVideoCompletion.js";
export default function LayerVideoAfterSettings({
  page,
  action,
  change,
  busy,
}) {
  const after = action.afterPlayback,
    enabled = !!after?.enabled,
    playing = ["restart", "resume"].includes(action.command);
  const looping = action.layerIds.some(
    (id) => page.layers.find((l) => l.id === id)?.frameMedia?.playback?.loop,
  );
  const unavailable = !playing || !page.states.length || looping;
  return (
    <fieldset className="action-layer-list">
      <legend>Après la lecture</legend>
      <label className="checkbox-field">
        <input
          type="checkbox"
          aria-label="Activer un état de page après la lecture"
          checked={enabled}
          disabled={busy || (!enabled && unavailable)}
          onChange={(e) =>
            change({
              afterPlayback: {
                ...after,
                enabled: e.target.checked,
                stateId: after?.stateId ?? null,
              },
            })
          }
        />
        Activer un état de page après la lecture
      </label>
      {!page.states.length && (
        <p className="help">
          Créez un état sur cette diapositive pour le choisir après la lecture.
        </p>
      )}
      {!playing && (
        <p className="help">
          Cette option s’applique aux commandes de lecture et de reprise, pas à
          Pause ou Arrêter.
        </p>
      )}
      {looping && (
        <p className="help">
          Une vidéo ciblée est en boucle. Désactivez la boucle : une lecture
          infinie ne peut pas déclencher cette action de fin.
        </p>
      )}
      {enabled && page.states.length > 0 && (
        <label className="field">
          État de page après la lecture
          <select
            aria-label="État de page après la lecture"
            value={after.stateId || ""}
            disabled={busy || unavailable}
            onChange={(e) =>
              change({
                afterPlayback: {
                  ...after,
                  stateId: e.target.value || null,
                  missingStateId: null,
                },
              })
            }
          >
            <option value="">Choisir un état</option>
            {page.states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {enabled && after?.missingStateId && (
        <p role="alert">État cible introuvable. Choisissez un autre état.</p>
      )}
      {afterPlaybackEnabled(action) && !!action.layerIds.length && (
        <p className="help">
          L’état est activé une seule fois après la fin naturelle de toutes les
          vidéos ciblées. Une interruption annule cette action de fin.
        </p>
      )}
    </fieldset>
  );
}
