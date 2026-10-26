// One reusable bitmap, updated only for transitions that request an ending fade.
export function watchLastVideoFrame(video,enabled){
 let canvas=null,frame,cancelled=false;
 function capture(){if(!enabled||cancelled||video.readyState<2||!video.videoWidth)return;try{canvas ||= video.ownerDocument.createElement('canvas');if(canvas.width!==video.videoWidth)canvas.width=video.videoWidth;if(canvas.height!==video.videoHeight)canvas.height=video.videoHeight;canvas.getContext('2d').drawImage(video,0,0);}catch{canvas=null;}}
 function tick(){capture();if(!cancelled&&video.requestVideoFrameCallback)frame=video.requestVideoFrameCallback(tick);}
 if(enabled){if(video.requestVideoFrameCallback)frame=video.requestVideoFrameCallback(tick);else{video.addEventListener('timeupdate',capture);video.addEventListener('loadeddata',capture);}}
 return {get canvas(){return canvas;},capture,dispose(){cancelled=true;if(frame!==undefined)video.cancelVideoFrameCallback(frame);video.removeEventListener('timeupdate',capture);video.removeEventListener('loadeddata',capture);}};
}
export const postVideoEffect=options=>options?.afterVideo?.enabled?{type:'crossfade',duration:options.afterVideo.duration,easing:options.afterVideo.easing,direction:'left',fullPage:true}:null;
