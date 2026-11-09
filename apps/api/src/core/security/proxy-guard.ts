import {createHash,timingSafeEqual} from 'node:crypto';
/** Bloqueia acesso direto ao backend: apenas o BFF do Backoffice conhece a chave. */
export function isValidProxyKey(provided:unknown,expected:string|undefined):boolean {
  if(typeof provided!=='string'||typeof expected!=='string'||expected.length<32||provided.length>512)return false;
  const a=createHash('sha256').update(provided,'utf8').digest();
  const b=createHash('sha256').update(expected,'utf8').digest();
  return timingSafeEqual(a,b);
}
export function proxyGuardRequired(env:NodeJS.ProcessEnv):boolean {
  return env.VERCEL==='1'||env.ENABLE_BRAVO_PROXY_GUARD==='true';
}
export function validatePreviewDeploymentEnv(env:NodeJS.ProcessEnv):string[] {
  const errors:string[]=[];
  if(env.VERCEL==='1'){
    if(env.VERCEL_ENV!=='preview'&&(env.BRAVO_ENV!=='HOMOLOGACAO'||env.ENABLE_EXTERNAL_PUBLICATION==='true'))errors.push('Implantação Vercel só é permitida em Preview/Homologação');
    if(!env.BRAVO_PROXY_KEY||env.BRAVO_PROXY_KEY.length<32)errors.push('BRAVO_PROXY_KEY não configurada (mínimo 32 caracteres)');
  }
  if(env.ENABLE_BRAVO_PROXY_GUARD==='true'&&(!env.BRAVO_PROXY_KEY||env.BRAVO_PROXY_KEY.length<32))errors.push('BRAVO_PROXY_KEY não configurada');
  return errors;
}
