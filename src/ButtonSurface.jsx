import {buttonShapeRadius,shapeClip,rgba} from './buttonShapes.js';
import TextBlock from './TextBlock.jsx';
import {buttonTextItem} from './buttonText.js';
import {buttonEffect} from './buttonAppearance.js';
export function effectFor(item,{active,hovered,clicked}){
 const e=item.interactiveEffects;
 const effects=[clicked&&e?.click,hovered&&e?.hover,active&&e?.active].filter(Boolean);
 return {...(effects.find(f=>f.type!=='none')||buttonEffect()),scaleEffect:effects.find(f=>f.type==='scale'),glowEffect:effects.find(f=>f.type==='glow'),contrastEffect:effects.find(f=>f.type==='contrast')};
}
export default function ButtonSurface({item,urls,active,effect,darkness,editing=false}){
 const a=item.appearance,i=item.indicator,glow=effect.glowEffect||(Object.values(item.interactiveEffects||{}).find(f=>f?.type==='glow'))||effect,scale=effect.scaleEffect,scaleDuration=scale?.duration??Object.values(item.interactiveEffects||{}).find(f=>f?.type==='scale')?.duration??effect.duration; 
 const unit=v=>`${v/19.2}cqw`;
 const background=a&&!a.transparent?`${a.background}${Math.round(a.backgroundOpacity*2.55).toString(16).padStart(2,'0')}`:'transparent';
 const radius=buttonShapeRadius(item,unit);
 const style={transform:scale?`scale(${scale.scale/100})`:'scale(1)',transitionDuration:`${scaleDuration}ms`,borderRadius:radius};
 return <span className="button-visual" style={style}>
 <span className={`button-paint ${a?'custom-button-paint':''}`} style={{background:a?background:undefined,color:item.labelText?.color??a?.text,border:a?`${unit(a.borderEnabled===false?0:a.borderWidth)} solid ${item.buttonShape?"transparent":rgba(a.border,a.borderOpacity??1)}`:undefined,borderRadius:radius,...(item.buttonShape?{overflow:'hidden',pointerEvents:editing?'none':'auto',clipPath:shapeClip(item,unit)}:{}),filter:`brightness(${1-darkness/100})`,transitionDuration:`${effect.duration}ms`}}>{urls[item.imageId]?<span className={item.imageCrop?"button-image-clip":"button-image-legacy"}><img src={urls[item.imageId]} alt="" draggable={false} loading="lazy" style={item.imageCrop?{objectFit:item.imageCrop.mode,transform:`translate(${item.imageCrop.x*100}%, ${item.imageCrop.y*100}%) rotate(${item.imageCrop.rotation||0}deg) scale(${item.imageCrop.zoom})`}:undefined}/></span>:!item.labelText&&<span className="button-placeholder">{item.name}</span>}{item.labelText&&<span className="button-label-text" style={{color:item.labelText.color}}><TextBlock item={buttonTextItem(item)} canMeasure={false} storedHeight={item.height}/></span>}{item.buttonShape&&a&&<span className="button-shape-border" style={{border:`${unit(a.borderEnabled===false?0:a.borderWidth)} solid ${rgba(a.border,a.borderOpacity??1)}`,borderRadius:radius}}/>}</span>
 <span className="button-glow" style={{borderRadius:radius,opacity:effect.glowEffect?1:0,boxShadow:`0 0 ${unit(glow.intensity)} ${glow.color}, inset 0 0 ${unit(glow.intensity/2)} ${glow.color}`,border:`${unit(glow.thickness)} solid ${glow.color}`,transitionDuration:`${glow.duration}ms`}}/>
 {active&&i?.enabled&&<span aria-hidden="true" className={`button-check check-${i.position}`} style={{color:i.color,fontSize:unit(i.size),background:i.circle?i.background:'transparent',...(item.buttonShape==='ellipse'&&i.position!=='center'?{right:'8%',...(i.position==='top-right'?{top:'8%'}:{bottom:'8%'})}:{}),borderRadius:i.circle?'50%':0}}>✓</span>}
 </span>;
}
