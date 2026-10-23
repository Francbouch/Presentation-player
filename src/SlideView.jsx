import { animateViews, decodeImage } from './visualEffects.js';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { demoComponents } from './slides.jsx';
import { orderedLayers, resolveBackground } from './document.js';
import InteractiveButtons from './InteractiveButtons.jsx';

export default function SlideView({ page, urls, interaction, number, total, buttonEditing, onBackgroundReady, videoSurface, videoLayers }) {
  const registerFrameVideo=useCallback((id,controller)=>interaction.registerVideo?.(page.id,id,controller),[page.id,interaction.registerVideo]);
  const snapshot = videoSurface && videoLayers?.pageId===page.id ? videoLayers : null;
  const persistent = new Map((snapshot?.layers||[]).map(layer=>[layer.id,layer]));
  const target = interaction.target || page.defaultBackground;
  const source = urls[resolveBackground(page, target)] || urls[resolveBackground(page, page.defaultBackground)];
  const Demo = demoComponents[page.demoTemplate];
  const image = useRef(null),root=useRef(null),pendingImage=useRef(null);
  const visual=interaction.visual;
  const nextSource=visual ? urls[resolveBackground(page,visual.to.target)] || urls[resolveBackground(page,page.defaultBackground)] : undefined;
  const different=!!visual && source!==nextSource;
  const finishRef=useRef(interaction.finishVisual);finishRef.current=interaction.finishVisual;
  useLayoutEffect(()=>{
    if(!visual)return;const element=root.current;let cancelled=false,animation;
    const layerFrames=new Map([...element.querySelectorAll('[data-layer-id]')].map(el=>[el.dataset.layerId,el]));
    const entering=(visual.scope==='background'?[]:orderedLayers(page)).filter(layer=>!(visual.from.visibility[layer.id] ?? layer.visible) && (visual.to.visibility[layer.id] ?? layer.visible));
    const enteringImages=entering.flatMap(layer=>[...(layerFrames.get(layer.id)?.querySelectorAll('img') || [])]);
    Promise.all([decodeImage(different?pendingImage.current:null),...enteringImages.map(img=>decodeImage(img))]).then(()=>{
      if(cancelled)return;const extra=(visual.scope==='background'?[]:orderedLayers(page)).flatMap(layer=>{const from=visual.from.visibility[layer.id] ?? layer.visible, to=visual.to.visibility[layer.id] ?? layer.visible;if(from===to)return [];const frame=layerFrames.get(layer.id);return frame?[{element:frame,from:from?1:0,to:to?1:0}]:[];});
      interaction.visualPrepared?.(visual.id);
      if(visual.scope==='background'&&(visual.effect.type==='none'||!different||window.matchMedia('(prefers-reduced-motion: reduce)').matches)){cancelled=true;finishRef.current?.(visual.id);return;}
      element.classList.add('visual-effect-running');element.dataset.effectRunning=visual.effect.type;
      animation=animateViews(different&&visual.scope!=='background'?image.current:null,different?pendingImage.current:null,visual.effect,extra);
      return animation.finished;
    }).then(()=>{if(!cancelled)finishRef.current?.(visual.id);}).catch(error=>{if(!cancelled)finishRef.current?.(visual.id,error);});
    return()=>{cancelled=true;animation?.cancel();element.classList.remove('visual-effect-running');delete element.dataset.effectRunning;};
  },[visual?.id]);
  useEffect(() => {
    if (!onBackgroundReady && !interaction.backgroundReady) return;
    let cancelled = false;
    // Décoder l’image réellement montée, pas seulement une copie de préchargement.
    const ready = Promise.all([source ? decodeImage(image.current) : Promise.resolve(),...([...root.current.querySelectorAll('.interactive-button-layer img')].filter(img=>!img.complete || !img.naturalWidth).map(img=>decodeImage(img)))]);
    const report = ready => { if (!cancelled) { const result = { pageId: page.id, source, ready, stateId:interaction.stateId??null,readinessId:interaction.readinessId }; onBackgroundReady?.(result); interaction.backgroundReady?.(result); } };
    ready.then(() => report(true)).catch(() => report(false));
    return () => { cancelled = true; };
  }, [source, page.id, onBackgroundReady, interaction.backgroundReady, interaction.stateId, interaction.readinessId, JSON.stringify(interaction.visibility), urls]);
  return <div ref={root} className={`slide ${visual?`state-effect-active effect-${visual.effect.type}`:''}`} key={page.id}>
    {!source && <div ref={image} className="empty-slide"><span>▧</span><p>Aucune image</p><small>Importez une image dans l’éditeur.</small></div>}
    {[...new Set([source,different?nextSource:undefined].filter(Boolean))].map(src=><img key={src} ref={src===source?image:pendingImage} className={`slide-background ${src===source?'':'visual-pending-background'}`} src={src} alt={src===source?page.title:''}/>)}

    {different && !nextSource && <div ref={pendingImage} className="empty-slide visual-pending-background"><span>▧</span><p>Aucune image</p></div>}
    {Demo && <><div className="slide-shade" /><Demo /></>}
    {page.variants.length > 0 && <div className="choices variant-choices" aria-label="Variantes d’image">
      <button aria-pressed={target?.kind === 'main'} onClick={() => interaction.choose({ kind: 'main' })}>Image principale</button>
      {page.variants.map(item => <button key={item.id} aria-pressed={target?.kind === 'variant' && target.variantId === item.id} onClick={() => interaction.choose({ kind: 'variant', variantId: item.id })}>{item.name}</button>)}
    </div>}
    <InteractiveButtons key={page.id} buttons={orderedLayers(page).map(layer => ({ ...layer, ...(persistent.get(layer.id)||{}), videoOverlay:persistent.has(layer.id), visible:persistent.has(layer.id) ? true : layer.folderHidden ? false : visual ? (visual.from.visibility[layer.id] ?? layer.visible) || (visual.to.visibility[layer.id] ?? layer.visible) : interaction.visibility?.[layer.id] ?? layer.visible, entering:visual && !(visual.from.visibility[layer.id] ?? layer.visible) && (visual.to.visibility[layer.id] ?? layer.visible) }))} urls={urls} videoSurface={videoSurface} activeButtonId={snapshot ? snapshot.activeButtonId : interaction.activeButtonId} selectedGroups={snapshot ? snapshot.selectedGroups : interaction.selectedGroups} showActiveButton={page.showActiveButton} onActivate={interaction.activateButton} registerVideo={interaction.registerVideo?registerFrameVideo:undefined} {...buttonEditing} />
    <span className="slide-number">{String(number).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
  </div>;
}
