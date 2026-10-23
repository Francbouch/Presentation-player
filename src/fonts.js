import catalog from "./fontCatalog.json" with { type: "json" };
export { catalog as MODERN_FONTS };
const pending = new Map();
const CACHE = "studio-official-fonts-v1";
// CacheStorage contient uniquement les polices publiques, jamais les médias du projet.
async function bytes(url) {
  const embedded = window.__studioFontAssets?.[url];
  if (embedded) return fetch(embedded).then((r) => r.arrayBuffer());
  let cache;
  try {
    cache = await caches.open(CACHE);
    const cached = await cache.match(url);
    if (cached) return cached.arrayBuffer();
  } catch {
    /* navigation privée / stockage indisponible */
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok)
    throw new Error(
      "La police ne peut pas être chargée. Reconnectez-vous puis réessayez.",
    );
  const buffer = await response.arrayBuffer();
  if (cache) {
    try {
      await cache.put(
        url,
        new Response(buffer, { headers: { "Content-Type": "font/woff2" } }),
      );
    } catch {
      /* Le rendu reste disponible sans cache. */
    }
  }
  return buffer;
}
export function ensureFont(id, italic = false) {
  if (!Object.hasOwn(catalog, id) || typeof document === "undefined")
    return Promise.resolve();
  const font = catalog[id],
    style =
      italic && font.faces.some((f) => f.style === "italic")
        ? "italic"
        : "normal",
    key = `${id}:${style}`;
  if (!pending.has(key)) {
    const promise = Promise.all(
      font.faces
        .filter((f) => f.style === style)
        .map(async (f) => {
          const face = new FontFace(font.name, await bytes(f.url), {
            style: f.style,
            weight: f.weight,
            unicodeRange: f.unicodeRange,
            display: "swap",
          });
          await face.load();
          document.fonts.add(face);
        }),
    ).catch((error) => {
      pending.delete(key);
      throw error;
    });
    pending.set(key, promise);
  }
  return pending.get(key);
}
export function textWeight(style) {
  return style?.weight ?? (style?.bold ? 700 : 400);
}
export function preparePageFonts(page) {
  return Promise.all(
    [...page.layers, ...page.buttons]
      .map((i) => (i.type === "text" ? i.textStyle : i.labelText?.textStyle))
      .filter(Boolean)
      .map((s) => ensureFont(s.font, s.italic)),
  );
}
