import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||4173);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.txt':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
 try{
 const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+(route==='/'?'/index.html':route));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return}
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
 const data=await fs.readFile(file);
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
 res.end(req.method==='HEAD'?undefined:data);
 }catch{res.writeHead(404);res.end('Not found')}
});
server.listen(port,'127.0.0.1',()=>{
 const url='http://127.0.0.1:'+port;console.log('Shadowline War ready: '+url);
 if(process.argv.includes('--open')){
 const command=process.platform==='win32'?'rundll32.exe':process.platform==='darwin'?'open':'xdg-open';
 const args=process.platform==='win32'?['url.dll,FileProtocolHandler',url]:[url];
 const browser=spawn(command,args,{windowsHide:true,stdio:'ignore'});
 browser.on('error',()=>console.log('Open '+url+' in your browser.'));
 }
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'Port '+port+' is busy. Set PORT to another number.':e.message);process.exitCode=1});
