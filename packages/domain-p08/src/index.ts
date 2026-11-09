/** BRAVO_II — Pacote 08 | Regras puras da venda. Nunca usar este domínio para liquidar valores. */
export class SalesRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SalesRuleError';
  }
}

export type SaleChannel = 'ONLINE' | 'PDV' | 'BILHETERIA';
export type OrderStatus = 'RESERVADO' | 'EXPIRADO' | 'CANCELADO' | 'PAGO';
export const HOLD_MINUTES = 15;
export const MAX_TICKETS_PER_ORDER = 10;
export const MAX_TICKET_NUMBER = 99_999_999;
export const TICKET_NUMBER_PATTERN = /^\d{8}$/;

export function normalizeCpf(raw: unknown): string {
  if (typeof raw !== 'string') throw new SalesRuleError('CPF obrigatório');
  const cpf = raw.replace(/[.\-\s]/g, '');
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) throw new SalesRuleError('CPF inválido');
  const check = (digits: number) => {
    const sum = [...cpf.slice(0, digits)].reduce((acc, d, i) => acc + Number(d) * (digits + 1 - i), 0);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  if (check(9) !== Number(cpf[9]) || check(10) !== Number(cpf[10])) {
    throw new SalesRuleError('Dígitos verificadores de CPF inválidos');
  }
  return cpf;
}

export type CustomerInput = {
  fullName: string;
  cpf: string;
  email: string;
  phone: string;
  birthDate?: string;
  address?: {
    zip?: string;
    street?: string;
    number?: string;
    district?: string;
    city?: string;
    state?: string;
  };
  marketingOptIn?: boolean;
};

export function validateCustomer(value: CustomerInput) {
  if (
    !value ||
    typeof value.fullName !== 'string' ||
    value.fullName.trim().length < 5 ||
    value.fullName.trim().length > 160
  ) {
    throw new SalesRuleError('Nome completo obrigatório (5–160 caracteres)');
  }
  const cpf = normalizeCpf(value.cpf);
  const email = typeof value.email === 'string' ? value.email.trim().toLowerCase() : '';
  if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) throw new SalesRuleError('E-mail inválido');
  const phone = typeof value.phone === 'string' ? value.phone.replace(/\D/g, '') : '';
  if (!/^\d{10,13}$/.test(phone)) throw new SalesRuleError('Telefone inválido');
  let birthDate: Date | undefined;
  if (value.birthDate) {
    birthDate = new Date(`${value.birthDate}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value.birthDate) ||
      Number.isNaN(birthDate.getTime()) ||
      birthDate.toISOString().slice(0, 10) !== value.birthDate ||
      birthDate > new Date()
    ) {
      throw new SalesRuleError('Data de nascimento inválida');
    }
  }
  const address = value.address === undefined ? undefined : value.address;
  if (address !== undefined) {
    if (!address || typeof address !== 'object' || JSON.stringify(address).length > 1600) {
      throw new SalesRuleError('Endereço inválido');
    }
    if (address.zip && !/^\d{5}-?\d{3}$/.test(address.zip)) throw new SalesRuleError('CEP inválido');
    if (address.state && !/^[A-Za-z]{2}$/.test(address.state)) throw new SalesRuleError('UF inválida');
  }
  if (value.marketingOptIn !== undefined && typeof value.marketingOptIn !== 'boolean') {
    throw new SalesRuleError('Preferência de marketing inválida');
  }
  return {
    fullName: value.fullName.trim(),
    cpf,
    email,
    phone,
    birthDate,
    address,
    marketingOptIn: value.marketingOptIn === true,
  };
}

export function validateReservation(value: {
  eventId: string;
  sessionId: string;
  lotId: string;
  customerId: string;
  quantity: number;
  channel: SaleChannel;
  idempotencyKey: string;
}) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  for (const f of ['eventId', 'sessionId', 'lotId', 'customerId', 'idempotencyKey'] as const) {
    if (typeof value?.[f] !== 'string' || !uuid.test(value[f])) {
      throw new SalesRuleError(`${f} deve ser UUID`);
    }
  }
  if (!Number.isInteger(value.quantity) || value.quantity < 1 || value.quantity > MAX_TICKETS_PER_ORDER) {
    throw new SalesRuleError('Quantidade fora do limite permitido');
  }
  if (!['ONLINE', 'PDV', 'BILHETERIA'].includes(value.channel)) {
    throw new SalesRuleError('Canal inválido');
  }
  return value;
}

export function calculateLineTotal(unitCents: number, quantity: number): number {
  if (
    !Number.isSafeInteger(unitCents) ||
    unitCents < 0 ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > MAX_TICKETS_PER_ORDER
  ) {
    throw new SalesRuleError('Valor ou quantidade inválidos');
  }
  const total = unitCents * quantity;
  if (!Number.isSafeInteger(total) || total > 2_147_483_647) {
    throw new SalesRuleError('Valor total fora do limite');
  }
  return total;
}

export function formatTicketNumber(value: number): string {
  if (!Number.isInteger(value) || value < 1 || value > MAX_TICKET_NUMBER) {
    throw new SalesRuleError('Faixa de oito dígitos esgotada ou inválida');
  }
  return String(value).padStart(8, '0');
}

export function mayReserve(input: {
  eventStatus: string;
  lotStatus: string;
  sessionStatus: string;
  lotStartsAt: Date;
  lotEndsAt: Date;
  salesStartAt?: Date | null;
  eventStartsAt: Date;
  now: Date;
  enabledChannels: string[];
  channel: SaleChannel;
  numbered: boolean;
  seatIds?: string[];
  quantity?: number;
}) {
  if (input.eventStatus !== 'PUBLICADO') throw new SalesRuleError('Evento ainda não publicado');
  if (input.lotStatus !== 'ATIVO' || input.sessionStatus !== 'ATIVA') {
    throw new SalesRuleError('Sessão ou lote ainda não liberado');
  }
  if (input.numbered) {
    if (!Array.isArray(input.seatIds) || input.seatIds.length === 0) {
      throw new SalesRuleError('Lugares numerados aguardam módulo de alocação por assento');
    }
    if (input.quantity !== undefined && input.seatIds.length !== input.quantity) {
      throw new SalesRuleError('Quantidade de poltronas selecionadas deve coincidir com a quantidade do pedido');
    }
    if (new Set(input.seatIds).size !== input.seatIds.length) {
      throw new SalesRuleError('Poltrona duplicada informada na mesma reserva');
    }
  }
  if (!input.enabledChannels.includes(input.channel)) throw new SalesRuleError('Canal de venda não habilitado');
  if (input.salesStartAt && input.now < input.salesStartAt) throw new SalesRuleError('Venda ainda não iniciada');
  if (input.now < input.lotStartsAt || input.now >= input.lotEndsAt) {
    throw new SalesRuleError('Lote fora da janela de vendas');
  }
  if (input.now >= input.eventStartsAt) {
    throw new SalesRuleError('Evento já iniciado; requer regra operacional específica');
  }
  return true;
}

export function assertChannelOrderLimit(
  quantity: number,
  channel: SaleChannel,
  customMaxPerOrder?: number | null
): number {
  const defaultLimit = channel === 'ONLINE' ? MAX_TICKETS_PER_ORDER : MAX_TICKETS_PER_ORDER;
  const effectiveLimit =
    customMaxPerOrder && Number.isInteger(customMaxPerOrder) && customMaxPerOrder > 0
      ? Math.min(customMaxPerOrder, MAX_TICKETS_PER_ORDER)
      : defaultLimit;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > effectiveLimit) {
    throw new SalesRuleError(`PED-003: Limite máximo de ${effectiveLimit} ingressos por pedido no canal ${channel}`);
  }
  return effectiveLimit;
}

export function calculateCouponDiscountCents(
  subtotalCents: number,
  coupon: {
    discountType: 'PERCENTAGE' | 'FIXED';
    percentageRate?: number | null;
    fixedAmountCents?: number | null;
  }
): { discountCents: number; finalTotalCents: number } {
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0) {
    throw new SalesRuleError('Subtotal inválido para cálculo de cupom');
  }
  let discountCents = 0;
  if (coupon.discountType === 'FIXED') {
    const fixed = Number(coupon.fixedAmountCents ?? 0);
    if (!Number.isSafeInteger(fixed) || fixed < 0) {
      throw new SalesRuleError('Valor fixo do cupom inválido');
    }
    discountCents = Math.min(subtotalCents, fixed);
  } else if (coupon.discountType === 'PERCENTAGE') {
    const rate = Number(coupon.percentageRate ?? 0);
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      throw new SalesRuleError('Percentual de desconto do cupom inválido');
    }
    discountCents = Math.min(subtotalCents, Math.round((subtotalCents * Math.round(rate * 100)) / 10000));
  } else {
    throw new SalesRuleError('Tipo de desconto de cupom inválido');
  }
  return {
    discountCents,
    finalTotalCents: Math.max(0, subtotalCents - discountCents),
  };
}

export function expiresAt(now: Date) {
  return new Date(now.getTime() + HOLD_MINUTES * 60_000);
}

export function assertConfirmedPayment(
  order: { status: OrderStatus; expiresAt: Date; totalCents: number },
  confirmation: { amountCents: number; verified: boolean },
  now: Date
) {
  if (!confirmation.verified) throw new SalesRuleError('Liquidação não verificada');
  if (order.status !== 'RESERVADO') throw new SalesRuleError('Pedido não está aguardando pagamento');
  if (now > order.expiresAt) throw new SalesRuleError('Reserva expirada: conciliação manual obrigatória');
  if (order.totalCents !== confirmation.amountCents) throw new SalesRuleError('Divergência no valor confirmado');
}

/** Recibo assinado por ADAPTADOR INTERNO confiável. Não é a assinatura do provedor em si. */
export type AdapterReceipt = {
  orderId: string;
  provider: string;
  providerRef: string;
  amountCents: number;
  verifiedAt: string;
  signature: string;
};

export function settlementCanonical(receipt: Omit<AdapterReceipt, 'signature'>): string {
  return [
    'BRAVO_II_SETTLEMENT_V1',
    receipt.orderId,
    receipt.provider,
    receipt.providerRef,
    String(receipt.amountCents),
    receipt.verifiedAt,
  ].join('|');
}
