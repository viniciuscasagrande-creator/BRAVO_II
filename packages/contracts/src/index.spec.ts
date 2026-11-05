import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_ROLES,
  calculateEventDiskFeeCents,
  EventFeeAgreementSchema,
  filterNavigationByPermissions,
  isValidPublicTicketCode,
} from './index';

describe('@bravo-ii/contracts — Regras de Domínio e RBAC', () => {
  it('calcula Taxa Disk por evento tanto percentual quanto fixa em centavos sem ponto flutuante', () => {
    const feePercent = calculateEventDiskFeeCents(10000, {
      calculationType: 'PERCENTAGE',
      percentageRate: 12.5,
      fixedAmountCents: null,
    });
    assert.equal(feePercent, 1250);

    const feeFixed = calculateEventDiskFeeCents(10000, {
      calculationType: 'FIXED',
      percentageRate: null,
      fixedAmountCents: 1500,
    });
    assert.equal(feeFixed, 1500);
  });

  it('valida schema de Taxa Disk exigindo escopo INTERNAL_DISK e proibindo ambiguidade fixo/percentual', () => {
    const valid = EventFeeAgreementSchema.safeParse({
      eventId: '11111111-1111-4111-8111-111111111111',
      agreementVersion: 1,
      calculationType: 'PERCENTAGE',
      percentageRate: 10,
      fixedAmountCents: null,
      payer: 'CUSTOMER',
      visibility: 'INTERNAL_DISK',
      status: 'APPROVED',
    });
    assert.equal(valid.success, true);

    const invalidBoth = EventFeeAgreementSchema.safeParse({
      eventId: '11111111-1111-4111-8111-111111111111',
      agreementVersion: 1,
      calculationType: 'PERCENTAGE',
      percentageRate: 10,
      fixedAmountCents: 500,
      payer: 'CUSTOMER',
      visibility: 'INTERNAL_DISK',
      status: 'APPROVED',
    });
    assert.equal(invalidBoth.success, false);
  });

  it('valida código numérico público de ingresso de exatamente 8 dígitos preservando zeros à esquerda', () => {
    assert.equal(isValidPublicTicketCode('00481920'), true);
    assert.equal(isValidPublicTicketCode('1234567'), false);
    assert.equal(isValidPublicTicketCode('123456789'), false);
    assert.equal(isValidPublicTicketCode('1234ABCD'), false);
  });

  it('segrega permissões entre Financeiro Disk, SAC e Produtor PDT', () => {
    const financeiroPerms = CANONICAL_ROLES.FINANCEIRO_DISK.permissions;
    const sacPerms = CANONICAL_ROLES.SAC_ATENDIMENTO.permissions;
    const produtorPerms = CANONICAL_ROLES.PRODUTOR_PDT.permissions;

    assert.equal(financeiroPerms.includes('event-fee:read-internal'), true);
    assert.equal(financeiroPerms.includes('refund:approve'), true);

    assert.equal(sacPerms.includes('refund:request'), true);
    assert.equal(sacPerms.includes('refund:approve'), false);
    assert.equal(sacPerms.includes('event-fee:read-internal'), false);

    assert.equal(produtorPerms.includes('pdt:portal-read'), true);
    assert.equal(produtorPerms.includes('event-fee:read-internal'), false);
    assert.equal(produtorPerms.includes('finance:read'), false);

    const produtorMenu = filterNavigationByPermissions(produtorPerms);
    const produtorHrefs = produtorMenu.map((m) => m.href);
    assert.equal(produtorHrefs.includes('/financeiro'), false);
    assert.equal(produtorHrefs.includes('/comercial'), false);
    assert.equal(produtorHrefs.includes('/produtores-pdt'), true);
  });
});
