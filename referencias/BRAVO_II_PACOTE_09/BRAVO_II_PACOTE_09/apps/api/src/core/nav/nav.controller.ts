import {Controller,Get,Req,UseGuards} from '@nestjs/common';
import {menuForRoles} from '@bravo-ii/core-policy';
import {P06PrincipalGuard} from '../../modules/pacote06/security.js';
import type {AuthRequest} from '../auth/auth-context.middleware.js';
@Controller('v1/navegacao') @UseGuards(P06PrincipalGuard)
export class NavigationController {
  @Get('menu') menu(@Req()req:AuthRequest){return {items:menuForRoles(req.user!.roles),version:'09-homologacao'};}
}
