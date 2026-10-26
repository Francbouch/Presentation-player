import {useEffect,useState} from 'react';
const time = n => Number.isFinite(n) ? `${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}` : '0:00';
// Native chrome follows the video's crop transform. Only masked/transformed media
// need this compact HTML control bar, anchored to the frame rather than the media.
export default function FrameVideoControls({video, surface, name}) {
  const [state,setState]=useState({paused:true,current:0,duration:0,volume:1,muted:true});
  useEffect(()=>{
    const v=video.current;if(!v)return;
    const sync=()=>setState({paused:v.paused,current:v.currentTime,duration:Number.isFinite(v.duration)?v.duration:0,volume:v.volume,muted:v.muted});
    const events=['play','pause','ended','timeupdate','durationchange','loadedmetadata','volumechange','seeked'];
    events.forEach(e=>v.addEventListener(e,sync));sync();
    return()=>events.forEach(e=>v.removeEventListener(e,sync));
  },[video]);
  const seek=e=>{const value=Number(e.currentTarget.value);video.current.currentTime=value;setState(s=>({...s,current:value}));};
  const volume=e=>{const value=Number(e.currentTarget.value);video.current.volume=value;setState(s=>({...s,volume:value}));};
  const play=()=>{const v=video.current;if(v.paused)v.play().catch(()=>{});else v.pause();};
  return <div className="frame-video-controlbar" role="group" aria-label={`Commandes vidéo ${name || ''}`} onPointerDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()} onDoubleClick={e=>e.stopPropagation()} onKeyDown={e=>{
    e.stopPropagation();if(e.code==='Space'&&!e.target.matches('button')){e.preventDefault();play();}
  }}>
    <input aria-label="Position dans la vidéo" className="frame-video-progress" type="range" min="0" max={state.duration||0} step="0.01" value={Math.min(state.current,state.duration)} disabled={!state.duration} onInput={seek} onChange={seek} />
    <div className="frame-video-buttons">
      <button type="button" aria-label={state.paused?'Lire la vidéo':'Mettre la vidéo en pause'} onClick={play}>{state.paused?'▶':'Ⅱ'}</button>
      <span className="frame-video-time">{time(state.current)} / {time(state.duration)}</span>
      <button type="button" aria-label={state.muted?'Activer le son':'Couper le son'} onClick={()=>{video.current.muted=!video.current.muted;}}>{state.muted?'♩':'♪'}</button>
      <input aria-label="Volume de la vidéo" type="range" min="0" max="1" step="0.01" value={state.volume} onInput={volume} onChange={volume} />
      {typeof document.documentElement.requestFullscreen==='function'&&<button type="button" aria-label="Plein écran vidéo" onClick={()=>{if(document.fullscreenElement===surface.current)document.exitFullscreen().catch(()=>{});else surface.current?.requestFullscreen?.().catch(()=>{});}}>⛶</button>}
    </div>
  </div>;
}
