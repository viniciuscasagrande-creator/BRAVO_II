import {Body,Controller,Get,Param,Post,UseGuards} from '@nestjs/common';
import {P06PrincipalGuard,Principal,Actor} from '../pacote06/security.js';
import {BravoCheckoutService} from './checkout.service.js';
import {BravoPdvService} from './pdv.service.js';
import {ReserveInput} from '../pacote08/order.service.js';
@UseGuards(P06PrincipalGuard)
@Controller('v1/checkout')
export class BravoCheckoutController {
 constructor(private readonly checkout:BravoCheckoutService){}
 @Get('pedidos/:orderId/tentativas') list(@Param('orderId')id:string,@Principal()actor:Actor){return this.checkout.list(id,actor);}
 @Post('pedidos/:orderId/tentativas') prepare(@Param('orderId')id:string,@Body()body:{provider:string;method:string;idempotencyKey:string},@Principal()actor:Actor){return this.checkout.prepare(id,body,actor);}
 @Post('tentativas/:id/iniciar-sandbox') start(@Param('id')id:string,@Principal()actor:Actor){return this.checkout.startPagbankSandbox(id,actor);}
 @Get('tentativas/:id/consultar-sandbox') consult(@Param('id')id:string,@Principal()actor:Actor){return this.checkout.consultPagbankSandbox(id,actor);}
 // Nenhum webhook, confirmação, captura ou estorno é exposto neste controlador.
}
@UseGuards(P06PrincipalGuard)
@Controller('v1/pdv')
export class BravoPdvController {
 constructor(private readonly pdv:BravoPdvService){}
 @Get('terminais') list(@Principal()actor:Actor){return this.pdv.list(actor);}
 @Post('terminais') register(@Body()body:{code:string;label:string;venue:string},@Principal()actor:Actor){return this.pdv.register(body,actor);}
 @Post('terminais/:id/turnos') open(@Param('id')id:string,@Principal()actor:Actor){return this.pdv.openShift(id,actor);}
 @Post('turnos/:id/fechar') close(@Param('id')id:string,@Principal()actor:Actor){return this.pdv.closeShift(id,actor);}
 @Post('terminais/:id/turnos/:shiftId/reservas') reserve(@Param('id')id:string,@Param('shiftId')shiftId:string,@Body()body:Omit<ReserveInput,'channel'>,@Principal()actor:Actor){return this.pdv.reserve(id,shiftId,body,actor);}
}
