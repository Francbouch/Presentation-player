// WOFF2 officiels Google Fonts distribués sans modification par Fontsource.
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const ids = [
  "manrope",
  "plus-jakarta-sans",
  "dm-sans",
  "outfit",
  "sora",
  "urbanist",
  "instrument-sans",
  "space-grotesk",
  "bricolage-grotesque",
  "cormorant-garamond",
];
const catalog = {};
for (const id of ids) {
  const base = `node_modules/@fontsource-variable/${id}`,
    meta = JSON.parse(await readFile(`${base}/metadata.json`)),
    pkg = JSON.parse(await readFile(`${base}/package.json`));
  const dest = `public/fonts/${id}`;
  await mkdir(dest, { recursive: true });
  await copyFile(`${base}/LICENSE`, `${dest}/OFL.txt`);
  const faces = [];
  for (const style of meta.styles) {
    const css = await readFile(
      `${base}/wght${style === "italic" ? "-italic" : ""}.css`,
      "utf8",
    );
    for (const block of css.matchAll(/@font-face\s*\{([^}]+)\}/g)) {
      const file = block[1].match(/url\(\.\/files\/([^)]*)\)/)?.[1];
      if (!file?.includes("-latin-") && !file?.includes("-latin-ext-"))
        continue;
      const bytes = await readFile(`${base}/files/${file}`),
        hash = createHash("sha256").update(bytes).digest("hex").slice(0, 12),
        name = `${hash}-${file}`;
      await writeFile(`${dest}/${name}`, bytes);
      faces.push({
        url: `/fonts/${id}/${name}`,
        style,
        weight: block[1].match(/font-weight:\s*([^;]+)/)[1],
        unicodeRange: block[1].match(/unicode-range:\s*([^;]+)/)[1],
      });
    }
  }
  catalog[id] = {
    name: meta.family,
    css: `"${meta.family}", ${meta.category === "serif" ? "Georgia, serif" : "Arial, sans-serif"}`,
    weights: Array.from(
      {
        length:
          (Number(meta.variable.wght.max) - Number(meta.variable.wght.min)) /
            100 +
          1,
      },
      (_, i) => Number(meta.variable.wght.min) + i * 100,
    ),
    faces,
    source: meta.source,
    version: meta.version,
    fontsource: pkg.version,
    license: "OFL-1.1",
  };
}
await writeFile(
  "src/fontCatalog.json",
  JSON.stringify(catalog, null, 2) + "\n",
);
await writeFile(
  "public/fonts/README.txt",
  "Official Google Fonts, redistributed unchanged as WOFF2 via @fontsource-variable.\nEach family includes its OFL license. Sources and versions: src/fontCatalog.json.\nRegenerate with npm ci && node scripts/vendor-fonts.mjs. Latin and Latin Extended subsets include French accents and œ.\n",
);
