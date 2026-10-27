// Native decoding avoids a JavaScript loop over every media byte in recent browsers.
// Keep the fallback for older Chrome/Edge and previously supported browsers.
export function decodeBase64Bytes(value){
 if(typeof Uint8Array.fromBase64==='function')return Uint8Array.fromBase64(value);
 const raw=atob(value),bytes=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 return bytes;
}
