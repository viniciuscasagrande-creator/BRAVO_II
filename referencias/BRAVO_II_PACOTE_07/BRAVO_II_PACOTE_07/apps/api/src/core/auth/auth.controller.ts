import {Body,Controller,Get,HttpCode,Post,Req,Res,UnauthorizedException,UseGuards} from '@nestjs/common';
import type {Response} from 'express';
import {AuthService} from './auth.service.js';
import type {AuthRequest} from './auth-context.middleware.js';
import {P06PrincipalGuard} from '../../modules/pacote06/security.js';
const COOKIE='bravo_session';
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly auth:AuthService){}
  @Post('login') @HttpCode(200)
  async login(@Body()body:{email:string;password:string},@Res({passthrough:true})res:Response){
    const secure=process.env.COOKIE_SECURE==='true';
    if(process.env.NODE_ENV==='production'&&!secure)throw new UnauthorizedException('COOKIE_SECURE deve ser true em produção');
    const result=await this.auth.login(body?.email,body?.password);
    res.cookie(COOKIE,result.token,{httpOnly:true,secure,sameSite:'lax',path:'/',maxAge:8*3600_000});
    return {user:result.user,csrfToken:result.csrfToken,expiresAt:result.expiresAt};
  }
  @Get('me') @UseGuards(P06PrincipalGuard)
  me(@Req()req:AuthRequest){return this.auth.me(req);}
  @Post('logout') @HttpCode(200) @UseGuards(P06PrincipalGuard)
  async logout(@Req()req:AuthRequest,@Res({passthrough:true})res:Response){
    await this.auth.logout(req);
    res.clearCookie(COOKIE,{httpOnly:true,secure:process.env.COOKIE_SECURE==='true',sameSite:'lax',path:'/'});
    return {ok:true};
  }
}
