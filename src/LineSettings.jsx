import {
  linePoints,
  lineGeometry,
  lineLength,
  lineAngle,
  constrainLine,
} from "./vectorLines.js";
export default function LineSettings({ layer, change, busy }) {
  const s = layer.stroke,
    points = linePoints(layer),
    set = (patch) => change(layer.id, patch),
    stroke = (patch) => set({ stroke: { ...s, ...patch } });
  const numeric = (label, value, min, max, apply, step = 0.1) => (
    <label className="field" key={label}>
      {label}
      <input
        aria-label={label}
        disabled={busy}
        type="number"
        min={min}
        max={max}
        step={step}
        value={Math.round(value * 100) / 100}
        onChange={(e) => {
          if (e.target.value !== "" && Number.isFinite(e.target.valueAsNumber))
            apply(Math.max(min, Math.min(max, e.target.valueAsNumber)));
        }}
      />
    </label>
  );
  function coordinate(index, axis, value) {
    const next = points.map((p) => ({ ...p }));
    next[index][axis] = value / (axis === "x" ? 1920 : 1080);
    const geometry = lineGeometry(...next);
    if (geometry) set(geometry);
  }
  function polar(length, angle) {
    const a = (angle * Math.PI) / 180,
      b = constrainLine(
        points[0],
        {
          x: points[0].x + (Math.cos(a) * length) / 1920,
          y: points[0].y + (Math.sin(a) * length) / 1080,
        },
        false,
      );
    set(lineGeometry(points[0], b));
  }
  return (
    <>
      <details className="property-section" open>
        <summary>Géométrie de la ligne</summary>
        <fieldset
          className="line-geometry-fields"
          disabled={busy || layer.locked}
        >
          <div className="layer-coordinates">
            {[0, 1].flatMap((i) =>
              ["x", "y"].map((axis) =>
                numeric(
                  `${axis.toUpperCase()}${i + 1} (px)`,
                  points[i][axis] * (axis === "x" ? 1920 : 1080),
                  0,
                  axis === "x" ? 1920 : 1080,
                  (n) => coordinate(i, axis, n),
                ),
              ),
            )}
          </div>
          {numeric(
            "Longueur de la ligne (px)",
            lineLength(layer),
            0,
            2203,
            (n) => polar(n, lineAngle(layer)),
          )}
          {numeric("Angle de la ligne (°)", lineAngle(layer), -180, 180, (n) =>
            polar(lineLength(layer), n),
          )}
        </fieldset>
      </details>
      <details className="property-section" open>
        <summary>Trait</summary>
        <label className="checkbox-field">
          <input
            disabled={busy}
            type="checkbox"
            checked={s.enabled}
            onChange={(e) => stroke({ enabled: e.target.checked })}
          />
          Activer le trait
        </label>
        <label className="field">
          Couleur du trait
          <input
            aria-label="Couleur du trait"
            disabled={busy}
            type="color"
            value={s.color}
            onChange={(e) => stroke({ color: e.target.value })}
          />
        </label>
        {numeric(
          "Opacité du trait (%)",
          s.opacity * 100,
          0,
          100,
          (n) => stroke({ opacity: n / 100 }),
          1,
        )}
        {numeric("Épaisseur du trait (px)", s.width, 0, 200, (n) =>
          stroke({ width: n }),
        )}
        <label className="field">
          Extrémités du trait
          <select
            aria-label="Extrémités du trait"
            disabled={busy}
            value={s.cap}
            onChange={(e) => stroke({ cap: e.target.value })}
          >
            <option value="butt">Carrées — au point (Butt)</option>
            <option value="round">Arrondies (Round)</option>
            <option value="square">Projetées (Square)</option>
          </select>
        </label>
        <svg
          className="line-cap-preview"
          viewBox="0 0 180 54"
          role="img"
          aria-label="Aperçu : carrées, arrondies et projetées"
        >
          <g stroke={s.color} strokeWidth="8">
            {["butt", "round", "square"].map((cap, i) => (
              <line
                key={cap}
                x1="16"
                x2="164"
                y1={9 + i * 18}
                y2={9 + i * 18}
                strokeLinecap={cap}
              />
            ))}
          </g>
        </svg>
      </details>
      <details className="property-section" open>
        <summary>Style du trait</summary>
        <label className="field">
          Style du trait
          <select
            aria-label="Style du trait"
            disabled={busy}
            value={s.pattern}
            onChange={(e) => stroke({ pattern: e.target.value })}
          >
            <option value="solid">Ligne continue</option>
            <option value="dots">Ligne pointillée</option>
            <option value="dashed">Ligne tiretée</option>
            <option value="custom">Personnalisé</option>
          </select>
        </label>
        {s.pattern === "custom" && (
          <>
            {numeric("Longueur des tirets (px)", s.dash, 0.1, 2000, (n) =>
              stroke({ dash: n }),
            )}
            {numeric("Espacement des tirets (px)", s.gap, 0.1, 2000, (n) =>
              stroke({ gap: n }),
            )}
          </>
        )}
        {s.pattern !== "solid" &&
          numeric("Décalage du motif (px)", s.offset, -10000, 10000, (n) =>
            stroke({ offset: n }),
          )}
      </details>
      <details className="property-section" open>
        <summary>Décorations</summary>
        {[
          ["start", "Début de ligne"],
          ["end", "Fin de ligne"],
        ].map(([key, label]) => (
          <label className="field" key={key}>
            {label}
            <select
              aria-label={label}
              disabled={busy}
              value={s[key]}
              onChange={(e) => stroke({ [key]: e.target.value })}
            >
              <option value="none">Aucun</option>
              <option value="arrow">Flèche</option>
              <option value="dot">Point rond</option>
            </select>
          </label>
        ))}
        {(s.start !== "none" || s.end !== "none") &&
          numeric(
            "Taille des décorations (× épaisseur)",
            s.decorationScale,
            1,
            20,
            (n) => stroke({ decorationScale: n }),
          )}
      </details>
    </>
  );
}
