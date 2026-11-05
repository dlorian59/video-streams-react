import { build } from 'esbuild';
import { createSecureServer, connect, constants } from 'node:http2';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');const output=resolve(root,'output/spring-demo');await mkdir(output,{recursive:true});
const cert=process.env.DEMO_TLS_CERT;const key=process.env.DEMO_TLS_KEY;
if(!cert||!key)throw Error('Set DEMO_TLS_CERT and DEMO_TLS_KEY to your local test certificate files; see CONTRIBUTING.md');
await build({entryPoints:[resolve(root,'examples/spring-react/main.tsx')],bundle:true,format:'esm',alias:{react:resolve(root,'node_modules/react'),'react-dom':resolve(root,'node_modules/react-dom')},outfile:resolve(output,'main.js')});
// A loopback-only HTTP/2 proxy preserves the raw request stream and same-origin session cookies.
// HTTP/2 proxy только на loopback сохраняет исходный поток запроса и same-origin session cookies.
const backend=connect('https://127.0.0.1:19445',{rejectUnauthorized:false});backend.on('error',error=>console.error('Demo backend connection:',error.message));
const server=createSecureServer({allowHTTP1:true,cert:await readFile(cert),key:await readFile(key)},async(request,response)=>{
 try{
  const path=new URL(request.url,'https://127.0.0.1:5182').pathname;
  if(path.startsWith('/api/')||path==='/login'||path==='/logout'){
   const headers={':method':request.method,':path':request.url};
   for(const [name,value]of Object.entries(request.headers))if(!name.startsWith(':')&&!['host','connection','keep-alive','transfer-encoding','upgrade','http2-settings'].includes(name))headers[name]=value;
   const upstream=backend.request(headers);upstream.on('response',incoming=>{const copy={};for(const[name,value]of Object.entries(incoming))if(!name.startsWith(':'))copy[name]=value;response.writeHead(incoming[':status'],copy);});
   upstream.on('error',()=>{if(!response.headersSent)response.writeHead(502);response.end();});request.on('aborted',()=>upstream.close(constants.NGHTTP2_CANCEL));response.on('close',()=>{if(!upstream.closed)upstream.close(constants.NGHTTP2_CANCEL);});
   request.pipe(upstream);upstream.pipe(response);return;
  }
  const file=path==='/'?resolve(root,'examples/spring-react/index.html'):['/main.js','/main.css'].includes(path)?resolve(output,path.slice(1)):null;
  if(!file){response.writeHead(404).end();return;}response.setHeader('content-type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css':'application/javascript');response.end(await readFile(file));
 }catch{if(!response.headersSent)response.writeHead(500);response.end();}
});
server.listen(5182,'127.0.0.1',()=>console.log('Spring video example https://127.0.0.1:5182'));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{backend.close();server.close(()=>process.exit(0));});
