import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ensureCorrelationId } from '@bravo-ii/telemetry';
import { AuthGuard, type AuthenticatedRequest } from '../../common/auth/auth.guard';
import type { ReserveInput } from '../pacote08/order.service';
import { BravoCheckoutService } from './checkout.service';
import { BravoPdvService } from './pdv.service';

@UseGuards(AuthGuard)
@Controller('v1/checkout')
export class BravoCheckoutController {
  constructor(private readonly checkout: BravoCheckoutService) {}

  @Get('pedidos/:orderId/tentativas')
  list(@Req() req: AuthenticatedRequest, @Param('orderId') id: string) {
    return this.checkout.list(id, req.actor!);
  }

  @Post('pedidos/:orderId/tentativas')
  prepare(
    @Req() req: AuthenticatedRequest,
    @Param('orderId') id: string,
    @Body() body: { provider: string; method: string; idempotencyKey: string }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.checkout.prepare(id, body, req.actor!, correlationId);
  }

  @Post('tentativas/:id/iniciar-sandbox')
  start(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.checkout.startPagbankSandbox(id, req.actor!, correlationId);
  }

  @Get('tentativas/:id/consultar-sandbox')
  consult(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.checkout.consultPagbankSandbox(id, req.actor!);
  }
  // Nenhum webhook, confirmação, captura ou estorno é exposto neste controlador.
}

@UseGuards(AuthGuard)
@Controller('v1/pdv')
export class BravoPdvController {
  constructor(private readonly pdv: BravoPdvService) {}

  @Get('terminais')
  list(@Req() req: AuthenticatedRequest) {
    return this.pdv.list(req.actor!);
  }

  @Get('turnos')
  listShifts(@Req() req: AuthenticatedRequest) {
    return this.pdv.listShifts(req.actor!);
  }

  @Get('terminais/:id/conciliacao')
  reconcileTerminal(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.pdv.reconcileTerminal(id, req.actor!);
  }

  @Post('terminais')
  register(
    @Req() req: AuthenticatedRequest,
    @Body() body: { code: string; label: string; venue: string }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.pdv.register(body, req.actor!, correlationId);
  }

  @Post('terminais/:id/turnos')
  open(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.pdv.openShift(id, req.actor!, correlationId);
  }

  @Post('turnos/:id/fechar')
  close(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.pdv.closeShift(id, req.actor!, correlationId);
  }

  @Post('terminais/:id/turnos/:shiftId/reservas')
  reserve(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('shiftId') shiftId: string,
    @Body() body: Omit<ReserveInput, 'channel'>
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.pdv.reserve(id, shiftId, body, req.actor!, correlationId);
  }
}
