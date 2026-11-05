/** Requer proxy same-origin /v1/* para NestJS com a sessão real do Core (cookie HttpOnly + CSRF).
 * Nunca aceita `role`, `userId` ou token local vindo da UI. */
export class ApiFailure extends Error {constructor(public status:number,public code:string,message:string){super(message);this.name='ApiFailure';}}
export async function request<T>(path:string,options:RequestInit={}):Promise<T>{
  const res=await fetch(`/v1/${path.replace(/^\/+/, '')}`, {credentials:'same-origin',cache:'no-store',...options,headers:{'Content-Type':'application/json',...options.headers}});
  if(!res.ok){const detail=await res.json().catch(()=>({}));throw new ApiFailure(res.status,detail?.error?.code||'API',detail?.error?.message||detail?.message||`Falha HTTP ${res.status}`);}
  return await res.json() as T;
}
export const get=<T>(path:string)=>request<T>(path);
export const post=<T>(path:string,body?:unknown)=>request<T>(path,{method:'POST',body:JSON.stringify(body??{})});
export const patch=<T>(path:string,body:unknown)=>request<T>(path,{method:'PATCH',body:JSON.stringify(body)});
export type ProducerSummary={id:string;legalName:string;tradeName?:string;cnpj:string;status:string;createdAt:string};
export type EventSummary={id:string;name:string;status:string;startsAt:string;endsAt:string;createdAt:string;producers:{producer:{legalName:string};role:string}[]};
export type EventFull={id:string;name:string;status:string;revision:number;startsAt:string;endsAt:string;salesStartAt?:string;producers:{producer:{id:string;legalName:string;status:string};role:string}[];sessions:{id:string;name:string;startsAt:string;endsAt:string;capacity:number}[];areas:{id:string;label:string;capacity:number;isNumbered:boolean}[];ticketCategories:{id:string;name:string}[];lots:{id:string;name:string;faceValueCents:number;capacity:number}[];channels:{channel:string;enabled:boolean}[];approvals:{step:string;decision:string;actorId:string}[]};
