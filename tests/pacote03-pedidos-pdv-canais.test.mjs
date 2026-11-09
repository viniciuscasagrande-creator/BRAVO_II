import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const p08 = await import('../packages/domain-p08/dist/index.js');
const p09 = await import('../packages/domain-p09/dist/index.js');

test('Pacote 03 (PED-001 & PED-002): reserva em setor numerado exige seatIds distintos equivalentes à quantidade e libera poltronas ao expirar/cancelar', () => {
  const now = new Date('2026-06-01T15:00:00Z');
  const baseEvent = {
    eventStatus: 'PUBLICADO',
    lotStatus: 'ATIVO',
    sessionStatus: 'ATIVA',
    lotStartsAt: new Date('2026-05-01T00:00:00Z'),
    lotEndsAt: new Date('2026-07-01T00:00:00Z'),
    salesStartAt: new Date('2026-05-01T00:00:00Z'),
    eventStartsAt: new Date('2026-07-01T20:00:00Z'),
    now,
    enabledChannels: ['ONLINE'],
    channel: 'ONLINE',
    numbered: true,
    quantity: 2,
  };

  assert.throws(
    () => p08.mayReserve({ ...baseEvent, seatIds: [] }),
    /Lugares numerados aguardam módulo de alocação por assento/
  );

  const seatA = '11111111-1111-4111-8111-111111111111';
  const seatB = '22222222-2222-4222-8222-222222222222';
  assert.throws(
    () => p08.mayReserve({ ...baseEvent, seatIds: [seatA, seatA] }),
    /Poltrona duplicada informada na mesma reserva/
  );

  assert.equal(p08.mayReserve({ ...baseEvent, seatIds: [seatA, seatB] }), true);

  const orderSvc = fs.readFileSync('apps/api/src/modules/pacote08/order.service.ts', 'utf8');
  assert.match(orderSvc, /UPDATE seats\s+SET status = 'HELD', active_hold_id = \$1/);
  assert.match(orderSvc, /UPDATE seats SET status = 'AVAILABLE', active_hold_id = NULL/);
});

test('Pacote 03 (PED-003): limite configurável de ingressos por canal e cálculo de cupom promocional no servidor', () => {
  assert.equal(p08.assertChannelOrderLimit(4, 'ONLINE', 6), 6);
  assert.throws(
    () => p08.assertChannelOrderLimit(5, 'ONLINE', 4),
    /PED-003: Limite máximo de 4 ingressos por pedido no canal ONLINE/
  );

  const discountPct = p08.calculateCouponDiscountCents(20_000, {
    discountType: 'PERCENTAGE',
    percentageRate: 15,
    fixedAmountCents: null,
  });
  assert.equal(discountPct.discountCents, 3_000);
  assert.equal(discountPct.finalTotalCents, 17_000);

  const discountFixed = p08.calculateCouponDiscountCents(20_000, {
    discountType: 'FIXED',
    percentageRate: null,
    fixedAmountCents: 2_500,
  });
  assert.equal(discountFixed.discountCents, 2_500);
  assert.equal(discountFixed.finalTotalCents, 17_500);
});

test('Pacote 03 (PDV-001): validação de setores autorizados no PDV e conciliação consolidada de turno/caixa', () => {
  const sec1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const sec2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  assert.equal(p09.assertPdvSectorAllowed([sec1], sec1), true);
  assert.throws(
    () => p09.assertPdvSectorAllowed([sec1], sec2),
    /Setor não autorizado para venda neste ponto de venda/
  );

  const summary = p09.summarizePdvShiftReconciliation([
    { status: 'PAGO', totalCents: 12_000, quantity: 2 },
    { status: 'RESERVADO', totalCents: 6_000, quantity: 1 },
    { status: 'CANCELADO', totalCents: 6_000, quantity: 1 },
  ]);
  assert.equal(summary.totalOrders, 3);
  assert.equal(summary.paidCount, 2);
  assert.equal(summary.paidAmountCents, 12_000);
  assert.equal(summary.reservedCount, 1);
  assert.equal(summary.reservedAmountCents, 6_000);
  assert.equal(summary.cancelledOrExpiredCount, 1);
});
