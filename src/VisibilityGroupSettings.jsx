import { orderedLayers, uid } from "./document.js";
export function GroupActionSettings({ action, page, change, busy }) {
  const groups = page.visibilityGroups || [];
  return (
    <fieldset disabled={busy}>
      <legend>Groupes contrôlés</legend>
      {!groups.length && (
        <p>Créez un groupe dans l’onglet États → Groupes de visibilité.</p>
      )}
      {groups.map((g) => {
        const operation = action.operations.find((o) => o.groupId === g.id);
        return (
          <label className="field" key={g.id}>
            {g.name}
            <select
              aria-label={`Action du groupe ${g.name}`}
              value={operation?.mode || ""}
              onChange={(e) =>
                change({
                  operations: [
                    ...action.operations.filter((o) => o.groupId !== g.id),
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
        );
      })}
      {action.operations.some(
        (o) => !groups.some((g) => g.id === o.groupId),
      ) && (
        <p role="alert">
          Un groupe cible a été supprimé ou appartient à une autre diapositive.{" "}
          <button
            type="button"
            onClick={() =>
              change({
                operations: action.operations.filter((o) =>
                  groups.some((g) => g.id === o.groupId),
                ),
              })
            }
          >
            Retirer les cibles absentes
          </button>
        </p>
      )}
    </fieldset>
  );
}
export default function VisibilityGroupSettings({ page, changePage, busy }) {
  const groups = page.visibilityGroups || [],
    layers = orderedLayers(page);
  const set = (id, patch) =>
    changePage(page.id, {
      visibilityGroups: groups.map((g) =>
        g.id === id ? { ...g, ...patch } : g,
      ),
    });
  function remove(g) {
    const refs = page.buttons.filter((b) =>
      b.action?.operations?.some((o) => o.groupId === g.id),
    );
    if (
      !window.confirm(
        `Supprimer le groupe « ${g.name} » ? Ses calques sont conservés.${refs.length ? ` ${refs.length} bouton(s) devront être reconfigurés.` : ""}`,
      )
    )
      return;
    changePage(page.id, {
      visibilityGroups: groups.filter((v) => v.id !== g.id),
      states: page.states.map((s) => ({
        ...s,
        ...(s.groupVisibility
          ? {
              groupVisibility: Object.fromEntries(
                Object.entries(s.groupVisibility).filter(([id]) => id !== g.id),
              ),
            }
          : {}),
      })),
    });
  }
  return (
    <section className="visibility-group-settings">
      <h2>Groupes de visibilité</h2>
      <p>
        Un calque appartient à un seul groupe de visibilité. Les groupes ne
        déplacent pas les objets. Les dossiers masqués restent prioritaires.
      </p>
      <button
        className="ui-button"
        disabled={busy || groups.length >= 200}
        onClick={() =>
          changePage(page.id, {
            visibilityGroups: [
              ...groups,
              {
                id: uid(),
                name: `Groupe de visibilité ${groups.length + 1}`,
                layerIds: [],
                initialVisible: true,
              },
            ],
          })
        }
      >
        + Groupe de visibilité
      </button>
      {groups.map((g) => (
        <details className="state-card" key={g.id} open>
          <summary>
            {g.initialVisible ? "◉" : "○"} {g.name} · {g.layerIds.length}{" "}
            élément(s)
          </summary>
          <label className="field">
            Nom du groupe
            <input
              aria-label={`Nom du groupe de visibilité ${g.id}`}
              value={g.name}
              maxLength={80}
              disabled={busy}
              onChange={(e) => {
                if (e.target.value.trim()) set(g.id, { name: e.target.value });
              }}
            />
          </label>
          <label>
            <input
              type="checkbox"
              aria-label={`Visibilité initiale du groupe ${g.name}`}
              disabled={busy}
              checked={g.initialVisible}
              onChange={(e) => set(g.id, { initialVisible: e.target.checked })}
            />
            Visible au départ
          </label>
          <fieldset disabled={busy}>
            <legend>Éléments du groupe</legend>
            {layers.map((l) => (
              <label className="checkbox-field" key={l.id}>
                <input
                  type="checkbox"
                  aria-label={`Inclure ${l.name} dans ${g.name}`}
                  checked={g.layerIds.includes(l.id)}
                  disabled={groups.some(
                    (other) =>
                      other.id !== g.id && other.layerIds.includes(l.id),
                  )}
                  onChange={(e) =>
                    set(g.id, {
                      layerIds: e.target.checked
                        ? [...g.layerIds, l.id]
                        : g.layerIds.filter((id) => id !== l.id),
                    })
                  }
                />
                {l.name}
                {l.folderHidden ? " · dossier masqué" : ""}
              </label>
            ))}
          </fieldset>
          <p>
            Contrôlé par :{" "}
            {page.buttons
              .filter((b) =>
                b.action?.operations?.some((o) => o.groupId === g.id),
              )
              .map((b) => b.name)
              .join(", ") || "Aucun bouton"}
          </p>
          <button
            className="ui-button danger"
            disabled={busy}
            onClick={() => remove(g)}
          >
            Supprimer le groupe {g.name}
          </button>
        </details>
      ))}
    </section>
  );
}
export function StateGroupDefaults({ page, stateId, changePage, busy }) {
  const s = page.states.find((s) => s.id === stateId);
  if (!s || !page.visibilityGroups?.length) return null;
  return (
    <details open>
      <summary>Groupes au départ de cet état</summary>
      {page.visibilityGroups.map((g) => (
        <label className="field" key={g.id}>
          {g.name}
          <select
            aria-label={`Groupe ${g.name} dans ${s.name}`}
            disabled={busy}
            value={
              s.groupVisibility?.[g.id] === undefined
                ? "default"
                : s.groupVisibility[g.id]
                  ? "show"
                  : "hide"
            }
            onChange={(e) => {
              const values = { ...s.groupVisibility };
              if (e.target.value === "default") delete values[g.id];
              else values[g.id] = e.target.value === "show";
              changePage(page.id, {
                states: page.states.map((state) =>
                  state.id === s.id ? { ...s, groupVisibility: values } : state,
                ),
              });
            }}
          >
            <option value="default">
              Configuration du groupe ({g.initialVisible ? "visible" : "masqué"}
              )
            </option>
            <option value="show">Visible</option>
            <option value="hide">Masqué</option>
          </select>
        </label>
      ))}
    </details>
  );
}
