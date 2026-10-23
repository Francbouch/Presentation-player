import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Réunit le build et les médias de démonstration dans un fichier HTML autonome.
// Les chemins restent intacts pour préserver les noms de fichiers dans les ZIP.
const root = process.cwd();
const html = await readFile(path.join(root, 'dist/index.html'), 'utf8');
const jsPath = html.match(/<script[^>]*src="([^"]+)"/)?.[1];
const cssPath = html.match(/<link[^>]*href="([^"]+\.css)"/)?.[1];
if (!jsPath || !cssPath) throw new Error('Exécutez npm run build avant de créer la version autonome.');
const js = await readFile(path.join(root, 'dist', jsPath), 'utf8');
const css = await readFile(path.join(root, 'dist', cssPath), 'utf8');
const assets = {};
for (const file of ['slides/aurora.png', 'slides/ocean.png', 'slides/sunset.png', 'transitions/01-02.mp4']) {
  const bytes = await readFile(path.join(root, 'public', file));
  const type = file.endsWith('.mp4') ? 'video/mp4' : 'image/png';
  assets[`/${file}`] = `data:${type};base64,${bytes.toString('base64')}`;
}
const fonts = JSON.parse(await readFile(path.join(root,'src/fontCatalog.json'),'utf8'));
const fontAssets = {};
for (const font of Object.values(fonts)) for (const face of font.faces) {
 const bytes = await readFile(path.join(root,'public',face.url));
 fontAssets[face.url] = `data:font/woff2;base64,${bytes.toString('base64')}`;
}
const fontLicenses = await Promise.all(Object.keys(fonts).map(async id => `${fonts[id].name}\n${await readFile(path.join(root,'public/fonts',id,'OFL.txt'),'utf8')}`));
const assetLoader = `window.__studioFontAssets=${JSON.stringify(fontAssets)};const demoAssets=${JSON.stringify(assets)};const originalFetch=window.fetch.bind(window);window.fetch=(input,options)=>originalFetch(demoAssets[typeof input==='string'?input:input.url]||input,options);`;
const script = `${assetLoader}\n${js}`.replaceAll('</script', '<\\/script');
const standalone = `<!doctype html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Studio — Éditeur de présentation</title><style>${css}</style><!-- ${fontLicenses.join("\n\n").replaceAll("--", "—")} --></head><body><div id="root"></div><script type="module">${script}</script></body></html>`;
await writeFile(path.join(root, 'dist/presentation-player.html'), standalone);
console.log('Version autonome créée : dist/presentation-player.html');
