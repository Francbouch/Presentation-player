import {validateButtonAppearance} from './buttonAppearance.js';
import { defaultEffect, upgradeEffects, validateEffects } from './visualEffects.js';
import { upgradeTimeline, validateTimeline } from './timeline.js';
import { normalizeActions, validateActions } from './actions.js';
import { DEFAULT_TEXT_STYLE, upgradeText, validateTextStyles } from './textModel.js';
export const uid = () => crypto.randomUUID();
export const DOCUMENT_VERSION = 8;
export const layerDefaults = { rotation: 0, opacity: 1, visible: true, locked: false };
export const emptyPage = (number) => ({ id: uid(), title: `Page ${number}`, imageId: null, transitionId: null, variants: [], buttons: [], layers: [], layerOrder: [], states: [], initialStateId: null, defaultBackground: { kind: 'main' }, showActiveButton: true, demoTemplate: null, stateEffects: { default:defaultEffect(), pairs:[] } });

export const MIN_BUTTON_SIZE = .02;
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function createInteractiveButton(number) {
  return { ...layerDefaults, id: uid(), name: `Bouton ${number}`, imageId: null, target: null, x: .1, y: .68, width: .14, height: .14 };
}

export function createLayer(type, number) {
  const names = { image: 'Image', text: 'Texte', rectangle: 'Rectangle', circle: 'Cercle', line: 'Ligne' };
  return { ...layerDefaults, id: uid(), name: `${names[type]} ${number}`, type, x: .2, y: .2, width: type === 'text' ? .4 : type === 'circle' ? .140625 : .25, height: type === 'line' ? .02 : type === 'text' ? .15 : .25,
    ...(type === 'image' ? { imageId: null } : type === 'text' ? { content: 'Votre texte', color: '#ffffff', textStyle: { ...DEFAULT_TEXT_STYLE } } : { color: '#b8a0ec' }) };
}

// L’ordre est commun aux boutons historiques et aux nouveaux calques.
// Les tableaux existants sont conservés pour préserver les associations.
export function orderedLayers(page) {
  const items = [...(page.layers || []), ...(page.buttons || []).map(button => ({ ...button, type: 'button' }))];
  const byId = new Map(items.map(item => [item.id, item]));
  const ids = [...new Set([...(page.layerOrder || []), ...items.map(item => item.id)])].filter(id => byId.has(id));
  return ids.map(id => byId.get(id));
}

export function resolveBackground(page, target) {
  if (target?.kind === 'initial') return resolveBackground(page, page.states?.find(state => state.id === page.initialStateId)?.background || page.defaultBackground);
  if (target?.kind === 'media') return target.mediaId;
  if (target?.kind === 'variant') return page.variants.find(variant => variant.id === target.variantId)?.mediaId || page.imageId;
  return page.imageId;
}

export function normalizePage(page) {
  const repairTarget = target => target?.kind === 'variant' && !page.variants.some(variant => variant.id === target.variantId) ? null : target;
  return {
    ...page,
    buttons: (page.buttons || []).map(button => ({ ...layerDefaults, ...button, target: repairTarget(button.target) })),
    layers: (page.layers || []).map(upgradeText),
    layerOrder: orderedLayers(page).map(layer => layer.id),
    defaultBackground: repairTarget(page.defaultBackground) || { kind: 'main' },
    showActiveButton: page.showActiveButton ?? true,
  };
}

export function normalizeDocument(document) {
  if (![1, 2, 3, 4, 5, 6, 7, 8].includes(document?.version) || !Array.isArray(document.pages) || !Array.isArray(document.media)) {
    throw new Error('Cette version de présentation n’est pas compatible avec cette application. Vos données sont conservées : ouvrez une version plus récente du site.');
  }
  document = upgradeEffects(upgradeTimeline(document));
  const pageIds = new Set(document.pages.map(page => page.id));
  return { ...document, version: DOCUMENT_VERSION, pages: document.pages.map(page => { const next=normalizeActions(normalizePage(page), pageIds); const ids=new Set([null,...next.states.map(s=>s.id)]); return {...next,stateEffects:{...next.stateEffects,pairs:next.stateEffects.pairs.filter(p=>ids.has(p.fromId) && ids.has(p.toId))}}; }) };
}

export function migrateDocument(document) {
  if (![1, 2, 3, 4, 5, 6, 7, 8].includes(document?.version)) {
    throw new Error('Cette version de présentation n’est pas compatible avec cette application. Vos données sont conservées : ouvrez une version plus récente du site.');
  }
  if (!Array.isArray(document.pages) || !Array.isArray(document.media) || document.pages.some(page => !page || !Array.isArray(page.variants) || typeof page.id !== 'string' || (document.version >= 2 && !Array.isArray(page.buttons))) || document.media.some(media => !media || !(media.blob instanceof Blob))) {
    throw new Error('La présentation enregistrée est illisible. Elle n’a pas été effacée ni remplacée.');
  }
  // Une migration connue ajoute des champs ; elle ne supprime pas de pages,
  // de médias ou de paramètres inconnus. Une version future est bloquée.
  if (document.version >= 3) {
    document.pages.forEach(page => validatePageLayers(page, id => id === null || document.media.some(media => media.id === id && media.type.startsWith('image/'))));
    if (document.version >= 4) {
      validateActions(document, (id, kind) => id === null || document.media.some(media => media.id === id && media.type.startsWith(`${kind}/`)));
      if (document.version >= 5) validateTextStyles(document.pages);
      if (document.version >= 6) { validateTimeline(document, (id, kind) => document.media.some(media => media.id === id && media.type.startsWith(`${kind}/`))); if (document.version >= 7) { validateEffects(document); validateButtonAppearance(document); if(document.version===8)return document; } }
    }
  }
  const upgraded=upgradeEffects(upgradeTimeline(document));
  const next = { ...upgraded, version: DOCUMENT_VERSION, pages: upgraded.pages.map(page => {
    const buttons = (page.buttons ?? []).map(button => ({ ...layerDefaults, ...button }));
    return normalizeActions({ ...page, buttons, layers: (page.layers || []).map(upgradeText), layerOrder: page.layerOrder ?? [...(page.layers || []).map(layer => layer.id), ...buttons.map(button => button.id)], defaultBackground: page.defaultBackground ?? { kind: 'main' }, showActiveButton: page.showActiveButton ?? true });
  }) };
  validateTimeline(next, (id, kind) => document.media.some(media => media.id === id && media.type.startsWith(`${kind}/`)));
  validateEffects(next);
  validateButtonAppearance(next);
  validateTextStyles(next.pages);
  validateActions(next, (id, kind) => id === null || document.media.some(media => media.id === id && media.type.startsWith(`${kind}/`)));
  return next;
}

export function validatePageLayers(page, imageRef) {
  const fail = () => { throw new Error('La configuration des calques est invalide. La présentation actuelle est conservée.'); };
  if (!Array.isArray(page.layers) || !Array.isArray(page.layerOrder)) fail();
  const ids = new Set();
  for (const layer of [...page.layers, ...page.buttons]) {
    if (!layer || typeof layer.id !== 'string' || !layer.id || ids.has(layer.id) || typeof layer.name !== 'string' || layer.name.length > 80 || !['x', 'y', 'width', 'height', 'rotation', 'opacity'].every(key => Number.isFinite(layer[key])) || layer.x < 0 || layer.y < 0 || layer.width < .02 || layer.height < .02 || layer.x + layer.width > 1.00000001 || layer.y + layer.height > 1.00000001 || layer.opacity < 0 || layer.opacity > 1 || layer.rotation < -360 || layer.rotation > 360 || typeof layer.visible !== 'boolean' || typeof layer.locked !== 'boolean') fail();
    ids.add(layer.id);
  }
  for (const layer of page.layers) {
    if (!['image', 'text', 'rectangle', 'circle', 'line'].includes(layer.type)) fail();
    if (layer.type === 'image' && !imageRef(layer.imageId)) fail();
    if (layer.type !== 'image' && !/^#[0-9a-f]{6}$/i.test(layer.color)) fail();
    if (layer.type === 'text' && (typeof layer.content !== 'string' || layer.content.length > 10000)) fail();
  }
  if (page.layerOrder.length !== ids.size || new Set(page.layerOrder).size !== ids.size || page.layerOrder.some(id => !ids.has(id))) fail();
}

export function duplicatePageModel(page) {
  const variantIds = new Map(page.variants.map(variant => [variant.id, uid()]));
  const remapTarget = target => target?.kind === 'variant' ? { ...target, variantId: variantIds.get(target.variantId) } : target;
  const layerIds = new Map(orderedLayers(page).map(layer => [layer.id, uid()]));
  const stateIds = new Map((page.states || []).map(state => [state.id, uid()]));
  const copyId = uid();
  const remapAction = action => !action ? null : { ...action,
    ...(action.target ? { target: remapTarget(action.target) } : {}),
    ...(action.finalBackground ? { finalBackground: remapTarget(action.finalBackground) } : {}),
    ...(action.layerIds ? { layerIds: action.layerIds.map(id => layerIds.get(id)) } : {}),
    ...(action.type === 'state' ? { stateId: stateIds.get(action.stateId) || null } : {}),
    ...('pageId' in action ? { pageId: action.pageId === page.id ? copyId : action.pageId } : {}),
  };
  return {
    ...page, id: copyId, title: `${page.title.slice(0, 190)} (copie)`,
    variants: page.variants.map(variant => ({ ...variant, id: variantIds.get(variant.id) })),
    buttons: page.buttons.map(button => ({ ...button, id: layerIds.get(button.id), target: remapTarget(button.target), action: remapAction(button.action) })),
    states: (page.states || []).map(state => ({ ...state, id: stateIds.get(state.id), background: remapTarget(state.background), visibility: Object.fromEntries(Object.entries(state.visibility).map(([id, value]) => [layerIds.get(id), value])), activeButtonId: layerIds.get(state.activeButtonId) || null })),
    initialStateId: stateIds.get(page.initialStateId) || null,
    stateEffects:{...page.stateEffects,pairs:page.stateEffects.pairs.map(p=>({...p,fromId:p.fromId===null?null:stateIds.get(p.fromId),toId:p.toId===null?null:stateIds.get(p.toId)}))},
    layers: (page.layers || []).map(layer => ({ ...layer, id: layerIds.get(layer.id) })),
    layerOrder: orderedLayers(page).map(layer => layerIds.get(layer.id)),
    defaultBackground: remapTarget(page.defaultBackground),
  };
}

export function pruneDocument(document) {
  // Les médias non utilisés restent disponibles : détacher un passage ou
  // supprimer une page ne doit jamais effacer un fichier utilisateur.
  return document;
}

export async function createDemoDocument() {
  const paths = ['/slides/aurora.png', '/slides/ocean.png', '/slides/sunset.png', '/transitions/01-02.mp4'];
  const media = await Promise.all(paths.map(async (path) => {
    const response = await fetch(path);
    if (!response.ok) throw new Error('Impossible de charger les médias de démonstration.');
    const blob = await response.blob();
    return { id: uid(), name: path.split('/').pop(), blob, type: path.endsWith('.mp4') ? 'video/mp4' : 'image/png' };
  }));
  const demo = {
    version: 5,
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
  return { ...upgradeEffects(upgradeTimeline(demo)), version: DOCUMENT_VERSION };
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
  let duration;
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
      element.onload = element.onloadedmetadata = () => { if (kind === 'video' && Number.isFinite(element.duration)) duration = element.duration; done(); };
      element.onerror = () => done(new Error('Ce média ne peut pas être lu par votre navigateur. Essayez un autre fichier.'));
      element.src = url;
      if (kind === 'video') element.preload = 'metadata';
    });
  } finally { URL.revokeObjectURL(url); }
  return { id: uid(), name: file.name, type, blob, ...(duration !== undefined ? { duration } : {}) };
}
