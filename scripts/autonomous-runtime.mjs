import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
export async function autonomousRuntime(){
 const result=await build({entryPoints:['src/autonomous-main.jsx'],bundle:true,jsx:'automatic',write:false,outfile:'autonomous.js',format:'iife',minify:true,legalComments:'inline',target:['chrome100','firefox100','safari16'],define:{'process.env.NODE_ENV':'"production"'}});
 const fontCatalog=JSON.parse(await readFile('src/fontCatalog.json','utf8')),fonts={},licenses={};
 for(const [id,font] of Object.entries(fontCatalog)){
  for(const face of font.faces)fonts[face.url]='data:font/woff2;base64,'+(await readFile(path.join('public',face.url))).toString('base64');
  licenses[`polices/${id}-OFL.txt`]=await readFile(`public/fonts/${id}/OFL.txt`,'utf8');
 }
 for(const name of ['react','react-dom','scheduler'])licenses[`${name}-LICENSE.txt`]=await readFile(`node_modules/${name}/LICENSE`,'utf8');
 return {format:1,js:result.outputFiles.find(f=>f.path.endsWith('.js')).text,css:result.outputFiles.find(f=>f.path.endsWith('.css')).text,fonts,licenses};
}
export function autonomousExportPlugin(){
 let devRuntime;
 return {name:'studio-autonomous-export',
  configureServer(server){server.middlewares.use('/autonomous-player.json',async(req,res,next)=>{
   if(req.method!=='GET')return next();
   try{devRuntime??=autonomousRuntime().catch(error=>{devRuntime=null;throw error;});res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(await devRuntime));}catch(error){res.statusCode=500;res.end(JSON.stringify({error:'Le lecteur autonome ne peut pas être préparé.'}));server.config.logger.error(error.stack);}
  });server.watcher.on('change',()=>{devRuntime=null;});},
  async generateBundle(){this.emitFile({type:'asset',fileName:'autonomous-player.json',source:JSON.stringify(await autonomousRuntime())});}
 };
}
