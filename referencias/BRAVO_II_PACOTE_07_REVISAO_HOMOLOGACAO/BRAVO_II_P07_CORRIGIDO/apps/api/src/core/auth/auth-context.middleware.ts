import {ForbiddenException,Injectable,NestMiddleware} from '@nestjs/common';
import {NextFunction,Request,Response} from 'express';
import {Actor} from '../../modules/pacote06/security.js';
import {CorePrismaService} from '../prisma/prisma.service.js';
import {assertCookieToken,isMutating,originAllowed} from '@bravo-ii/core-policy';
import {compareSecret,csrfForToken,hashSessionToken} from './auth-crypto.js';
export type AuthRequest=Request & {user?:Actor;sessionToken?:string;sessionId?:string};
@Injectable()
export class AuthContextMiddleware implements NestMiddleware {
  constructor(private readonly db:CorePrismaService){}
  async use(req:AuthRequest,_res:Response,next:NextFunction){
    // Qualquer mutação requer Origin válido (inclusive login); nunca liberar CORS universal.
    if(isMutating(req.method)){
      const allowed=process.env.APP_ORIGIN;
      if(!allowed||!originAllowed(req.header('origin'),allowed))throw new ForbiddenException('Origem não autorizada');
    }
    const token=assertCookieToken(req.header('cookie'));
    if(token){
      const session=await this.db.bravoIdentitySession.findUnique({
        where:{tokenHash:hashSessionToken(token)},include:{user:true}
      });
      if(session&&!session.revokedAt&&session.expiresAt>new Date()&&session.user.status==='ATIVO'){
        req.user={id:session.user.id,roles:session.user.roles};
        req.sessionToken=token;
        req.sessionId=session.id;
      }
    }
    // Cross-site POST bloqueado mesmo sem cookie. Para sessão ativa, exigir token CSRF.
    if(isMutating(req.method) && !req.path.endsWith('/auth/login')){
      if(!req.user||!req.sessionToken)throw new ForbiddenException('Sessão obrigatória');
      const provided=req.header('x-csrf-token')||'';
      if(!compareSecret(provided,csrfForToken(req.sessionToken)))throw new ForbiddenException('Token CSRF inválido');
    }
    next();
  }
}
