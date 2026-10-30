import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve('dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'});return res.end('{"ok":true}')}const p=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!p.startsWith(root+sep)){res.writeHead(403);return res.end('Forbidden')}if(!(await stat(p)).isFile())throw Error();res.writeHead(200,{'Content-Type':types[extname(p)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(await readFile(p))}catch{res.writeHead(404);res.end('Not found')}});
server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('RescueMap ready'));
