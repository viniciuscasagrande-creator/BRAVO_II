export type ProducerStatus = 'EM_CADASTRO' | 'EM_VALIDACAO' | 'APROVADO' | 'SUSPENSO' | 'INATIVO';
export type EventStatus =
  | 'RASCUNHO'
  | 'EM_ANALISE'
  | 'APROVADO'
  | 'REPROVADO'
  | 'PUBLICACAO_SOLICITADA'
  | 'PUBLICADO'
  | 'SUSPENSO'
  | 'ADIADO'
  | 'CANCELADO'
  | 'ENCERRADO';
export type FeeType = 'PERCENTUAL' | 'FIXA';
export type ApprovalStep = 'CADASTRAL' | 'COMERCIAL' | 'OPERACIONAL' | 'PUBLICACAO';
export type ExtendedApprovalArea =
  | 'CADASTRAL'
  | 'COMERCIAL'
  | 'CONTRATO'
  | 'TECNICA'
  | 'LOCAL'
  | 'OPERACIONAL'
  | 'PUBLICACAO';
export type Role = 'CADASTRO' | 'COMERCIAL' | 'OPERACOES' | 'PUBLICACAO' | 'FINANCEIRO' | 'ADMIN' | 'PRODUTOR';
export type Channel = 'ONLINE' | 'PDV' | 'BILHETERIA';

export interface ProducerInput {
  legalName: string;
  tradeName?: string;
  cnpj: string;
  stateRegistration?: string;
  municipalRegistration?: string;
  email: string;
  phone: string;
  address: {
    street: string;
    number: string;
    district: string;
    city: string;
    state: string;
    postalCode: string;
  };
  legalRepresentative: {
    name: string;
    email: string;
    role: string;
  };
}

export interface FeeInput {
  type: FeeType;
  percentBasisPoints?: number;
  fixedCents?: number;
  effectiveFrom: string;
  negotiationReference: string;
}

export interface EventDraftInput {
  name: string;
  description: string;
  venueName: string;
  venueCity: string;
  venueState: string;
  startAt: string;
  endAt: string;
  salesStartAt: string;
  ageRating: string;
  policyUrl: string;
}

export interface SessionInput {
  startsAt: string;
  endsAt: string;
  capacity: number;
}

export interface LotInput {
  name: string;
  faceValueCents: number;
  startsAt: string;
  endsAt: string;
  capacity: number;
}

export interface ApprovalRecord {
  step: ApprovalStep;
  actorId: string;
  decision: 'APROVADO' | 'REPROVADO';
  reason?: string;
}

export interface PublicationCheckInput {
  status: EventStatus;
  producerVerified: boolean;
  primaryProducerCount: number;
  event: EventDraftInput;
  sessions: SessionInput[];
  lots: LotInput[];
  channels: Channel[];
  approvedFeeCount: number;
  approvals: ApprovalRecord[];
}

export class DomainError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export function normalizeCnpj(raw: string): string {
  return raw.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

export function isValidCnpj(raw: string): boolean {
  const c = normalizeCnpj(raw);
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(c) || /^([0-9A-Z])\1{13}$/.test(c)) {
    return false;
  }
  const calc = (base: string, weights: number[]) => {
    const sum = weights.reduce((acc, w, i) => acc + (base.charCodeAt(i) - 48) * w, 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const d1 = calc(c.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(c.slice(0, 12) + String(d1), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return c.endsWith(`${d1}${d2}`);
}

export function validateProducer(input: ProducerInput): void {
  if (!input.legalName || input.legalName.trim().length < 3) {
    throw new DomainError('PRODUTOR_RAZAO_SOCIAL', 'Razão social obrigatória.');
  }
  if (!isValidCnpj(input.cnpj)) {
    throw new DomainError('CNPJ_INVALIDO', 'CNPJ inválido.');
  }
  if (!input.email.includes('@')) {
    throw new DomainError('EMAIL_INVALIDO', 'E-mail corporativo inválido.');
  }
  if (input.phone.replace(/\D/g, '').length < 10) {
    throw new DomainError('TELEFONE_INVALIDO', 'Telefone inválido.');
  }
  if (!input.address.city || !input.address.state || input.address.state.length !== 2) {
    throw new DomainError('ENDERECO_INVALIDO', 'Endereço comercial incompleto.');
  }
  if (!input.legalRepresentative.name || !input.legalRepresentative.email.includes('@')) {
    throw new DomainError('REPRESENTANTE_INVALIDO', 'Representante legal obrigatório.');
  }
}

export function validateFee(input: FeeInput): void {
  if (!input.negotiationReference?.trim()) {
    throw new DomainError('REFERENCIA_NEGOCIACAO', 'Referência da negociação é obrigatória.');
  }
  if (Number.isNaN(Date.parse(input.effectiveFrom))) {
    throw new DomainError('VIGENCIA_INVALIDA', 'Vigência da taxa inválida.');
  }
  if (input.type === 'PERCENTUAL') {
    if (input.fixedCents !== undefined) {
      throw new DomainError('TAXA_EXCLUSIVA', 'Taxa percentual não pode definir valor fixo.');
    }
    if (
      input.percentBasisPoints === undefined ||
      !Number.isInteger(input.percentBasisPoints) ||
      input.percentBasisPoints < 0 ||
      input.percentBasisPoints > 10000
    ) {
      throw new DomainError('TAXA_PERCENTUAL_INVALIDA', 'Taxa percentual deve estar entre 0 e 10000 pontos-base.');
    }
    return;
  }
  if (input.percentBasisPoints !== undefined) {
    throw new DomainError('TAXA_EXCLUSIVA', 'Taxa fixa não pode definir percentual.');
  }
  if (input.fixedCents === undefined || !Number.isInteger(input.fixedCents) || input.fixedCents < 0) {
    throw new DomainError('TAXA_FIXA_INVALIDA', 'Taxa fixa deve ser informada em centavos inteiros não negativos.');
  }
}

export function calculateFeeCents(faceValueCents: number, fee: FeeInput): number {
  if (!Number.isInteger(faceValueCents) || faceValueCents < 0) {
    throw new DomainError('VALOR_INGRESSO_INVALIDO', 'Valor de face inválido.');
  }
  validateFee(fee);
  return fee.type === 'FIXA'
    ? fee.fixedCents!
    : Math.round((faceValueCents * fee.percentBasisPoints!) / 10000);
}

export function assertFeeCanBeApproved(proposedBy: string, approvedBy: string, role: Role): void {
  if (proposedBy === approvedBy) {
    throw new DomainError('AUTOAPROVACAO', 'Quem propõe a Taxa Disk não pode aprová-la.');
  }
  if (!['COMERCIAL', 'FINANCEIRO', 'ADMIN'].includes(role)) {
    throw new DomainError('PAPEL_TAXA', 'Papel sem alçada para aprovar Taxa Disk.');
  }
}

export function assertFeeBelongsToEvent(feeEventId: string, targetEventId: string): void {
  if (!feeEventId || feeEventId !== targetEventId) {
    throw new DomainError('TAXA_EVENTO', 'Taxa Disk pertence exclusivamente ao evento negociado.');
  }
}

export function assertProspectiveFeeChange(effectiveFrom: string, referenceNow: string): void {
  if (Date.parse(effectiveFrom) <= Date.parse(referenceNow)) {
    throw new DomainError('VIGENCIA_RETROATIVA', 'Nova versão de Taxa Disk só pode valer para vendas futuras.');
  }
}

export function validateEventDraft(event: EventDraftInput): void {
  if (!event.name || event.name.trim().length < 3) {
    throw new DomainError('EVENTO_NOME', 'Nome do evento obrigatório.');
  }
  if (!event.description || event.description.trim().length < 20) {
    throw new DomainError('EVENTO_DESCRICAO', 'Descrição pública mínima de 20 caracteres.');
  }
  if (!event.venueName || !event.venueCity || event.venueState.length !== 2) {
    throw new DomainError('EVENTO_LOCAL', 'Local do evento incompleto.');
  }
  const s = Date.parse(event.startAt);
  const e = Date.parse(event.endAt);
  const sales = Date.parse(event.salesStartAt);
  if ([s, e, sales].some(Number.isNaN) || e <= s || sales > e) {
    throw new DomainError('EVENTO_DATAS', 'Datas de início, término ou início de vendas incoerentes.');
  }
  if (!event.ageRating?.trim() || !event.policyUrl?.startsWith('http')) {
    throw new DomainError('EVENTO_POLITICA', 'Classificação indicativa e política pública são obrigatórias.');
  }
}

export function validateSession(session: SessionInput, event: EventDraftInput): void {
  const s = Date.parse(session.startsAt);
  const e = Date.parse(session.endsAt);
  if ([s, e].some(Number.isNaN) || e <= s) {
    throw new DomainError('SESSAO_HORARIO', 'Horário de sessão inválido.');
  }
  if (s < Date.parse(event.startAt) || e > Date.parse(event.endAt)) {
    throw new DomainError('SESSAO_FORA_EVENTO', 'Sessão fora do período do evento.');
  }
  if (!Number.isInteger(session.capacity) || session.capacity <= 0) {
    throw new DomainError('SESSAO_CAPACIDADE', 'Capacidade da sessão deve ser positiva.');
  }
}

export function validateLot(lot: LotInput): void {
  if (!lot.name?.trim()) {
    throw new DomainError('LOTE_NOME', 'Nome do lote obrigatório.');
  }
  if (!Number.isInteger(lot.faceValueCents) || lot.faceValueCents < 0) {
    throw new DomainError('LOTE_PRECO', 'Preço do lote inválido.');
  }
  if (!Number.isInteger(lot.capacity) || lot.capacity <= 0) {
    throw new DomainError('LOTE_CAPACIDADE', 'Capacidade do lote deve ser positiva.');
  }
  if (Date.parse(lot.endsAt) <= Date.parse(lot.startsAt)) {
    throw new DomainError('LOTE_JANELA', 'Janela de venda do lote inválida.');
  }
}

export const REQUIRED_APPROVALS: ApprovalStep[] = ['CADASTRAL', 'COMERCIAL', 'OPERACIONAL', 'PUBLICACAO'];

const ROLE_BY_STEP: Record<ApprovalStep, Role[]> = {
  CADASTRAL: ['CADASTRO', 'ADMIN'],
  COMERCIAL: ['COMERCIAL', 'ADMIN'],
  OPERACIONAL: ['OPERACOES', 'ADMIN'],
  PUBLICACAO: ['PUBLICACAO', 'ADMIN']
};

export function assertCanApprove(
  step: ApprovalStep,
  actorRole: Role,
  submitterId: string,
  actorId: string,
  existing: ApprovalRecord[]
): void {
  if (submitterId === actorId) {
    throw new DomainError('AUTOAPROVACAO', 'Solicitante não pode aprovar o próprio evento.');
  }
  if (!ROLE_BY_STEP[step].includes(actorRole)) {
    throw new DomainError('PAPEL_APROVACAO', 'Papel sem permissão para esta etapa.');
  }
  const index = REQUIRED_APPROVALS.indexOf(step);
  for (const prev of REQUIRED_APPROVALS.slice(0, index)) {
    if (!existing.some((r) => r.step === prev && r.decision === 'APROVADO')) {
      throw new DomainError('ETAPA_FORA_ORDEM', `A etapa ${prev} precisa ser aprovada antes de ${step}.`);
    }
  }
}

export function readinessIssues(input: PublicationCheckInput): string[] {
  const issues: string[] = [];
  try {
    validateEventDraft(input.event);
  } catch (e) {
    issues.push((e as Error).message);
  }
  if (!input.producerVerified) issues.push('Produtor principal não está aprovado.');
  if (input.primaryProducerCount !== 1) issues.push('Evento deve ter exatamente um produtor principal.');
  if (input.sessions.length === 0) issues.push('Evento precisa de ao menos uma sessão.');
  input.sessions.forEach((s) => {
    try {
      validateSession(s, input.event);
    } catch (e) {
      issues.push((e as Error).message);
    }
  });
  if (input.lots.length === 0) issues.push('Evento precisa de ao menos um lote.');
  input.lots.forEach((l) => {
    try {
      validateLot(l);
    } catch (e) {
      issues.push((e as Error).message);
    }
  });
  if (input.channels.length === 0) issues.push('Evento precisa de ao menos um canal habilitado.');
  if (input.approvedFeeCount < 1) issues.push('Evento precisa de Taxa Disk aprovada.');
  for (const step of REQUIRED_APPROVALS) {
    if (!input.approvals.some((a) => a.step === step && a.decision === 'APROVADO')) {
      issues.push(`Etapa ${step} pendente.`);
    }
  }
  return issues;
}

export function assertCanRequestPublication(input: PublicationCheckInput): void {
  const issues = readinessIssues(input);
  if (issues.length > 0) {
    throw new DomainError('EVENTO_INCOMPLETO', issues.join(' '));
  }
  if (input.status !== 'APROVADO') {
    throw new DomainError('ESTADO_PUBLICACAO', 'Somente evento APROVADO pode solicitar publicação.');
  }
}

export function assertCanEditEvent(status: EventStatus): void {
  if (['PUBLICACAO_SOLICITADA', 'PUBLICADO', 'APROVADO', 'EM_ANALISE'].includes(status)) {
    throw new DomainError('EDICAO_BLOQUEADA', 'Evento submetido, aprovado ou publicado exige fluxo de revisão.');
  }
}

export function isPubliclyVisibleEventStatus(status: EventStatus | string): boolean {
  // EVT-002: Eventos adiados, suspensos, cancelados, encerrados ou em análise não ficam visíveis publicamente.
  return status === 'PUBLICADO' || status === 'EM_VENDA';
}

export function publicEventProjection(params: {
  id: string;
  event: EventDraftInput;
  sessions: SessionInput[];
  lots: LotInput[];
  status: EventStatus;
  fee?: FeeInput;
  producer?: ProducerInput;
}) {
  const publiclyVisible = isPubliclyVisibleEventStatus(params.status);
  return {
    id: params.id,
    name: params.event.name,
    description: params.event.description,
    venue: {
      name: params.event.venueName,
      city: params.event.venueCity,
      state: params.event.venueState
    },
    startAt: params.event.startAt,
    endAt: params.event.endAt,
    ageRating: params.event.ageRating,
    policyUrl: params.event.policyUrl,
    sessions: publiclyVisible
      ? params.sessions.map((s) => ({
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          capacity: s.capacity
        }))
      : [],
    lots: publiclyVisible
      ? params.lots.map((l) => ({
          name: l.name,
          faceValueCents: l.faceValueCents,
          startsAt: l.startsAt,
          endsAt: l.endsAt
        }))
      : [],
    status: params.status,
    publiclyVisible
  };
}

export function publicationCommand(eventId: string, revision: number) {
  return {
    kind: 'EVENT_PUBLICATION_REQUESTED' as const,
    eventId,
    destination: 'DISKINGRESSOS' as const,
    idempotencyKey: `publication:${eventId}:v${revision}`
  };
}

// ============================================================================
// PACOTE 02 — NÚCLEO OPERACIONAL (EVT-001, LOT-001, MAP-001, MAP-002)
// ============================================================================

export function mapAreaToCanonicalApprovalStep(area: ExtendedApprovalArea | string): ApprovalStep {
  switch (area) {
    case 'CADASTRAL':
      return 'CADASTRAL';
    case 'COMERCIAL':
    case 'CONTRATO':
      return 'COMERCIAL';
    case 'OPERACIONAL':
    case 'TECNICA':
    case 'LOCAL':
      return 'OPERACIONAL';
    case 'PUBLICACAO':
      return 'PUBLICACAO';
    default:
      throw new DomainError('ETAPA_APROVACAO_INVALIDA', `Área de aprovação inválida: ${area}`);
  }
}

export interface LotInventoryState {
  id: string;
  lotNumber: number;
  modalityName: string;
  sectorId: string;
  capacity: number;
  reservedCount: number;
  issuedCount: number;
  status: string;
}

export function calculateLotAvailability(input: {
  capacity: number;
  reservedCount: number;
  issuedCount: number;
}) {
  if (input.capacity < 0 || input.reservedCount < 0 || input.issuedCount < 0) {
    throw new DomainError('ESTOQUE_NEGATIVO', 'Contadores de estoque do lote não podem ser negativos.');
  }
  const committedCount = input.reservedCount + input.issuedCount;
  const availableCount = Math.max(0, input.capacity - committedCount);
  const isSoldOut = committedCount >= input.capacity && input.capacity > 0;
  const occupancyPercent =
    input.capacity > 0 ? Math.min(100, Math.round((committedCount / input.capacity) * 10000) / 100) : 0;
  return {
    capacity: input.capacity,
    reservedCount: input.reservedCount,
    issuedCount: input.issuedCount,
    committedCount,
    availableCount,
    isSoldOut,
    occupancyPercent
  };
}

export function evaluateLotProgression(lots: LotInventoryState[]): {
  soldOutLotIds: string[];
  activatedLotIds: string[];
} {
  // LOT-001 / ADR-002: Soma de vendidos (issuedCount) + reservados (reservedCount) determina esgotamento e virada sequencial.
  const soldOutLotIds: string[] = [];
  const activatedLotIds: string[] = [];

  const byGroup = new Map<string, LotInventoryState[]>();
  for (const lot of lots) {
    const key = `${lot.sectorId}::${lot.modalityName.trim().toUpperCase()}`;
    const list = byGroup.get(key) ?? [];
    list.push(lot);
    byGroup.set(key, list);
  }

  for (const groupLots of byGroup.values()) {
    const ordered = [...groupLots].sort((a, b) => a.lotNumber - b.lotNumber);
    for (let i = 0; i < ordered.length; i++) {
      const current = ordered[i];
      const inv = calculateLotAvailability(current);
      const isCurrentlyActive = current.status === 'ACTIVE' || current.status === 'ATIVO';
      if (isCurrentlyActive && inv.isSoldOut) {
        soldOutLotIds.push(current.id);
        const nextCandidate = ordered
          .slice(i + 1)
          .find((candidate) => ['DRAFT', 'RASCUNHO', 'PAUSED'].includes(candidate.status) && !calculateLotAvailability(candidate).isSoldOut);
        if (nextCandidate && !activatedLotIds.includes(nextCandidate.id)) {
          activatedLotIds.push(nextCandidate.id);
        }
      }
    }
  }

  return { soldOutLotIds, activatedLotIds };
}

export function generateNumberedRowSeats(input: {
  rowLabel: string;
  startNumber: number;
  endNumber: number;
}): Array<{ rowLabel: string; seatNumber: string; seatCode: string }> {
  const row = input.rowLabel?.trim().toUpperCase();
  if (!row || !/^[A-Z0-9_-]{1,12}$/.test(row)) {
    throw new DomainError('FILA_INVALIDA', 'Identificador da fila inválido (use letras/números, ex.: A, B, F01).');
  }
  if (
    !Number.isInteger(input.startNumber) ||
    !Number.isInteger(input.endNumber) ||
    input.startNumber < 1 ||
    input.endNumber < input.startNumber ||
    input.endNumber - input.startNumber + 1 > 500
  ) {
    throw new DomainError(
      'INTERVALO_POLTRONAS_INVALIDO',
      'Intervalo de poltronas inválido (informe início >= 1 e máximo de 500 poltronas por fila).'
    );
  }
  const seats: Array<{ rowLabel: string; seatNumber: string; seatCode: string }> = [];
  for (let n = input.startNumber; n <= input.endNumber; n++) {
    const numStr = String(n).padStart(2, '0');
    seats.push({
      rowLabel: row,
      seatNumber: numStr,
      seatCode: `${row}-${numStr}`
    });
  }
  return seats;
}

export function assertCanDeleteSector(input: {
  committedLotTickets: number;
  occupiedSeats: number;
}): void {
  if (input.committedLotTickets > 0 || input.occupiedSeats > 0) {
    throw new DomainError(
      'SETOR_COM_VENDAS_OU_RESERVAS',
      'MAP-002: Não é permitido excluir setor ou mapa que já possui reservas ativas ou ingressos emitidos.'
    );
  }
}
