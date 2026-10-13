export const buttonEffect = () => ({type:'none',color:'#b8a0ec',thickness:3,intensity:12,scale:125,darkness:45,duration:200});
export const buttonStyle = () => ({background:'#2a2339',backgroundOpacity:90,transparent:false,text:'#f4ecff',border:'#a98acf',borderWidth:1,radius:5});
export const buttonIndicator = () => ({enabled:false,color:'#ffffff',size:28,position:'top-right',circle:true,background:'#67508f'});
export const buttonInteraction = () => ({hover:buttonEffect(),click:buttonEffect(),active:buttonEffect(),clickDuration:350});
const color=v=>typeof v==='string' && /^#[\da-f]{6}$/i.test(v);
const number=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;
export function validateButtonAppearance(document){
 const fail=()=>{throw new Error('Les paramètres d’apparence des boutons sont invalides. Votre projet est conservé.');};
 for(const p of document.pages) {
  const defaults=new Set();
  for(const b of p.buttons||[]) {
   const a=b.appearance,i=b.indicator,e=b.interactiveEffects;
   if(a && (!['background','text','border'].every(k=>color(a[k])) || !number(a.backgroundOpacity,0,100)||typeof a.transparent!=='boolean'||!number(a.borderWidth,0,30)||!number(a.radius,0,200)))fail();
   if(i && (typeof i.enabled!=='boolean'||typeof i.circle!=='boolean'||!color(i.color)||!color(i.background)||!number(i.size,8,120)||!['center','top-right','bottom-right'].includes(i.position)))fail();
   if(e){if(!number(e.clickDuration,50,10000))fail();for(const key of ['hover','click','active']){const f=e[key];if(!f||!['none','glow','scale','contrast'].includes(f.type)||!color(f.color)||!number(f.thickness,0,30)||!number(f.intensity,0,60)||!number(f.scale,105,150)||!number(f.darkness,0,80)||!number(f.duration,0,5000))fail();}}
   if(b.selectionGroup!==undefined && (typeof b.selectionGroup!=='string'||b.selectionGroup.length>80))fail();
   if(b.defaultSelected!==undefined && typeof b.defaultSelected!=='boolean')fail();
   if(b.selectionGroup&&b.defaultSelected){if(defaults.has(b.selectionGroup))fail();defaults.add(b.selectionGroup);}
  }
 }
}
