import {autonomousSnapshot,base64,htmlEscape,jsonForScript} from './autonomousExport.js';
export const MEDIA_CHUNK_SIZE=4*1024*1024;
const instructions=`STUDIO. — Dossier autonome\n\nConservez et transmettez TOUT ce dossier, y compris le sous-dossier medias.\nOuvrez « Ouvrir la présentation.html » avec Chrome ou Edge récent. Aucun serveur ni compte requis.\nEspace : suivante ; flèche gauche : précédente ; F : plein écran.\nYouTube nécessite Internet et peut refuser la lecture locale : utilisez son lien externe.\nLes médias sont découpés pour limiter la mémoire et compressés sans perte lorsque cela réduit leur taille. Les vidéos conservent exactement leurs octets, leur qualité et leurs codecs originaux.\nCette copie indépendante est transférable et non révocable. Les notes et médias inutilisés sont exclus. Elle ne remplace pas une sauvegarde éditable ZIP.\nSi l’export échoue, le sous-dossier peut être incomplet : ne le transmettez pas. Le fichier HTML est créé uniquement après la réussite de toutes les écritures.\n`;
async function writeFile(directory,name,data){
 const file=await directory.getFileHandle(name,{create:true}),writer=await file.createWritable();
 try{await writer.write(data);await writer.close();}catch(error){try{await writer.abort();}catch{}throw error;}
}
export async function encodeMediaChunk(blob){
 if(typeof CompressionStream==='function'){
  const compressed=await new Response(blob.stream().pipeThrough(new CompressionStream('gzip'))).blob();
  if(compressed.size<blob.size*.97)return {codec:'gzip',base64:await base64(compressed)};
 }
 return {codec:'raw',base64:await base64(blob)};
}
// All large writes are bounded chunks. No giant HTML, archive, whole-file digest or base64 string.
export async function writeLargeAutonomousPresentation(document,destination,progress=()=>{}){
 const {snapshot,media}=autonomousSnapshot(document);
 if(!snapshot.pages.length)throw Error('Ajoutez une diapositive avant d’exporter.');
 progress('Préparation du lecteur autonome…');
 const response=await fetch(`${import.meta.env.BASE_URL}autonomous-player.json`,{cache:'no-store'});
 if(!response.ok)throw Error('Le lecteur autonome est indisponible. Rechargez puis réessayez.');
 const runtime=await response.json();
 if(runtime.format!==1||!runtime.js||!runtime.css||!runtime.fonts||!runtime.licenses)throw Error('Lecteur autonome incompatible. Rechargez l’application.');
 const folderName='Presentation-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID().slice(0,8);
 const folder=await destination.getDirectoryHandle(folderName,{create:true});
 const files=await folder.getDirectoryHandle('medias',{create:true});
 await writeFile(folder,'LIRE-MOI.txt',instructions);
 const assets=[];let done=0;const total=media.reduce((n,m)=>n+m.blob.size,0);
 for(let index=0;index<media.length;index++){
  const item=media[index],chunks=[];
  try{
   if(!item.blob?.size)throw Error('Fichier vide ou indisponible.');
   for(let offset=0;offset<item.blob.size;offset+=MEDIA_CHUNK_SIZE){
    const chunk=item.blob.slice(offset,offset+MEDIA_CHUNK_SIZE),encoded=await encodeMediaChunk(chunk);
    const name=`media-${index}-${chunks.length}.js`;
    await writeFile(files,name,`window.__studioMediaChunk=${jsonForScript(encoded)};`);
    chunks.push('medias/'+name);done+=chunk.size;
    progress(`Écriture des médias : ${Math.round(done/total*100)} % · ${index+1} / ${media.length} (qualité originale)…`);
   }
  }catch(error){throw Error(`Impossible d’exporter « ${item.name} » : ${error.message} Le dossier est incomplet. Le projet original est conservé.`);}
  assets.push({ids:[item.id],type:item.type,chunks});
 }
 await writeFile(folder,'lecteur.js',runtime.js);
 await writeFile(folder,'lecteur.css',runtime.css);
 const licenses=await folder.getDirectoryHandle('Licences',{create:true});
 for(const [name,text]of Object.entries(runtime.licenses)){
  const parts=name.split('/');let dir=licenses;for(const part of parts.slice(0,-1))dir=await dir.getDirectoryHandle(part,{create:true});
  await writeFile(dir,parts.at(-1),text);
 }
 const payload={format:1,document:snapshot,fonts:runtime.fonts,assets};
 // A classic external script works from file://; fetching local JSON does not.
 await writeFile(folder,'presentation.js',`window.__studioPresentation=${jsonForScript(payload)};`);
 await writeFile(folder,'Ouvrir la présentation.html',`<!doctype html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><title>${htmlEscape(snapshot.title)}</title><link rel="stylesheet" href="lecteur.css"></head><body><div id="root"><p>Chargement… Si cet écran persiste, conservez tout le dossier et ouvrez-le avec Chrome ou Edge récent.</p></div><script src="presentation.js"></script><script src="lecteur.js"></script></body></html>`);
 progress('Dossier autonome prêt.');return folderName;
}
export async function downloadLargeAutonomousPresentation(document,progress){
 if(!window.showDirectoryPicker)throw Error('Pour les gros projets, ouvrez l’application dans Chrome ou Edge sur ordinateur (HTTPS), puis réessayez.');
 let destination;
 try{destination=await window.showDirectoryPicker({mode:'readwrite',id:'studio-autonomous-export'});}catch(error){if(error.name==='AbortError')return null;throw error;}
 return writeLargeAutonomousPresentation(document,destination,progress);
}
