import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ProducersService } from './producers.service';
import { AuthGuard, type AuthenticatedRequest, RequirePermission } from '../../common/auth/auth.guard';
import { ensureCorrelationId } from '@bravo-ii/telemetry';

@Controller('api/v1/producers')
@UseGuards(AuthGuard)
export class ProducersController {
  constructor(private readonly producersService: ProducersService) {}

  @Get()
  @RequirePermission('commercial:read')
  async listProducers() {
    const items = await this.producersService.listProducers();
    return { items };
  }

  @Get(':producerId')
  @RequirePermission('commercial:read')
  async getProducer(@Param('producerId') producerId: string) {
    return this.producersService.getProducerById(producerId);
  }

  @Post()
  @RequirePermission('commercial:write')
  async createProducer(@Body() body: unknown, @Req() req: AuthenticatedRequest) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.producersService.createProducer(body, req.actor!, correlationId);
  }

  @Post(':producerId/contacts')
  @RequirePermission('commercial:write')
  async addContact(
    @Param('producerId') producerId: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.producersService.addProducerContact(producerId, body, req.actor!, correlationId);
  }

  @Post(':producerId/documents')
  @RequirePermission('commercial:write')
  async addDocument(
    @Param('producerId') producerId: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.producersService.addProducerDocument(producerId, body, req.actor!, correlationId);
  }

  @Post(':producerId/verify')
  @RequirePermission('commercial:write')
  async verifyProducer(@Param('producerId') producerId: string, @Req() req: AuthenticatedRequest) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.producersService.verifyProducer(producerId, req.actor!, correlationId);
  }

  @Post(':producerId/contracts')
  @RequirePermission('commercial:write')
  async createContract(
    @Param('producerId') producerId: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.producersService.createContract(producerId, body, req.actor!, correlationId);
  }
}
