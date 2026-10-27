import {cardContentLayers} from "./timelineCardContent.js";
import {FRAME_PAN_LIMIT} from './mediaFrames.js';
// Les liens utilisent les identifiants de médias, jamais leurs noms ni leurs URL temporaires.
export function imageUsages(document, id) {
  const uses = [];
  for (const page of document.pages) {
    const add = label => uses.push(`${page.title || 'Page sans nom'} → ${label}`);
    const background = (target, label) => {
      if (target?.kind === 'media' && target.mediaId === id) add(label);
      else if (target?.kind === 'variant' && page.variants.some(v => v.id === target.variantId && v.mediaId === id)) add(label);
      else if (target?.kind === 'main' && page.imageId === id) add(label);
      else if (target?.kind === 'initial') {const initial=page.states.find(s => s.id === page.initialStateId)?.background || page.defaultBackground;if(initial?.kind!=='initial')background(initial,label);}
    };
    if (page.imageId === id) add('Image principale');
    page.variants.forEach(v => { if (v.mediaId === id) add(`Variante « ${v.name} »`); });
    background(page.defaultBackground, 'Arrière-plan par défaut');
    page.layers.forEach(l => { for(const step of l.timeline?.steps||[])if(step.imageId===id||step.videoId===id)add(`Ligne du temps « ${l.name} » → ${step.name}`); if (l.imageId === id || l.frameMedia?.mediaId === id) add(`Calque « ${l.name} »`); });
    page.buttons.forEach(b => {
      if (b.imageId === id) add(`Image du bouton « ${b.name} »`);
      // target est le miroir historique de l’action background : ne pas compter deux fois ce lien.
      background(b.action?.type === 'background' ? b.action.target : b.target, `Arrière-plan du bouton « ${b.name} »`);
      background(b.action?.extra?.target, `Arrière-plan supplémentaire du bouton « ${b.name} »`);
      background(b.action?.finalBackground, `Image finale du bouton « ${b.name} »`);
    });
    page.states.forEach(s => background(s.background, `État « ${s.name} »`));
  }
  for(const c of document.components||[])for(const l of c.layers){const source=document.pages.find(p=>p.id===c.sourcePageId);for(const step of l.timeline?.steps||[])if(step.imageId===id||step.videoId===id)uses.push(`Composant « ${c.name} » → ${l.name} → ${step.name}`);const targets=[l.action?.extra?.target,l.action?.target,l.action?.finalBackground,l.target];if(l.imageId===id||l.frameMedia?.mediaId===id||targets.some(t=>t?.kind==='media'&&t.mediaId===id||t?.kind==='main'&&source?.imageId===id||t?.kind==='variant'&&source?.variants.some(v=>v.id===t.variantId&&v.mediaId===id)))uses.push(`Composant « ${c.name} » → ${l.name}`);}
  for(const child of cardContentLayers(document))if(child.imageId===id||child.frameMedia?.mediaId===id)uses.push(`Fiche Timeline → ${child.name}`);
  return uses;
}
export const defaultCrop = () => ({ mode: 'contain', zoom: 1, x: 0, y: 0 });
export function validateImageLibrary(document) {
  const fail = () => { throw new Error('La bibliothèque ou le cadrage des images est invalide. Votre projet est conservé.'); };
  if (document.mediaFolders !== undefined && (!Array.isArray(document.mediaFolders) || document.mediaFolders.length > 500)) fail();
  const folders = new Set();
  for (const f of document.mediaFolders || []) {
    if (!f || typeof f.id !== 'string' || !f.id || folders.has(f.id) || typeof f.name !== 'string' || !f.name.trim() || f.name.length > 80) fail();
    folders.add(f.id);
  }
  for (const m of document.media) {
    if (m.folderId != null && !folders.has(m.folderId)) fail();
    if (m.importedAt !== undefined && (!Number.isFinite(m.importedAt) || m.importedAt < 0)) fail();
    for (const key of ['width', 'height']) if (m[key] !== undefined && (!Number.isFinite(m[key]) || m[key] <= 0)) fail();
  }
  for (const p of document.pages) for (const b of p.buttons) {
    const c = b.imageCrop;
    if(c?.rotation!==undefined&&(!Number.isFinite(c.rotation)||Math.abs(c.rotation)>360))fail();
    if (c !== undefined && (!c || !['contain','cover'].includes(c.mode) || !Number.isFinite(c.zoom) || c.zoom < .1 || c.zoom > 5 || !Number.isFinite(c.x) || Math.abs(c.x) > FRAME_PAN_LIMIT || !Number.isFinite(c.y) || Math.abs(c.y) > FRAME_PAN_LIMIT)) fail();
  }
}
const hashes = new WeakMap();
export async function imageHash(blob) {
  if (!hashes.has(blob)) hashes.set(blob, blob.arrayBuffer().then(bytes => crypto.subtle.digest('SHA-256', bytes)).then(bytes => [...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2,'0')).join('')));
  return hashes.get(blob);
}
export async function existingImage(media, incoming) {
  const candidates = media.filter(m => m.type === incoming.type && m.blob.size === incoming.blob.size);
  if (!candidates.length) return null;
  const hash = await imageHash(incoming.blob);
  for (const candidate of candidates) {try{if (await imageHash(candidate.blob) === hash) return candidate;}catch{/* Conserver une ancienne ressource illisible sans bloquer un nouvel import valide. */}}
  return null;
}
