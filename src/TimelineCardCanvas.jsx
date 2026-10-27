import {useLayoutEffect,useRef,useState} from "react";
import InteractiveButtons from './InteractiveButtons.jsx';
import {cardAppearance,cardToView,cardFromView,cardPixels} from './timelineCardContent.js';
import './timelineCardCanvas.css';
export default function TimelineCardCanvas({content,design={},size,urls,editing=false,selectedId,selection=[],select=()=>{},change=()=>{},batch,beginGesture,endGesture,videoEditingId,setVideoEditingId,cropId,setCropId,preview=false,pageId,playbackEnabled=true,grid=false,onFrameDrop,duplicateMove}){
 const viewport=useRef(null),[width,setWidth]=useState(null);
 useLayoutEffect(()=>{const element=viewport.current;if(!element)return;const observer=new ResizeObserver(([e])=>setWidth(e.borderBoxSize?.[0]?.inlineSize||element.offsetWidth));observer.observe(element);return()=>observer.disconnect();},[]);
 const a={...cardAppearance(design),...content.appearance},inner={width:Math.max(10,size.width-2*(a.padding+a.borderWidth)),height:Math.max(10,size.height-2*(a.padding+a.borderWidth))};
 const layers=content.layerOrder.map(id=>content.layers.find(l=>l.id===id)).filter(Boolean),view=layers.map(l=>cardToView(l,inner));
 const extent={width:Math.max(inner.width,...layers.map(l=>{const r=cardPixels(l);return r.x+r.width;})),height:Math.max(inner.height,...layers.map(l=>{const r=cardPixels(l);return r.y+r.height;}))};
 const adjust=(id,p,options)=>change(id,cardFromView(p,inner),options);
 const logicalWidth=Math.max(10,size.width-2*a.borderWidth),logicalHeight=Math.max(10,size.height-2*a.borderWidth),scale=width?width/logicalWidth:1;
 return <div ref={viewport} className={`timeline-card-canvas ${editing&&grid?'with-card-grid':''}`} data-card-canvas="true" style={{position:'absolute',inset:0,overflow:editing?'visible':a.overflow}}>
  <div className="card-canvas-reservation" style={{position:"relative",width:(a.overflow==='auto'&&!editing?Math.max(logicalWidth,extent.width+2*a.padding):logicalWidth)*scale,height:(a.overflow==='auto'&&!editing?Math.max(logicalHeight,extent.height+2*a.padding):logicalHeight)*scale}}><div className="card-canvas-scale" style={{position:"absolute",width:logicalWidth,height:logicalHeight,transform:`scale(${scale})`,transformOrigin:"top left"}}>
  <div className="card-canvas-coordinate" style={{position:'relative',margin:a.padding,width:inner.width,height:inner.height}}>
   {!editing&&a.overflow==='auto'&&<div aria-hidden="true" style={{position:'absolute',width:extent.width,height:extent.height,pointerEvents:'none'}}/>}
   <InteractiveButtons coordinateSize={inner} pageId={pageId} buttons={view} urls={urls} showActiveButton={false} editing={editing&&!preview} selection={selection} selectedButtonId={selectedId} onSelect={select} onGeometryChange={adjust} onDuplicateMove={duplicateMove?(ids,patches)=>duplicateMove(ids,Object.fromEntries(Object.entries(patches).map(([id,p])=>[id,cardFromView(p,inner)]))):undefined} onFrameDrop={onFrameDrop} onBatchChange={patches=>batch?.(Object.fromEntries(Object.entries(patches).map(([id,p])=>[id,cardFromView(p,inner)])))} beginGesture={beginGesture} endGesture={endGesture} magnetism={a.magnetism} playbackEnabled={playbackEnabled} onActivate={()=>{}} cropId={cropId} onCrop={setCropId} videoEditingId={videoEditingId} onVideoInteract={setVideoEditingId} youtubeEditingId={videoEditingId} onYoutubeInteract={setVideoEditingId} onNudge={(e,ids)=>{e.preventDefault();const dx=(e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0)*(e.shiftKey?10:1)/1920,dy=(e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0)*(e.shiftKey?10:1)/1080;batch?.(Object.fromEntries(layers.filter(l=>ids.includes(l.id)&&!l.locked).map(l=>[l.id,{x:Math.max(0,l.x+dx),y:Math.max(0,l.y+dy)}])));}} />
  </div>
  </div></div>
 </div>;
}
