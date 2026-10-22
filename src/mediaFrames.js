export const frameCrop = () => ({
  mode: "cover",
  x: 0,
  y: 0,
  zoom: 1,
  rotation: 0,
});
export const framePlayback = () => ({
  autoplay: false,
  loop: false,
  muted: true,
  rate: 1,
  end: "hold",
});
export const frameBorder = () => ({
  enabled: false,
  color: "#ffffff",
  width: 2,
  opacity: 1,
});
export const isFrame = (item) => ["circle", "rectangle"].includes(item.type);
export function validateFrames(document) {
  const fail = () => {
    throw Error(
      "Les paramètres des cadres multimédias sont invalides. Votre projet est conservé.",
    );
  };
  const finite = (n, a, b) => Number.isFinite(n) && n >= a && n <= b;
  for (const page of [
    ...document.pages,
    ...(document.components || []).map((c) => ({ layers: c.layers })),
  ])
    for (const l of page.layers || []) {
      if (l.border !== undefined) {
        const b = l.border;
        if (
          !b ||
          typeof b.enabled !== "boolean" ||
          !/^#[0-9a-f]{6}$/i.test(b.color) ||
          !finite(b.width, 0, 100) ||
          !finite(b.opacity, 0, 1)
        )
          fail();
      }
      if (
        l.fillMode !== undefined &&
        !["solid", "transparent"].includes(l.fillMode)
      )
        fail();
      if (l.fillOpacity !== undefined && !finite(l.fillOpacity, 0, 1)) fail();
      if (l.cornerRadius !== undefined && !finite(l.cornerRadius, 0, 500))
        fail();
      if (l.frameMedia != null) {
        const m = l.frameMedia;
        if (
          !isFrame(l) ||
          !["image", "video"].includes(m.kind) ||
          !document.media.some(
            (r) => r.id === m.mediaId && r.type.startsWith(m.kind + "/"),
          )
        )
          fail();
        const c = m.crop;
        if (
          !c ||
          !["cover", "contain"].includes(c.mode) ||
          !finite(c.x, -2, 2) ||
          !finite(c.y, -2, 2) ||
          !finite(c.zoom, 0.1, 5) ||
          !finite(c.rotation, -360, 360)
        )
          fail();
        if (m.kind === "video") {
          const v = m.playback;
          if (
            !v ||
            ["autoplay", "loop", "muted"].some(
              (k) => typeof v[k] !== "boolean",
            ) ||
            !finite(v.rate, 0.5, 2) ||
            !["hold", "first", "hide"].includes(v.end)
          )
            fail();
        }
      }
    }
}
