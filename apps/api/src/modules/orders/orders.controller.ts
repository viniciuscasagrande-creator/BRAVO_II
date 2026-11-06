import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AuthGuard, type AuthenticatedRequest } from '../../common/auth/auth.guard';
import { ensureCorrelationId } from '@bravo-ii/telemetry';
import type { Request } from 'express';

@Controller(['api/v1', 'v1'])
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('orders')
  @UseGuards(AuthGuard)
  async listOrders() {
    const items = await this.ordersService.listOrders();
    return { items };
  }

  @Post('orders')
  @UseGuards(AuthGuard)
  async createOrder(@Body() body: unknown, @Req() req: AuthenticatedRequest) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.ordersService.createOrder(body, req.actor!, correlationId);
  }

  @Post('orders/:orderId/checkout')
  @UseGuards(AuthGuard)
  async checkoutOrder(
    @Param('orderId') orderId: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.ordersService.checkoutOrder(orderId, body, req.actor!, correlationId);
  }

  /**
   * Endpoint de Webhook do Provedor de Pagamento Sandbox (autenticado via assinatura do provedor).
   */
  @Post('webhooks/payments/:provider')
  async handlePaymentWebhook(
    @Param('provider') provider: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.ordersService.handlePaymentWebhook(provider, body, correlationId);
  }
}
