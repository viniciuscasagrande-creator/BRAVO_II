import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const PUBLIC=resolve(fileURLToPath(new URL('./public/', import.meta.url)));
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
const port=Number(process.env.PORT||4173);
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const filename=resolve(PUBLIC,'.'+(pathname==='/'?'/index.html':pathname));
  if(filename!==PUBLIC && !filename.startsWith(PUBLIC+sep)){res.writeHead(403);res.end('Proibido');return}
  const info=await stat(filename);if(!info.isFile())throw new Error('Arquivo não encontrado');
  const body=await readFile(filename);res.writeHead(200,{'Content-Type':MIME[extname(filename)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);
 }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Não encontrado')}
});
server.listen(port,()=>console.log(`BRAVO_II Preview pronto: http://localhost:${port} (somente navegação, sem operações reais)`));
