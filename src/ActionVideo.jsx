import { useEffect, useRef, useState } from 'react';
import { resolveBackground } from './document.js';

export default function ActionVideo({ playback, urls, finish, stop }) {
  const video = useRef(null);
  const [ready, setReady] = useState(false);
  const source = urls[playback.action.videoId];
  useEffect(() => {
    const element = video.current;
    const image = new Image();
    if (playback.action.end === 'image') {
      const final = urls[resolveBackground(playback.page, playback.action.finalBackground || playback.page.defaultBackground)];
      if (final) { image.src = final; image.decode().catch(() => {}); }
    }
    let frame;
    if (element.requestVideoFrameCallback) frame = element.requestVideoFrameCallback(() => setReady(true));
    element.play()?.catch(() => finish(playback.id, true));
    let lastTime = 0, since = Date.now();
    const timer = setInterval(() => {
      if (element.ended) return;
      if (element.currentTime !== lastTime) { lastTime = element.currentTime; since = Date.now(); }
      if (Date.now() - since > 8000) { element.pause(); finish(playback.id, true); }
    }, 500);
    return () => { clearInterval(timer); image.src = ''; element.pause(); if (frame !== undefined) element.cancelVideoFrameCallback(frame); };
  }, [playback.id, source]);
  // La page reste visible jusqu’à la première image ; la dernière frame est
  // conservée jusqu’à la préparation du média final ou de la page de destination.
  return <><video ref={video} className="action-video" style={{ visibility: ready ? 'visible' : 'hidden' }} src={source} muted playsInline preload="auto" onLoadedData={event => { if (!event.currentTarget.requestVideoFrameCallback) setReady(true); }} onEnded={() => finish(playback.id)} onError={() => finish(playback.id, true)} /><button className="action-video-stop ui-button" onClick={stop}>Arrêter la vidéo</button></>;
}
