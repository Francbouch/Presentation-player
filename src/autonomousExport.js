import JSZip from 'jszip';
import {migrateDocument,readMedia} from './document.js';
const MAX_MEDIA=256*1024*1024;
export const htmlEscape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const jsonForScript=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
export function autonomousSnapshot(document){
 const valid=migrateDocument(document);
 const pages=valid.pages.map(page=>{const {notes,...rest}=page;return rest;});
 const snapshot=JSON.parse(JSON.stringify({version:valid.version,title:valid.title||'Présentation interactive',pages,transitions:valid.transitions||[]}));
 const required=new Set();
 function visit(value){if(typeof value==='string')required.add(value);else if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')Object.values(value).forEach(visit);}
 visit(snapshot.pages);visit(snapshot.transitions);
 return {snapshot,media:valid.media.filter(item=>required.has(item.id))};
}
export function base64(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(Error('Un média ne peut pas être lu. Réimportez-le depuis votre ordinateur.'));reader.readAsDataURL(blob);});}
export async function buildAutonomousPresentation(document,progress=()=>{}){
 // Capture JSON and Blob references before the first await. Later edits do not alter this copy.
 const {snapshot,media}=autonomousSnapshot(document);
 if(!snapshot.pages.length)throw Error('Ajoutez une diapositive avant de télécharger une présentation.');
 if(media.reduce((sum,m)=>sum+m.blob.size,0)>MAX_MEDIA)throw Error('La copie autonome est limitée à 256 Mo de médias utilisés pour éviter de saturer la mémoire. Utilisez Fichier → Exporter un dossier autonome (gros projets). Le projet original est conservé.');
 progress('Préparation du lecteur autonome…');
 const response=await fetch(`${import.meta.env.BASE_URL}autonomous-player.json`,{cache:'no-store'});
 if(!response.ok)throw Error('Le lecteur autonome est indisponible. Rechargez l’application puis réessayez.');
 const runtime=await response.json();
 if(runtime.format!==1||typeof runtime.js!=='string'||typeof runtime.css!=='string'||!runtime.fonts||!runtime.licenses)throw Error('Le lecteur autonome est incompatible. Rechargez l’application.');
 const assets=[],hashes=new Map();
 for(let i=0;i<media.length;i++){
  const item=media[i];progress(`Vérification et intégration des médias : ${i+1} / ${media.length}…`);
  let blob;
  try{const readable=await readMedia(new File([item.blob],item.name,{type:item.type}),item.type.startsWith('video/')?'video':'image');blob=readable.blob;}catch(error){throw Error(`Impossible d’intégrer « ${item.name} » : ${error.message} Aucun fichier autonome n’a été généré.`);}
  const hash=item.type+':'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
  const existing=hashes.get(hash);if(existing){existing.ids.push(item.id);continue;}
  const asset={ids:[item.id],type:item.type,base64:await base64(blob)};hashes.set(hash,asset);assets.push(asset);
 }
 progress('Création du fichier à transmettre…');
 const payload={format:1,document:snapshot,assets,fonts:runtime.fonts};
 const js=runtime.js.replace(/<\/script/gi,'<\\/script'),css=runtime.css.replace(/<\/style/gi,'<\\/style');
 const html=`<!doctype html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><title>${htmlEscape(snapshot.title)}</title><style>${css}</style></head><body><div id="root"><p>Chargement de la présentation…</p></div><script id="studio-presentation-data" type="application/json">${jsonForScript(payload)}</script><script>${js}</script></body></html>`;
 const zip=new JSZip();zip.file('Ouvrir la présentation.html',html);zip.file('LIRE-MOI.txt',`STUDIO. — Présentation autonome en lecture seule\n\n1. Décompressez entièrement ce ZIP.\n2. Ouvrez « Ouvrir la présentation.html » avec une version récente de Chrome ou Edge.\n3. Cliquez sur « Ouvrir la présentation ».\n\nEspace : suivante ; flèche gauche : précédente ; F : plein écran.\nLes images, vidéos locales et polices sont intégrées au HTML. Aucun serveur ni compte n’est requis.\nYouTube et les liens externes nécessitent Internet. YouTube peut refuser la lecture intégrée depuis un fichier local : utilisez le lien Ouvrir sur YouTube.\nLa lecture automatique peut nécessiter un clic. Les codecs doivent être pris en charge par le navigateur.\n\nCette copie figée ne suit pas les changements de l’éditeur et ne peut pas être révoquée. Toute personne qui reçoit ces fichiers peut les copier et récupérer les médias inclus. Les notes du présentateur et médias inutilisés de la bibliothèque ne sont pas inclus.\nCe fichier ne remplace pas une sauvegarde ZIP éditable du projet.\n`);
 for(const [name,text] of Object.entries(runtime.licenses))zip.file('Licences/'+name,text);
 return zip.generateAsync({type:'blob',compression:'STORE'});
}
export async function downloadAutonomousPresentation(document,progress){
 const blob=await buildAutonomousPresentation(document,progress),url=URL.createObjectURL(blob),link=window.document.createElement('a');link.href=url;link.download='presentation-autonome.zip';link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
