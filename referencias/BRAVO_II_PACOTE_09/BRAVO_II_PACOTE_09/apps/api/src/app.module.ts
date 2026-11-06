import {MiddlewareConsumer,Module,NestModule} from '@nestjs/common';
import {CorePrismaModule} from './core/prisma/prisma.service.js';
import {AuthContextMiddleware} from './core/auth/auth-context.middleware.js';
import {AuthController} from './core/auth/auth.controller.js';
import {AuthService} from './core/auth/auth.service.js';
import {NavigationController} from './core/nav/nav.controller.js';
import {HealthController} from './core/health/health.controller.js';
import {BravoPacote06Module} from './modules/pacote06/module.js';
import {BravoPacote08Module} from './modules/pacote08/module.js';
import {BravoPacote09Module} from './modules/pacote09/module.js';
@Module({imports:[CorePrismaModule,BravoPacote06Module,BravoPacote08Module,BravoPacote09Module],controllers:[AuthController,NavigationController,HealthController],providers:[AuthService,AuthContextMiddleware]})
export class AppModule implements NestModule{
  configure(consumer:MiddlewareConsumer){consumer.apply(AuthContextMiddleware).forRoutes('*');}
}
