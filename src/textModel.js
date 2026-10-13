// Unités de mise en page dans un cadre de référence ; le rendu est mis à
// l’échelle une seule fois, sans refaire les retours à la ligne à chaque écran.
export const TEXT_WIDTH = 1920;
export const TEXT_HEIGHT = 1080;
export const TEXT_FONTS = {
  arial: { name: 'Arial — classique', css: 'Arial, Helvetica, sans-serif' },
  system: { name: 'Système — moderne', css: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  verdana: { name: 'Verdana — lisible', css: 'Verdana, Arial, sans-serif' },
  trebuchet: { name: 'Trebuchet — titres', css: '"Trebuchet MS", Arial, sans-serif' },
  georgia: { name: 'Georgia — élégant', css: 'Georgia, "Times New Roman", serif' },
  mono: { name: 'Monospace — technique', css: '"Courier New", Courier, monospace' },
};
export const DEFAULT_TEXT_STYLE = { font: 'arial', fontSize: 48, bold: false, italic: false, underline: false, align: 'left', verticalAlign: 'top', letterSpacing: 0, lineHeight: 1.25, uppercase: false, padding: 0, wrap: true, autoHeight: false, preset: 'body' };
export const TEXT_PRESETS = {
  title: { name: 'Grand titre', style: { ...DEFAULT_TEXT_STYLE, fontSize: 96, bold: true, lineHeight: 1.1, letterSpacing: -1.5, preset: 'title' } },
  subtitle: { name: 'Sous-titre', style: { ...DEFAULT_TEXT_STYLE, fontSize: 64, lineHeight: 1.2, preset: 'subtitle' } },
  body: { name: 'Texte normal', style: { ...DEFAULT_TEXT_STYLE } },
  annotation: { name: 'Petite annotation', style: { ...DEFAULT_TEXT_STYLE, fontSize: 28, lineHeight: 1.35, preset: 'annotation' } },
  technical: { name: 'Étiquette technique', style: { ...DEFAULT_TEXT_STYLE, font: 'mono', fontSize: 32, bold: true, letterSpacing: 1.5, uppercase: true, preset: 'technical' } },
};
export function upgradeText(layer) {
  if (layer.type !== 'text' || Object.keys(DEFAULT_TEXT_STYLE).every(key => layer.textStyle && Object.hasOwn(layer.textStyle, key))) return layer;
  return { ...layer, textStyle: { ...DEFAULT_TEXT_STYLE, ...layer.textStyle } };
}
export function validateTextStyles(pages) {
  for (const layer of pages.flatMap(page => page.layers).filter(layer => layer.type === 'text')) {
    const style = layer.textStyle;
    if (!style || typeof style.font !== 'string' || !Object.hasOwn(TEXT_FONTS, style.font) || !['left', 'center', 'right'].includes(style.align) || !['top', 'center', 'bottom'].includes(style.verticalAlign) || !['body', 'title', 'subtitle', 'annotation', 'technical', 'custom'].includes(style.preset) || !['bold', 'italic', 'underline', 'uppercase', 'wrap', 'autoHeight'].every(key => typeof style[key] === 'boolean') || !Number.isFinite(style.fontSize) || style.fontSize < 8 || style.fontSize > 320 || !Number.isFinite(style.letterSpacing) || style.letterSpacing < -10 || style.letterSpacing > 100 || !Number.isFinite(style.lineHeight) || style.lineHeight < .5 || style.lineHeight > 3 || !Number.isFinite(style.padding) || style.padding < 0 || style.padding > 200) {
      throw new Error('La mise en forme du texte est invalide. La présentation actuelle est conservée.');
    }
  }
}
