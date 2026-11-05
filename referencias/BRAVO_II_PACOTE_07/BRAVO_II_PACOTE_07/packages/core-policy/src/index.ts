/** Fonte única de permissões de menu. API sempre valida as permissões nas operações. */
export const ROLES = ['ADMIN','COMERCIAL','CADASTRO','OPERACOES','PUBLICACAO','FINANCEIRO_DISK','AUDITOR','RH','PRODUTOR'] as const;
export type Role = (typeof ROLES)[number];
export type MenuItem = { id:string; label:string; href:string; roles:readonly Role[]; status:'ATIVO'|'EM_IMPLANTACAO'; group:string };
export const MENU:readonly MenuItem[] = [
  {id:'home',label:'Painel inicial',href:'/',roles:['ADMIN','COMERCIAL','CADASTRO','OPERACOES','PUBLICACAO','FINANCEIRO_DISK','AUDITOR','RH'],status:'ATIVO',group:'Geral'},
  {id:'produtores',label:'Central de Produtores',href:'/comercial/produtores',roles:['ADMIN','COMERCIAL','CADASTRO','OPERACOES','FINANCEIRO_DISK','AUDITOR'],status:'ATIVO',group:'Comercial'},
  {id:'eventos',label:'Gestão de Eventos',href:'/eventos',roles:['ADMIN','COMERCIAL','CADASTRO','OPERACOES','PUBLICACAO','FINANCEIRO_DISK','AUDITOR'],status:'ATIVO',group:'Eventos'},
  {id:'taxas',label:'Taxa Disk por evento',href:'/comercial',roles:['ADMIN','COMERCIAL','FINANCEIRO_DISK','AUDITOR'],status:'ATIVO',group:'Comercial'},
  {id:'financeiro',label:'Financeiro Disk — 104 funções',href:'/financeiro',roles:['ADMIN','FINANCEIRO_DISK','AUDITOR'],status:'EM_IMPLANTACAO',group:'Financeiro'},
  {id:'rh',label:'RH e Departamento Pessoal — 45 funções',href:'/rh',roles:['ADMIN','RH','AUDITOR'],status:'EM_IMPLANTACAO',group:'Pessoas'},
];
export function hasAnyRole(actorRoles:readonly string[],permitted:readonly string[]):boolean {
  return actorRoles.some(role=>permitted.includes(role));
}
export function menuForRoles(actorRoles:readonly string[]):MenuItem[] {
  if (!Array.isArray(actorRoles)) return [];
  return MENU.filter(item=>hasAnyRole(actorRoles,item.roles)).map(x=>({...x}));
}
export function isPermittedNav(actorRoles:readonly string[],href:string):boolean {
  return MENU.some(m=>m.href===href && m.status==='ATIVO' && hasAnyRole(actorRoles,m.roles));
}
export function originAllowed(origin:string|undefined,accepted:string):boolean {
  try {
    const parsed=new URL(origin||'');
    const target=new URL(accepted);
    return parsed.origin===target.origin && ['https:','http:'].includes(parsed.protocol);
  } catch {return false;}
}
export function isMutating(method:string):boolean {return !['GET','HEAD','OPTIONS'].includes(method.toUpperCase());}
export function assertCookieToken(cookieHeader:string|undefined,key='bravo_session'):string|undefined {
  // Evita aceitar valores duplicados ou injetados com delimitadores.
  const found=(cookieHeader||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(key+'='));
  if(found.length!==1)return undefined;
  const value=found[0].slice(key.length+1);
  return /^[A-Za-z0-9_-]{43}$/.test(value)?value:undefined;
}
