import {timelineStep} from './milestoneTimeline.js';
import {parallelBranches,branchRanks,updateParallelBranches,detachParallel} from './timelineParallel.js';
import {TLNumber,TLSelect} from './MilestoneTimelineSettings.jsx';
export default function TimelineBranchSequenceSettings({timeline:t,group:g,save,select}){
 const branches=parallelBranches(g),ranks=branchRanks(g),steps=new Map(t.steps.map(s=>[s.id,s]));
 function commit(next,rank=g.revealRanks,document=t){
  // Preserve custom ranks where possible, ensuring a sequence never reveals backwards.
  const valid={...rank};for(const b of next){let previous=1;b.stepIds.forEach((id,index)=>{previous=Math.max(previous,valid[id]??index+1);if(rank)valid[id]=previous;});}
  save(updateParallelBranches(document,g.id,next,rank?valid:undefined));
 }
 function removeBranch(branch){
  if(branch.stepIds.length&&!window.confirm('Supprimer cette branche ? Ses étapes et leurs fiches seront conservées après le groupe dans la Timeline.'))return;
  let next=t;for(const id of [...branch.stepIds].reverse())next=detachParallel(next,g.id,id);
  const remaining=next.parallelGroups?.find(x=>x.id===g.id);if(remaining)next=updateParallelBranches(next,g.id,parallelBranches(remaining).filter(b=>b.id!==branch.id));save(next);
 }
 return <details className="parallel-sequences" open={!!g.branches} aria-label={'Séquences de '+g.name}>
 <summary>Branches et étapes successives</summary>
 <p className="help">Chaque branche suit sa propre séquence. Les étapes de même rang apparaissent ensemble. Les rangs ne représentent pas des dates et restent croissants dans chaque branche ; un déplacement ajuste les rangs suivants si nécessaire. Les anciens groupes restent simultanés tant qu’aucune séquence n’est ajoutée.</p>
 {branches.map((branch,bi)=><fieldset key={branch.id}>
 <legend>Branche {bi+1}</legend>
 <label className="field">Nom de la branche<input aria-label={'Nom de la branche '+(bi+1)} value={branch.name} maxLength={200} onChange={e=>commit(branches.map(b=>b.id===branch.id?{...b,name:e.target.value}:b))}/></label>
 <ol>{branch.stepIds.map((id,index)=>{const step=steps.get(id);if(!step)return null;return <li key={id}>
 <button className="ui-button" onClick={()=>select(id)}>{step.name}</button>
 {[-1,1].map(direction=><button key={direction} className="ui-button" aria-label={(direction<0?'Monter l’étape ':'Descendre l’étape ')+step.name} disabled={index+direction<0||index+direction>=branch.stepIds.length} onClick={()=>{const ids=[...branch.stepIds];[ids[index],ids[index+direction]]=[ids[index+direction],ids[index]];commit(branches.map(b=>b.id===branch.id?{...b,stepIds:ids}:b));}}>{direction<0?'↑':'↓'}</button>)}
 <TLNumber label={'Rang de révélation de '+step.name} min={index?ranks[branch.stepIds[index-1]]:1} max={5000} value={ranks[id]} change={rank=>commit(branches,{...ranks,[id]:Math.max(index?ranks[branch.stepIds[index-1]]:1,rank)})}/>
 <TLSelect label={'Déplacer '+step.name+' vers une branche'} value={branch.id} options={Object.fromEntries(branches.map((b,i)=>[b.id,`${i+1} — ${b.name}`]))} change={target=>commit(branches.map(b=>({...b,stepIds:b.id===target?[...b.stepIds.filter(x=>x!==id),id]:b.stepIds.filter(x=>x!==id)})))}/>
 <button className="ui-button" aria-label={'Retirer de la branche '+step.name} onClick={()=>save(detachParallel(t,g.id,id))}>Retirer — conserver dans la Timeline</button>
 <button className="ui-button danger" aria-label={'Supprimer l’étape '+step.name+' de la branche'} onClick={()=>{if(window.confirm('Supprimer cette étape et sa fiche ? Les fichiers médias restent dans le projet.')){const next=detachParallel(t,g.id,id);save({...next,steps:next.steps.filter(s=>s.id!==id)});}}}>Supprimer l’étape</button>
 </li>;})}</ol>
 <button className="ui-button" aria-label={'Ajouter une étape à la branche '+(bi+1)} onClick={()=>{const step={...timelineStep(t.steps.length+1),phaseId:steps.get(g.stepIds[0])?.phaseId??null};commit(branches.map(b=>b.id===branch.id?{...b,stepIds:[...b.stepIds,step.id]}:b),g.revealRanks?{...ranks,[step.id]:(ranks[branch.stepIds.at(-1)]||0)+1}:undefined,{...t,steps:[...t.steps,step]});select(step.id);}}>Ajouter une étape à cette branche</button>
 <TLSelect label={'Ajouter une étape existante à la branche '+(bi+1)} value="" options={{'':'Choisir une étape',...Object.fromEntries(t.steps.filter(s=>!(t.parallelGroups||[]).some(g=>g.stepIds.includes(s.id))&&s.phaseId===steps.get(g.stepIds[0])?.phaseId).map(s=>[s.id,s.name]))}} change={id=>id&&commit(branches.map(b=>b.id===branch.id?{...b,stepIds:[...b.stepIds,id]}:b))}/>
 <div className="button-row">{[-1,1].map(dir=><button className="ui-button" key={dir} disabled={bi+dir<0||bi+dir>=branches.length} aria-label={(dir<0?'Monter la branche séquence ':'Descendre la branche séquence ')+(bi+1)} onClick={()=>{const next=[...branches];[next[bi],next[bi+dir]]=[next[bi+dir],next[bi]];commit(next);}}>{dir<0?'Monter la branche':'Descendre la branche'}</button>)}</div>
 <button className="ui-button" onClick={()=>removeBranch(branch)}>Supprimer la branche {bi+1} — conserver ses étapes</button>
 </fieldset>)}
 <button className="ui-button" onClick={()=>commit([...branches,{id:crypto.randomUUID(),name:'Nouvelle branche',stepIds:[]}])}>Ajouter une branche</button>
 <TLNumber label={'Espacement des étapes dans '+g.name} min={100} max={1200} value={g.stepSpacing||t.design.spacing} change={stepSpacing=>save({...t,parallelGroups:t.parallelGroups.map(v=>v.id===g.id?{...v,stepSpacing}:v)})}/>
 {g.revealRanks&&<button className="ui-button" onClick={()=>{const next={...g};delete next.revealRanks;save({...t,parallelGroups:t.parallelGroups.map(v=>v.id===g.id?next:v)});}}>Rétablir les rangs automatiques</button>}
 </details>;
}
