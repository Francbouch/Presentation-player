import {createContext,useContext,useEffect,useRef,useState} from 'react';
import {loadYouTubeAPI,youtubeError} from './youtubeAPI.js';
import {youtubeEmbed,youtubePoster} from './youtubeModel.js';
const Sessions=createContext(null);
export function YouTubeSessions({children}){const sessions=useRef(new Map());return <Sessions.Provider value={sessions.current}>{children}</Sessions.Provider>;}
export default function YouTubeSurface({item,pageId,editing,interacting,onExit,onInteract,showInteract=true,visible=true,playbackEnabled=true,disabled=false}){
 const q=item.youtube,sessionStore=useContext(Sessions),root=useRef(null),host=useRef(null),controller=useRef(null),latest=useRef(null),[near,setNear]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[blocked,setBlocked]=useState(false),[attempt,setAttempt]=useState(0);
 const activated=useRef(false);
 if(visible&&(editing?interacting:playbackEnabled))activated.current=true;
 const live=visible&&!disabled&&(editing?interacting:playbackEnabled),eligible=visible&&(editing?interacting:(playbackEnabled||activated.current)),key=JSON.stringify([pageId,item.id,q.videoId,q.start,q.end]);
 latest.current={live,q};
 useEffect(()=>{const win=root.current.ownerDocument.defaultView;const observer=new win.IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))setNear(true);},{rootMargin:'150px'});observer.observe(root.current);return()=>observer.disconnect();},[]);
 useEffect(()=>{if(!live&&controller.current&&(editing||!visible||disabled||q.pauseOnExit))try{controller.current.pauseVideo();}catch{}},[live,editing,visible,disabled,q.pauseOnExit]);
 useEffect(()=>{
  if(!q.videoId||!eligible||!near)return;
  let stopped=false,player,readyTimer,endTimer;const doc=host.current.ownerDocument,win=doc.defaultView;setLoaded(false);setError('');setBlocked(false);
  const offline=()=>setError('Connexion Internet indisponible. La vidéo YouTube ne peut pas être lue hors ligne.');win.addEventListener('offline',offline);
  if(win.navigator.onLine===false)offline();
  else loadYouTubeAPI(win).then(YT=>{
   if(stopped)return;
   const iframe=doc.createElement('iframe');iframe.title=`Vidéo YouTube : ${item.name}`;iframe.dataset.youtubePlayer='true';iframe.dataset.youtubeId=q.videoId;iframe.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';iframe.loading='lazy';iframe.src=youtubeEmbed(q,globalThis.location.origin);host.current.append(iframe);
   readyTimer=win.setTimeout(()=>{if(!stopped)setError('Le lecteur YouTube ne répond pas. Réessayez ou ouvrez la vidéo sur YouTube.');},15000);
   player=new YT.Player(iframe,{host:'https://www.youtube-nocookie.com',events:{onReady:event=>{
    if(stopped)return;win.clearTimeout(readyTimer);controller.current=event.target;setLoaded(true);
    try{q.muted?event.target.mute():event.target.unMute();const remembered=!q.restartOnReturn?sessionStore?.get(key):null;event.target.cueVideoById({videoId:q.videoId,startSeconds:remembered??q.start,...(q.end!==null?{endSeconds:q.end}:{})});if(latest.current.live&&q.autoplay)event.target.playVideo();else event.target.pauseVideo();}catch{setError('Les commandes YouTube sont momentanément indisponibles.');}
   },onError:event=>{if(!stopped){win.clearTimeout(readyTimer);setError(youtubeError(event.data));}},onAutoplayBlocked:()=>{if(!stopped)setBlocked(true);},onStateChange:event=>{if(stopped)return;if(event.data===0&&q.loop&&latest.current.live){try{event.target.seekTo(q.start,true);event.target.playVideo();}catch{}}if(event.data===1){setBlocked(false);if(!latest.current.live&&(editing||!visible||latest.current.q.pauseOnExit))try{event.target.pauseVideo();}catch{}}}}});
   if(q.end!==null)endTimer=win.setInterval(()=>{if(stopped||!controller.current)return;try{if(player.getPlayerState()===1&&player.getCurrentTime()>=q.end){if(q.loop&&latest.current.live){player.seekTo(q.start,true);player.playVideo();}else player.pauseVideo();}}catch{}},250);
  }).catch(e=>{if(!stopped)setError(e.message);});
  return()=>{stopped=true;win.clearTimeout(readyTimer);win.clearInterval(endTimer);win.removeEventListener('offline',offline);if(player){try{const time=player.getCurrentTime();if(Number.isFinite(time))sessionStore?.set(key,time);player.pauseVideo();}catch{}try{player.destroy();}catch{}}controller.current=null;host.current?.replaceChildren();};
 // Inactive destination pages are posters. An already active source is released
 // when it leaves: no iframe/player survives a page unmount.
 },[key,near,eligible,attempt,q.controls,q.autoplay,q.muted,q.loop,q.pauseOnExit,q.restartOnReturn]);
 const clickable=live&&(!editing||interacting),poster=q.videoId?youtubePoster(q.videoId):null;
 return <div ref={root} className={`youtube-surface ${clickable?'youtube-interacting':''}`} data-youtube-interacting={clickable?'true':'false'} data-youtube-surface="true" onPointerDown={e=>{if(clickable)e.stopPropagation();}} onKeyDown={e=>{if(clickable){e.stopPropagation();if(editing&&e.key==='Escape'){e.preventDefault();onExit?.();}}}}>
  <div className="youtube-viewport"><div className="youtube-poster" aria-hidden="true">{poster&&<img data-youtube-thumbnail="true" src={poster} alt="" loading="lazy" onLoad={e=>{e.currentTarget.style.visibility='';}} onError={e=>{e.currentTarget.style.visibility='hidden';}}/>}<span>▶ {q.videoId?'YouTube':'Coller une URL YouTube'}</span></div><div className="youtube-player-host" ref={host} style={{visibility:loaded&&!error?'visible':'hidden',pointerEvents:clickable?'auto':'none'}}/>
  {eligible&&!loaded&&!error&&q.videoId&&<span className="youtube-loading" role="status">Préparation de YouTube…</span>}
  {error&&<div className="youtube-error" role="alert"><span>{error}</span><button type="button" onClick={()=>setAttempt(v=>v+1)}>Réessayer YouTube</button><a href={q.url} target="_blank" rel="noopener noreferrer">Ouvrir sur YouTube</a></div>}
  {blocked&&clickable&&!error&&<button type="button" className="youtube-manual-play" onClick={()=>{try{controller.current?.playVideo();}catch{} }}>Lecture automatique bloquée · Démarrer la vidéo</button>}
  </div>
  {editing&&interacting?<button type="button" className="youtube-edit-exit" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onExit?.();}}>Revenir à la manipulation du calque</button>:editing&&showInteract&&q.videoId&&<button type="button" className="youtube-edit-enter" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onInteract?.();}}>Interagir avec la vidéo</button>}
 </div>;
}
