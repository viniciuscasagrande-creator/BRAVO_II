/** Proxy interno (BFF) do Backoffice para NestJS. Nenhuma chave é enviada ao navegador. */
import {randomUUID} from 'node:crypto';
import type {NextRequest} from 'next/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
const MAX_JSON_BYTES=1024*1024;
function failure(status:number,message:string,diagnostics?:Record<string,unknown>):Response {
  return Response.json(
    diagnostics?{statusCode:status,message,diagnostics}:{statusCode:status,message},
    {status,headers:{'Cache-Control':'no-store'}}
  );
}
function getUpstream():URL {
  const raw=process.env.BRAVO_API_URL||'http://127.0.0.1:4100';
  const target=new URL(raw);
  if(target.username||target.password||target.pathname!=='/'||target.search||target.hash)throw new Error('BRAVO_API_URL deve conter apenas a origem da API');
  if(process.env.VERCEL==='1'){
    if(process.env.VERCEL_ENV!=='preview'&&(process.env.BRAVO_ENV!=='HOMOLOGACAO'||process.env.ENABLE_EXTERNAL_PUBLICATION==='true'))throw new Error('BFF liberado apenas em Preview');
    if(target.protocol!=='https:'||['localhost','127.0.0.1'].includes(target.hostname))throw new Error('BRAVO_API_URL deve apontar para API HTTPS da Vercel');
  }else if(!['http:','https:'].includes(target.protocol))throw new Error('BRAVO_API_URL inválida');
  if(!process.env.BRAVO_PROXY_KEY||process.env.BRAVO_PROXY_KEY.length<32)throw new Error('BRAVO_PROXY_KEY não configurada');
  return target;
}
async function handler(req:NextRequest,ctx:{params:Promise<{path:string[]}>}):Promise<Response>{
  const {path}=await ctx.params;
  if(!Array.isArray(path)||path.length<1||path.some(x=>!x||x==='.'||x==='..'||x.includes('/')||x.includes('\\')))
    return failure(400,'Rota inválida');
  const method=req.method.toUpperCase();
  const mutating=!['GET','HEAD','OPTIONS'].includes(method);
  const browserOrigin=req.headers.get('origin');
  const ownOrigin=new URL(req.url).origin;
  if(mutating&&browserOrigin!==ownOrigin)return failure(403,'Origem não autorizada');
  const declared=Number(req.headers.get('content-length')||0);
  if(mutating&&declared>MAX_JSON_BYTES)return failure(413,'Corpo da requisição acima do limite');
  const correlationId=req.headers.get('x-correlation-id')||randomUUID();
  const startedAt=Date.now();
  try{
    const upstream=getUpstream();
    const target=new URL(`/v1/${path.map(encodeURIComponent).join('/')}${new URL(req.url).search}`,upstream);
    const headers=new Headers({
      Accept:'application/json',
      'X-Bravo-Proxy-Key':process.env.BRAVO_PROXY_KEY!,
      'X-Correlation-Id':correlationId,
    });
    // Se a API estiver com Vercel Deployment Protection, usar segredo separado para bypass servidor-servidor.
    const protectionBypass=process.env.BRAVO_API_VERCEL_BYPASS_TOKEN;
    if(protectionBypass)headers.set('x-vercel-protection-bypass',protectionBypass);
    const cookie=req.headers.get('cookie');if(cookie)headers.set('Cookie',cookie);
    const auth=req.headers.get('authorization');if(auth)headers.set('Authorization',auth);
    const csrf=req.headers.get('x-csrf-token');if(csrf)headers.set('X-CSRF-Token',csrf);
    if(browserOrigin)headers.set('Origin',process.env.APP_ORIGIN||browserOrigin);
    const contentType=req.headers.get('content-type');
    if(mutating&&contentType&&!/^application\/json(?:;|$)/i.test(contentType))return failure(415,'Apenas requisições JSON são aceitas');
    if(contentType&&mutating)headers.set('Content-Type',contentType);
    let body:Uint8Array|undefined;
    if(mutating){
      const bytes=await req.arrayBuffer();
      if(bytes.byteLength>MAX_JSON_BYTES)return failure(413,'Corpo da requisição acima do limite');
      body=new Uint8Array(bytes);
    }
    const response=await fetch(target,{method,headers,body:body as BodyInit|undefined,cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(25000)});
    const outputHeaders=new Headers({
      'Cache-Control':'private, no-store, max-age=0',
      'X-Content-Type-Options':'nosniff',
      'X-Correlation-Id':correlationId,
      'X-Response-Time-Ms':String(Date.now()-startedAt),
    });
    const resultType=response.headers.get('content-type');if(resultType)outputHeaders.set('Content-Type',resultType);
    const cookies=response.headers.getSetCookie?.()||[];
    for(const setCookie of cookies)outputHeaders.append('Set-Cookie',setCookie);
    if(cookies.length===0){const single=response.headers.get('set-cookie');if(single)outputHeaders.append('Set-Cookie',single);}
    const retry=response.headers.get('retry-after');if(retry)outputHeaders.set('Retry-After',retry);
    // Não transportar headers de hop-by-hop ou redirecionamentos externos.
    return new Response(method==='HEAD'?null:response.body,{status:response.status,headers:outputHeaders});
  }catch(err){
    return failure(503,'Integração de homologação indisponível. Verifique a API e as variáveis do servidor.',{
      service:'bravo-ii-bff',
      correlationId,
      durationMs:Date.now()-startedAt,
      apiState:'UNREACHABLE_OR_MISCONFIGURED',
      hasBravoApiUrl:Boolean(process.env.BRAVO_API_URL),
      hasBravoProxyKey:Boolean(process.env.BRAVO_PROXY_KEY&&process.env.BRAVO_PROXY_KEY.length>=32),
      reason:err instanceof Error?err.message:'UNKNOWN_BFF_ERROR',
    });
  }
}
export const GET=handler;
export const POST=handler;
export const PATCH=handler;
export const PUT=handler;
export const DELETE=handler;
export const HEAD=handler;
