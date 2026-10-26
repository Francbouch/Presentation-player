export const EFFECTS = { none:'Coupe instantanée', crossfade:'Fondu croisé', black:'Fondu au noir', slide:'Glissement', wipe:'Révélation', zoom:'Zoom subtil' };
export const defaultEffect = () => ({ type:'none', duration:500, direction:'left', easing:'ease-in-out' });
export function upgradeEffects(document) {
  if (document.version >= 7) return document;
  return { ...document, transitions:document.transitions.map(t=>({...t,effect:t.effect || defaultEffect()})), pages:document.pages.map(p=>({...p,stateEffects:p.stateEffects || {default:defaultEffect(),pairs:[]}})) };
}
export function validateEffect(effect) {
  if (!effect || (!Object.hasOwn(EFFECTS,effect.type)&&!['fade','zoom-in','zoom-out'].includes(effect.type)) || !Number.isFinite(effect.duration) || effect.duration<50 || effect.duration>10000 || !['left','right','up','down'].includes(effect.direction) || !['linear','ease-in','ease-out','ease-in-out'].includes(effect.easing)) throw new Error('Les paramètres de transition visuelle sont invalides. Votre projet est conservé.');
}
export function validateEffects(document) {
  document.transitions.forEach(t=>{if(t.mode==='visual' || t.effect!==undefined)validateEffect(t.effect);});
  for (const page of document.pages) {
    for(const button of page.buttons||[])validateBackgroundEffect(button.backgroundEffect);
    const config=page.stateEffects, ids=new Set([null,...page.states.map(s=>s.id)]), pairs=new Set();
    if(!config || !Array.isArray(config.pairs) || config.pairs.length>500)throw new Error('Les transitions entre états sont invalides. Votre projet est conservé.');
    validateEffect(config.default);
    for(const pair of config.pairs){const key=JSON.stringify([pair?.fromId,pair?.toId]);if(!pair || !ids.has(pair.fromId) || !ids.has(pair.toId) || pair.fromId===pair.toId || pairs.has(key))throw new Error('Les transitions entre états sont invalides. Votre projet est conservé.');pairs.add(key);validateEffect(pair.effect);}
  }
}
export function stateEffect(page,fromId,toId) { return page.stateEffects?.pairs.find(p=>p.fromId===fromId && p.toId===toId)?.effect || page.stateEffects?.default || defaultEffect(); }
export function effectFrames(effect) {
  const vector={left:['-100%','0%'],right:['100%','0%'],up:['0%','-100%'],down:['0%','100%']}[effect.direction];
  const opposite=vector.map(v=>v.startsWith('-')?v.slice(1):v==='0%'?v:`-${v}`);
  if(effect.type==='slide')return {old:[{transform:'translate(0,0)'},{transform:`translate(${opposite})`}],next:[{transform:`translate(${vector})`},{transform:'translate(0,0)'}]};
  if(effect.type==='wipe'){const clip={left:'inset(0 100% 0 0)',right:'inset(0 0 0 100%)',up:'inset(0 0 100% 0)',down:'inset(100% 0 0 0)'}[effect.direction];return {old:null,next:[{clipPath:clip},{clipPath:'inset(0 0 0 0)'}]};}
  if(effect.type==='crossfade'&&effect.fullPage)return {old:[{opacity:1},{opacity:0}],next:[{opacity:0},{opacity:1}]};
  if(effect.type==='fade')return {old:[{opacity:1,offset:0},{opacity:0,offset:.5},{opacity:0,offset:1}],next:[{opacity:0,offset:0},{opacity:0,offset:.5},{opacity:1,offset:1}]};
  if(effect.type==='zoom-in')return {old:null,next:[{opacity:0,transform:'scale(.8)'},{opacity:1,transform:'scale(1)'}]};
  if(effect.type==='zoom-out')return {old:null,next:[{opacity:0,transform:'scale(1.2)'},{opacity:1,transform:'scale(1)'}]};
  if(effect.type==='black')return {old:[{opacity:1,offset:0},{opacity:0,offset:.5},{opacity:0,offset:1}],next:[{opacity:0,offset:0},{opacity:0,offset:.5},{opacity:1,offset:1}]};
  if(effect.type==='zoom')return {old:[{transform:'scale(1)'},{transform:'scale(1.025)'}],next:[{opacity:0,transform:'scale(1.035)'},{opacity:1,transform:'scale(1)'}]};
  return {old:null,next:[{opacity:0},{opacity:1}]};
}
// L’appelant garde les animations remplies jusqu’au commit qui promeut la vue
// déjà décodée. cancel libère les styles et handles sans modifier le document.
export function animateViews(oldView,nextView,effect,extra=[]) {
  const animations=[], options={duration:effect.fullPage&&globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:effect.duration,easing:effect.easing,fill:'both'};
  const frames=effectFrames(effect);
  const restore=[];
  if(effect.fullPage&&effect.type==='crossfade')for(const view of [oldView,nextView])if(view){const previous=view.style.mixBlendMode;view.style.mixBlendMode='plus-lighter';restore.push(()=>{view.style.mixBlendMode=previous;});}
  if(oldView && frames.old)animations.push(oldView.animate(frames.old,options));
  if(nextView)animations.push(nextView.animate(frames.next,options));
  extra.forEach(({element,from,to})=>animations.push(element.animate([{opacity:from},{opacity:to}],options)));
  let timer;
  const finished=Promise.race([Promise.all(animations.map(a=>a.finished)),new Promise(resolve=>{timer=setTimeout(resolve,effect.duration+1500);})]);
  return {finished,cancel(){clearTimeout(timer);animations.forEach(a=>a.cancel());restore.forEach(f=>f());}};
}
export function decodeImage(element,timeout=15000) {
  if(!element || typeof element.decode!=='function')return Promise.resolve();
  if(element.loading==='lazy')element.loading='eager';
  let timer;
  return Promise.race([element.decode(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('L’image ne peut pas être préparée. La vue actuelle est conservée.')),timeout);})]).catch(()=>{throw new Error('L’image ne peut pas être préparée. La vue actuelle est conservée.');}).finally(()=>clearTimeout(timer));
}

export const BACKGROUND_EFFECTS={none:'Instantané (aucune transition)',crossfade:'Fondu croisé',slide:'Glissement',zoom:'Zoom doux',wipe:'Balayage'};
export const defaultBackgroundEffect=()=>({...defaultEffect(),duration:600});
export function validateBackgroundEffect(effect){if(effect===undefined)return;validateEffect(effect);if(!Object.hasOwn(BACKGROUND_EFFECTS,effect.type)||effect.duration<100||effect.duration>2000)throw Error('La transition du fond d’écran est invalide. Votre projet est conservé.');}
