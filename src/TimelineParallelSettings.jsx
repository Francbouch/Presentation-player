import {useState,useEffect} from 'react';
import {timelineStep} from './milestoneTimeline.js';
import {timelineUnits,createParallel,dissolveParallel,detachParallel,reconcileParallel} from './timelineParallel.js';
import {TLNumber,TLSelect,TLColor} from './MilestoneTimelineSettings.jsx';
export default function TimelineParallelSettings({layer,change,select}){
 const t=layer.timeline,[chosen,setChosen]=useState([]),[name,setName]=useState('Travaux parallèles'),[error,setError]=useState(''),[opened,setOpened]=useState(null),[draft,setDraft]=useState(false);
 const groups=t.parallelGroups||[],used=new Set(groups.flatMap(g=>g.stepIds));
 const save=v=>change(layer.id,{timeline:reconcileParallel(v)});
 useEffect(()=>{const f=e=>{if(e.detail?.layerId===layer.id){setOpened(e.detail.groupId);document.getElementById('parallel-settings-'+layer.id)?.setAttribute('open','');}};document.addEventListener('studio-timeline-edit-group',f);return()=>document.removeEventListener('studio-timeline-edit-group',f);},[layer.id]);
 function update(g,patch){save({...t,parallelGroups:groups.map(v=>v.id===g.id?{...v,...patch}:v)});}
 function create(ids,next=t){try{const result=createParallel(next,ids,name);save(result);setChosen([]);setDraft(false);setError('');setOpened(result.parallelGroups.at(-1).id);}catch(e){setError(e.message);}}
 return <details className="property-section" open id={'parallel-settings-'+layer.id}><summary>Étapes simultanées</summary>
 <p className="help">Un groupe compte pour une seule avancée. Chaque branche conserve sa fiche et son titre.</p>
 <button className="ui-button" onClick={()=>{setDraft(true);setChosen([]);setError('');}}>Créer un groupe vide</button>
 {draft&&<p role="status">Groupe en préparation : choisissez au moins deux étapes ci-dessous ou créez deux nouvelles branches. Rien n’est enregistré avant validation.</p>}
 <label className="field">Nom du nouveau groupe<input aria-label="Nom du nouveau groupe parallèle" value={name} maxLength={200} onChange={e=>setName(e.target.value)}/></label>
 <fieldset><legend>Étapes à regrouper</legend>{t.steps.filter(s=>!used.has(s.id)).map(s=><label className="checkbox-field" key={s.id}><input type="checkbox" aria-label={'Regrouper '+s.name} checked={chosen.includes(s.id)} onChange={e=>setChosen(v=>e.target.checked?[...v,s.id]:v.filter(id=>id!==s.id))}/>{s.name}</label>)}</fieldset>
 <button className="ui-button" onClick={()=>create(chosen)}>Créer un groupe d’étapes simultanées</button>
 <button className="ui-button" onClick={()=>{const a=timelineStep(t.steps.length+1),b=timelineStep(t.steps.length+2);create([a.id,b.id],reconcileParallel({...t,steps:[...t.steps,a,b]}));}}>Créer un groupe avec deux nouvelles étapes</button>
 <p className="help">Pour commencer sans étapes existantes, créez deux branches vierges puis complétez-les. Un groupe enregistré contient toujours au moins deux étapes.</p>
 {error&&<p role="alert">{error}</p>}
 {timelineUnits(t).filter(u=>u.kind==='parallel').map(u=>{const g=u.group;return <details className="parallel-group-settings" key={g.id} open={opened===g.id} onToggle={e=>{if(e.currentTarget.open)setOpened(g.id);}}><summary>Groupe parallèle — {g.name} ({g.stepIds.length})</summary>
 <label className="field">Nom du groupe<input aria-label={'Nom du groupe '+g.id} value={g.name} maxLength={200} onChange={e=>update(g,{name:e.target.value})}/></label>
 <ol>{u.steps.map((s,i)=><li key={s.id}><button className="ui-button" onClick={()=>select(s.id)} aria-label={'Propriétés de la branche '+s.name}>{s.name}</button><button className="ui-button" disabled={!i} aria-label={'Monter la branche '+s.name} onClick={()=>{const ids=[...g.stepIds];[ids[i-1],ids[i]]=[ids[i],ids[i-1]];update(g,{stepIds:ids});}}>↑</button><button className="ui-button" disabled={i===u.steps.length-1} aria-label={'Descendre la branche '+s.name} onClick={()=>{const ids=[...g.stepIds];[ids[i+1],ids[i]]=[ids[i],ids[i+1]];update(g,{stepIds:ids});}}>↓</button><button className="ui-button" onClick={()=>save(detachParallel(t,g.id,s.id))} aria-label={'Retirer du groupe '+s.name}>Retirer</button></li>)}</ol>
 <TLSelect label={'Ajouter une étape au groupe '+g.name} value="" options={{'':'Choisir une étape',...Object.fromEntries(t.steps.filter(s=>!used.has(s.id)&&s.phaseId===u.steps[0].phaseId).map(s=>[s.id,s.name]))}} change={id=>id&&update(g,{stepIds:[...g.stepIds,id]})}/>
 <button className="ui-button" onClick={()=>{const s={...timelineStep(t.steps.length+1),phaseId:u.steps[0].phaseId};save({...t,steps:[...t.steps,s],parallelGroups:groups.map(v=>v.id===g.id?{...v,stepIds:[...v.stepIds,s.id]}:v)});select(s.id);}}>Ajouter une nouvelle branche à {g.name}</button>
 <TLNumber label={'Espacement des branches de '+g.name} min={100} max={1200} value={g.spacing} change={spacing=>update(g,{spacing})}/>
 <TLSelect label={'Style des branches de '+g.name} value={g.style} options={{curved:'Courbes',rounded:'Angles arrondis',straight:'Lignes droites'}} change={style=>update(g,{style})}/>
 <TLNumber label={'Épaisseur des branches de '+g.name} min={1} max={30} value={g.width} change={width=>update(g,{width})}/>
 <label className="checkbox-field"><input type="checkbox" checked={g.color!==null} onChange={e=>update(g,{color:e.target.checked?t.design.lineColor:null})}/>Couleur personnalisée des branches</label>
 {g.color&&<TLColor label={'Couleur des branches de '+g.name} value={g.color} change={color=>update(g,{color})}/>}
 <TLNumber label={'Opacité des branches de '+g.name} min={0} max={100} value={g.opacity} change={opacity=>update(g,{opacity})}/>
 {g.style!=='straight'&&<TLNumber label={'Rayon des branches de '+g.name} min={0} max={400} value={g.radius} change={radius=>update(g,{radius})}/>}
 <div className="button-row">{[-1,1].map(dir=><button key={dir} className="ui-button" onClick={()=>{const units=timelineUnits(t).map(u=>({kind:u.kind,id:u.id})),i=units.findIndex(u=>u.id===g.id),j=i+dir;if(j<0||j>=units.length)return;[units[i],units[j]]=[units[j],units[i]];save({...t,chronology:units});}}>{dir<0?'Avancer':'Reculer'} le groupe {g.name}</button>)}</div>
 <button className="ui-button" onClick={()=>save(dissolveParallel(t,g.id))}>Dissoudre le groupe {g.name} — conserver les étapes</button>
 <p className="help">Retirer une branche la place après le groupe. S’il ne reste qu’une branche, elle redevient automatiquement une étape individuelle, sans perte de données.</p>
 </details>;})}
 </details>;
}
