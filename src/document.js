export const uid = () => crypto.randomUUID();
export const emptyPage = (number) => ({ id: uid(), title: `Page ${number}`, imageId: null, transitionId: null, variants: [], buttons: [], defaultBackground: { kind: 'main' }, showActiveButton: true, demoTemplate: null });

export const MIN_BUTTON_SIZE = .02;
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function createInteractiveButton(number) {
  return { id: uid(), name: `Bouton ${number}`, imageId: null, target: null, x: .1, y: .68, width: .14, height: .14 };
}

export function resolveBackground(page, target) {
  if (target?.kind === 'media') return target.mediaId;
  if (target?.kind === 'variant') return page.variants.find(variant => variant.id === target.variantId)?.mediaId || page.imageId;
  return page.imageId;
}

export function normalizePage(page) {
  const repairTarget = target => target?.kind === 'variant' && !page.variants.some(variant => variant.id === target.variantId) ? null : target;
  return {
    ...page,
    buttons: (page.buttons || []).map(button => ({ ...button, target: repairTarget(button.target) })),
    defaultBackground: repairTarget(page.defaultBackground) || { kind: 'main' },
    showActiveButton: page.showActiveButton ?? true,
  };
}

export function normalizeDocument(document) {
  if (![1, 2].includes(document?.version) || !Array.isArray(document.pages) || !Array.isArray(document.media)) {
    throw new Error('Cette version de présentation n’est pas compatible avec cette application. Vos données sont conservées : ouvrez une version plus récente du site.');
  }
  return { ...document, version: 2, pages: document.pages.map(normalizePage) };
}

export function migrateDocument(document) {
  if (![1, 2].includes(document?.version)) {
    throw new Error('Cette version de présentation n’est pas compatible avec cette application. Vos données sont conservées : ouvrez une version plus récente du site.');
  }
  if (!Array.isArray(document.pages) || !Array.isArray(document.media) || document.pages.some(page => !page || !Array.isArray(page.variants) || typeof page.id !== 'string' || (document.version === 2 && !Array.isArray(page.buttons))) || document.media.some(media => !media || !(media.blob instanceof Blob))) {
    throw new Error('La présentation enregistrée est illisible. Elle n’a pas été effacée ni remplacée.');
  }
  // Une migration connue ajoute des champs ; elle ne supprime pas de pages,
  // de médias ou de paramètres inconnus. Une version future est bloquée.
  if (document.version === 2) return document;
  return { ...document, version: 2, pages: document.pages.map(page => ({
    ...page, buttons: page.buttons ?? [], defaultBackground: page.defaultBackground ?? { kind: 'main' }, showActiveButton: page.showActiveButton ?? true,
  })) };
}

export function duplicatePageModel(page) {
  const variantIds = new Map(page.variants.map(variant => [variant.id, uid()]));
  const remapTarget = target => target?.kind === 'variant' ? { ...target, variantId: variantIds.get(target.variantId) } : target;
  return {
    ...page, id: uid(), title: `${page.title.slice(0, 190)} (copie)`,
    variants: page.variants.map(variant => ({ ...variant, id: variantIds.get(variant.id) })),
    buttons: page.buttons.map(button => ({ ...button, id: uid(), target: remapTarget(button.target) })),
    defaultBackground: remapTarget(page.defaultBackground),
  };
}

export function pruneDocument(document) {
  const used = new Set(document.pages.flatMap(page => [page.imageId, page.transitionId,
    ...page.variants.map(variant => variant.mediaId),
    ...(page.buttons || []).flatMap(button => [button.imageId, button.target?.kind === 'media' ? button.target.mediaId : null]),
    page.defaultBackground?.kind === 'media' ? page.defaultBackground.mediaId : null,
  ]).filter(Boolean));
  const media = document.media.filter(item => used.has(item.id));
  return { ...document, media: media.length === document.media.length ? document.media : media };
}

export async function createDemoDocument() {
  const paths = ['/slides/aurora.png', '/slides/ocean.png', '/slides/sunset.png', '/transitions/01-02.mp4'];
  const media = await Promise.all(paths.map(async (path) => {
    const response = await fetch(path);
    if (!response.ok) throw new Error('Impossible de charger les médias de démonstration.');
    const blob = await response.blob();
    return { id: uid(), name: path.split('/').pop(), blob, type: path.endsWith('.mp4') ? 'video/mp4' : 'image/png' };
  }));
  return {
    version: 2,
    pages: [
      { ...emptyPage(1), title: 'Une nouvelle perspective', imageId: media[0].id, transitionId: media[3].id, demoTemplate: 'welcome' },
      { ...emptyPage(2), title: 'Changez d’atmosphère', imageId: media[0].id, demoTemplate: 'atmospheres', variants: [
        { id: uid(), name: 'Aurore', mediaId: media[0].id },
        { id: uid(), name: 'Océan', mediaId: media[1].id },
        { id: uid(), name: 'Crépuscule', mediaId: media[2].id },
      ] },
      { ...emptyPage(3), title: 'Faites place à vos idées', imageId: media[1].id, demoTemplate: 'closing' },
    ],
    media,
  };
}

export const mediaTypes = {
  image: ['image/png', 'image/jpeg', 'image/webp'],
  video: ['video/mp4', 'video/webm'],
};

export async function readMedia(file, kind) {
  const extensionTypes = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm' };
  const type = file.type || extensionTypes[file.name.split('.').pop().toLowerCase()];
  if (!mediaTypes[kind].includes(type)) throw new Error(kind === 'image' ? 'Choisissez une image PNG, JPG, JPEG ou WebP.' : 'Choisissez une vidéo MP4 ou WebM.');
  if (!file.size) throw new Error('Ce fichier est vide. Choisissez un autre fichier.');
  const blob = file.slice(0, file.size, type);
  const url = URL.createObjectURL(blob);
  try {
    await new Promise((resolve, reject) => {
      const element = kind === 'image' ? new Image() : document.createElement('video');
      const timeout = setTimeout(() => done(new Error('Le média est trop long à charger ou son format n’est pas pris en charge.')), 15000);
      function done(error) {
        clearTimeout(timeout);
        element.onload = element.onloadedmetadata = element.onerror = null;
        if (kind === 'video') { element.removeAttribute('src'); element.load(); }
        if (error) reject(error); else resolve();
      }
      element.onload = element.onloadedmetadata = () => done();
      element.onerror = () => done(new Error('Ce média ne peut pas être lu par votre navigateur. Essayez un autre fichier.'));
      element.src = url;
      if (kind === 'video') element.preload = 'metadata';
    });
  } finally { URL.revokeObjectURL(url); }
  return { id: uid(), name: file.name, type, blob };
}
