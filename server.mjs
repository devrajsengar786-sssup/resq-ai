import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./public/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
http.createServer(async(req,res)=>{
 if(req.url==='/health'){res.writeHead(200,{'Content-Type':'text/plain'});return res.end('ok');}
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
 try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root)||!types[path.extname(file)])throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)],'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:body);}catch{res.writeHead(404);res.end('Not found');}
}).listen(Number(process.env.PORT)||8080,'0.0.0.0');
