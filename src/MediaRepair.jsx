import {useRef,useState} from 'react';
import {readMedia} from './document.js';

// Répare également un média conservé mais non utilisé, sans supprimer les
// fichiers ni changer les associations des pages, boutons ou transitions.
export default function MediaRepair({document,update}) {
 const input=useRef(null),target=useRef(null);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 function choose(media){target.current=media;input.current.accept=media.type.startsWith('image/')?'.png,.jpg,.jpeg,.webp':'.mp4,.webm';input.current.click();}
 async function selected(event){const file=event.target.files?.[0],original=target.current;event.target.value='';if(!file||!original)return;setBusy(true);setMessage('');try{
  if(file.name!==original.name || file.size!==original.blob.size)throw new Error(`Choisissez le fichier original « ${original.name} » (${original.blob.size} octets). Le média existant est conservé.`);
  const copied=await readMedia(file,original.type.startsWith('image/')?'image':'video');
  if(copied.type!==original.type)throw new Error('Le format ne correspond pas au média original. Le média existant est conservé.');
  update(previous=>({...previous,media:previous.media.map(m=>m.id===original.id?{...m,blob:copied.blob,...(copied.duration!==undefined?{duration:copied.duration}:{})}:m)}));
  setMessage(`« ${original.name} » a été recopié. Ses associations sont conservées. Si un autre média bloque la sauvegarde, rattachez également son fichier.`);
 }catch(error){setMessage(error.message);}finally{setBusy(false);}}
 return <details className="settings-panel media-repair"><summary>Réparer les médias provenant d’une clé USB</summary><p className="help">Reconnectez la clé ou copiez ses fichiers sur votre ordinateur. Rattachez les fichiers originaux ci-dessous, y compris les médias conservés qui ne sont plus affichés sur une page. Les pages et les réglages sont conservés.</p>{document.media.map(media=><div className="button-row" key={media.id}><span>{media.name}</span><button type="button" className="ui-button" disabled={busy} onClick={()=>choose(media)} aria-label={`Rattacher ${media.name}`}>Rattacher le fichier original</button></div>)}{message&&<p role="status">{message}</p>}<input ref={input} hidden type="file" data-testid="repair-media-input" onChange={selected}/></details>;
}
