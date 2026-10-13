import {buttonEffect} from './buttonAppearance.js';
export function effectFor(item,{active,hovered,clicked}){
 const e=item.interactiveEffects;
 const effects=[clicked&&e?.click,hovered&&e?.hover,active&&e?.active].filter(Boolean);
 return {...(effects.find(f=>f.type!=='none')||buttonEffect()),scaleEffect:effects.find(f=>f.type==='scale'),glowEffect:effects.find(f=>f.type==='glow'),contrastEffect:effects.find(f=>f.type==='contrast')};
}
export default function ButtonSurface({item,urls,active,effect,darkness}){
 const a=item.appearance,i=item.indicator,glow=effect.glowEffect||(Object.values(item.interactiveEffects||{}).find(f=>f?.type==='glow'))||effect,scale=effect.scaleEffect,scaleDuration=scale?.duration??Object.values(item.interactiveEffects||{}).find(f=>f?.type==='scale')?.duration??effect.duration; 
 const unit=v=>`${v/19.2}cqw`;
 const background=a&&!a.transparent?`${a.background}${Math.round(a.backgroundOpacity*2.55).toString(16).padStart(2,'0')}`:'transparent';
 const style={transform:scale?`scale(${scale.scale/100})`:'scale(1)',transitionDuration:`${scaleDuration}ms`,borderRadius:a?unit(a.radius):undefined};
 return <span className="button-visual" style={style}>
 <span className={`button-paint ${a?'custom-button-paint':''}`} style={{background:a?background:undefined,color:a?.text,border:a?`${unit(a.borderWidth)} solid ${a.border}`:undefined,borderRadius:a?unit(a.radius):undefined,filter:`brightness(${1-darkness/100})`,transitionDuration:`${effect.duration}ms`}}>{urls[item.imageId]?<img src={urls[item.imageId]} alt="" draggable={false} loading="lazy"/>:<span className="button-placeholder">{item.name}</span>}</span>
 <span className="button-glow" style={{borderRadius:a?unit(a.radius):undefined,opacity:effect.glowEffect?1:0,boxShadow:`0 0 ${unit(glow.intensity)} ${glow.color}, inset 0 0 ${unit(glow.intensity/2)} ${glow.color}`,border:`${unit(glow.thickness)} solid ${glow.color}`,transitionDuration:`${glow.duration}ms`}}/>
 {active&&i?.enabled&&<span aria-hidden="true" className={`button-check check-${i.position}`} style={{color:i.color,fontSize:unit(i.size),background:i.circle?i.background:'transparent',borderRadius:i.circle?'50%':0}}>✓</span>}
 </span>;
}
