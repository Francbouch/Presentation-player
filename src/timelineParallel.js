// Parallel groups reference existing steps; their chronology is independent of geometry.
export const branchDefaults = {style:'curved', spacing:180, width:4, color:null, opacity:100, radius:60};
export function timelineUnits(t, visibleOnly=false) {
  const steps=new Map(t.steps.filter(s=>!visibleOnly||s.visible).map(s=>[s.id,s]));
  const groups=new Map((t.parallelGroups||[]).map(g=>[g.id,g]));
  const membership=new Map((t.parallelGroups||[]).flatMap(g=>g.stepIds.map(id=>[id,g.id])));
  const used=new Set(), out=[];
  function add(ref){
    if(ref.kind==='parallel'){
      const g=groups.get(ref.id); if(!g||used.has('g:'+g.id))return;
      const members=g.stepIds.map(id=>steps.get(id)).filter(Boolean);
      used.add('g:'+g.id);members.forEach(s=>used.add(s.id));
      if(members.length)out.push({id:g.id,kind:'parallel',group:g,steps:members});
    }else{
      const s=steps.get(ref.id);if(!s||used.has(s.id))return;
      const groupId=membership.get(s.id);if(groupId){add({kind:'parallel',id:groupId});return;}
      used.add(s.id);out.push({id:s.id,kind:'step',steps:[s]});
    }
  }
  (t.chronology||t.steps.map(s=>({kind:'step',id:s.id}))).forEach(add);
  t.steps.forEach(s=>add({kind:'step',id:s.id}));
  return out;
}
export function reconcileParallel(t) {
  if(!t.parallelGroups && !t.chronology)return t;
  const ids=new Set(t.steps.map(s=>s.id));
  const groups=(t.parallelGroups||[]).map(g=>({...g,stepIds:g.stepIds.filter(id=>ids.has(id))}));
  // A singleton becomes a normal step at the group's previous position.
  const chronology=(t.chronology||[]).flatMap(u=>{
    if(u.kind!=='parallel')return [u];
    const g=groups.find(g=>g.id===u.id);return !g?[]:g.stepIds.length<2?g.stepIds.map(id=>({kind:'step',id})):[u];
  });
  const next={...t,parallelGroups:groups.filter(g=>g.stepIds.length>=2),chronology};
  next.chronology=timelineUnits(next).map(u=>({kind:u.kind,id:u.id}));
  return next;
}
export function createParallel(t, ids, name='Étapes simultanées') {
  const chosen=t.steps.filter(s=>ids.includes(s.id));
  if(chosen.length<2)throw Error('Choisissez au moins deux étapes.');
  if(new Set(chosen.map(s=>s.phaseId)).size>1)throw Error('Ces étapes appartiennent à des phases différentes. Affectez-les explicitement à la même phase avant de les regrouper.');
  const already=new Set((t.parallelGroups||[]).flatMap(g=>g.stepIds));
  if(chosen.some(s=>already.has(s.id)))throw Error('Retirez d’abord les étapes de leur groupe actuel.');
  const group={id:crypto.randomUUID(),name,stepIds:chosen.map(s=>s.id),...branchDefaults,width:t.design.lineWidth};
  const units=timelineUnits(t), at=units.findIndex(u=>u.steps.some(s=>ids.includes(s.id)));
  const chronology=units.flatMap((u,i)=>[...(i===at?[{kind:'parallel',id:group.id}]:[]),...(!u.steps.some(s=>ids.includes(s.id))?[{kind:u.kind,id:u.id}]:[])]);
  return {...t,parallelGroups:[...(t.parallelGroups||[]),group],chronology};
}
export function dissolveParallel(t,id) {
  const g=t.parallelGroups?.find(g=>g.id===id);if(!g)return t;
  return reconcileParallel({...t,parallelGroups:t.parallelGroups.filter(g=>g.id!==id),chronology:timelineUnits(t).flatMap(u=>u.id===id?g.stepIds.map(id=>({kind:'step',id})):[{kind:u.kind,id:u.id}])});
}
export function detachParallel(t,groupId,stepId) {
  const units=timelineUnits(t), index=units.findIndex(u=>u.id===groupId);
  if(index<0)return t;
  const chronology=units.map(u=>({kind:u.kind,id:u.id}));
  chronology.splice(index+1,0,{kind:'step',id:stepId});
  return reconcileParallel({...t,parallelGroups:t.parallelGroups.map(g=>g.id===groupId?{...g,stepIds:g.stepIds.filter(id=>id!==stepId)}:g),chronology});
}
export function validateParallel(t,fail) {
  if(t.parallelGroups===undefined && t.chronology===undefined)return;
  if(!Array.isArray(t.parallelGroups)||!Array.isArray(t.chronology)||t.parallelGroups.length>2500) return fail();
  const groups=new Set(),member=new Set(),steps=new Map(t.steps.map(s=>[s.id,s]));
  for(const g of t.parallelGroups){
    if(!g||typeof g.id!=='string'||!g.id||g.id.length>200||groups.has(g.id)||steps.has(g.id)||typeof g.name!=='string'||g.name.length>200||!Array.isArray(g.stepIds)||g.stepIds.length<2||g.stepIds.length>5000)return fail();
    groups.add(g.id);let phase;
    for(const id of g.stepIds){const s=steps.get(id);if(!s||member.has(id))return fail();member.add(id);if(phase===undefined)phase=s.phaseId;else if(phase!==s.phaseId)return fail();}
    if(!['curved','rounded','straight'].includes(g.style)||!Number.isFinite(g.spacing)||g.spacing<100||g.spacing>1200||!Number.isFinite(g.width)||g.width<1||g.width>30||!Number.isFinite(g.opacity)||g.opacity<0||g.opacity>100||!Number.isFinite(g.radius)||g.radius<0||g.radius>400||(g.color!==null&&!/^#[a-f0-9]{6}$/i.test(g.color)))return fail();
  }
  const seen=new Set();
  for(const u of t.chronology){if(!u||!['step','parallel'].includes(u.kind)||seen.has(u.kind+':'+u.id)||(u.kind==='parallel'?!groups.has(u.id):!steps.has(u.id)||member.has(u.id)))return fail();seen.add(u.kind+':'+u.id);}
  if(t.chronology.length!==groups.size+t.steps.length-member.size)return fail();
}
export function groupCentre(points,id){
  const p=points.find(p=>p.id===id);if(!p)return null;
  const members=p.parallelId?points.filter(q=>q.parallelId===p.parallelId):[p];
  return {...p,x:(Math.min(...members.map(p=>p.x))+Math.max(...members.map(p=>p.x)))/2,y:(Math.min(...members.map(p=>p.y))+Math.max(...members.map(p=>p.y)))/2,groupBounds:{width:Math.max(...members.map(p=>p.x))-Math.min(...members.map(p=>p.x)),height:Math.max(...members.map(p=>p.y))-Math.min(...members.map(p=>p.y))}};
}
export function parallelPath(a,b,style,radius,axis=null){
  if(style==='straight')return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  const dx=b.x-a.x,dy=b.y-a.y,horizontal=axis?axis==='horizontal':Math.abs(dx)>=Math.abs(dy);
  if(style==='curved'){const bend=Math.min(radius,(horizontal?Math.abs(dx):Math.abs(dy))/2);return horizontal?`M ${a.x} ${a.y} C ${a.x+Math.sign(dx)*bend} ${a.y} ${b.x-Math.sign(dx)*bend} ${b.y} ${b.x} ${b.y}`:`M ${a.x} ${a.y} C ${a.x} ${a.y+Math.sign(dy)*bend} ${b.x} ${b.y-Math.sign(dy)*bend} ${b.x} ${b.y}`;}
  const r=Math.min(radius,Math.abs(dx)/2,Math.abs(dy)/2),sx=Math.sign(dx),sy=Math.sign(dy),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
  return horizontal?`M ${a.x} ${a.y} L ${mx-r*sx} ${a.y} Q ${mx} ${a.y} ${mx} ${a.y+r*sy} L ${mx} ${b.y-r*sy} Q ${mx} ${b.y} ${mx+r*sx} ${b.y} L ${b.x} ${b.y}`:`M ${a.x} ${a.y} L ${a.x} ${my-r*sy} Q ${a.x} ${my} ${a.x+r*sx} ${my} L ${b.x-r*sx} ${my} Q ${b.x} ${my} ${b.x} ${my+r*sy} L ${b.x} ${b.y}`;
}
