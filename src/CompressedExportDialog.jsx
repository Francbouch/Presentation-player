import {useEffect,useRef,useState} from 'react';
import {buildCompressedPresentation,downloadSinglePresentation,SHARE_LIMIT} from './compressedAutonomousExport.js';
export default function CompressedExportDialog({document:project,close,onBusy}){
 const dialog=useRef(null),controller=useRef(null),[working,setWorking]=useState(false),[progress,setProgress]=useState(''),[error,setError]=useState(''),[result,setResult]=useState(null);
 useEffect(()=>{dialog.current.showModal();return()=>controller.current?.abort();},[]);
 async function create(){
  const run=new AbortController();controller.current=run;setWorking(true);onBusy(true);setError('');setResult(null);
  try{const blob=await buildCompressedPresentation(project,{maxBytes:SHARE_LIMIT,signal:run.signal,progress:setProgress});if(!run.signal.aborted)setResult(blob);}
  catch(error){setError(error.name==='AbortError'?'Export annulé. Votre projet est inchangé.':error.message);}
  finally{controller.current=null;setWorking(false);onBusy(false);}
 }
 function cancel(){if(working){setProgress('Annulation en cours…');controller.current?.abort();}else close();}
 return <dialog ref={dialog} className="confirmation" aria-labelledby="compressed-export-title" onCancel={e=>{e.preventDefault();cancel();}}>
  <h2 id="compressed-export-title">Un seul fichier interactif · 250 Mo maximum</h2>
  <p>Les vidéos seront compressées si nécessaire, jusqu’à 1080p (720p si le budget l’exige). Les images, boutons et interactions sont conservés. Vos originaux restent intacts ; tout le traitement se fait sur cet ordinateur.</p>
  <p>Vous obtiendrez un fichier HTML à ouvrir directement dans Chrome ou Edge récent. Partagez-le par un lien : 250 Mo dépasse généralement les limites du courriel, et certains services refusent les pièces jointes HTML. YouTube nécessite Internet. Cette copie indépendante est transférable et non révocable.</p>
  <p>La compression peut prendre plusieurs minutes. Gardez cet onglet ouvert. Si la taille ne peut pas être atteinte avec une qualité correcte, un message vous proposera le dossier autonome.</p>
  {working&&<p role="status" aria-live="polite">{progress}</p>}{error&&<p role="alert">{error}</p>}
  {result&&<p role="status">Fichier prêt : {(result.size/1_000_000).toFixed(1)} Mo. Aucun dossier à décompresser. Cette copie ne remplace pas votre sauvegarde ZIP éditable.</p>}
  <div className="button-row"><button className="ui-button" onClick={cancel}>{working?'Annuler la compression':'Fermer'}</button>{result?<button className="ui-button primary" onClick={()=>downloadSinglePresentation(result)}>Télécharger le fichier HTML</button>:<button className="ui-button primary" disabled={working} onClick={create}>Créer le fichier</button>}</div>
 </dialog>;
}
