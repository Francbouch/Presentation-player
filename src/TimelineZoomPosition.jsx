export default function TimelineZoomPosition({label,value,change}){
 return <label className="field">{label} : {value} %<input type="range" aria-label={label} min="0" max="100" step="1" value={value} onChange={e=>change(Number(e.target.value))}/><input type="number" aria-label={label+' (%)'} min="0" max="100" value={value} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isFinite(n)&&n>=0&&n<=100)change(n);}}/></label>;
}
