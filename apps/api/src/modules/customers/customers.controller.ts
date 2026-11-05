import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { AuthGuard, type AuthenticatedRequest } from '../../common/auth/auth.guard';
import { ensureCorrelationId } from '@bravo-ii/telemetry';

@Controller('api/v1/customers')
@UseGuards(AuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async listCustomers() {
    const items = await this.customersService.listCustomers();
    return { items };
  }

  @Post()
  async createCustomer(@Body() body: unknown, @Req() req: AuthenticatedRequest) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.customersService.createCustomer(body, req.actor!, correlationId);
  }
}
