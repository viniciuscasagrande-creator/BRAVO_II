import {Body,Controller,Get,Param,Post,Query,UseGuards} from '@nestjs/common';
import {CustomerInput} from '@bravo-ii/domain-p08';
import {P06PrincipalGuard,Principal,Actor} from '../pacote06/security.js';
import {BravoCustomersService} from './customer.service.js';
import {BravoOrdersService,ReserveInput} from './order.service.js';

@UseGuards(P06PrincipalGuard)
@Controller('v1/clientes')
export class BravoCustomersController {
  constructor(private readonly customers:BravoCustomersService){}
  @Post() create(@Body()body:CustomerInput,@Principal()actor:Actor){return this.customers.create(body,actor);}
  @Get() search(@Query('busca')search:string,@Principal()actor:Actor){return this.customers.search(search,actor);}
  @Get(':id') get(@Param('id')id:string,@Principal()actor:Actor){return this.customers.get(id,actor);}
}
@UseGuards(P06PrincipalGuard)
@Controller('v1/pedidos')
export class BravoOrdersController {
  constructor(private readonly orders:BravoOrdersService){}
  @Get() list(@Principal()actor:Actor){return this.orders.list(actor);}
  @Post('reservas') reserve(@Body()body:ReserveInput,@Principal()actor:Actor){return this.orders.reserve(body,actor);}
  @Post('reservas/expiradas/processar') expire(@Principal()actor:Actor){return this.orders.expireReserved(actor);}
  @Get(':id') get(@Param('id')id:string,@Principal()actor:Actor){return this.orders.get(id,actor);}
  @Post(':id/cancelar-reserva') cancel(@Param('id')id:string,@Principal()actor:Actor){return this.orders.cancelUnpaid(id,actor);}
  // Proibido criar endpoint de confirmação de pagamento aqui.
}

@UseGuards(P06PrincipalGuard)
@Controller('v1/ingressos')
export class BravoTicketsController {
  constructor(private readonly orders:BravoOrdersService){}
  @Get() find(@Query('numero')number:string,@Principal()actor:Actor){return this.orders.findTicket(number,actor);}
}
