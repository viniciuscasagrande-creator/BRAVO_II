import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertAttemptAllowed,
  assertPagbankSandbox,
  assertPdvTerminal,
  assertSandboxCheckoutId,
  assertShiftMayOpen,
  providerStatusReadOnly,
  safeSandboxPayload,
  validateCheckoutInput,
} from './index';

const uuid = '123e4567-e89b-42d3-a456-426614174000';
const validOrder = {
  status: 'RESERVADO',
  expiresAt: new Date('2030-05-01T00:00:00Z'),
  totalCents: 10500,
  channel: 'ONLINE',
};
const env = {
  BRAVO_ENV: 'HOMOLOGACAO',
  ENABLE_REAL_PAYMENTS: 'false',
  ENABLE_REAL_REFUNDS: 'false',
  ENABLE_EXTERNAL_PUBLICATION: 'false',
  ENABLE_PAGBANK_SANDBOX: 'true',
  PAGBANK_SANDBOX_TOKEN: 'sandbox-token-01234567890123456789',
};

test('Aceita chave única UUID e PIX PagBank', () =>
  assert.equal(validateCheckoutInput({ provider: 'PAGBANK', method: 'PIX', idempotencyKey: uuid }).method, 'PIX'));
test('Bloqueia chave não-UUID', () =>
  assert.throws(() => validateCheckoutInput({ provider: 'PAGBANK', method: 'PIX', idempotencyKey: 'duplicada' })));
test('Bloqueia adquirente desconhecida', () =>
  assert.throws(() => validateCheckoutInput({ provider: 'FAKE', method: 'PIX', idempotencyKey: uuid })));
test('Não presume PIX habilitado na Rede', () =>
  assert.throws(() => validateCheckoutInput({ provider: 'REDE', method: 'PIX', idempotencyKey: uuid })));
test('Aceita cartão crédito Rede apenas para catalogação', () =>
  assert.equal(validateCheckoutInput({ provider: 'REDE', method: 'CARTAO_CREDITO', idempotencyKey: uuid }).provider, 'REDE'));
test('Reserva ainda ativa pode registrar tentativa', () =>
  assert.equal(assertAttemptAllowed(validOrder, new Date('2026-11-06T12:00:00Z')), true));
test('Pedido pago não cria nova tentativa', () =>
  assert.throws(() => assertAttemptAllowed({ ...validOrder, status: 'PAGO' }, new Date())));
test('Reserva expirada não recebe checkout', () =>
  assert.throws(() => assertAttemptAllowed({ ...validOrder, expiresAt: new Date('2020-01-01') }, new Date())));
test('Valor nulo não recebe checkout', () =>
  assert.throws(() => assertAttemptAllowed({ ...validOrder, totalCents: 0 }, new Date())));
test('Aceita código estável para terminal', () =>
  assert.equal(assertPdvTerminal({ code: 'PDV_CWB_001', label: 'Bilheteria 01', venue: 'Teatro principal' }).code, 'PDV_CWB_001'));
test('Bloqueia código de terminal com comandos ou delimitadores', () =>
  assert.throws(() => assertPdvTerminal({ code: 'PDV;DROP', label: 'Bilheteria 01', venue: 'Teatro principal' })));
test('Bloqueia turno se operações do PDV desativadas', () =>
  assert.throws(() => assertShiftMayOpen('ATIVO', false, true, false)));
test('Bloqueia turno de terminal não habilitado', () =>
  assert.throws(() => assertShiftMayOpen('BLOQUEADO_HOMOLOGACAO', false, true, true)));
test('Bloqueia operador não autorizado', () =>
  assert.throws(() => assertShiftMayOpen('ATIVO', false, false, true)));
test('Bloqueia segundo turno simultâneo', () =>
  assert.throws(() => assertShiftMayOpen('ATIVO', true, true, true)));
test('Consulta sandbox exige bloqueio real de dinheiro', () =>
  assert.equal(assertPagbankSandbox(env), env.PAGBANK_SANDBOX_TOKEN));
test('Não consulta sandbox com ambiente produção', () =>
  assert.throws(() => assertPagbankSandbox({ ...env, BRAVO_ENV: 'PRODUCAO' })));
test('Não consulta sandbox com pagamentos reais ativados', () =>
  assert.throws(() => assertPagbankSandbox({ ...env, ENABLE_REAL_PAYMENTS: 'true' })));
test('Não consulta sandbox com token inexistente', () =>
  assert.throws(() => assertPagbankSandbox({ ...env, PAGBANK_SANDBOX_TOKEN: '' })));
test('Valida identificador remoto', () =>
  assert.equal(assertSandboxCheckoutId('CHEC_ABC12345'), 'CHEC_ABC12345'));
test('Rejeita URL remota na referência (sem SSRF)', () =>
  assert.throws(() => assertSandboxCheckoutId('https://example.com/checkout')));
test('AUTHORIZED e PAID são apenas informações e nunca emitem', () => {
  for (const status of ['AUTHORIZED', 'PAID']) {
    const x = providerStatusReadOnly(status);
    assert.equal(x.issuedTickets, 0);
    assert.equal(x.requiresVerifiedWebhookAndReconciliation, true);
  }
});
test('Payload do checkout usa centavos do pedido e prazo da reserva', () => {
  const expiresAt = new Date('2030-05-01T00:00:00Z');
  const x = safeSandboxPayload({
    id: uuid,
    quantity: 2,
    unitCents: 5250,
    totalCents: 10500,
    expiresAt,
    lot: { name: 'Inteira' },
  });
  assert.equal(x.items[0].unit_amount, 5250);
  assert.equal(x.items[0].quantity, 2);
  assert.equal(x.expiration_date, expiresAt.toISOString());
  assert.equal(x.reference_id, uuid);
});
test('Sem item válido não monta checkout sandbox', () =>
  assert.throws(() =>
    safeSandboxPayload({
      id: uuid,
      quantity: 0,
      unitCents: 5250,
      totalCents: 0,
      expiresAt: new Date(),
      lot: { name: 'Inteira' },
    })
  ));
test('Diferença entre total do pedido e soma dos itens é recusada', () =>
  assert.throws(() =>
    safeSandboxPayload({
      id: uuid,
      quantity: 2,
      unitCents: 5250,
      totalCents: 10501,
      expiresAt: new Date(),
      lot: { name: 'Inteira' },
    })
  ));
