import {validateCardContents} from "./timelineCardContent.js";
import {youtubeDefaults,validateYouTube} from './youtubeModel.js';
import {timelineData,validateMilestoneTimeline,validateMilestoneMedia,isTimelineLayer,validTimelineFrame} from './milestoneTimeline.js';
import {remapExtra} from './videoExtra.js';
import {validateVideoLayers} from './videoLayers.js';
import {normalizeLayerName} from './layerNames.js';
import {validateEditorialText} from './textLists.js';
import {cleanVisibilityGroups,validateVisibilityGroups} from './visibilityGroups.js';
import {resolveDocumentColors,validateProjectColors} from './projectColors.js';
import {resolveProjectStyles,validateProjectStyles} from './projectStyles.js';
import {validateObjectEffects} from './objectEffects.js';
import {folderFlags,validateFolders,cleanFolders} from './layerFolders.js';
import {defaultStroke,validateVectorLine} from './vectorLines.js';
import {validateFrames} from './mediaFrames.js';
import {validateOrganization,cleanGroups,cleanInstances} from './visualGroups.js';
import { validateImageLibrary } from './imageLibrary.js';
import { validateStateVisibility } from './stateVisibility.js';
import {validateButtonText} from './buttonText.js';
import { snapshotBlob } from './mediaBlob.js';
import {validateButtonAppearance} from './buttonAppearance.js';
import { defaultEffect, upgradeEffects, validateEffects } from './visualEffects.js';
import { upgradeTimeline, validateTimeline } from './timeline.js';
import { normalizeActions, validateActions } from './actions.js';
import { DEFAULT_TEXT_STYLE, upgradeText, validateTextStyles } from './textModel.js';
export const uid = () => crypto.randomUUID();
export const DOCUMENT_VERSION = 41;
export const layerDefaults = { rotation: 0, opacity: 1, visible: true, locked: false };
export const emptyPage = (number) => ({ id: uid(), title: `Page ${number}`, notes: '', imageId: null, transitionId: null, variants: [], buttons: [], layers: [], layerOrder: [], states: [], initialStateId: null, defaultBackground: { kind: 'main' }, showActiveButton: true, demoTemplate: null, stateEffects: { default:defaultEffect(), pairs:[] } });

export const MIN_BUTTON_SIZE = .02;
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function createInteractiveButton(number) {
  return { ...layerDefaults, id: uid(), name: `Bouton ${number}`, nameMode:'auto', futureStateVisibility: true, imageId: null, target: null, x: .1, y: .68, width: .14, height: .14 };
}

export function createLayer(type, number) {
  if(type==='youtube')return {...layerDefaults,id:uid(),name:'Vidéo YouTube',type,x:.15,y:.2,width:.4,height:.4,color:'#161923',youtube:youtubeDefaults()};
  if(type==='milestoneTimeline')return {...layerDefaults,id:uid(),name:'Ligne du temps',type,x:.1,y:.25,width:.8,height:.5,color:'#b8a0ec',timeline:timelineData()};
  const names = { image: 'Image', text: 'Texte', rectangle: 'Rectangle', circle: 'Cercle', line: 'Ligne', vectorLine:'Ligne' };
  return { ...layerDefaults, id: uid(), name: type==='text'?'Votre texte':`${names[type]} ${number}`, ...(type==='text'?{nameMode:'auto'}:{}), type, x: .2, y: .2, width: type === 'text' ? .4 : ['circle','rectangle'].includes(type) ? 200/1920 : .25, height: ['line','vectorLine'].includes(type) ? .02 : type === 'text' ? .15 : ['circle','rectangle'].includes(type) ? 200/1080 : .25,
    ...(type==='vectorLine'?{endpoints:{x1:0,y1:.5,x2:1,y2:.5},stroke:defaultStroke()}:{}),
    ...(type === 'image' ? { imageId: null } : type === 'text' ? { content: 'Votre texte', color: '#ffffff', textStyle: { ...DEFAULT_TEXT_STYLE } } : { color: '#b8a0ec' }) };
}

// L’ordre est commun aux boutons historiques et aux nouveaux calques.
// Les tableaux existants sont conservés pour préserver les associations.
export function orderedLayers(page) {
  const items = [...(page.layers || []), ...(page.buttons || []).map(button => ({ ...button, type: 'button' }))];
  const byId = new Map(items.map(item => [item.id, item]));
  const ids = [...new Set([...(page.layerOrder || []), ...items.map(item => item.id)])].filter(id => byId.has(id));
  return ids.map(id => {const item=byId.get(id),flags=folderFlags(page,id);return flags.folderLocked||flags.folderHidden?{...item,...flags,ownLocked:item.locked,locked:item.locked||flags.folderLocked}:item;});
}

export function resolveBackground(page, target) {
  if (target?.kind === 'initial') return resolveBackground(page, page.states?.find(state => state.id === page.initialStateId)?.background || page.defaultBackground);
  if (target?.kind === 'media') return target.mediaId;
  if (target?.kind === 'variant') return page.variants.find(variant => variant.id === target.variantId)?.mediaId || page.imageId;
  return page.imageId;
}

export function normalizePage(page) {
  page=cleanVisibilityGroups(cleanFolders(page));
  const repairTarget = target => target?.kind === 'variant' && !page.variants.some(variant => variant.id === target.variantId) ? null : target;
  return {
    ...page,
    notes: typeof page.notes === 'string' ? page.notes : '',
    buttons: (page.buttons || []).map(button => normalizeLayerName({ ...layerDefaults, ...button, target: repairTarget(button.target) })),
    layers: (page.layers || []).map(layer=>normalizeLayerName(upgradeText(layer))),
    layerOrder: orderedLayers(page).map(layer => layer.id),
    defaultBackground: repairTarget(page.defaultBackground) || { kind: 'main' },
    showActiveButton: page.showActiveButton ?? true,
  };
}

export function normalizeDocument(document) {
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41].includes(document?.version) || !Array.isArray(document.pages) || !Array.isArray(document.media)) {
    throw new Error('Cette version de présentation n’est pas compatible avec cette application. Vos données sont conservées : ouvrez une version plus récente du site.');
  }
  document = resolveProjectStyles(resolveDocumentColors(document));
  document = upgradeEffects(upgradeTimeline(document));
  const pageIds = new Set(document.pages.map(page => page.id));
  return { ...document, version: DOCUMENT_VERSION, pages: document.pages.map(page => { const normalized=normalizeActions(normalizePage(page), pageIds); const next=page.visualGroups||page.componentInstances?cleanInstances(cleanGroups(normalized)):normalized; const ids=new Set([null,...next.states.map(s=>s.id)]); return {...next,stateEffects:{...next.stateEffects,pairs:next.stateEffects.pairs.filter(p=>ids.has(p.fromId) && ids.has(p.toId))}}; }) };
}

export function migrateDocument(document) {
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41].includes(document?.version)) {
    throw new Error('Cette version de présentation n’est pas compatible avec cette application. Vos données sont conservées : ouvrez une version plus récente du site.');
  }
  if (!Array.isArray(document.pages) || !Array.isArray(document.media) || document.pages.some(page => !page || !Array.isArray(page.variants) || typeof page.id !== 'string' || (document.version >= 2 && !Array.isArray(page.buttons))) || document.media.some(media => !media || !(media.blob instanceof Blob))) {
    throw new Error('La présentation enregistrée est illisible. Elle n’a pas été effacée ni remplacée.');
  }
  if(document.pages.some(p=>p.notes!==undefined && typeof p.notes!=='string')) throw new Error('Les notes de cette présentation sont illisibles. Les données sont conservées.');
  validateVideoLayers(document);
  validateEditorialText(document.pages);
  validateVisibilityGroups(document);
  validateProjectColors(document);
  validateProjectStyles(document);
  validateFrames(document);
  validateCardContents(document);
  // Une migration connue ajoute des champs ; elle ne supprime pas de pages,
  // de médias ou de paramètres inconnus. Une version future est bloquée.
  if (document.version >= 3) {
    document.pages.forEach(page => validatePageLayers(page, id => id === null || document.media.some(media => media.id === id && media.type.startsWith('image/'))));
    if (document.version >= 4) {
      validateActions(document, (id, kind) => id === null || document.media.some(media => media.id === id && media.type.startsWith(`${kind}/`)));
      if (document.version >= 5) validateTextStyles(document.pages);
      if (document.version >= 6) { validateTimeline(document, (id, kind) => document.media.some(media => media.id === id && media.type.startsWith(`${kind}/`))); if (document.version >= 7) { validateEffects(document); validateButtonAppearance(document); if(document.version>=9){validateButtonText(document); validateStateVisibility(document); validateImageLibrary(document); if(document.version>=13)validateOrganization(document); validateMilestoneMedia(document);return document.version === DOCUMENT_VERSION ? document : { ...document, version: DOCUMENT_VERSION };} } }
    }
  }
  const upgraded=upgradeEffects(upgradeTimeline(document));
  const next = { ...upgraded, version: DOCUMENT_VERSION, pages: upgraded.pages.map(page => {
    const buttons = (page.buttons ?? []).map(button => ({ ...layerDefaults, ...button }));
    return normalizeActions({ ...page, buttons, layers: (page.layers || []).map(layer=>normalizeLayerName(upgradeText(layer))), layerOrder: page.layerOrder ?? [...(page.layers || []).map(layer => layer.id), ...buttons.map(button => button.id)], defaultBackground: page.defaultBackground ?? { kind: 'main' }, showActiveButton: page.showActiveButton ?? true });
  }) };
  validateTimeline(next, (id, kind) => document.media.some(media => media.id === id && media.type.startsWith(`${kind}/`)));
  validateEffects(next);
  validateButtonAppearance(next);
  validateButtonText(next);
  validateStateVisibility(next);
  validateImageLibrary(next);
  validateTextStyles(next.pages);
  validateMilestoneMedia(next);
  validateActions(next, (id, kind) => id === null || document.media.some(media => media.id === id && media.type.startsWith(`${kind}/`)));
  return next;
}

export function validatePageLayers(page, imageRef) {
  validateFolders(page);
  const fail = () => { throw new Error('La configuration des calques est invalide. La présentation actuelle est conservée.'); };
  if (!Array.isArray(page.layers) || !Array.isArray(page.layerOrder)) fail();
  const ids = new Set();
  for (const layer of [...page.layers, ...page.buttons]) {
    if(layer.nameMode!==undefined&&!['auto','manual'].includes(layer.nameMode))fail();
    validateObjectEffects(layer.objectEffects);
    if (!layer || typeof layer.id !== 'string' || !layer.id || ids.has(layer.id) || typeof layer.name !== 'string' || layer.name.length > 80 || !['x', 'y', 'width', 'height', 'rotation', 'opacity'].every(key => Number.isFinite(layer[key])) || (isTimelineLayer(layer) && page.layers.includes(layer) ? !validTimelineFrame(layer) : layer.x < 0 || layer.y < 0 || layer.width < .02 || layer.height < .02 || layer.x + layer.width > 1.00000001 || layer.y + layer.height > 1.00000001) || layer.opacity < 0 || layer.opacity > 1 || layer.rotation < -360 || layer.rotation > 360 || typeof layer.visible !== 'boolean' || typeof layer.locked !== 'boolean') fail();
    ids.add(layer.id);
  }
  for (const layer of page.layers) {
    validateYouTube(layer);
    validateVectorLine(layer);
    validateMilestoneTimeline(layer);
    if (!['image', 'text', 'rectangle', 'circle', 'line','vectorLine','milestoneTimeline','youtube'].includes(layer.type)) fail();
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
  const folderIds=new Map((page.layerFolders||[]).map(f=>[f.id,uid()]));
  const copyId = uid();
  const visibilityIds=new Map((page.visibilityGroups||[]).map(g=>[g.id,uid()]));
  const visualIds=new Map((page.visualGroups||[]).map(g=>[g.id,uid()]));
  const remapAction = action => !action ? null : { ...action,
    ...(action.extra?{extra:remapExtra(action.extra,layerIds,visualIds,visibilityIds,remapTarget)}:{}),
    ...(action.target ? { target: remapTarget(action.target) } : {}),
    ...(action.finalBackground ? { finalBackground: remapTarget(action.finalBackground) } : {}),
    ...(action.operations?{operations:action.operations.map(o=>({...o,groupId:visibilityIds.get(o.groupId)||o.groupId}))}:{}),
    ...(action.layerIds ? { layerIds: action.layerIds.map(id => layerIds.get(id)) } : {}),
    ...(action.targetModes ? {targetModes:Object.fromEntries(Object.entries(action.targetModes).map(([id,mode])=>[layerIds.get(id),mode]))} : {}),
    ...(action.type === 'video' && action.finalStateId ? {finalStateId:stateIds.get(action.finalStateId)||null} : {}),
    ...(action.type==='layerVideo'&&action.afterPlayback?.stateId?{afterPlayback:{...action.afterPlayback,stateId:stateIds.get(action.afterPlayback.stateId)||null}}:{}),
    ...(action.type === 'state' ? { stateId: stateIds.get(action.stateId) || null } : {}),
    ...('pageId' in action ? { pageId: action.pageId === page.id ? copyId : action.pageId } : {}),
  };
  return {
    ...page, ...(page.visibilityGroups?{visibilityGroups:page.visibilityGroups.map(g=>({...g,id:visibilityIds.get(g.id),layerIds:g.layerIds.map(id=>layerIds.get(id))}))}:{}), ...(page.layerFolders?{layerFolders:page.layerFolders.map(f=>({...f,id:folderIds.get(f.id),parentId:folderIds.get(f.parentId)||null,children:f.children.map(id=>layerIds.get(id))}))}:{}), id: copyId, title: `${page.title.slice(0, 190)} (copie)`,
    variants: page.variants.map(variant => ({ ...variant, id: variantIds.get(variant.id) })),
    buttons: page.buttons.map(button => ({ ...button, id: layerIds.get(button.id), target: remapTarget(button.target), action: remapAction(button.action) })),
    states: (page.states || []).map(state => ({ ...state, ...(state.groupVisibility?{groupVisibility:Object.fromEntries(Object.entries(state.groupVisibility).map(([id,v])=>[visibilityIds.get(id),v]))}:{}), id: stateIds.get(state.id), background: remapTarget(state.background), visibility: Object.fromEntries(Object.entries(state.visibility).map(([id, value]) => [layerIds.get(id), value])), activeButtonId: layerIds.get(state.activeButtonId) || null })),
    initialStateId: stateIds.get(page.initialStateId) || null,
    stateEffects:{...page.stateEffects,pairs:page.stateEffects.pairs.map(p=>({...p,fromId:p.fromId===null?null:stateIds.get(p.fromId),toId:p.toId===null?null:stateIds.get(p.toId)}))},
    layers: (page.layers || []).map(layer => ({ ...layer, id: layerIds.get(layer.id) })),
    layerOrder: orderedLayers(page).map(layer => layerIds.get(layer.id)),
    ...(page.visualGroups?{visualGroups:page.visualGroups.map(g=>({...g,id:visualIds.get(g.id),children:g.children.map(id=>layerIds.get(id))}))}:{}),
    ...(page.componentInstances?{componentInstances:page.componentInstances.map(i=>({...i,id:uid(),members:Object.fromEntries(Object.entries(i.members).map(([key,id])=>[key,layerIds.get(id)]))}))}:{}),
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
  let blob;
  try { blob = await snapshotBlob(file.slice(0, file.size, type)); }
  catch { throw new Error(`Le fichier « ${file.name} » ne peut pas être lu. Reconnectez la clé USB ou copiez le fichier sur votre ordinateur, puis importez-le à nouveau. Aucun média existant n’a été supprimé.`); }
  const url = URL.createObjectURL(blob);
  let duration, width, height;
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
      element.onload = element.onloadedmetadata = () => { if (kind === 'image') { width=element.naturalWidth; height=element.naturalHeight; } if (kind === 'video' && Number.isFinite(element.duration)) duration = element.duration; done(); };
      element.onerror = () => done(new Error('Ce média ne peut pas être lu par votre navigateur. Essayez un autre fichier.'));
      element.src = url;
      if (kind === 'video') element.preload = 'metadata';
    });
  } finally { URL.revokeObjectURL(url); }
  return { id: uid(), name: file.name, type, blob, importedAt: Date.now(), ...(width ? {width,height} : {}), ...(duration !== undefined ? { duration } : {}) };
}
