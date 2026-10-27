// Calendar dates have no time zone. Durations count elapsed days, not inclusive days.
export function calendarDay(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const [y,m,d]=value.split('-').map(Number);if(y<1)return null;
 const date=new Date(0);date.setUTCHours(0,0,0,0);date.setUTCFullYear(y,m-1,d);
 return date.toISOString().slice(0,10)===value?date.getTime()/86400000:null;
}
export function elapsedDays(timing){const a=calendarDay(timing?.start),b=calendarDay(timing?.end);return a!==null&&b!==null&&b>=a?b-a:null;}
export function estimateDays(value){const m=/^\s*(\d+(?:[.,]\d+)?)\s*(jours?|j|semaines?|sem)\s*$/i.exec(value||'');const days=m?Number(m[1].replace(',','.'))*(m[2].toLowerCase().startsWith('sem')?7:1):null;return Number.isFinite(days)?days:null;}
export const durationDays=timing=>elapsedDays(timing)??estimateDays(timing?.estimate);
export const durationDefaults=()=>({display:{a:false,b:false,c:true},scale:50/7,scaleUnit:'day',a:{color:'#b8a0ec',thickness:12,opacity:100,radius:5,offset:-70,text:true,dates:true,mode:'proportional',length:100},b:{color:'#63cfad',thickness:5,opacity:100,marker:'line',markerSize:14,offset:0,text:true,direction:'auto',mode:'proportional',length:100},c:{format:'short',start:true,end:true,duration:true,fontSize:18,textColor:'#ffffff',background:'#242632',bgOpacity:85,radius:6,offset:{x:0,y:110}}});
export function durationSettings(t,step){const defaults=durationDefaults(),global=t.design.duration||{},local=step?.timing||{};return {...defaults,...global,display:{...defaults.display,...global.display,...local.display},...Object.fromEntries(['a','b','c'].map(k=>[k,{...defaults[k],...global[k],...local[k],...(k==='c'?{offset:{...defaults.c.offset,...global.c?.offset,...local.c?.offset}}:{})}]))};}
export function durationLength(t,step,key){const d=durationSettings(t,step),days=durationDays(step.timing);return d[key].mode==='custom'?d[key].length:days===null?null:days*(d.scaleUnit==='week'?d.scale/7:d.scale);}
export function dateLabel(value,format='short'){if(calendarDay(value)===null)return '';if(format==='iso')return value;return new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:format==='long'?'long':'short',year:format==='long'?'numeric':undefined,timeZone:'UTC'}).format(new Date(calendarDay(value)*86400000));}
export function durationText(timing){const days=elapsedDays(timing);return days!==null?`${days} jour${days===1?'':'s'}`:timing?.estimate?`Durée estimée : ${timing.estimate}`:'';}
export function durationLabel(t,step){const c=durationSettings(t,step).c,q=step.timing;return [c.start&&dateLabel(q?.start,c.format),c.end&&dateLabel(q?.end,c.format),c.duration&&durationText(q)].filter(Boolean).join(' · ');}
export function durationAxis(t,point,points,kind='b'){const direction=kind==='b'?durationSettings(t,point).b.direction:'auto';if(direction==='horizontal')return {x:1,y:0};if(direction==='vertical'||t.design.layout==='vertical')return {x:0,y:1};if(t.design.layout!=='zigzag')return {x:1,y:0};
 if(point.sequence){const branch=points.filter(p=>p.branchId===point.branchId),i=branch.findIndex(p=>p.id===point.id),other=branch[i+1]||branch[i-1];return {x:other?Math.sign((branch[i+1]?other.x-point.x:point.x-other.x))||1:1,y:0};}
 const centre=p=>points.filter(q=>p.parallelId?q.parallelId===p.parallelId:q.id===p.id).reduce((r,q,_,a)=>({x:r.x+q.x/a.length,y:r.y+q.y/a.length}),{x:0,y:0});
 const p=centre(point),unique=points.filter((q,i)=>!q.parallelId||points.findIndex(v=>v.parallelId===q.parallelId)===i),index=unique.findIndex(q=>q.id===point.id||point.parallelId&&q.parallelId===point.parallelId);
 const next=unique[index+1]&&centre(unique[index+1]),prev=unique[index-1]&&centre(unique[index-1]);return {x:next&&Math.abs(next.y-p.y)<1?Math.sign(next.x-p.x)||1:prev&&Math.abs(prev.y-p.y)<1?Math.sign(p.x-prev.x)||1:1,y:0};
}
export function validateDuration(t,fail){
 const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v),num=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;
 const shape=(v,key)=>{if(!object(v))return fail();const rules={color:v=>/^#[0-9a-f]{6}$/i.test(v),textColor:v=>/^#[0-9a-f]{6}$/i.test(v),background:v=>/^#[0-9a-f]{6}$/i.test(v),thickness:v=>num(v,1,100),opacity:v=>num(v,0,100),bgOpacity:v=>num(v,0,100),radius:v=>num(v,0,100),offset:key==='c'?v=>object(v)&&num(v.x,-38400,38400)&&num(v.y,-21600,21600):v=>num(v,-5000,5000),text:v=>typeof v==='boolean',dates:v=>typeof v==='boolean',start:v=>typeof v==='boolean',end:v=>typeof v==='boolean',duration:v=>typeof v==='boolean',mode:v=>['proportional','custom'].includes(v),length:v=>num(v,0,1000000),marker:v=>['line','dot','arrow','none'].includes(v),markerSize:v=>num(v,1,100),direction:v=>['auto','horizontal','vertical'].includes(v),format:v=>['short','long','iso'].includes(v),fontSize:v=>num(v,8,100)};for(const [k,f]of Object.entries(rules))if(v[k]!==undefined&&!f(v[k]))fail();};
 const display=v=>{if(!object(v))return fail();for(const k of ['a','b','c'])if(v[k]!==undefined&&typeof v[k]!=='boolean')fail();};
 const global=t.design.duration;if(global!==undefined){if(!object(global))return fail();if(global.display!==undefined)display(global.display);if(global.scale!==undefined&&!num(global.scale,.01,1000))fail();if(global.scaleUnit!==undefined&&!['day','week'].includes(global.scaleUnit))fail();for(const k of ['a','b','c'])if(global[k]!==undefined)shape(global[k],k);}
 for(const step of t.steps){const q=step.timing;if(q===undefined)continue;if(!object(q))return fail();for(const k of ['start','end'])if(q[k]!==undefined&&q[k]!==null&&q[k]!==''&&calendarDay(q[k])===null)fail();if(q.start&&q.end&&elapsedDays(q)===null)fail();if(q.estimate!==undefined&&(typeof q.estimate!=='string'||q.estimate.length>200))fail();if(q.display!==undefined)display(q.display);for(const k of ['a','b','c'])if(q[k]!==undefined)shape(q[k],k);}
}

// Copy only C's bubble-relative local offset; leave every other setting intact.
export function applyDurationLabelPosition(timeline,stepId){
 const source=timeline.steps.find(step=>step.id===stepId);
 if(!source)return timeline;
 const offset=durationSettings(timeline,source).c.offset;
 return {...timeline,steps:timeline.steps.map(step=>({...step,timing:{...step.timing,c:{...step.timing?.c,offset:{...offset}}}}))};
}
