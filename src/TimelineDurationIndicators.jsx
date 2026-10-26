import TimelineStepTitle from './TimelineStepTitle.jsx';
import {durationSettings,durationLength,durationLabel,durationText,dateLabel,durationAxis} from './timelineDuration.js';
const unit=n=>`${n/19.2}cqw`;
export default function TimelineDurationIndicators({item,step,points,editing,positioning,change,exit}){
 const t=item.timeline,q=step.timing;if(!q)return null;
 const d=durationSettings(t,step),axis=durationAxis(t,step,points),angle=axis.y?90:axis.x<0?180:0,label=durationLabel(t,step);
 const bars=['a','b'].map(k=>{
  const a=d[k],length=durationLength(t,step,k);if(!d.display[k]||length===null)return null;
  const height=k==='b'?Math.max(a.thickness,a.markerSize):a.thickness;
  return <span key={k} data-duration-style={k} data-duration-length={length} className={`timeline-duration-bar duration-${k}`} style={{left:unit(-axis.y*a.offset),top:unit(axis.x*a.offset),width:unit(length),height:unit(height),transform:`translateY(-50%) rotate(${angle}deg)`,opacity:a.opacity/100}}>
    <span className="duration-stroke" style={{height:unit(a.thickness),background:a.color,borderRadius:unit(a.radius||0)}}/>
    {k==='b'&&a.marker!=='none'&&<span className={`duration-marker marker-${a.marker}`} style={{width:unit(a.markerSize),height:unit(a.markerSize),color:a.color,background:a.marker==='dot'?a.color:undefined,borderColor:a.color}}/>}
    {a.text&&<span className="duration-bar-text" style={{color:t.design.textColor,fontSize:unit(16),top:k==='a'?'50%':unit(-14),transform:`translate(-50%,-50%) rotate(${-angle}deg)`}}>{durationText(q)}</span>}
    {k==='a'&&a.dates&&<>{['start','end'].map((end,i)=><span key={end} className="duration-end-date" style={{left:i?'100%':0,top:unit(20),fontSize:unit(14),transform:`translateX(-50%) rotate(${-angle}deg)`}}>{dateLabel(q[end],d.c.format)}</span>)}</>}
    {editing&&a.mode==='custom'&&<span className="duration-custom-flag" style={{fontSize:unit(12),top:unit(-22)}}>{k.toUpperCase()} · hors échelle</span>}
  </span>;
 });
 return <span className={`timeline-duration-indicators ${positioning?'is-positioning-duration':''}`} data-duration-step={step.id}>
  {bars}
  {(d.display.c||positioning)&&label&&<span className="timeline-duration-label" style={{fontSize:unit(d.c.fontSize),color:d.c.textColor,'--duration-label-background':`${d.c.background}${Math.round(d.c.bgOpacity*2.55).toString(16).padStart(2,'0')}`,'--duration-label-radius':unit(d.c.radius)}}>
   <TimelineStepTitle item={item} step={{...step,name:`de durée ${step.name}`,titleOffset:d.c.offset}} positioning={positioning} selected={positioning} select={()=>{}} change={(id,offset)=>change(id,{c:{...q.c,offset}})} durationLabel previewEvent="studio-timeline-duration-preview"><span>{label}</span></TimelineStepTitle>
   {positioning&&<button type="button" className="duration-position-done" style={{left:unit(d.c.offset.x),top:unit(d.c.offset.y-28)}} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();exit();}}>Terminer le positionnement de l’étiquette</button>}
  </span>}
 </span>;
}
