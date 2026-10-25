export default function TimelineParallelPaths({geometry:g,design:d,shown,editing,progress,started,onGroup}){
 const activeUnit=progress/100*Math.max(1,g.units.length-1);
 return g.segments.map(segment=>{
  const u=g.units[segment.unitIndex],visible=editing||!d.reveal||u.steps.some(s=>shown.has(s.id));
  const completed=started&&activeUnit+1e-6>=segment.unitIndex,group=segment.group;
  return <g key={segment.id} data-parallel-id={group?.id} data-unit-index={segment.unitIndex} className="timeline-branch-connection" style={{visibility:visible?'visible':'hidden',opacity:visible?(group?.opacity??100)/100:0,transition:`opacity ${d.revealDuration}ms ease`}}>
   <path d={segment.d} fill="none" stroke={group?.color||d.lineColor} strokeWidth={group?.width||d.lineWidth} strokeLinejoin="round" strokeLinecap="round"/>
   {d.progress&&<path className="milestone-branch-progress" d={segment.d} pathLength="100" fill="none" stroke={d.progressColor} strokeWidth={group?.width||d.lineWidth} strokeLinecap="round" strokeDasharray={`${completed?100:0} 100`} style={{transition:`stroke-dasharray ${d.progressDuration}ms ease`}}/>}
   {editing&&group&&<path className="timeline-branch-hit" d={segment.d} fill="none" stroke="transparent" strokeWidth={Math.max(18,group.width+12)} role="button" tabIndex={0} aria-label={`Propriétés du groupe ${group.name}`} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onGroup(group.id);}} onKeyDown={e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();onGroup(group.id);}}}/>}
  </g>;
 });
}
