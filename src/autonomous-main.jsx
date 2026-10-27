// Separate entry point: no App, Editor, storage hook or project import/export UI.
import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import Player from './Player.jsx';
import {YouTubeSessions} from './YouTubeSurface.jsx';
import {preparePageFonts} from './fonts.js';
import './styles.css';
import './buttons.css';
import './layers.css';
import './text.css';
import './timeline.css';
import './visualEffects.css';
import './buttonAppearance.css';
import './autonomous.css';
const noop=()=>{};
function AutonomousPlayer(){
 const [state,setState]=useState({loading:true}),[started,setStarted]=useState(false);
 useEffect(()=>{
  let live=true;const urls={};
  (async()=>{
   const payload=JSON.parse(document.getElementById('studio-presentation-data').textContent);
   window.__studioFontAssets=payload.fonts;
   if(payload.format!==1||!payload.document?.pages?.length)throw Error('Cette présentation autonome est invalide.');
   for(const asset of payload.assets){const raw=atob(asset.base64),parts=[];for(let i=0;i<raw.length;i+=65536)parts.push(Uint8Array.from(raw.slice(i,i+65536),c=>c.charCodeAt(0)));const url=URL.createObjectURL(new Blob(parts,{type:asset.type}));for(const id of asset.ids)urls[id]=url;}
   await Promise.all(payload.document.pages.map(preparePageFonts));
   if(live)setState({document:payload.document,urls,loading:false});else Object.values(urls).forEach(URL.revokeObjectURL);
  })().catch(error=>{Object.values(urls).forEach(URL.revokeObjectURL);if(live)setState({error:error.message});});
  return()=>{live=false;Object.values(urls).forEach(URL.revokeObjectURL);};
 },[]);
 if(state.loading)return <main className="autonomous-welcome" role="status">Préparation de la présentation…</main>;
 if(state.error)return <main className="autonomous-welcome" role="alert">{state.error} Demandez une nouvelle copie à l’expéditeur.</main>;
 if(!started)return <main className="autonomous-welcome"><h1>{state.document.title||'Présentation interactive'}</h1><p>Copie indépendante · Lecture seule · {state.document.pages.length} diapositives</p><button className="ui-button primary" onClick={()=>setStarted(true)}>Ouvrir la présentation</button><p>Espace : suivante · ← : précédente · F : plein écran</p><p>Les vidéos YouTube et les liens externes nécessitent Internet.</p></main>;
 return <main className="autonomous-app app"><YouTubeSessions><Player document={state.document} pages={state.document.pages} urls={state.urls} readOnly onBusyChange={noop}/></YouTubeSessions></main>;
}
createRoot(document.getElementById('root')).render(<AutonomousPlayer/>);
