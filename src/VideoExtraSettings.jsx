import { BackgroundSelect } from "./ActionSettings.jsx";
import { GroupActionSettings } from "./VisibilityGroupSettings.jsx";
import { orderedLayers } from "./document.js";
import { extraEndProblem, extraProblem } from "./videoExtra.js";
export default function VideoExtraSettings({
  page,
  action,
  media,
  change,
  busy,
}) {
  const extra = action.extra,
    problem = extraProblem(page, extra),
    endProblem = extraEndProblem(page, action);
  const update = (patch) => change({ extra: { ...extra, ...patch } });
  const groups = extra?.type === "visualGroups" ? page.visualGroups || [] : [];
  return (
    <fieldset className="action-layer-list" disabled={busy}>
      <legend>Action supplémentaire (facultative)</legend>
      <label className="field">
        Action supplémentaire
        <select
          aria-label="Action supplémentaire"
          value={extra?.type || ""}
          onChange={(e) =>
            change({
              extra: e.target.value
                ? {
                    type: e.target.value,
                    when: "click",
                    ...(e.target.value === "visibility"
                      ? { layerIds: [], mode: "custom", targetModes: {} }
                      : e.target.value === "background"
                        ? { target: { kind: "main" } }
                        : { operations: [] }),
                  }
                : null,
            })
          }
        >
          <option value="">Aucune</option>
          <option value="visibility">Afficher / masquer des calques</option>
          <option value="visibilityGroups">
            Afficher / masquer des groupes de visibilité
          </option>
          <option value="visualGroups">
            Afficher / masquer des groupes de calques
          </option>
          {action.type === "layerVideo" && (
            <option value="background">Changer l’arrière-plan</option>
          )}
        </select>
      </label>
      {extra && (
        <>
          <label className="field">
            Exécuter
            <select
              aria-label="Exécuter l’action supplémentaire"
              value={extra.when}
              onChange={(e) => update({ when: e.target.value })}
            >
              <option value="click">Au clic du bouton</option>
              <option value="ended" disabled={!!endProblem}>
                Après la fin de la vidéo
              </option>
            </select>
          </label>
          {endProblem && (
            <p className="help">{endProblem} Choisissez « Au clic ».</p>
          )}
          {extra.type === "visibility" && (
            <p className="help">
              Les dossiers et groupes de visibilité masqués restent
              prioritaires. Masquer un calque vidéo met sa lecture en pause et
              annule son action de fin, selon les règles actuelles du lecteur.
            </p>
          )}
          {extra.type === "visibility" &&
            orderedLayers(page).map((l) => (
              <label className="field" key={l.id}>
                {l.name}
                <select
                  aria-label={`Action supplémentaire pour ${l.name}`}
                  value={
                    extra.layerIds.includes(l.id)
                      ? extra.targetModes?.[l.id] || extra.mode
                      : ""
                  }
                  onChange={(e) =>
                    update({
                      layerIds: [
                        ...extra.layerIds.filter((id) => id !== l.id),
                        ...(e.target.value ? [l.id] : []),
                      ],
                      targetModes: {
                        ...Object.fromEntries(
                          Object.entries(extra.targetModes || {}).filter(
                            ([id]) => id !== l.id,
                          ),
                        ),
                        ...(e.target.value ? { [l.id]: e.target.value } : {}),
                      },
                    })
                  }
                >
                  <option value="">Ne pas modifier</option>
                  <option value="show">Afficher</option>
                  <option value="hide">Masquer</option>
                  <option value="toggle">Basculer</option>
                </select>
              </label>
            ))}
          {extra.type === "visibilityGroups" && (
            <GroupActionSettings
              page={page}
              action={extra}
              change={update}
              busy={busy}
            />
          )}
          {extra.type === "visualGroups" && (
            <>
              <p className="help">
                Ces groupes organisent les calques ; les groupes de visibilité
                restent prioritaires, comme ailleurs dans studio.
              </p>
              {!groups.length && (
                <p className="help">
                  Créez un groupe de calques pour le contrôler.
                </p>
              )}
              {groups.map((g) => (
                <label className="field" key={g.id}>
                  {g.name}
                  <select
                    aria-label={`Action supplémentaire du groupe de calques ${g.name}`}
                    value={
                      extra.operations.find((o) => o.groupId === g.id)?.mode ||
                      ""
                    }
                    onChange={(e) =>
                      update({
                        operations: [
                          ...extra.operations.filter((o) => o.groupId !== g.id),
                          ...(e.target.value
                            ? [{ groupId: g.id, mode: e.target.value }]
                            : []),
                        ],
                      })
                    }
                  >
                    <option value="">Ne pas modifier</option>
                    <option value="show">Afficher</option>
                    <option value="hide">Masquer</option>
                    <option value="toggle">Basculer</option>
                  </select>
                </label>
              ))}
            </>
          )}
          {extra.type === "background" && (
            <BackgroundSelect
              page={page}
              media={media}
              value={extra.target}
              onChange={(target) => update({ target })}
              label="Arrière-plan supplémentaire"
              initial
              disabled={busy}
            />
          )}
          {extra.when === "ended" && (
            <p className="help">
              Fin naturelle uniquement, après toutes les vidéos ciblées. L’état
              de fin est appliqué d’abord, puis cette action. Une interruption
              annule l’action de fin.
              {action.type === "video" && action.end === "page"
                ? " Elle concerne la page source, avant le départ vers la page suivante."
                : ""}
            </p>
          )}
          {problem && (
            <p role="alert">
              {problem}
              <button type="button" onClick={() => change({ extra: null })}>
                Retirer l’action supplémentaire
              </button>
            </p>
          )}
        </>
      )}
    </fieldset>
  );
}
