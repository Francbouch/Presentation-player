import ColorInput from './ProjectColors.jsx';
import { defaultObjectEffects } from "./objectEffects.js";
export default function ObjectEffectsSettings({ item, change, busy }) {
  const e = item.objectEffects || defaultObjectEffects(),
    set = (kind, value) =>
      change(item.id, {
        objectEffects: { ...e, [kind]: { ...e[kind], ...value } },
      });
  const number = (label, value, min, max, fn) => (
    <label className="field" key={label}>
      {label}
      <input
        aria-label={label}
        disabled={busy}
        type="number"
        min={min}
        max={max}
        step="1"
        value={value}
        onChange={(event) => {
          if (
            event.target.value !== "" &&
            Number.isFinite(event.target.valueAsNumber)
          )
            fn(Math.min(max, Math.max(min, event.target.valueAsNumber)));
        }}
      />
    </label>
  );
  return (
    <details className="property-section">
      <summary>Effets visuels</summary>
      <fieldset disabled={busy} className="layer-property-fields">
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={e.shadow.enabled}
            onChange={(v) => set("shadow", { enabled: v.target.checked })}
          />
          Ombre portée
        </label>
        {e.shadow.enabled && (
          <>
            <label className="field">
              Couleur de l’ombre
              <ColorInput
                aria-label="Couleur de l’ombre"
                type="color" colorPath="objectEffects.shadow.color"
                value={e.shadow.color}
                onChange={(v) => set("shadow", { color: v.target.value })}
              />
            </label>
            {number(
              "Opacité de l’ombre (%)",
              e.shadow.opacity * 100,
              0,
              100,
              (v) => set("shadow", { opacity: v / 100 }),
            )}
            {[
              ["x", "Décalage X de l’ombre (px)", -300, 300],
              ["y", "Décalage Y de l’ombre (px)", -300, 300],
              ["blur", "Flou de l’ombre (px)", 0, 64],
            ].map(([k, l, a, b]) =>
              number(l, e.shadow[k], a, b, (v) => set("shadow", { [k]: v })),
            )}
          </>
        )}
        <button
          className="ui-button"
          onClick={() => set("shadow", defaultObjectEffects().shadow)}
        >
          Réinitialiser l’ombre
        </button>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={e.blur.enabled}
            onChange={(v) => set("blur", { enabled: v.target.checked })}
          />
          Flou visuel
        </label>
        {e.blur.enabled &&
          number("Intensité du flou (px)", e.blur.amount, 0, 32, (v) =>
            set("blur", { amount: v }),
          )}
        <button
          className="ui-button"
          onClick={() => set("blur", defaultObjectEffects().blur)}
        >
          Réinitialiser le flou
        </button>
        <p className="help">
          Effets sur la silhouette, sans modifier les médias ni la zone
          cliquable. Valeurs indépendantes du zoom. Étendue et modes de fusion
          non proposés pour préserver les vidéos et la composition.
        </p>
      </fieldset>
    </details>
  );
}
