import {createPortal} from 'react-dom';
import {useEffect,useRef,useState} from 'react';
import Player from './Player.jsx';
import {NotesText} from './NotesPanel.jsx';

export function openAudienceWindow(){
 const popup=window.open('','studio-audience','popup,width=1280,height=800');
 if(!popup)return null;
 popup.document.title='studio · Présentation publique';
 popup.document.body.replaceChildren();
 for(const source of document.querySelectorAll('link[rel="stylesheet"],style')){const copy=source.cloneNode(true);if(source.href)copy.href=source.href;popup.document.head.append(copy);}
 for(const face of document.fonts)try{popup.document.fonts.add(face);}catch{}
 const style=popup.document.createElement('style');style.textContent='body{margin:0;background:#10121b}.presentation-mode .intro,.presentation-mode .below{display:none}.presentation-mode{padding:0}.player{max-width:none;margin:0}.stage{width:100%;max-height:100vh}.toolbar{margin:0}';popup.document.head.append(style);
 return popup;
}
export default function Presenter({presentation,pages,urls,startIndex,onExit,onBusyChange,audience}){
 const [index,setIndex]=useState(startIndex),[seconds,setSeconds]=useState(0),[running,setRunning]=useState(true),[preview,setPreview]=useState(null),[closed,setClosed]=useState(false);
 const controller=useRef(null),[busy,setBusy]=useState(false);
 const page=pages[index];
 useEffect(()=>{if(!running)return;const start=Date.now()-seconds*1000;const timer=setInterval(()=>setSeconds(Math.floor((Date.now()-start)/1000)),250);return()=>clearInterval(timer);},[running]);
 useEffect(()=>{if(!audience)return;const timer=setInterval(()=>{if(audience.closed){setClosed(true);onBusyChange(false);}},500);return()=>{clearInterval(timer);if(!audience.closed)audience.close();};},[audience]);
 function busyChange(value){setBusy(value);onBusyChange(value);}
 const player=<Player document={presentation} pages={pages} urls={urls} startIndex={startIndex} onExit={onExit} onBusyChange={busyChange} controls={controller} onPageChange={setIndex} presenterTarget={audience?preview:null} eventWindow={audience||window}/>;
 return <section className="presenter-view" aria-label="Vue Présentateur">
  <div className="presenter-controls"><strong>Vue Présentateur · privée</strong><output aria-label="Chronomètre">{Math.floor(seconds/60).toString().padStart(2,'0')}:{(seconds%60).toString().padStart(2,'0')}</output><button className="ui-button" onClick={()=>setRunning(v=>!v)}>{running?'Pause du chronomètre':'Reprendre le chronomètre'}</button><button className="ui-button" onClick={()=>{setSeconds(0);setRunning(false);}}>Remettre à zéro</button><button className="ui-button" disabled={busy} onClick={onExit}>Revenir à l’éditeur</button></div>
  {!audience&&<p role="status">La fenêtre publique a été bloquée. Autorisez les fenêtres contextuelles puis relancez la vue Présentateur. Ici, seul le plein écran du lecteur masque les notes : ne partagez pas toute cette fenêtre.</p>}
  {closed?<p role="alert">La fenêtre publique a été fermée. Revenez à l’éditeur pour relancer la présentation.</p>:audience?createPortal(player,audience.document.body):player}
  {audience&&<div className="stage" ref={setPreview} aria-label="Aperçu privé de la diapositive actuelle"/>}
  <nav className="presenter-controls" aria-label="Commandes privées"><button className="ui-button" disabled={closed||busy||index===0} onClick={()=>controller.current?.navigate(-1)}>Page précédente</button><span>Page {index+1} / {pages.length} — {page?.title}</span><button className="ui-button" disabled={closed||busy||index===pages.length-1} onClick={()=>controller.current?.navigate(1)}>Page suivante</button><button className="ui-button" disabled={closed||busy} onClick={()=>controller.current?.fullscreen()}>Plein écran public</button></nav>
  <aside className="presenter-private" aria-label="Notes privées"><h2>Notes · {page?.title}</h2>{page?.notes?<NotesText text={page.notes}/>:<p>Aucune note pour cette diapositive.</p>}</aside>
  {audience&&<p>Déplacez la fenêtre publique vers votre deuxième écran, puis activez son plein écran depuis cette fenêtre. Partagez uniquement la fenêtre publique.</p>}
 </section>;
}
