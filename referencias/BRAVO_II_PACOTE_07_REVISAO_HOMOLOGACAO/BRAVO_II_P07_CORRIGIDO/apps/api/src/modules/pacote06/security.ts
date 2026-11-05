import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, createParamDecorator } from '@nestjs/common';
export type Actor = {id:string; roles:string[]; scopes?:{eventIds?:string[]; producerIds?:string[]}};
/** O Core do Pacote 05 deve validar uma sessão real e colocar o principal CONFIÁVEL em req.user.
 * Este guard nunca aceita ID/role do body, query, cookie cru ou cabeçalhos escolhidos pelo cliente.
 * Sem Core autenticado, TODAS as rotas fecham com 401. */
@Injectable()
export class P06PrincipalGuard implements CanActivate {
  canActivate(context:ExecutionContext):boolean {
    const req=context.switchToHttp().getRequest<{user?:Actor}>();
    if(!req.user || typeof req.user.id!=='string' || !req.user.id || !Array.isArray(req.user.roles)) throw new UnauthorizedException('Sessão do Core não autenticada');
    return true;
  }
}
export const Principal = createParamDecorator((_data:unknown,ctx:ExecutionContext)=>ctx.switchToHttp().getRequest().user as Actor);
export function requireInternal(actor:Actor,...permitted:string[]):void {
  if(!actor.roles.some(r=>permitted.includes(r))) throw new ForbiddenException('Acesso negado ao módulo');
}
export function roleForStep(actor:Actor,allowed:string[]):string {
  const role=actor.roles.find(r=>allowed.includes(r));
  if(!role) throw new ForbiddenException('Perfil sem alçada para esta aprovação');
  return role;
}
