export async function request<T>(path:string,options:RequestInit={}):Promise<T>{
 const response=await fetch(`/v1/${path}`,{...options,credentials:'same-origin',cache:'no-store'});
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(typeof body.message==='string'?body.message:'Não foi possível concluir a consulta.');
 return body as T;
}
export const get=<T>(path:string)=>request<T>(path);
export const currentSession=()=>get<{user:{roles:string[]}}> ('auth/me');
