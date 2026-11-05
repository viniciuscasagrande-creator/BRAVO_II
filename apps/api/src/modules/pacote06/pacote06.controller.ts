import { Body, Controller, Get, Param, Post, Query, Req, UseFilters, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest, RequirePermission } from '../../common/auth/auth.guard';
import { ensureCorrelationId } from '@bravo-ii/telemetry';
import { Pacote06Service } from './pacote06.service';
import { P06DomainErrorFilter } from './domain.filter';
import type {
  ApprovalStep,
  Channel,
  EventDraftInput,
  FeeInput,
  LotInput,
  ProducerInput,
  SessionInput,
} from '@bravo-ii/domain-p06';

@Controller(['api/v1/p06', 'v1'])
@UseGuards(AuthGuard)
@UseFilters(P06DomainErrorFilter)
export class Pacote06Controller {
  constructor(private readonly service: Pacote06Service) {}

  // ==========================================================================
  // 1. CENTRAL DE PRODUTORES PJ (suporta /produtores e /comercial/produtores)
  // ==========================================================================

  @Get(['produtores', 'comercial/produtores'])
  @RequirePermission('commercial:read')
  listProducers(@Req() req: AuthenticatedRequest, @Query('q') q?: string, @Query('status') status?: string) {
    return this.service.listProducers(req.actor!, { q, status });
  }

  @Get(['produtores/:id', 'comercial/produtores/:id'])
  @RequirePermission('commercial:read')
  getProducer(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.getProducer(req.actor!, id);
  }

  @Post(['produtores', 'comercial/produtores'])
  @RequirePermission('commercial:write')
  createProducer(@Req() req: AuthenticatedRequest, @Body() body: ProducerInput) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.service.createProducer(req.actor!, body, correlationId);
  }

  @Post(['produtores/:id/documentos', 'comercial/produtores/:id/documentos'])
  @RequirePermission('commercial:write')
  attachDocument(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { kind?: string; documentType?: string; storageKey: string; checksum: string }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.service.attachProducerDocument(req.actor!, id, body, correlationId);
  }

  @Post([
    'produtores/:id/documentos/:docId/validar',
    'comercial/produtores/:id/documentos/:docId/validar',
  ])
  @RequirePermission('commercial:write')
  verifyDocument(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Body() body: { status?: 'VALIDADO' | 'REJEITADO' }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.service.verifyProducerDocument(req.actor!, id, docId, body?.status ?? 'VALIDADO', correlationId);
  }

  @Post([
    'produtores/:id/aprovar',
    'comercial/produtores/:id/validar',
    'comercial/produtores/:id/aprovar',
  ])
  @RequirePermission('commercial:write')
  verifyProducer(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { decision?: 'APROVADO' | 'SUSPENSO'; reason?: string }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.service.verifyProducer(req.actor!, id, body?.decision ?? 'APROVADO', body?.reason, correlationId);
  }

  // ==========================================================================
  // 2. COMERCIAL DISK — TAXA DISK POR EVENTO (NUNCA EXPOSTA AO PDT)
  // ==========================================================================

  @Get('comercial/eventos/:eventId/taxas')
  @RequirePermission('event-fee:read-internal')
  listFees(@Req() req: AuthenticatedRequest, @Param('eventId') eventId: string) {
    return this.service.listFeesForEvent(req.actor!, eventId);
  }

  @Post('comercial/eventos/:eventId/taxas')
  @RequirePermission('event-fee:propose')
  proposeFee(@Req() req: AuthenticatedRequest, @Param('eventId') eventId: string, @Body() body: FeeInput) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    const normalized: FeeInput = {
      type: body.type,
      percentBasisPoints: body.percentBasisPoints ?? undefined,
      fixedCents: body.fixedCents ?? undefined,
      effectiveFrom: body.effectiveFrom,
      negotiationReference: body.negotiationReference,
    };
    return this.service.proposeFee(req.actor!, eventId, normalized, correlationId);
  }

  @Post('comercial/eventos/:eventId/taxas/:feeId/aprovar')
  @RequirePermission('event-fee:approve')
  approveFee(
    @Req() req: AuthenticatedRequest,
    @Param('eventId') eventId: string,
    @Param('feeId') feeId: string
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.service.approveFee(req.actor!, eventId, feeId, correlationId);
  }

  @Post('comercial/taxas/simular')
  @RequirePermission('event-fee:read-internal')
  simulateFee(@Req() req: AuthenticatedRequest, @Body() body: { faceValueCents: number; fee: FeeInput }) {
    return this.service.simulateFee(req.actor!, body.faceValueCents, body.fee);
  }

  // ==========================================================================
  // 3. GESTÃO DE EVENTOS — EVENT BUILDER, APROVAÇÕES E PUBLICAÇÃO
  // ==========================================================================

  @Get('eventos')
  @RequirePermission('event:read')
  listEvents(@Req() req: AuthenticatedRequest) {
    return this.service.listEvents(req.actor!);
  }

  @Get('eventos/:id')
  @RequirePermission('event:read')
  getEvent(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.getEvent(req.actor!, id);
  }

  @Post('eventos')
  @RequirePermission('event:write')
  createDraft(
    @Req() req: AuthenticatedRequest,
    @Body() body: EventDraftInput & { primaryProducerId: string }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.service.createDraft(req.actor!, body, correlationId);
  }

  @Post('eventos/:id/produtores-secundarios')
  @RequirePermission('event:write')
  addSecondaryProducer(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { producerId: string }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.service.addSecondaryProducer(req.actor!, id, body.producerId, correlationId);
  }

  @Post('eventos/:id/sessoes')
  @RequirePermission('event:write')
  addSession(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: SessionInput) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.service.addSession(req.actor!, id, body, correlationId);
  }

  @Post(['eventos/:id/setores', 'eventos/:id/areas'])
  @RequirePermission('event:write')
  addArea(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    body: {
      sessionId?: string;
      name?: string;
      label?: string;
      capacity: number;
      isNumbered: boolean;
      seats?: Array<{ rowLabel: string; seatNumber: string }>;
    }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.service.addArea(req.actor!, id, body, correlationId);
  }

  @Post(['eventos/:id/modalidades', 'eventos/:id/categorias'])
  @RequirePermission('event:write')
  addCategory(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { name: string; requiresProof: boolean }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.service.addCategory(req.actor!, id, body, correlationId);
  }

  @Post('eventos/:id/lotes')
  @RequirePermission('event:write')
  addLot(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: LotInput & { sessionId?: string; areaId?: string; categoryId?: string }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.service.addLot(req.actor!, id, body, correlationId);
  }

  @Post('eventos/:id/canais')
  @RequirePermission('event:write')
  setChannels(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { channels?: Channel[]; channel?: Channel; enabled?: boolean }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.service.setChannels(req.actor!, id, body, correlationId);
  }

  @Post('eventos/:id/midias')
  @RequirePermission('event:write')
  addMedia(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { kind: string; storageKey: string; altText: string }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.service.addMedia(req.actor!, id, body, correlationId);
  }

  @Post(['eventos/:id/submeter', 'eventos/:id/enviar-analise'])
  @RequirePermission('event:write')
  submit(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.service.submitForReview(req.actor!, id, correlationId);
  }

  @Post('eventos/:id/aprovacoes')
  @RequirePermission('event:read')
  decideApproval(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { step: ApprovalStep; decision: 'APROVADO' | 'REPROVADO'; reason?: string }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.service.decideApproval(req.actor!, id, body, correlationId);
  }

  @Get('eventos/:id/prontidao-publicacao')
  @RequirePermission('event:read')
  readiness(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.readiness(req.actor!, id);
  }

  @Get('eventos/:id/pendencias')
  @RequirePermission('event:read')
  async listReadinessIssues(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const res = await this.service.readiness(req.actor!, id);
    return res.issues;
  }

  @Post(['eventos/:id/solicitar-publicacao', 'eventos/:id/publicacoes/solicitar'])
  @RequirePermission('event:publish')
  requestPublication(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.service.requestPublication(req.actor!, id, correlationId);
  }

  @Get('eventos/:id/projecao-publica')
  @RequirePermission('event:read')
  publicProjection(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.publicProjection(req.actor!, id);
  }

  @Post('eventos/:id/ocorrencias')
  @RequirePermission('event:write')
  openChangeCase(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { changeType: 'ADIAMENTO' | 'CANCELAMENTO' | 'SUSPENSAO' | 'ALTERACAO'; reason: string }
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.service.openChangeCase(req.actor!, id, body, correlationId);
  }
}
