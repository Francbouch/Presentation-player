const ID=/^[A-Za-z0-9_-]{11}$/;
export const validYouTubeId=id=>typeof id==='string'&&ID.test(id);
export const youtubeDefaults=()=>({videoId:null,url:'',controls:true,autoplay:false,muted:true,pauseOnExit:true,restartOnReturn:true,loop:false,start:0,end:null,lockAspect:false});
export const youtubeURL=id=>`https://www.youtube.com/watch?v=${id}`;
export const youtubePoster=id=>`https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export function parseYouTubeURL(input){
 const fail=()=>{throw Error('URL YouTube non reconnue. Collez un lien youtube.com ou youtu.be valide.');};
 if(typeof input!=='string'||input.length>2048)fail();
 let text=input.trim();if(/^(?:(?:www\.|m\.)?youtube\.com|youtu\.be|www\.youtube-nocookie\.com)\//i.test(text))text='https://'+text;
 let u;try{u=new URL(text);}catch{fail();}
 if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port)fail();
 const host=u.hostname.toLowerCase(),parts=u.pathname.split('/').filter(Boolean);let id;
 if(host==='youtu.be'&&parts.length===1)id=parts[0];
 else if(['youtube.com','www.youtube.com','m.youtube.com'].includes(host)){
  if(u.pathname==='/watch'&&u.searchParams.getAll('v').length===1)id=u.searchParams.get('v');
  else if(parts.length===2&&['embed','shorts','live'].includes(parts[0]))id=parts[1];
 }else if(host==='www.youtube-nocookie.com'&&parts.length===2&&parts[0]==='embed')id=parts[1];
 if(!validYouTubeId(id))fail();
 const raw=u.searchParams.get('start')??u.searchParams.get('t');let start;
 if(raw&&/^\d+$/.test(raw))start=Number(raw);
 else if(raw&&/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.test(raw)){const m=/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(raw);start=Number(m[1]||0)*3600+Number(m[2]||0)*60+Number(m[3]||0);}
 return {videoId:id,url:youtubeURL(id),...(Number.isInteger(start)&&start<=86400?{start}:{})};
}
export function validateYouTube(layer){
 if(layer.type!=='youtube')return;
 const q=layer.youtube,fail=()=>{throw Error('La configuration du calque YouTube est invalide. Le projet actuel est conservé.');};
 if(!q||Array.isArray(q)||typeof q!=='object')fail();
 if(q.videoId===null){if(q.url!=='')fail();}else if(!validYouTubeId(q.videoId)||q.url!==youtubeURL(q.videoId))fail();
 for(const k of ['controls','autoplay','muted','pauseOnExit','restartOnReturn','loop','lockAspect'])if(typeof q[k]!=='boolean')fail();
 if(!Number.isInteger(q.start)||q.start<0||q.start>86400||(q.end!==null&&(!Number.isInteger(q.end)||q.end<=q.start||q.end>86400)))fail();
}
export function youtubeEmbed(q,origin){
 if(!validYouTubeId(q.videoId))return null;
 const u=new URL(`https://www.youtube-nocookie.com/embed/${q.videoId}`);
 const values={enablejsapi:1,playsinline:1,controls:q.controls?1:0,autoplay:0,fs:1,start:q.start,...(q.end!==null?{end:q.end}:{}),...(q.loop?{loop:1,playlist:q.videoId}:{}),...(origin&&/^https?:\/\//.test(origin)?{origin}:{})};
 for(const [k,v]of Object.entries(values))u.searchParams.set(k,String(v));return u.href;
}
export function youtubeKeyboardFocus(event){const doc=event.target?.ownerDocument||globalThis.document;return !!(event.target?.closest?.('[data-youtube-interacting="true"]')||doc?.activeElement?.matches?.('iframe[data-youtube-player]'));}
export function youtubeAspectPatch(item,patch){if(!item||item.type!=='youtube'||!item.youtube.lockAspect)return patch;const next={...patch};if(patch.width!==undefined&&patch.height===undefined)next.height=patch.width;if(patch.height!==undefined&&patch.width===undefined)next.width=patch.height;if(patch.width!==undefined&&patch.height!==undefined){const side=Math.min(patch.width,patch.height);next.width=side;next.height=side;}const side=Math.max(.02,Math.min(next.width??item.width,next.height??item.height,1-(patch.x??item.x),1-(patch.y??item.y)));return {...next,width:side,height:side};}
