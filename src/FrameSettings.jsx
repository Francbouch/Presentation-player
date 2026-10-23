import ColorInput from './ProjectColors.jsx';
import {
  frameBorder,
  frameCrop,
  framePlayback,
  isFrame,
} from "./mediaFrames.js";
export default function FrameSettings({
  layer,
  media,
  change,
  busy,
  importFrame,
  adjusting,
  onAdjust,
}) {
  const b = layer.border || frameBorder(),
    m = layer.frameMedia,
    c = m?.crop || frameCrop(),
    v = m?.playback || framePlayback();
  const set = (patch) => change(layer.id, patch),
    border = (patch) => set({ border: { ...b, ...patch } }),
    content = (patch) => set({ frameMedia: { ...m, ...patch } }),
    crop = (patch) => content({ crop: { ...c, ...patch } }),
    playback = (patch) => content({ playback: { ...v, ...patch } });
  const number = (label, value, min, max, fn, step = 1) => (
    <label className="field">
      {label}
      <input
        aria-label={label}
        disabled={busy}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          if (e.target.value !== "" && Number.isFinite(e.target.valueAsNumber))
            fn(Math.min(max, Math.max(min, e.target.valueAsNumber)));
        }}
      />
    </label>
  );
  return (
    <>
      {["circle", "rectangle", "line"].includes(layer.type) && (
        <details className="property-section" open>
          <summary>Remplissage</summary>
          <label className="field">
            Type de remplissage
            <select
              disabled={busy}
              value={layer.fillMode || "solid"}
              onChange={(e) => set({ fillMode: e.target.value })}
            >
              <option value="solid">Couleur unie</option>
              <option value="transparent">
                Transparent / Aucun remplissage
              </option>
            </select>
          </label>
          {layer.fillMode !== "transparent" &&
            number(
              "Opacité du remplissage (%)",
              Math.round((layer.fillOpacity ?? 1) * 100),
              0,
              100,
              (n) => set({ fillOpacity: n / 100 }),
            )}
          {layer.type === "rectangle" &&
            number(
              "Coins arrondis (px)",
              layer.cornerRadius || 0,
              0,
              500,
              (n) => set({ cornerRadius: n }),
            )}
        </details>
      )}
      <details className="property-section" open>
        <summary>Bordure</summary>
        <label className="checkbox-field">
          <input
            type="checkbox"
            disabled={busy}
            checked={b.enabled}
            onChange={(e) => border({ enabled: e.target.checked })}
          />
          Activer la bordure
        </label>
        {b.enabled && (
          <>
            <label className="field">
              Couleur de la bordure
              <ColorInput
                aria-label="Couleur de la bordure du cadre"
                type="color" colorPath="border.color"
                disabled={busy}
                value={b.color}
                onChange={(e) => border({ color: e.target.value })}
              />
            </label>
            {number("Épaisseur de la bordure (px)", b.width, 0, 100, (n) =>
              border({ width: n }),
            )}
            {number(
              "Opacité de la bordure (%)",
              Math.round(b.opacity * 100),
              0,
              100,
              (n) => border({ opacity: n / 100 }),
            )}
          </>
        )}
      </details>
      {isFrame(layer) && (
        <details className="property-section" open>
          <summary>Contenu multimédia</summary>
          <button
            className="ui-button"
            disabled={busy}
            onClick={() => importFrame(layer.id)}
          >
            Importer / remplacer un média
          </button>
          <label className="field">
            Média de la bibliothèque
            <select
              aria-label="Média du cadre"
              disabled={busy}
              value={m?.mediaId || ""}
              onChange={(e) => {
                const r = media.find((r) => r.id === e.target.value);
                set({
                  frameMedia: r
                    ? {
                        mediaId: r.id,
                        kind: r.type.startsWith("video/") ? "video" : "image",
                        crop: frameCrop(),
                        playback: framePlayback(),
                      }
                    : null,
                });
              }}
            >
              <option value="">Aucun média</option>
              {media.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          {m && (
            <>
              <button
                className="ui-button"
                disabled={busy}
                onClick={() => set({ frameMedia: null })}
              >
                Retirer le média
              </button>
              <button
                className="ui-button"
                disabled={busy}
                onClick={() => onAdjust(!adjusting)}
              >
                {adjusting ? "Terminer" : "Modifier le contenu"}
              </button>
            </>
          )}
          <p className="help">
            Déposez une image ou une vidéo sur le cadre. Double-cliquez pour
            déplacer le contenu.
          </p>
        </details>
      )}
      {m && (
        <details className="property-section" open>
          <summary>Cadrage du contenu</summary>
          <div className="button-row">
            <button
              className="ui-button"
              disabled={busy}
              onClick={() => crop({ mode: "cover", zoom: 1 })}
            >
              Remplir le cadre
            </button>
            <button
              className="ui-button"
              disabled={busy}
              onClick={() => crop({ mode: "contain", zoom: 1 })}
            >
              Ajuster au cadre
            </button>
            <button
              className="ui-button"
              disabled={busy}
              onClick={() => crop({ x: 0, y: 0 })}
            >
              Centrer
            </button>
            <button
              className="ui-button"
              disabled={busy}
              onClick={() => content({ crop: frameCrop() })}
            >
              Réinitialiser le cadrage
            </button>
          </div>
          {number(
            "Position interne X (%)",
            Math.round(c.x * 100),
            -200,
            200,
            (n) => crop({ x: n / 100 }),
          )}
          {number(
            "Position interne Y (%)",
            Math.round(c.y * 100),
            -200,
            200,
            (n) => crop({ y: n / 100 }),
          )}
          <label className="field">
            Échelle du contenu : {Math.round(c.zoom * 100)} %
            <input
              aria-label="Échelle du contenu"
              type="range"
              min="10"
              max="500"
              disabled={busy}
              value={Math.round(c.zoom * 100)}
              onChange={(e) => crop({ zoom: Number(e.target.value) / 100 })}
            />
          </label>
          {number("Rotation interne (°)", c.rotation, -360, 360, (n) =>
            crop({ rotation: n }),
          )}
        </details>
      )}
      {m?.kind === "video" && (
        <details className="property-section" open>
          <summary>Lecture vidéo</summary>
          {[
            ["autoplay", "Lecture automatique à l’affichage"],
            ["loop", "Lire en boucle"],
            ["muted", "Muet"],
          ].map(([key, label]) => (
            <label className="checkbox-field" key={key}>
              <input
                type="checkbox"
                disabled={busy}
                checked={v[key]}
                onChange={(e) => playback({ [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
          {number(
            "Vitesse de lecture",
            v.rate,
            0.5,
            2,
            (n) => playback({ rate: n }),
            0.1,
          )}
          <label className="field">
            Comportement à la fin
            <select
              aria-label="Comportement à la fin"
              disabled={busy}
              value={v.end}
              onChange={(e) => playback({ end: e.target.value })}
            >
              <option value="hold">Conserver la dernière image.</option>
              <option value="first">Revenir à la première image.</option>
              <option value="hide">Masquer le cadre vidéo.</option>
            </select>
          </label>
        </details>
      )}
    </>
  );
}
