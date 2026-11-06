import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ensureCorrelationId } from '@bravo-ii/telemetry';
import { AuthGuard, type AuthenticatedRequest } from '../../common/auth/auth.guard';
import { BravoSacService, type SupportCreate } from './sac.service';
import { BravoAfterSalesService } from './aftersales.service';
import { BravoRefundService } from './refund.service';

@UseGuards(AuthGuard)
@Controller('v1/sac')
export class BravoSacController {
  constructor(private readonly svc: BravoSacService) {}

  @Get('indicadores')
  metrics(@Req() req: AuthenticatedRequest) {
    return this.svc.metrics(req.actor!);
  }

  @Get('chamados')
  list(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('busca') search?: string
  ) {
    return this.svc.list(req.actor!, { status, search });
  }

  @Post('chamados')
  create(@Req() req: AuthenticatedRequest, @Body() body: SupportCreate) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.svc.create(body, req.actor!, correlationId);
  }

  @Get('chamados/:id')
  detail(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.svc.get(id, req.actor!);
  }

  @Post('chamados/:id/interacoes')
  interaction(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { kind: string; body: string }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.svc.addInteraction(id, body, req.actor!, correlationId);
  }

  @Post('chamados/:id/status')
  status(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { status: string; reason: string }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.svc.transition(id, body, req.actor!, correlationId);
  }

  @Post('chamados/:id/atribuir')
  assign(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { assigneeId: string; queueId?: string }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.svc.assign(id, body, req.actor!, correlationId);
  }

  @Post('chamados/:id/incidente')
  incident(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { severity: string; serviceName: string; isMajor: boolean }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.svc.incident(id, body, req.actor!, correlationId);
  }

  @Post('chamados/:id/csat')
  csat(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { score: number; comment?: string }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.svc.csat(id, body, req.actor!, correlationId);
  }

  @Get('politicas-sla')
  sla(@Req() req: AuthenticatedRequest) {
    return this.svc.policies(req.actor!);
  }

  @Post('politicas-sla')
  slaNew(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      category: string;
      priority: string;
      responseMinutes: number;
      resolutionMinutes: number;
    }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.svc.newPolicy(body, req.actor!, correlationId);
  }

  @Get('equipes')
  teams(@Req() req: AuthenticatedRequest) {
    return this.svc.teams(req.actor!);
  }

  @Post('equipes')
  teamNew(@Req() req: AuthenticatedRequest, @Body() body: { name: string }) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.svc.newTeam(body, req.actor!, correlationId);
  }

  @Post('filas')
  queueNew(
    @Req() req: AuthenticatedRequest,
    @Body() body: { name: string; teamId?: string }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.svc.newQueue(body, req.actor!, correlationId);
  }

  @Post('equipes/:id/agentes')
  member(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { userId: string }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.svc.addMember(id, body, req.actor!, correlationId);
  }

  @Get('incidentes')
  incidents(@Req() req: AuthenticatedRequest) {
    return this.svc.incidents(req.actor!);
  }

  @Post('incidentes/:id/status')
  incStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { status: string; reason: string }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.svc.incidentStatus(id, body, req.actor!, correlationId);
  }

  @Get('problemas')
  problems(@Req() req: AuthenticatedRequest) {
    return this.svc.problems(req.actor!);
  }

  @Post('problemas/:id/status')
  problemStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { status: string; reason: string }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.svc.problemStatus(id, body, req.actor!, correlationId);
  }

  @Post('problemas')
  problem(
    @Req() req: AuthenticatedRequest,
    @Body() body: { title: string; rootCause?: string; workaround?: string }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.svc.problem(body, req.actor!, correlationId);
  }

  @Get('conhecimento')
  knowledge(@Req() req: AuthenticatedRequest) {
    return this.svc.knowledge(req.actor!);
  }

  @Post('conhecimento')
  newArticle(
    @Req() req: AuthenticatedRequest,
    @Body() body: { title: string; content: string; category: string }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.svc.newArticle(body, req.actor!, correlationId);
  }

  @Post('conhecimento/:id/publicar')
  publish(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.svc.publishArticle(id, req.actor!, correlationId);
  }
}

@UseGuards(AuthGuard)
@Controller('v1/pos-venda')
export class BravoAfterSalesController {
  constructor(private readonly svc: BravoAfterSalesService) {}

  @Get('trocas')
  changes(@Req() req: AuthenticatedRequest) {
    return this.svc.listExchanges(req.actor!);
  }

  @Post('trocas')
  newChange(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      orderId: string;
      ticketId: string;
      targetSessionId: string;
      targetLotId: string;
      reason: string;
    }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.svc.requestExchange(body, req.actor!, correlationId);
  }

  @Post('trocas/:id/analisar')
  review(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { decision: string; reason: string }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.svc.reviewExchange(id, body, req.actor!, correlationId);
  }

  @Post('trocas/:id/qualificar')
  qualify(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.svc.qualifyExchange(id, req.actor!, correlationId);
  }

  @Post('trocas/:id/executar')
  execute(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.svc.executeExchange(id, req.actor!);
  }

  @Get('cancelamentos')
  cancels(@Req() req: AuthenticatedRequest) {
    return this.svc.listCancellations(req.actor!);
  }

  @Post('cancelamentos')
  newCancel(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      type: string;
      orderId?: string;
      eventId?: string;
      ticketId?: string;
      reason: string;
    }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.svc.requestCancel(body, req.actor!, correlationId);
  }

  @Post('cancelamentos/:id/analisar')
  reviewCancel(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { decision: string; reason: string }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.svc.reviewCancellation(id, body, req.actor!, correlationId);
  }

  @Post('eventos/:eventId/lotes-estorno/:caseId/planejar')
  plan(
    @Req() req: AuthenticatedRequest,
    @Param('eventId') eventId: string,
    @Param('caseId') caseId: string
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.svc.eventBatchPlan(eventId, caseId, req.actor!, correlationId);
  }
}

@UseGuards(AuthGuard)
@Controller('v1/estornos')
export class BravoRefundController {
  constructor(private readonly svc: BravoRefundService) {}

  @Get('impacto')
  impact(@Req() req: AuthenticatedRequest) {
    return this.svc.financialImpact(req.actor!);
  }

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.svc.list(req.actor!);
  }

  @Post()
  request(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      orderId: string;
      cancellationId?: string;
      amountCents: number;
      reason: string;
      idempotencyKey: string;
    }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.svc.request(body, req.actor!, correlationId);
  }

  @Get(':id')
  detail(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.svc.get(id, req.actor!);
  }

  @Post(':id/analisar')
  analyze(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.svc.startReview(id, req.actor!, correlationId);
  }

  @Post(':id/aprovar')
  approve(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { reason: string }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.svc.approve(id, body, req.actor!, correlationId);
  }

  @Post(':id/reprovar')
  reject(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { reason: string }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.svc.reject(id, body, req.actor!, correlationId);
  }
  // NÃO criar endpoint de executar, liquidar, confirmar ou confirmar-webhook estorno aqui.
}
