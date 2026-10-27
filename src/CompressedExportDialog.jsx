import {useEffect,useRef,useState} from 'react';
import {buildCompressedPresentation,buildOriginalPresentation,saveOriginalPresentation,downloadSinglePresentation,SHARE_LIMIT} from './compressedAutonomousExport.js';
export default function CompressedExportDialog({document:project,close,onBusy}){
 const dialog=useRef(null),controller=useRef(null),[working,setWorking]=useState(false),[progress,setProgress]=useState(''),[error,setError]=useState(''),[result,setResult]=useState(null),[compress,setCompress]=useState(false);
 useEffect(()=>{dialog.current.showModal();return()=>controller.current?.abort();},[]);
 async function create(){
  const run=new AbortController();controller.current=run;setWorking(true);onBusy(true);setError('');setResult(null);
  try{
   const options={signal:run.signal,progress:setProgress};
   const output=compress?await buildCompressedPresentation(project,{...options,maxBytes:SHARE_LIMIT}):window.showSaveFilePicker?await saveOriginalPresentation(project,options):await buildOriginalPresentation(project,options);
   if(!run.signal.aborted)setResult(output);
  }
  catch(error){setError(error.name==='AbortError'?'Export annulé. Votre projet est inchangé.':error.message);}
  finally{controller.current=null;setWorking(false);onBusy(false);}
 }
 function cancel(){if(working){setProgress('Annulation en cours…');controller.current?.abort();}else close();}
 return <dialog ref={dialog} className="confirmation" aria-labelledby="compressed-export-title" onCancel={e=>{e.preventDefault();cancel();}}>
  <h2 id="compressed-export-title">Un seul fichier interactif</h2>
  <p>Par défaut, les images et vidéos gardent leur qualité originale, sans limite de taille imposée par l’application et sans compression vidéo. Les boutons, états et transitions sont conservés. Votre projet reste inchangé.</p>
  <label><input type="checkbox" checked={compress} disabled={working||!!result} onChange={e=>setCompress(e.target.checked)}/> Réduire à 250 Mo maximum (compression vidéo facultative)</label>
  {compress&&<p>Les vidéos seront compressées jusqu’à 1080p ou 720p selon le budget. Si la taille ne peut pas être atteinte avec une qualité correcte, désactivez cette option pour exporter sans limite.</p>}
  <p>Vous obtiendrez un seul fichier HTML, sans dossier voisin ni ZIP. Déposez-le dans Google Drive et partagez son lien. Le destinataire doit le télécharger, puis l’ouvrir dans Chrome ou Edge récent et cliquer sur « Ouvrir la présentation ». L’aperçu Google Drive ne lance pas la présentation.</p>
  <p>Gardez cet onglet ouvert pendant la création. Chrome et Edge permettent de choisir le fichier de destination et d’écrire progressivement sur le disque. Un projet de 500 Mo peut produire un HTML d’environ 670 Mo ; l’espace disque et la mémoire du navigateur restent nécessaires. YouTube nécessite Internet. La copie est indépendante, transférable et non révocable.</p>
  {working&&<p role="status" aria-live="polite">{progress}</p>}{error&&<p role="alert">{error}</p>}
  {result&&<p role="status">{result.saved?'Fichier enregistré':'Fichier prêt'} : {(result.size/1_000_000).toFixed(1)} Mo. Aucun dossier à décompresser. Cette copie ne remplace pas votre sauvegarde ZIP éditable.</p>}
  <div className="button-row"><button className="ui-button" onClick={cancel}>{working?'Annuler l’export':'Fermer'}</button>{result?(!result.saved&&<button className="ui-button primary" onClick={()=>downloadSinglePresentation(result)}>Télécharger le fichier HTML</button>):<button className="ui-button primary" disabled={working} onClick={create}>Créer le fichier</button>}</div>
 </dialog>;
}
