import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { CustomerInput } from '@bravo-ii/domain-p08';
import { ensureCorrelationId } from '@bravo-ii/telemetry';
import { AuthGuard, type AuthenticatedRequest } from '../../common/auth/auth.guard';
import { BravoCustomersService } from './customer.service';
import { BravoOrdersService, type ReserveInput } from './order.service';

@UseGuards(AuthGuard)
@Controller('v1/clientes')
export class BravoCustomersController {
  constructor(private readonly customers: BravoCustomersService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: CustomerInput) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.customers.create(body, req.actor!, correlationId);
  }

  @Get()
  search(@Req() req: AuthenticatedRequest, @Query('busca') search: string) {
    return this.customers.search(search, req.actor!);
  }

  @Get(':id')
  get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.customers.get(id, req.actor!);
  }
}

@UseGuards(AuthGuard)
@Controller('v1/pedidos')
export class BravoOrdersController {
  constructor(private readonly orders: BravoOrdersService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.orders.list(req.actor!);
  }

  @Post('reservas')
  reserve(@Req() req: AuthenticatedRequest, @Body() body: ReserveInput) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.orders.reserve(body, req.actor!, undefined, correlationId);
  }

  @Post('reservas/expiradas/processar')
  expire(@Req() req: AuthenticatedRequest) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.orders.expireReserved(req.actor!, correlationId);
  }

  @Get('cupons/validar')
  validateCoupon(
    @Req() req: AuthenticatedRequest,
    @Query('eventId') eventId: string,
    @Query('code') code: string,
    @Query('subtotalCents') subtotalCents: string
  ) {
    return this.orders.validateCouponForOrder(
      eventId,
      code,
      Number(subtotalCents || 0),
      req.actor!
    );
  }

  @Get('eventos/:eventId/setores/:sectorId/poltronas')
  listSeats(
    @Req() req: AuthenticatedRequest,
    @Param('eventId') eventId: string,
    @Param('sectorId') sectorId: string
  ) {
    return this.orders.listAvailableSeats(eventId, sectorId, req.actor!);
  }

  @Get(':id')
  get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.orders.get(id, req.actor!);
  }

  @Post(':id/cancelar-reserva')
  cancel(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.orders.cancelUnpaid(id, req.actor!, correlationId);
  }
  // Proibido criar endpoint HTTP público de confirmação de pagamento aqui.
}

@UseGuards(AuthGuard)
@Controller('v1/ingressos')
export class BravoTicketsController {
  constructor(private readonly orders: BravoOrdersService) {}

  @Get()
  find(@Req() req: AuthenticatedRequest, @Query('numero') number: string) {
    return this.orders.findTicket(number, req.actor!);
  }
}
