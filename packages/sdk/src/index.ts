import type {
  ApproveEventFeeAgreementRequestDto,
  AuditRecordDto,
  AuthenticatedActorDto,
  CatalogFunctionItemDto,
  CatalogSummaryDto,
  CheckinValidationResultDto,
  CheckoutOrderRequestDto,
  ContractDto,
  CostCenterDto,
  CouponCampaignDto,
  CourtesyQuotaDto,
  CreateContractRequestDto,
  CreateCostCenterRequestDto,
  CreateCouponCampaignRequestDto,
  CreateCourtesyQuotaRequestDto,
  CreateCustomerRequestDto,
  CreateEventPriceLotRequestDto,
  CreateEventRequestDto,
  CreateEventSalesChannelRequestDto,
  CreateEventSectorRequestDto,
  CreateEventSessionRequestDto,
  CreateFeeSnapshotRequestDto,
  CreateFinanceLedgerEntryRequestDto,
  CreateInventoryHoldRequestDto,
  CreateOrderRequestDto,
  CreatePosTerminalRequestDto,
  CreateProducerContactRequestDto,
  CreateProducerDocumentRequestDto,
  CreateProducerRequestDto,
  CreateRhEmployeeRequestDto,
  CreateRhGeofenceRequestDto,
  CreateRhPaymentBatchRequestDto,
  CreateSeatsBatchRequestDto,
  CustomerDto,
  EventBuilderFullViewDto,
  EventFeeSnapshotDto,
  EventPriceLotDto,
  EventSalesChannelDto,
  EventSectorDto,
  EventSessionDto,
  EventSummaryViewDto,
  FinanceLedgerEntryDto,
  InventoryHoldDto,
  IssueCourtesyTicketRequestDto,
  LoginRequestDto,
  NavigationMenuItem,
  OpenPosCashSessionRequestDto,
  OperationalOverviewDto,
  OrderDetailDto,
  PaymentIntentDto,
  PaymentWebhookRequestDto,
  PosCashSessionDto,
  PosTerminalDto,
  ProducerContactDto,
  ProducerDetailDto,
  ProducerDocumentDto,
  ProposeEventFeeAgreementRequestDto,
  ReconcileRhPaymentBatchRequestDto,
  RecordTimePunchRequestDto,
  RhEmployeeDto,
  RhGeofenceDto,
  RhPaymentBatchDto,
  RhTimePunchDto,
  SeatDto,
  SessionAvailabilityDto,
  TicketDetailDto,
  ValidateCheckinRequestDto,
} from '@bravo-ii/contracts';

export interface BravoApiClientOptions {
  baseUrl?: string;
  sessionToken?: string;
  csrfToken?: string;
}

export class BravoApiClient {
  private readonly baseUrl: string;

  constructor(private readonly options: BravoApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? '').replace(/\/+$/, '');
  }

  private buildHeaders(correlationId?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const tok = this.options.sessionToken;
    if (this.options.csrfToken) {
      headers['X-CSRF-Token'] = this.options.csrfToken;
    } else if (tok && tok.startsWith('csrf:')) {
      headers['X-CSRF-Token'] = tok.slice('csrf:'.length);
    } else if (tok && tok !== 'cookie-session') {
      headers['Authorization'] = `Bearer ${tok}`;
    }
    if (correlationId) {
      headers['X-Correlation-Id'] = correlationId;
    }
    return headers;
  }

  private normalizePath(path: string): string {
    if (!this.baseUrl) {
      if (path === '/health') return '/v1/health';
      if (path.startsWith('/api/v1/')) return `/v1/${path.slice('/api/v1/'.length)}`;
    }
    return path;
  }

  private async requestJson<T>(path: string, init?: RequestInit): Promise<T> {
    const targetPath = this.normalizePath(path);
    const res = await fetch(`${this.baseUrl}${targetPath}`, {
      ...init,
      credentials: this.baseUrl ? undefined : 'same-origin',
      headers: {
        ...this.buildHeaders(),
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body?.error?.message ?? body?.message ?? `Erro na API (HTTP ${res.status})`);
    }
    return body as T;
  }

  async healthCheck(): Promise<{ status: string; database: string; migrationsApplied: number }> {
    return this.requestJson('/health');
  }

  async login(payload: LoginRequestDto): Promise<{ token: string; actor: AuthenticatedActorDto }> {
    return this.requestJson('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getSession(): Promise<AuthenticatedActorDto> {
    return this.requestJson('/api/v1/auth/me');
  }

  async getNavigation(): Promise<{ items: NavigationMenuItem[] }> {
    return this.requestJson('/api/v1/navigation');
  }

  async getOverview(): Promise<OperationalOverviewDto> {
    return this.requestJson('/api/v1/overview');
  }

  // ==========================================================================
  // Fase 02 — Produtores PJ, Contatos, Documentos, Contratos e Taxa Disk por Evento
  // ==========================================================================

  async listProducers(): Promise<{ items: ProducerDetailDto[] }> {
    return this.requestJson('/api/v1/producers');
  }

  async createProducer(payload: CreateProducerRequestDto): Promise<ProducerDetailDto> {
    return this.requestJson('/api/v1/producers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async addProducerContact(
    producerId: string,
    payload: CreateProducerContactRequestDto
  ): Promise<ProducerContactDto> {
    return this.requestJson(`/api/v1/producers/${encodeURIComponent(producerId)}/contacts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async addProducerDocument(
    producerId: string,
    payload: CreateProducerDocumentRequestDto
  ): Promise<ProducerDocumentDto> {
    return this.requestJson(`/api/v1/producers/${encodeURIComponent(producerId)}/documents`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async verifyProducer(producerId: string): Promise<ProducerDetailDto> {
    return this.requestJson(`/api/v1/producers/${encodeURIComponent(producerId)}/verify`, {
      method: 'POST',
    });
  }

  async createContract(producerId: string, payload: CreateContractRequestDto): Promise<ContractDto> {
    return this.requestJson(`/api/v1/producers/${encodeURIComponent(producerId)}/contracts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async proposeEventFeeAgreement(
    eventId: string,
    payload: ProposeEventFeeAgreementRequestDto
  ): Promise<{
    id: string;
    eventId: string;
    agreementVersion: number;
    calculationType: 'PERCENTAGE' | 'FIXED';
    percentageRate: number | null;
    fixedAmountCents: number | null;
    payer: string;
    status: string;
  }> {
    return this.requestJson(`/api/v1/events/${encodeURIComponent(eventId)}/fee-agreements`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async approveEventFeeAgreement(
    eventId: string,
    version: number,
    payload: ApproveEventFeeAgreementRequestDto
  ): Promise<{
    id: string;
    eventId: string;
    agreementVersion: number;
    status: string;
    approvalReference: string;
  }> {
    return this.requestJson(
      `/api/v1/events/${encodeURIComponent(eventId)}/fee-agreements/${version}/approve`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async createEventFeeSnapshot(
    eventId: string,
    payload: CreateFeeSnapshotRequestDto
  ): Promise<EventFeeSnapshotDto> {
    return this.requestJson(`/api/v1/events/${encodeURIComponent(eventId)}/fee-snapshots`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ==========================================================================
  // Fase 03 — Eventos, Event Builder, Aprovação e Publicação Controlada
  // ==========================================================================

  async listAuthorizedEvents(): Promise<{ items: EventSummaryViewDto[] }> {
    return this.requestJson('/api/v1/events');
  }

  async getEventById(eventId: string): Promise<EventBuilderFullViewDto> {
    return this.requestJson(`/api/v1/events/${encodeURIComponent(eventId)}`);
  }

  async createEvent(payload: CreateEventRequestDto): Promise<EventBuilderFullViewDto> {
    return this.requestJson('/api/v1/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async addEventSession(eventId: string, payload: CreateEventSessionRequestDto): Promise<EventSessionDto> {
    return this.requestJson(`/api/v1/events/${encodeURIComponent(eventId)}/sessions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async addEventSector(eventId: string, payload: CreateEventSectorRequestDto): Promise<EventSectorDto> {
    return this.requestJson(`/api/v1/events/${encodeURIComponent(eventId)}/sectors`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async addEventPriceLot(eventId: string, payload: CreateEventPriceLotRequestDto): Promise<EventPriceLotDto> {
    return this.requestJson(`/api/v1/events/${encodeURIComponent(eventId)}/price-lots`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async addEventSalesChannel(
    eventId: string,
    payload: CreateEventSalesChannelRequestDto
  ): Promise<EventSalesChannelDto> {
    return this.requestJson(`/api/v1/events/${encodeURIComponent(eventId)}/channels`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async submitEventForReview(eventId: string): Promise<EventBuilderFullViewDto> {
    return this.requestJson(`/api/v1/events/${encodeURIComponent(eventId)}/submit`, {
      method: 'POST',
    });
  }

  async approveEventOperational(eventId: string, notes?: string): Promise<EventBuilderFullViewDto> {
    return this.requestJson(`/api/v1/events/${encodeURIComponent(eventId)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  async publishEvent(eventId: string): Promise<EventBuilderFullViewDto> {
    return this.requestJson(`/api/v1/events/${encodeURIComponent(eventId)}/publish`, {
      method: 'POST',
    });
  }

  async listAuditRecords(): Promise<{ items: AuditRecordDto[] }> {
    return this.requestJson('/api/v1/audit-records');
  }

  // ==========================================================================
  // Fases 04 e 05 — Clientes PF, Inventário, Pedidos, Pagamentos, Ingressos, PDV, Portaria e Cupons
  // ==========================================================================

  async listCustomers(): Promise<{ items: CustomerDto[] }> {
    return this.requestJson('/api/v1/customers');
  }

  async createCustomer(payload: CreateCustomerRequestDto): Promise<CustomerDto> {
    return this.requestJson('/api/v1/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async createSeatsBatch(
    eventId: string,
    sectorId: string,
    payload: CreateSeatsBatchRequestDto
  ): Promise<{ items: SeatDto[] }> {
    return this.requestJson(
      `/api/v1/events/${encodeURIComponent(eventId)}/sectors/${encodeURIComponent(sectorId)}/seats`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async getSessionAvailability(sessionId: string): Promise<SessionAvailabilityDto> {
    return this.requestJson(`/api/v1/sessions/${encodeURIComponent(sessionId)}/availability`);
  }

  async createInventoryHold(
    sessionId: string,
    payload: CreateInventoryHoldRequestDto
  ): Promise<InventoryHoldDto> {
    return this.requestJson(`/api/v1/sessions/${encodeURIComponent(sessionId)}/holds`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listCouponCampaigns(): Promise<{ items: CouponCampaignDto[] }> {
    return this.requestJson('/api/v1/coupon-campaigns');
  }

  async createCouponCampaign(payload: CreateCouponCampaignRequestDto): Promise<CouponCampaignDto> {
    return this.requestJson('/api/v1/coupon-campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listCourtesyQuotas(): Promise<{ items: CourtesyQuotaDto[] }> {
    return this.requestJson('/api/v1/courtesy-quotas');
  }

  async createCourtesyQuota(payload: CreateCourtesyQuotaRequestDto): Promise<CourtesyQuotaDto> {
    return this.requestJson('/api/v1/courtesy-quotas', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async issueCourtesyTicket(
    quotaId: string,
    payload: IssueCourtesyTicketRequestDto
  ): Promise<OrderDetailDto> {
    return this.requestJson(`/api/v1/courtesy-quotas/${encodeURIComponent(quotaId)}/issue`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listPosTerminals(): Promise<{ items: PosTerminalDto[] }> {
    return this.requestJson('/api/v1/pos/terminals');
  }

  async createPosTerminal(payload: CreatePosTerminalRequestDto): Promise<PosTerminalDto> {
    return this.requestJson('/api/v1/pos/terminals', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listPosCashSessions(): Promise<{ items: PosCashSessionDto[] }> {
    return this.requestJson('/api/v1/pos/cash-sessions');
  }

  async openPosCashSession(payload: OpenPosCashSessionRequestDto): Promise<PosCashSessionDto> {
    return this.requestJson('/api/v1/pos/cash-sessions/open', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async closePosCashSession(cashSessionId: string): Promise<PosCashSessionDto> {
    return this.requestJson(`/api/v1/pos/cash-sessions/${encodeURIComponent(cashSessionId)}/close`, {
      method: 'POST',
    });
  }

  async listOrders(): Promise<{ items: OrderDetailDto[] }> {
    return this.requestJson('/api/v1/orders');
  }

  async createOrder(payload: CreateOrderRequestDto): Promise<OrderDetailDto> {
    return this.requestJson('/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async checkoutOrder(
    orderId: string,
    payload: CheckoutOrderRequestDto
  ): Promise<{ order: OrderDetailDto; paymentIntent: PaymentIntentDto }> {
    return this.requestJson(`/api/v1/orders/${encodeURIComponent(orderId)}/checkout`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async sendPaymentWebhook(
    provider: string,
    payload: PaymentWebhookRequestDto
  ): Promise<{ idempotentReplay: boolean; order: OrderDetailDto }> {
    return this.requestJson(`/api/v1/webhooks/payments/${encodeURIComponent(provider)}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listTickets(params?: { publicCode?: string; eventId?: string }): Promise<{ items: TicketDetailDto[] }> {
    const query = new URLSearchParams();
    if (params?.publicCode) query.set('publicCode', params.publicCode);
    if (params?.eventId) query.set('eventId', params.eventId);
    const qs = query.toString();
    return this.requestJson(`/api/v1/tickets${qs ? `?${qs}` : ''}`);
  }

  async cancelTicket(ticketId: string, reasonPtBr?: string): Promise<TicketDetailDto> {
    return this.requestJson(`/api/v1/tickets/${encodeURIComponent(ticketId)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reasonPtBr }),
    });
  }

  async retryTicketDelivery(ticketId: string): Promise<TicketDetailDto> {
    return this.requestJson(`/api/v1/tickets/${encodeURIComponent(ticketId)}/retry-delivery`, {
      method: 'POST',
    });
  }

  async validateCheckin(payload: ValidateCheckinRequestDto): Promise<CheckinValidationResultDto> {
    return this.requestJson('/api/v1/checkins/validate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ==========================================================================
  // Pacote Mestre Financeiro (104 Opções) + RH & DP (45 Opções) + Bridge RH-Financeiro
  // ==========================================================================

  async getCatalogSummary(domain?: 'FINANCEIRO' | 'RH'): Promise<CatalogSummaryDto> {
    const qs = domain ? `?dominio=${encodeURIComponent(domain)}` : '';
    return this.requestJson(`/api/v1/catalog/functions${qs}`);
  }

  async getCatalogFunction(numeroOrSlug: string): Promise<CatalogFunctionItemDto> {
    return this.requestJson(`/api/v1/catalog/functions/${encodeURIComponent(numeroOrSlug)}`);
  }

  async listCostCenters(): Promise<{ items: CostCenterDto[] }> {
    return this.requestJson('/api/v1/finance/cost-centers');
  }

  async createCostCenter(payload: CreateCostCenterRequestDto): Promise<CostCenterDto> {
    return this.requestJson('/api/v1/finance/cost-centers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listFinanceLedger(): Promise<{ items: FinanceLedgerEntryDto[] }> {
    return this.requestJson('/api/v1/finance/ledger');
  }

  async createFinanceLedgerEntry(
    payload: CreateFinanceLedgerEntryRequestDto
  ): Promise<FinanceLedgerEntryDto> {
    return this.requestJson('/api/v1/finance/ledger', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listFinanceRhPaymentBatches(): Promise<{ items: RhPaymentBatchDto[] }> {
    return this.requestJson('/api/v1/finance/rh-payment-batches');
  }

  async approveRhPaymentBatch(batchId: string): Promise<RhPaymentBatchDto> {
    return this.requestJson(`/api/v1/finance/rh-payment-batches/${encodeURIComponent(batchId)}/approve`, {
      method: 'POST',
    });
  }

  async prepareRhPaymentTreasury(batchId: string): Promise<RhPaymentBatchDto> {
    return this.requestJson(
      `/api/v1/finance/rh-payment-batches/${encodeURIComponent(batchId)}/prepare-treasury`,
      {
        method: 'POST',
      }
    );
  }

  async confirmRhPaymentSettlement(
    batchId: string,
    payload: ReconcileRhPaymentBatchRequestDto
  ): Promise<{ batch: RhPaymentBatchDto; ledgerEntry: FinanceLedgerEntryDto }> {
    return this.requestJson(
      `/api/v1/finance/rh-payment-batches/${encodeURIComponent(batchId)}/confirm-settlement`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async listRhEmployees(): Promise<{ items: RhEmployeeDto[] }> {
    return this.requestJson('/api/v1/rh/employees');
  }

  async createRhEmployee(payload: CreateRhEmployeeRequestDto): Promise<RhEmployeeDto> {
    return this.requestJson('/api/v1/rh/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listRhGeofences(): Promise<{ items: RhGeofenceDto[] }> {
    return this.requestJson('/api/v1/rh/geofences');
  }

  async createRhGeofence(payload: CreateRhGeofenceRequestDto): Promise<RhGeofenceDto> {
    return this.requestJson('/api/v1/rh/geofences', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listRhTimePunches(): Promise<{ items: RhTimePunchDto[] }> {
    return this.requestJson('/api/v1/rh/time-punches');
  }

  async recordRhTimePunch(payload: RecordTimePunchRequestDto): Promise<RhTimePunchDto> {
    return this.requestJson('/api/v1/rh/time-punches', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listRhPaymentBatches(): Promise<{ items: RhPaymentBatchDto[] }> {
    return this.requestJson('/api/v1/rh/payment-batches');
  }

  async createRhPaymentBatch(payload: CreateRhPaymentBatchRequestDto): Promise<RhPaymentBatchDto> {
    return this.requestJson('/api/v1/rh/payment-batches', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}
