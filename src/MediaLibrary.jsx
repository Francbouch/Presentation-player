import {createContext,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {existingImage,imageUsages} from './imageLibrary.js';
import {readMedia,uid} from './document.js';
import {storageEstimate} from './storage.js';

const Picker=createContext(null);
export function ChooseImage({onChoose,disabled=false,label='Choisir dans la bibliothèque'}) {
  const open=useContext(Picker);
  return open?<button className="ui-button" disabled={disabled} onClick={()=>open(onChoose)}>{label}</button>:null;
}
function Modal({title,close,children,working=false}) {
  const dialog=useRef(null),restore=useRef(window.document.activeElement);
  useEffect(()=>{dialog.current.showModal();return()=>restore.current?.isConnected&&restore.current.focus();},[]);
  return <dialog ref={dialog} className="library-dialog" aria-label={title} onCancel={e=>{e.preventDefault();if(!working)close();}}><div className="panel-heading"><h2>{title}</h2><button className="ui-button" aria-label="Fermer la fenêtre" disabled={working} onClick={close}>×</button></div>{children}</dialog>;
}
export function ImagePickerProvider({document,urls,children}) {
  const [choose,setChoose]=useState(null);
  return <Picker.Provider value={callback=>setChoose(()=>callback)}>{children}{choose&&<Modal title="Choisir une image" close={()=>setChoose(null)}><LibraryBrowser document={document} urls={urls} onChoose={id=>{const callback=choose;setChoose(null);callback(id);}}/></Modal>}</Picker.Provider>;
}
// Deux décodages simultanés au maximum. Les miniatures sont temporaires, jamais écrites dans IndexedDB.
let running=0;
const jobs=[];
function pump(){while(running<2&&jobs.length){running++;const job=jobs.shift();job().finally(()=>{running--;pump();});}}
function thumbnailJob(job){jobs.push(job);pump();}
function Thumbnail({media}) {
  const element=useRef(null),[url,setUrl]=useState(null);
  useEffect(()=>{
    let disposed=false,objectUrl=null,visible=false,request=0;
    const observer=new IntersectionObserver(([entry])=>{
      if(entry.isIntersecting){if(visible)return;visible=true;const token=++request;thumbnailJob(async()=>{
        if(disposed||!visible||token!==request)return;
        let bitmap;
        try{
          bitmap=await createImageBitmap(media.blob);
          if(disposed||!visible||token!==request)return;
          const canvas=window.document.createElement('canvas'),scale=Math.min(1,192/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
          const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.8));
          if(!blob||disposed||!visible||token!==request)return;objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);
        }catch{/* Une ressource ancienne illisible reste listée et remplaçable. */}finally{bitmap?.close();}
      });}else{visible=false;++request;if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}setUrl(null);}
    },{rootMargin:'100px'});
    observer.observe(element.current);
    return()=>{disposed=true;++request;observer.disconnect();if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[media.blob]);
  return <span className="library-thumb" ref={element}>{url?<img src={url} alt=""/>:<span aria-hidden="true">▧</span>}</span>;
}
export function LibraryBrowser({document,urls,onChoose,onSelect,selectedId,management}) {
  const [query,setQuery]=useState(''),[folder,setFolder]=useState('*'),[sort,setSort]=useState('name'),[view,setView]=useState('grid'),[size,setSize]=useState(88),[selection,setSelection]=useState(null),[preview,setPreview]=useState(false);
  const selected=document.media.find(m=>m.id===(selectedId??selection)&&m.type.startsWith('image/'));
  const folders=document.mediaFolders||[];
  const images=useMemo(()=>document.media.filter(m=>m.type.startsWith('image/')&&m.name.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))&&(folder==='*'||(m.folderId||'')===folder)).sort((a,b)=>sort==='date'?(b.importedAt||0)-(a.importedAt||0):sort==='size'?b.blob.size-a.blob.size:a.name.localeCompare(b.name,'fr',{numeric:true})),[document.media,query,folder,sort]);
  useEffect(()=>{if(folder&&folder!=='*'&&!folders.some(f=>f.id===folder))setFolder('*');},[folders,folder]);
  return <section className="media-library" aria-label="Bibliothèque d’images" onDragOver={management?e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';}:undefined} onDrop={management?e=>{e.preventDefault();e.stopPropagation();management.importFiles([...e.dataTransfer.files],folder==='*'?null:folder||null);}:undefined}>
    <div className="library-filters"><label className="field">Rechercher<input aria-label="Rechercher une image" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nom d’image…"/></label>
      <label className="field">Dossier<select aria-label="Dossier de la bibliothèque" value={folder} onChange={e=>setFolder(e.target.value)}><option value="*">Toutes les images</option><option value="">Non classées</option>{folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
      <label className="field">Trier<select aria-label="Trier les images" value={sort} onChange={e=>setSort(e.target.value)}><option value="name">Nom</option><option value="date">Date d’importation</option><option value="size">Taille</option></select></label>
      <div className="button-row"><button className="ui-button" aria-pressed={view==='grid'} onClick={()=>setView('grid')}>Grille</button><button className="ui-button" aria-pressed={view==='list'} onClick={()=>setView('list')}>Liste</button></div>
      <label className="field">Miniatures<input aria-label="Taille des miniatures de la bibliothèque" type="range" min="56" max="160" value={size} onChange={e=>setSize(+e.target.value)}/></label>
    </div>
    {management&&management.controls(folder)}
    <p className="help">{images.length} image(s){management?' · Déposez vos fichiers ici.':''}</p>
    <div className={`library-items resource-list library-${view}`} style={{'--thumb-size':`${size}px`}}>{images.map(media=><button className="library-item" key={media.id} aria-label={`Image ${media.name}`} aria-pressed={selected?.id===media.id} draggable={false} onClick={()=>{setSelection(media.id);onSelect?.(media.id);}} onDoubleClick={()=>{setSelection(media.id);onSelect?.(media.id);setPreview(true);}}><Thumbnail media={media}/><span>{media.name}<small>{(media.blob.size/1024/1024).toFixed(2)} Mo</small></span></button>)}</div>
    {selected&&<div className="library-selection"><strong>{selected.name}</strong><div className="button-row"><button className="ui-button" onClick={()=>setPreview(true)}>Aperçu agrandi</button>{onChoose&&<button className="ui-button primary" onClick={()=>onChoose(selected.id)}>Utiliser cette image</button>}</div>{management?.properties(selected)}</div>}
    {preview&&selected&&<Modal title={`Aperçu — ${selected.name}`} close={()=>setPreview(false)}><img className="library-large-preview" src={urls[selected.id]} alt={selected.name}/></Modal>}
    {!images.length&&<p className="help">Aucune image trouvée.</p>}
  </section>;
}
async function dimensions(blob){let bitmap;try{bitmap=await createImageBitmap(blob);return {width:bitmap.width,height:bitmap.height};}finally{bitmap?.close();}}
function ReplacementDialog({old,incoming,uses,urls,onCancel,onConfirm}) {
  const [working,setWorking]=useState(false),[error,setError]=useState(''),[src,setSrc]=useState(null);
  useEffect(()=>{const url=URL.createObjectURL(incoming.blob);setSrc(url);return()=>URL.revokeObjectURL(url);},[incoming.blob]);
  const changed=old.width&&old.height&&Math.abs(old.width/old.height-incoming.width/incoming.height)>.005;
  return <Modal title="Remplacer partout ?" close={onCancel} working={working}><p>Remplacer « {old.name} » par « {incoming.name} » dans {uses.length} utilisation(s).</p><img className="library-replacement-preview" src={src||undefined} alt="Nouvelle image"/>{changed&&<p role="alert">Les proportions sont différentes. Les cadres et les cadrages individuels seront conservés ; vérifiez le résultat.</p>}{!old.width&&<p className="help">Les proportions de l’ancienne image ne peuvent pas être vérifiées.</p>}<ul className="library-usage-list">{uses.map((use,i)=><li key={i}>{use}</li>)}</ul><p className="help">Ctrl+Z restaurera aussi l’ancien fichier. Ce remplacement ne modifie pas les cadres ni les actions.</p>{error&&<p role="alert">{error}</p>}<div className="button-row"><button className="ui-button" disabled={working} onClick={onCancel}>Annuler</button><button className="ui-button primary" disabled={working} onClick={async()=>{setWorking(true);try{await onConfirm();}catch(e){setError(e.message);setWorking(false);}}}>{working?'Remplacement…':'Confirmer le remplacement partout'}</button></div></Modal>;
}
export default function MediaLibrary({document,urls,update,commitMedia,busy,setBusy,message}) {
  const input=useRef(null),replacementInput=useRef(null),targetFolder=useRef(null),replacementId=useRef(null),lock=useRef(false);
  const [selectedId,setSelectedId]=useState(null),[folderName,setFolderName]=useState(''),[name,setName]=useState(''),[pending,setPending]=useState(null),[showUses,setShowUses]=useState(false),[deletion,setDeletion]=useState(null);
  const selected=document.media.find(m=>m.id===selectedId);
  useEffect(()=>setName(selected?.name||''),[selectedId,selected?.name]);
  async function operation(fn,propagate=false){if(lock.current||busy)return;lock.current=true;setBusy(true);try{await fn();}catch(e){message(e.message);if(propagate)throw e;}finally{lock.current=false;setBusy(false);}}
  async function importFiles(files,folderId=null){await operation(async()=>{
    if(!files.length)return;
    const space=await storageEstimate();if(space?.quota&&files.reduce((sum,f)=>sum+f.size,0)>space.quota-space.usage)throw new Error('Espace insuffisant pour ces images. Votre projet est conservé.');
    const additions=[];let count=0;
    for(const file of files){let incoming;try{incoming=await readMedia(file,'image');}catch(e){throw new Error(`« ${file.name} » : ${e.message}`);}const found=await existingImage([...document.media,...additions],incoming);if(!found)additions.push({...incoming,folderId});else count++;}
    if(document.media.length+additions.length>2000)throw new Error('Limite de 2 000 médias atteinte.');
    if(additions.length)await commitMedia(before=>({...before,media:[...before.media,...additions]}));
    message(`${additions.length} image(s) importée(s). ${count} fichier(s) identique(s) déjà disponible(s).`);
  });}
  async function prepareReplacement(file){await operation(async()=>{
    if(!file)return;const old=document.media.find(m=>m.id===replacementId.current);if(!old)return;
    const space=await storageEstimate();if(space?.quota&&file.size>space.quota-space.usage)throw new Error('Espace insuffisant pour remplacer cette image.');
    const incoming=await readMedia(file,'image');let size={};try{size=await dimensions(old.blob);}catch{/* Le remplacement peut réparer une ancienne image devenue illisible. */}
    setPending({old:{...old,...size},incoming});
  });}
  const management={importFiles,controls:folder=><>
    <button className="ui-button" disabled={busy} onClick={()=>{targetFolder.current=folder==='*'?null:folder||null;input.current.click();}}>Importer des images</button>
    <details className="library-folders"><summary>Dossiers</summary><label className="field">Nom du dossier<input aria-label="Nom du dossier" value={folderName} maxLength={80} disabled={busy} onChange={e=>setFolderName(e.target.value)}/></label><div className="button-row"><button className="ui-button" disabled={busy||!folderName.trim()||(document.mediaFolders||[]).length>=500} onClick={()=>{update(before=>({...before,mediaFolders:[...(before.mediaFolders||[]),{id:uid(),name:folderName.trim()}]}));setFolderName('');}}>Créer un dossier</button>{folder&&folder!=='*'&&<><button className="ui-button" disabled={busy||!folderName.trim()} onClick={()=>{update(before=>({...before,mediaFolders:before.mediaFolders.map(f=>f.id===folder?{...f,name:folderName.trim()}:f)}));setFolderName('');}}>Renommer le dossier</button><button className="ui-button" disabled={busy} onClick={()=>setDeletion({kind:'folder',id:folder})}>Supprimer le dossier</button></>}</div></details>
  </>,properties:media=>{
    const uses=imageUsages(document,media.id);
    return <><label className="field">Nom de l’image<input aria-label="Nom de l’image" value={name} maxLength={1000} disabled={busy} onChange={e=>setName(e.target.value)}/></label><button className="ui-button" disabled={busy||!name.trim()} onClick={()=>update(before=>({...before,media:before.media.map(m=>m.id===media.id?{...m,name:name.trim()}:m)}))}>Renommer l’image</button>
      <label className="field">Classer dans<select aria-label="Classer l’image dans un dossier" disabled={busy} value={media.folderId||''} onChange={e=>update(before=>({...before,media:before.media.map(m=>m.id===media.id?{...m,folderId:e.target.value||null}:m)}))}><option value="">Non classées</option>{(document.mediaFolders||[]).map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
      <button className="ui-button" onClick={()=>setShowUses(!showUses)}>{uses.length} utilisation(s)</button>{showUses&&<ul className="library-usage-list">{uses.map((use,i)=><li key={i}>{use}</li>)}</ul>}
      <div className="button-row"><button className="ui-button" disabled={busy} onClick={()=>{replacementId.current=media.id;replacementInput.current.click();}}>Remplacer partout…</button><button className="ui-button danger" disabled={busy||!!uses.length} title={uses.length?'Cette image est utilisée. Consultez la liste des utilisations.':undefined} onClick={()=>setDeletion({kind:'image',id:media.id})}>Supprimer l’image inutilisée</button></div>{!!uses.length&&<p className="help">Suppression bloquée : cette image est utilisée dans la présentation.</p>}</>;
  }};
  return <><LibraryBrowser document={document} urls={urls} selectedId={selectedId} onSelect={setSelectedId} management={management}/>
    <details className="library-videos"><summary>Vidéos du projet</summary>{document.media.filter(m=>m.type.startsWith('video/')).map(m=><p key={m.id}>{m.name} · {(m.blob.size/1024/1024).toFixed(1)} Mo</p>)}</details>
    <input hidden ref={input} type="file" multiple accept=".png,.jpg,.jpeg,.webp" data-testid="library-import" onChange={e=>{const files=[...e.target.files];e.target.value='';importFiles(files,targetFolder.current);}}/>
    <input hidden ref={replacementInput} type="file" accept=".png,.jpg,.jpeg,.webp" data-testid="library-replace" onChange={e=>{const file=e.target.files[0];e.target.value='';prepareReplacement(file);}}/>
    {pending&&<ReplacementDialog {...pending} urls={urls} uses={imageUsages(document,pending.old.id)} onCancel={()=>setPending(null)} onConfirm={async()=>{
      await operation(async()=>{await commitMedia(before=>({...before,media:before.media.map(m=>m.id===pending.old.id?{...m,blob:pending.incoming.blob,type:pending.incoming.type,width:pending.incoming.width,height:pending.incoming.height}:m)}));setPending(null);message('Image remplacée partout. Ctrl+Z permet de restaurer l’ancienne image.');},true);
    }}/>}
    {deletion&&<Modal title={deletion.kind==='folder'?'Supprimer le dossier ?':'Supprimer l’image inutilisée ?'} close={()=>setDeletion(null)}><p>{deletion.kind==='folder'?'Les images seront déplacées dans Non classées. Aucun fichier ne sera supprimé.':'Cette image n’est utilisée par aucun élément de la présentation.'}</p><div className="button-row"><button className="ui-button" onClick={()=>setDeletion(null)}>Annuler</button><button className="ui-button danger" onClick={()=>{update(before=>deletion.kind==='folder'?{...before,mediaFolders:before.mediaFolders.filter(f=>f.id!==deletion.id),media:before.media.map(m=>m.folderId===deletion.id?{...m,folderId:null}:m)}:imageUsages(before,deletion.id).length?before:{...before,media:before.media.filter(m=>m.id!==deletion.id)});setDeletion(null);}}>Confirmer la suppression</button></div></Modal>}
  </>;
}
