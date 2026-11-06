/** P09: contratos puros de checkout/PDV. Não é um motor de liquidação. */
export class CheckoutRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckoutRuleError';
  }
}

export type GatewayName = 'PAGBANK' | 'REDE';
export type PaymentMethod = 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const CHECKOUT_ATTEMPT_STATUSES = [
  'PENDENTE_HOMOLOGACAO',
  'ENVIANDO_SANDBOX',
  'CRIADO_SANDBOX',
  'RESULTADO_INDETERMINADO',
] as const;

export function validateCheckoutInput(input: { provider: string; method: string; idempotencyKey: string }) {
  if (!input || !UUID.test(input.idempotencyKey)) {
    throw new CheckoutRuleError('Informe UUID de idempotência válido');
  }
  if (!['PAGBANK', 'REDE'].includes(input.provider)) {
    throw new CheckoutRuleError('Adquirente não cadastrada');
  }
  if (!['PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO'].includes(input.method)) {
    throw new CheckoutRuleError('Meio de pagamento inválido');
  }
  if (input.provider === 'REDE' && input.method === 'PIX') {
    throw new CheckoutRuleError('PIX via Rede exige integração específica não homologada');
  }
  return {
    provider: input.provider as GatewayName,
    method: input.method as PaymentMethod,
    idempotencyKey: input.idempotencyKey,
  };
}

export function assertAttemptAllowed(
  order: { status: string; expiresAt: Date; totalCents: number; channel: string },
  now: Date
) {
  if (order.status !== 'RESERVADO') {
    throw new CheckoutRuleError('Apenas pedidos reservados podem abrir checkout');
  }
  if (order.expiresAt.getTime() <= now.getTime()) {
    throw new CheckoutRuleError('Reserva vencida');
  }
  if (!Number.isSafeInteger(order.totalCents) || order.totalCents <= 0) {
    throw new CheckoutRuleError('Total não elegível a pagamento');
  }
  if (!['ONLINE', 'PDV', 'BILHETERIA'].includes(order.channel)) {
    throw new CheckoutRuleError('Canal de origem inválido');
  }
  return true;
}

export function assertPdvTerminal(input: { code: string; label: string; venue: string }) {
  if (!input || typeof input.code !== 'string' || !/^[A-Z0-9_-]{3,32}$/.test(input.code)) {
    throw new CheckoutRuleError('Código do terminal inválido (A–Z, 0–9, hífen, _; 3–32)');
  }
  if (typeof input.label !== 'string' || input.label.trim().length < 3 || input.label.length > 100) {
    throw new CheckoutRuleError('Identificação do terminal inválida');
  }
  if (typeof input.venue !== 'string' || input.venue.trim().length < 3 || input.venue.length > 160) {
    throw new CheckoutRuleError('Local do terminal inválido');
  }
  return { code: input.code, label: input.label.trim(), venue: input.venue.trim() };
}

export function assertShiftMayOpen(
  terminalStatus: string,
  activeShift: boolean,
  operatorRole: boolean,
  enabled: boolean
) {
  if (!enabled) {
    throw new CheckoutRuleError('Operações de PDV bloqueadas até homologação do equipamento');
  }
  if (terminalStatus !== 'ATIVO') {
    throw new CheckoutRuleError('Terminal não habilitado');
  }
  if (activeShift) {
    throw new CheckoutRuleError('Já existe turno aberto');
  }
  if (!operatorRole) {
    throw new CheckoutRuleError('Operador sem autorização de PDV');
  }
  return true;
}

export function assertPagbankSandbox(env: Record<string, string | undefined>) {
  if (
    env.BRAVO_ENV !== 'HOMOLOGACAO' ||
    env.ENABLE_REAL_PAYMENTS !== 'false' ||
    env.ENABLE_REAL_REFUNDS !== 'false' ||
    env.ENABLE_EXTERNAL_PUBLICATION !== 'false'
  ) {
    throw new CheckoutRuleError('Operação recusada fora da homologação isolada');
  }
  if (env.ENABLE_PAGBANK_SANDBOX !== 'true') {
    throw new CheckoutRuleError('Integração sandbox PagBank desabilitada');
  }
  const token = env.PAGBANK_SANDBOX_TOKEN || '';
  if (token.length < 16 || /SUBSTITUA|PLACEHOLDER|EXEMPLO/i.test(token)) {
    throw new CheckoutRuleError('Token sandbox PagBank não configurado');
  }
  return token;
}

export function assertSandboxCheckoutId(value: string) {
  if (typeof value !== 'string' || !/^CHEC_[A-Za-z0-9_-]{4,100}$/.test(value)) {
    throw new CheckoutRuleError('Identificador sandbox inválido');
  }
  return value;
}

export function providerStatusReadOnly(externalStatus: unknown) {
  const status = typeof externalStatus === 'string' ? externalStatus.toUpperCase() : 'DESCONHECIDO';
  // Mapeamento informativo, NÃO uma confirmação de captura. Nunca emite ingresso.
  return {
    externalStatus: status,
    informationalOnly: true,
    requiresVerifiedWebhookAndReconciliation: true,
    issuedTickets: 0,
  };
}

export function safeSandboxPayload(order: {
  id: string;
  quantity: number;
  unitCents: number;
  totalCents: number;
  expiresAt: Date;
  lot: { name: string };
}) {
  if (
    !UUID.test(order.id) ||
    !Number.isInteger(order.quantity) ||
    order.quantity < 1 ||
    order.quantity > 10 ||
    !Number.isSafeInteger(order.unitCents) ||
    order.unitCents < 1
  ) {
    throw new CheckoutRuleError('Pedido inconsistente');
  }
  const name = String(order.lot.name || 'Ingresso').slice(0, 100);
  if (!name) {
    throw new CheckoutRuleError('Item sem nome');
  }
  if (order.unitCents * order.quantity !== order.totalCents) {
    throw new CheckoutRuleError('Valor do checkout diverge do total reservado');
  }
  return {
    reference_id: order.id,
    expiration_date: order.expiresAt.toISOString(),
    items: [
      {
        reference_id: order.id,
        name,
        quantity: order.quantity,
        unit_amount: order.unitCents,
      },
    ],
    payment_methods: [{ type: 'PIX' }],
  };
}
