import {validateOrganization} from './visualGroups.js';
import { validateImageLibrary } from './imageLibrary.js';
import { validateStateVisibility } from './stateVisibility.js';
import {validateButtonText} from './buttonText.js';
import {validateButtonAppearance} from './buttonAppearance.js';
import { validateEffects } from './visualEffects.js';
import { validateTimeline } from './timeline.js';
import JSZip from 'jszip';
import { DOCUMENT_VERSION, mediaTypes, MIN_BUTTON_SIZE, normalizeDocument, pruneDocument, readMedia, validatePageLayers } from './document.js';
import { refreshDemoVideo } from './demoMedia.js';
import { validateActions } from './actions.js';
import { validateTextStyles } from './textModel.js';

const MAX_ARCHIVE_SIZE = 1024 * 1024 * 1024;
const MAX_EXPANDED_SIZE = 2 * 1024 * 1024 * 1024;
const MAX_ENTRIES = 2500;

export async function exportPresentation(document) {
  const zip = new JSZip();
  const clean = pruneDocument(document);
  const media = clean.media.map((item, index) => {
    const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm' }[item.type];
    const path = `medias/${index + 1}.${extension}`;
    zip.file(path, item.blob);
    const {blob, ...metadata}=item;
    return {...metadata, path};
  });
  const config = JSON.stringify({ ...clean, version: DOCUMENT_VERSION, media }, null, 2);
  if (new Blob([config]).size > 5 * 1024 * 1024) throw new Error('Ce projet dépasse la limite de 5 Mo de configuration pour une sauvegarde restaurable. Vos données sont conservées.');
  zip.file('presentation.json', config);
  // Les médias sont déjà compressés ; STORE évite une compression lente des vidéos.
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
  if (blob.size > MAX_ARCHIVE_SIZE || clean.pages.length > 500 || clean.media.length > 2000 || clean.pages.some(page => page.variants.length > 100)) throw new Error('Ce projet dépasse les limites d’une sauvegarde ZIP restaurable (1 Go, 500 pages, 2 000 médias, 100 variantes par page). Les données du navigateur sont conservées. Utilisez des vidéos plus légères avant de réessayer.');
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = 'presentation-studio.zip';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function importPresentation(file) {
  if (file.size > MAX_ARCHIVE_SIZE) throw new Error('Ce ZIP dépasse la limite de 1 Go. Utilisez des médias plus légers.');
  let zip;
  try { zip = await JSZip.loadAsync(file, { checkCRC32: false }); } catch { throw new Error('Le fichier ZIP est illisible ou endommagé.'); }
  const entries = Object.values(zip.files).filter(entry => !entry.dir);
  if (entries.length > MAX_ENTRIES || entries.reduce((sum, entry) => sum + (entry._data?.uncompressedSize || 0), 0) > MAX_EXPANDED_SIZE) throw new Error('Ce ZIP contient trop de données (limite : 2 Go décompressés et 2 500 fichiers).');
  const configFile = zip.file('presentation.json');
  if (!configFile || configFile._data?.uncompressedSize > 5 * 1024 * 1024) throw new Error('Ce ZIP ne contient pas une configuration presentation.json valide.');
  // Vérifier les sommes CRC après les limites de taille, avant toute restauration.
  try { await JSZip.loadAsync(file, { checkCRC32: true }); }
  catch { throw new Error('Le fichier ZIP est endommagé : la vérification de ses fichiers a échoué.'); }
  let config;
  try { config = JSON.parse(await configFile.async('string')); } catch { throw new Error('La configuration JSON est invalide.'); }
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].includes(config.version) || !Array.isArray(config.pages) || !Array.isArray(config.media) || config.pages.length > 500 || config.media.length > 2000) throw new Error('Ce format de présentation n’est pas pris en charge.');
  const text = (value, limit = 200) => typeof value === 'string' && value.length > 0 && value.length <= limit;
  const ids = new Set();
  const descriptors = config.media.map(item => {
    if (!item || !text(item.id) || ids.has(item.id) || !text(item.name, 1000) || ![...mediaTypes.image, ...mediaTypes.video].includes(item.type) || !/^medias\/[a-zA-Z0-9._-]+$/.test(item.path) || !zip.file(item.path)) throw new Error('Un média du ZIP est manquant ou invalide.');
    ids.add(item.id);
    return item;
  });
  const kinds = new Map(descriptors.map(item => [item.id, item.type]));
  const ref = (id, kind) => id === null || (typeof id === 'string' && mediaTypes[kind].includes(kinds.get(id)));
  const pageIds = new Set();
  const pages = config.pages.map(page => {
    if (!page || !text(page.id) || pageIds.has(page.id) || typeof page.title !== 'string' || page.title.length > 200 || !ref(page.imageId, 'image') || !ref(page.transitionId, 'video') || !Array.isArray(page.variants) || page.variants.length > 100) throw new Error('Une page du ZIP est invalide.');
    pageIds.add(page.id);
    const variantIds = new Set();
    const variants = page.variants.map(variant => {
      if (!variant || !text(variant.id) || variantIds.has(variant.id) || typeof variant.name !== 'string' || variant.name.length > 80 || !ref(variant.mediaId, 'image') || variant.mediaId === null) throw new Error('Une variante du ZIP est invalide.');
      variantIds.add(variant.id);
      return { id: variant.id, name: variant.name, mediaId: variant.mediaId };
    });
    const backgroundTarget = (target, optional = false) => {
      if (target === null && optional) return null;
      if (target?.kind === 'initial' && optional) return { kind: 'initial' };
      if (target?.kind === 'main') return { kind: 'main' };
      if (target?.kind === 'variant' && variants.some(variant => variant.id === target.variantId)) return { kind: 'variant', variantId: target.variantId };
      if (target?.kind === 'media' && target.mediaId !== null && ref(target.mediaId, 'image')) return { kind: 'media', mediaId: target.mediaId };
      throw new Error('L’arrière-plan associé à un bouton ou à une page est invalide.');
    };
    if (config.version >= 2 && (!Array.isArray(page.buttons) || typeof page.showActiveButton !== 'boolean')) throw new Error('La configuration des boutons est invalide.');
    const buttonIds = new Set();
    const buttons = (config.version >= 2 ? page.buttons : []).map(button => {
      if (!button || !text(button.id) || buttonIds.has(button.id) || typeof button.name !== 'string' || button.name.length > 80 || !ref(button.imageId, 'image') || !['x', 'y', 'width', 'height'].every(key => Number.isFinite(button[key])) || button.x < 0 || button.y < 0 || button.width < MIN_BUTTON_SIZE || button.height < MIN_BUTTON_SIZE || button.x + button.width > 1.00000001 || button.y + button.height > 1.00000001) throw new Error('La position, l’image ou les dimensions d’un bouton sont invalides.');
      buttonIds.add(button.id);
      return { ...button, id: button.id, name: button.name, imageId: button.imageId, target: backgroundTarget(button.target, true), x: button.x, y: button.y, width: button.width, height: button.height };
    });
    if (config.version >= 3) validatePageLayers({ ...page, buttons }, id => ref(id, 'image'));
    return { ...page, id: page.id, title: page.title, imageId: page.imageId, transitionId: page.transitionId, variants, buttons, defaultBackground: backgroundTarget(page.defaultBackground || { kind: 'main' }), showActiveButton: page.showActiveButton ?? true, demoTemplate: ['welcome', 'atmospheres', 'closing'].includes(page.demoTemplate) ? page.demoTemplate : null };
  });
  if (config.version >= 4) validateActions({ ...config, pages }, ref);
  if (config.version >= 5) validateTextStyles(pages);
  if (config.version >= 6) validateTimeline({ ...config, pages }, ref);
  if(config.version >= 7) validateEffects({...config,pages});
  if(config.version>=8)validateButtonAppearance({...config,pages});
  if(config.version>=9)validateButtonText({...config,pages});
  if(config.version>=10)validateStateVisibility({...config,pages});
  if(config.version>=13)validateOrganization({...config,pages,media:descriptors});
  const normalized = normalizeDocument({ ...config, pages, media: [] });
  validateTimeline(normalized, ref);
  validateEffects(normalized);
  validateButtonAppearance(normalized);
  validateButtonText(normalized);
  validateStateVisibility(normalized);
  validateImageLibrary({...normalized,media:descriptors});
  normalized.pages.forEach(page => validatePageLayers(page, id => ref(id, 'image')));
  validateActions(normalized, ref);
  validateTextStyles(normalized.pages);
  const media = [];
  for (const item of descriptors) {
    const bytes = await zip.file(item.path).async('uint8array');
    if (!bytes.length) throw new Error('Un média du ZIP est vide.');
    const verified = await readMedia(new File([bytes], item.name, { type: item.type }), item.type.startsWith('image/') ? 'image' : 'video');
    const {path,...metadata}=item;
    media.push({...metadata,blob:verified.blob,duration:verified.duration});
  }
  return pruneDocument(await refreshDemoVideo({ ...normalized, media }));
}
