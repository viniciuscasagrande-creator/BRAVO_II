import {Injectable,UnauthorizedException,ForbiddenException} from '@nestjs/common';
import {CorePrismaService} from '../prisma/prisma.service.js';
import {csrfForToken,hashSessionToken,newSessionToken,verifyPassword} from './auth-crypto.js';
import type {AuthRequest} from './auth-context.middleware.js';
const SESSION_HOURS=8;
@Injectable()
export class AuthService {
  constructor(private readonly db:CorePrismaService){}
  async login(rawEmail:string,password:string){
    const email=typeof rawEmail==='string'?rawEmail.trim().toLowerCase():'';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof password!=='string')throw new UnauthorizedException('Credenciais inválidas');
    const user=await this.db.bravoIdentityUser.findUnique({where:{email}});
    if(!user||user.status!=='ATIVO'||(user.lockedUntil&&user.lockedUntil>new Date()))throw new UnauthorizedException('Credenciais inválidas');
    if(!await verifyPassword(password,user.passwordHash)){
      const attempts=user.failedLogins+1;
      await this.db.bravoIdentityUser.update({where:{id:user.id},data:{failedLogins:{increment:1},lockedUntil:attempts>=5?new Date(Date.now()+30*60*1000):null}});
      throw new UnauthorizedException('Credenciais inválidas');
    }
    // Uma conta bloqueada exige desbloqueio administrativo, não se auto-recupera após expirar.
    if(user.failedLogins>=5)throw new ForbiddenException('Conta bloqueada; solicite liberação ao administrador');
    const token=newSessionToken();
    const expiresAt=new Date(Date.now()+SESSION_HOURS*3600_000);
    await this.db.$transaction(async tx=>{
      await tx.bravoIdentityUser.update({where:{id:user.id},data:{failedLogins:0,lockedUntil:null}});
      await tx.bravoIdentitySession.create({data:{userId:user.id,tokenHash:hashSessionToken(token),expiresAt}});
      await tx.bravoAudit.create({data:{actorId:user.id,action:'LOGIN',resource:'SESSAO',resourceId:user.id,after:{status:'ABERTA'}}});
    });
    return {token,expiresAt,csrfToken:csrfForToken(token),user:{id:user.id,email:user.email,roles:user.roles,forcePasswordChange:user.forcePasswordChange}};
  }
  async me(req:AuthRequest){
    if(!req.user||!req.sessionToken)throw new UnauthorizedException('Sessão inválida');
    const user=await this.db.bravoIdentityUser.findUnique({where:{id:req.user.id},select:{id:true,email:true,roles:true,forcePasswordChange:true}});
    if(!user)throw new UnauthorizedException('Usuário não localizado');
    return {user,csrfToken:csrfForToken(req.sessionToken)};
  }
  async logout(req:AuthRequest){
    if(!req.sessionId||!req.user)throw new UnauthorizedException('Sessão inválida');
    await this.db.$transaction(async tx=>{
      await tx.bravoIdentitySession.update({where:{id:req.sessionId},data:{revokedAt:new Date()}});
      await tx.bravoAudit.create({data:{actorId:req.user!.id,action:'LOGOUT',resource:'SESSAO',resourceId:req.sessionId!}});
    });
  }
}
