const loads=new WeakMap();
// Each browsing window gets one official API script, shared by its players.
export function loadYouTubeAPI(win){
 if(win.YT?.Player)return Promise.resolve(win.YT);
 if(loads.has(win))return loads.get(win);
 const promise=new Promise((resolve,reject)=>{
  const doc=win.document,script=doc.createElement('script'),previous=win.onYouTubeIframeAPIReady;
  let settled=false,timer;
  const finish=error=>{if(settled)return;settled=true;win.clearTimeout(timer);script.onerror=null;if(win.onYouTubeIframeAPIReady===ready)win.onYouTubeIframeAPIReady=previous;if(error){script.remove();loads.delete(win);reject(error);}else resolve(win.YT);};
  const ready=()=>{try{previous?.();}finally{win.YT?.Player?finish():finish(Error('API YouTube indisponible.'));}};
  win.onYouTubeIframeAPIReady=ready;script.src='https://www.youtube.com/iframe_api';script.async=true;script.dataset.studioYoutubeApi='true';
  script.onerror=()=>finish(Error('Impossible de charger le lecteur YouTube. Vérifiez la connexion Internet ou les bloqueurs de contenu.'));
  timer=win.setTimeout(()=>finish(Error('Le lecteur YouTube ne répond pas. Réessayez ou ouvrez la vidéo sur YouTube.')),12000);
  doc.head.append(script);
 });loads.set(win,promise);return promise;
}
export const youtubeError=code=>({2:'Lien vidéo invalide.',5:'Cette vidéo ne peut pas être lue dans ce navigateur.',100:'Cette vidéo est privée, supprimée ou indisponible.',101:'Cette vidéo interdit la lecture intégrée.',150:'Cette vidéo interdit la lecture intégrée.',153:'YouTube ne peut pas vérifier l’origine du lecteur. Ouvrez la présentation depuis son adresse web.'}[code]||'YouTube ne peut pas lire cette vidéo (restriction ou erreur de lecture).');
