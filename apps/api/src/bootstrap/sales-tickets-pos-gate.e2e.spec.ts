import 'reflect-metadata';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from '../common/errors/api-exception.filter';
import { IdentityService } from '../modules/identity/identity.service';
import {
  PUBLIC_TICKET_CODE_REGEX,
  type CheckinValidationResultDto,
  type CouponCampaignDto,
  type CourtesyQuotaDto,
  type CustomerDto,
  type EventBuilderFullViewDto,
  type InventoryHoldDto,
  type OrderDetailDto,
  type PaymentIntentDto,
  type PosCashSessionDto,
  type PosTerminalDto,
  type SeatDto,
  type SessionAvailabilityDto,
  type TicketDetailDto,
} from '@bravo-ii/contracts';

describe('BRAVO_II — Fases 04 e 05 E2E: Inventário Concorrente (Site vs PDV), Pedidos, Webhook Idempotente, Ingresso 8 Dígitos, Portaria QR e Cupons/Cortesias', () => {
  let app: INestApplication;
  let baseUrl: string;

  let tokenComercial: string;
  let tokenOperacao: string;
  let tokenPdv: string;
  let tokenPortaria: string;

  let producerId: string;
  let eventId: string;
  let sessionId: string;
  let sectorId: string;
  let priceLotId: string;
  let seatA01Id: string;
  let seatA02Id: string;
  let customerId: string;
  let cashSessionId: string;

  let issuedTicket: TicketDetailDto;

  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PGLITE_DATA_DIR = 'memory://';
    process.env.ALLOW_REAL_PAYMENT_GATEWAY = 'false';
    process.env.ALLOW_REAL_REFUND_EXECUTION = 'false';
    process.env.ALLOW_REAL_PAYOUT_EXECUTION = 'false';

    app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.listen(0);

    const server = app.getHttpServer();
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;

    const identity = app.get(IdentityService);
    await identity.syncCanonicalRolesAndPermissions();

    await identity.ensureOperatorAccount({
      id: '22000000-0000-4000-8000-000000000001',
      email: 'comercial.f04@diskingressos.test',
      fullName: 'Comercial Disk F04',
      plainPassword: 'BravoTest#Comercial2026',
      role: 'COMERCIAL_DISK',
    });

    await identity.ensureOperatorAccount({
      id: '22000000-0000-4000-8000-000000000002',
      email: 'operacao.f04@diskingressos.test',
      fullName: 'Operação Eventos Disk F04',
      plainPassword: 'BravoTest#Operacao2026',
      role: 'OPERACAO_EVENTOS',
    });

    await identity.ensureOperatorAccount({
      id: '22000000-0000-4000-8000-000000000003',
      email: 'pdv.f04@diskingressos.test',
      fullName: 'Operador Caixa PDV F04',
      plainPassword: 'BravoTest#Pdv2026',
      role: 'PDV_CAIXA',
    });

    await identity.ensureOperatorAccount({
      id: '22000000-0000-4000-8000-000000000004',
      email: 'portaria.f04@diskingressos.test',
      fullName: 'Operador Portaria Checkin F04',
      plainPassword: 'BravoTest#Portaria2026',
      role: 'PORTARIA_CHECKIN',
    });

    const login = async (email: string, password: string): Promise<string> => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      assert.equal(res.status, 201);
      const data = (await res.json()) as { token: string };
      return data.token;
    };

    tokenComercial = await login('comercial.f04@diskingressos.test', 'BravoTest#Comercial2026');
    tokenOperacao = await login('operacao.f04@diskingressos.test', 'BravoTest#Operacao2026');
    tokenPdv = await login('pdv.f04@diskingressos.test', 'BravoTest#Pdv2026');
    tokenPortaria = await login('portaria.f04@diskingressos.test', 'BravoTest#Portaria2026');

    // Preparar Produtor PJ Verificado + Evento Publicado com Taxa Disk 12%
    const prodRes = await fetch(`${baseUrl}/api/v1/producers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenComercial}` },
      body: JSON.stringify({
        cnpj: '44.555.666/0001-77',
        legalName: 'Produtora Araucária Eventos Ltda',
        tradeName: 'Araucária Eventos',
      }),
    });
    assert.equal(prodRes.status, 201);
    producerId = ((await prodRes.json()) as { id: string }).id;

    await fetch(`${baseUrl}/api/v1/producers/${producerId}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenComercial}` },
      body: JSON.stringify({
        fullName: 'Carlos Mendes',
        email: 'carlos@araucaria.test',
        phone: '+5541988887777',
        roleType: 'LEGAL_REPRESENTATIVE',
        isPrimary: true,
      }),
    });
    await fetch(`${baseUrl}/api/v1/producers/${producerId}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenComercial}` },
      body: JSON.stringify({
        documentType: 'CONTRATO_SOCIAL',
        documentReference: 'S3://bravo/araucaria-doc.pdf',
      }),
    });
    await fetch(`${baseUrl}/api/v1/producers/${producerId}/contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenComercial}` },
      body: JSON.stringify({
        contractNumber: 'CTR-2026-F04',
        title: 'Contrato Bilheteria Araucária',
        status: 'ACTIVE',
      }),
    });
    await fetch(`${baseUrl}/api/v1/producers/${producerId}/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenComercial}` },
    });

    const evtRes = await fetch(`${baseUrl}/api/v1/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenOperacao}` },
      body: JSON.stringify({
        code: 'EVT-F04-VENDAS',
        title: 'Show Sinfônico Araucária',
        venueName: 'Ópera de Arame',
        city: 'Curitiba',
        stateUf: 'PR',
        timezone: 'America/Sao_Paulo',
        startsAt: '2026-12-28T23:00:00.000Z',
        primaryProducerId: producerId,
      }),
    });
    assert.equal(evtRes.status, 201);
    eventId = ((await evtRes.json()) as EventBuilderFullViewDto).id;

    const sesRes = await fetch(`${baseUrl}/api/v1/events/${eventId}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenOperacao}` },
      body: JSON.stringify({
        code: 'SES-UNICA',
        title: 'Sessão Única 20h',
        startsAt: '2026-12-28T23:00:00.000Z',
        endsAt: '2026-12-29T02:00:00.000Z',
        totalCapacity: 10,
      }),
    });
    sessionId = ((await sesRes.json()) as { id: string }).id;

    const secRes = await fetch(`${baseUrl}/api/v1/events/${eventId}/sectors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenOperacao}` },
      body: JSON.stringify({
        sessionId,
        code: 'CAMAROTE-A',
        name: 'Camarote A Numerado',
        areaType: 'SEATED',
        capacity: 5,
        blockedQuantity: 0,
      }),
    });
    sectorId = ((await secRes.json()) as { id: string }).id;

    const lotRes = await fetch(`${baseUrl}/api/v1/events/${eventId}/price-lots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenOperacao}` },
      body: JSON.stringify({
        sessionId,
        sectorId,
        modalityName: 'Inteira Camarote',
        categoryType: 'INTEIRA',
        lotNumber: 1,
        nominalPriceCents: 20000,
        maxQuantity: 5,
      }),
    });
    priceLotId = ((await lotRes.json()) as { id: string }).id;

    await fetch(`${baseUrl}/api/v1/events/${eventId}/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenOperacao}` },
      body: JSON.stringify({
        channelType: 'SITE',
        channelCode: 'SITE-OFICIAL',
        channelName: 'Site DiskIngressos',
        allowedPaymentMethods: ['PIX', 'CREDIT_CARD'],
      }),
    });

    await fetch(`${baseUrl}/api/v1/events/${eventId}/fee-agreements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenComercial}` },
      body: JSON.stringify({
        calculationType: 'PERCENTAGE',
        percentageRate: 12,
        fixedAmountCents: null,
        payer: 'CUSTOMER',
      }),
    });
    await fetch(`${baseUrl}/api/v1/events/${eventId}/fee-agreements/1/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenComercial}` },
      body: JSON.stringify({ approvalReference: 'COM-F04-APROVADO' }),
    });
    await fetch(`${baseUrl}/api/v1/events/${eventId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenOperacao}` },
    });
    await fetch(`${baseUrl}/api/v1/events/${eventId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenOperacao}` },
      body: JSON.stringify({ notes: 'Evento aprovado para vendas.' }),
    });
    await fetch(`${baseUrl}/api/v1/events/${eventId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenOperacao}` },
    });
  });

  after(async () => {
    if (app) {
      await app.close();
    }
  });

  it('1. Cadastra Cliente PF com CPF mascarado (sem expor CPF em claro) e cria assentos numerados no setor', async () => {
    const custRes = await fetch(`${baseUrl}/api/v1/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenOperacao}` },
      body: JSON.stringify({
        cpf: '123.456.789-01',
        fullName: 'Beatriz Oliveira',
        email: 'beatriz.oliveira@cliente.test',
        phone: '+5541991112222',
        marketingConsent: true,
      }),
    });
    assert.equal(custRes.status, 201);
    const customer = (await custRes.json()) as CustomerDto;
    assert.equal(customer.cpfMasked, '***.456.789-**');
    assert.equal(customer.marketingConsent, true);
    customerId = customer.id;

    // Criar assentos numerados A-01 e A-02
    const seatsRes = await fetch(
      `${baseUrl}/api/v1/events/${eventId}/sectors/${sectorId}/seats`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenOperacao}` },
        body: JSON.stringify({ seatCodes: ['A-01', 'A-02', 'A-03'] }),
      }
    );
    assert.equal(seatsRes.status, 201);
    const seats = ((await seatsRes.json()) as { items: SeatDto[] }).items;
    assert.equal(seats.length, 3);
    seatA01Id = seats.find((s) => s.seatCode === 'A-01')!.id;
    seatA02Id = seats.find((s) => s.seatCode === 'A-02')!.id;
  });

  it('2. Concorrência pelo mesmo assento (Site vs PDV): duas reservas simultâneas para A-01 permitem apenas 1 vencedor e retornam 409 Conflict para o segundo', async () => {
    const [resSite, resPdv] = await Promise.all([
      fetch(`${baseUrl}/api/v1/sessions/${sessionId}/holds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenOperacao}` },
        body: JSON.stringify({
          sectorId,
          seatId: seatA01Id,
          channelType: 'SITE',
          quantity: 1,
          idempotencyKey: 'race-site-seat-a01',
          ttlSeconds: 600,
        }),
      }),
      fetch(`${baseUrl}/api/v1/sessions/${sessionId}/holds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenPdv}` },
        body: JSON.stringify({
          sectorId,
          seatId: seatA01Id,
          channelType: 'PDV',
          quantity: 1,
          idempotencyKey: 'race-pdv-seat-a01',
          ttlSeconds: 600,
        }),
      }),
    ]);

    const statuses = [resSite.status, resPdv.status].sort();
    assert.deepEqual(statuses, [201, 409]);

    const winnerRes = resSite.status === 201 ? resSite : resPdv;
    const winnerHold = (await winnerRes.json()) as InventoryHoldDto;
    assert.equal(winnerHold.seatId, seatA01Id);
    assert.equal(winnerHold.status, 'ACTIVE');

    // Criar pedido e checkout sobre o hold vencedor, simulando falha de e-mail inicial
    const orderRes = await fetch(`${baseUrl}/api/v1/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenOperacao}` },
      body: JSON.stringify({
        eventId,
        sessionId,
        customerId,
        holdId: winnerHold.id,
        priceLotId,
        channelType: 'SITE',
        idempotencyKey: 'ord-seat-a01-winner',
      }),
    });
    assert.equal(orderRes.status, 201);
    const createdOrder = (await orderRes.json()) as OrderDetailDto;
    // Preço nominal 20000 + Taxa Disk 12% (2400) = 22400
    assert.equal(createdOrder.subtotalNominalCents, 20000);
    assert.equal(createdOrder.diskFeeCents, 2400);
    assert.equal(createdOrder.totalChargedCents, 22400);

    const checkoutRes = await fetch(`${baseUrl}/api/v1/orders/${createdOrder.id}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenOperacao}` },
      body: JSON.stringify({
        paymentMethod: 'PIX',
        idempotencyKey: 'chk-seat-a01',
        simulateEmailFailure: true,
      }),
    });
    assert.equal(checkoutRes.status, 201);
    const checkoutData = (await checkoutRes.json()) as {
      order: OrderDetailDto;
      paymentIntent: PaymentIntentDto;
    };

    // 3. Enviar Webhook de pagamento Sandbox DUAS vezes com o mesmo providerEventId (idempotência)
    const webhookPayload = {
      providerEventId: 'evt_provider_unique_0001',
      paymentIntentId: checkoutData.paymentIntent.id,
      eventType: 'PAYMENT_CAPTURED',
      signature: 'sbx_sig_authentic_001',
      simulateEmailFailure: true,
    };

    const wh1Res = await fetch(`${baseUrl}/api/v1/webhooks/payments/sandbox_gateway`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    });
    assert.equal(wh1Res.status, 201);
    const wh1 = (await wh1Res.json()) as { idempotentReplay: boolean; order: OrderDetailDto };
    assert.equal(wh1.idempotentReplay, false);
    assert.equal(wh1.order.status, 'CONFIRMADO');
    assert.equal(wh1.order.tickets.length, 1);

    const wh2Res = await fetch(`${baseUrl}/api/v1/webhooks/payments/sandbox_gateway`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    });
    assert.equal(wh2Res.status, 201);
    const wh2 = (await wh2Res.json()) as { idempotentReplay: boolean; order: OrderDetailDto };
    assert.equal(wh2.idempotentReplay, true);
    assert.equal(wh2.order.tickets.length, 1);
    assert.equal(wh2.order.tickets[0]!.id, wh1.order.tickets[0]!.id);

    issuedTicket = wh1.order.tickets[0]!;
    // Verifica código público de 8 dígitos numéricos e eixos independentes
    assert.equal(PUBLIC_TICKET_CODE_REGEX.test(issuedTicket.publicCode), true);
    assert.equal(issuedTicket.validityStatus, 'EMITIDO');
    assert.equal(issuedTicket.deliveryStatus, 'FALHA_ENVIO');
    assert.equal(issuedTicket.checkinStatus, 'NAO_UTILIZADO');
    assert.ok(issuedTicket.qrCredential?.qrToken);
  });

  it('3. Falha de envio de e-mail transacional não invalida o ingresso e permite retry até SENT/ENVIADO', async () => {
    const retryRes = await fetch(
      `${baseUrl}/api/v1/tickets/${issuedTicket.id}/retry-delivery`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenOperacao}` },
      }
    );
    assert.equal(retryRes.status, 201);
    const retried = (await retryRes.json()) as TicketDetailDto;
    assert.equal(retried.validityStatus, 'EMITIDO');
    assert.equal(retried.deliveryStatus, 'ENVIADO');
    assert.equal(retried.delivery?.status, 'SENT');
    assert.equal((retried.delivery?.attemptCount ?? 0) >= 2, true);
  });

  it('4. Validação de Portaria: bloqueia tentativa com apenas os 8 dígitos públicos, aprova 1º check-in com QR assinado e bloqueia 2º check-in duplicado', async () => {
    // 4.1 Tentativa informando apenas o código público de 8 dígitos sem QR -> DENIED_PUBLIC_CODE_ONLY
    const codeOnlyRes = await fetch(`${baseUrl}/api/v1/checkins/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenPortaria}` },
      body: JSON.stringify({
        eventId,
        sessionId,
        gateDeviceCode: 'COLETOR-PORTARIA-01',
        publicCodeOnly: issuedTicket.publicCode,
      }),
    });
    assert.equal(codeOnlyRes.status, 201);
    const codeOnlyData = (await codeOnlyRes.json()) as CheckinValidationResultDto;
    assert.equal(codeOnlyData.allowed, false);
    assert.equal(codeOnlyData.outcome, 'DENIED_PUBLIC_CODE_ONLY');

    // 4.2 Primeiro check-in com QR Token e assinatura HMAC válidos -> ALLOWED
    const validCheckinRes = await fetch(`${baseUrl}/api/v1/checkins/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenPortaria}` },
      body: JSON.stringify({
        eventId,
        sessionId,
        gateDeviceCode: 'COLETOR-PORTARIA-01',
        qrToken: issuedTicket.qrCredential!.qrToken,
        signatureHmac: issuedTicket.qrCredential!.signatureHmac,
      }),
    });
    assert.equal(validCheckinRes.status, 201);
    const validCheckin = (await validCheckinRes.json()) as CheckinValidationResultDto;
    assert.equal(validCheckin.allowed, true);
    assert.equal(validCheckin.outcome, 'ALLOWED');
    assert.equal(validCheckin.ticket?.checkinStatus, 'VALIDADO');

    // 4.3 Segundo check-in com o mesmo QR Code -> DENIED_ALREADY_USED
    const dupCheckinRes = await fetch(`${baseUrl}/api/v1/checkins/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenPortaria}` },
      body: JSON.stringify({
        eventId,
        sessionId,
        gateDeviceCode: 'COLETOR-PORTARIA-02',
        qrToken: issuedTicket.qrCredential!.qrToken,
        signatureHmac: issuedTicket.qrCredential!.signatureHmac,
      }),
    });
    assert.equal(dupCheckinRes.status, 201);
    const dupCheckin = (await dupCheckinRes.json()) as CheckinValidationResultDto;
    assert.equal(dupCheckin.allowed, false);
    assert.equal(dupCheckin.outcome, 'DENIED_ALREADY_USED');
  });

  it('5. Terminal PDV abre caixa, realiza venda com cupom de uso único, bloqueia reutilização do cupom esgotado e invalida QR de ingresso cancelado', async () => {
    // Cadastrar terminal PDV e abrir sessão de caixa
    const termRes = await fetch(`${baseUrl}/api/v1/pos/terminals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenPdv}` },
      body: JSON.stringify({
        terminalCode: 'PDV-SHOPPING-01',
        name: 'PDV Shopping Curitiba',
        locationDescription: 'Piso L2',
      }),
    });
    assert.equal(termRes.status, 201);
    const terminal = (await termRes.json()) as PosTerminalDto;

    const openCashRes = await fetch(`${baseUrl}/api/v1/pos/cash-sessions/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenPdv}` },
      body: JSON.stringify({
        terminalId: terminal.id,
        openingBalanceCents: 15000,
      }),
    });
    assert.equal(openCashRes.status, 201);
    const cashSession = (await openCashRes.json()) as PosCashSessionDto;
    cashSessionId = cashSession.id;

    // Criar campanha de cupom com maxUses = 1 (50% de desconto)
    const cpnRes = await fetch(`${baseUrl}/api/v1/coupon-campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenComercial}` },
      body: JSON.stringify({
        eventId,
        code: 'UNICO50',
        title: 'Desconto Único 50%',
        discountType: 'PERCENTAGE',
        percentageRate: 50,
        fixedAmountCents: null,
        maxUses: 1,
      }),
    });
    assert.equal(cpnRes.status, 201);
    const campaign = (await cpnRes.json()) as CouponCampaignDto;
    assert.equal(campaign.maxUses, 1);

    // Reservar assento A-02 no PDV e aplicar cupom UNICO50
    const holdA02Res = await fetch(`${baseUrl}/api/v1/sessions/${sessionId}/holds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenPdv}` },
      body: JSON.stringify({
        sectorId,
        seatId: seatA02Id,
        channelType: 'PDV',
        quantity: 1,
        idempotencyKey: 'hold-pdv-a02',
      }),
    });
    assert.equal(holdA02Res.status, 201);
    const holdA02 = (await holdA02Res.json()) as InventoryHoldDto;

    const pdvOrderRes = await fetch(`${baseUrl}/api/v1/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenPdv}` },
      body: JSON.stringify({
        eventId,
        sessionId,
        customerId,
        holdId: holdA02.id,
        priceLotId,
        channelType: 'PDV',
        posCashSessionId: cashSessionId,
        couponCode: 'UNICO50',
        idempotencyKey: 'ord-pdv-a02',
      }),
    });
    assert.equal(pdvOrderRes.status, 201);
    const pdvOrder = (await pdvOrderRes.json()) as OrderDetailDto;
    // Preço 20000 - 50% (10000) = 10000 líquido + 12% Taxa Disk (1200) = 11200
    assert.equal(pdvOrder.discountCents, 10000);
    assert.equal(pdvOrder.diskFeeCents, 1200);
    assert.equal(pdvOrder.totalChargedCents, 11200);

    // Checkout PDV em dinheiro (CASH) -> confirma imediatamente
    const pdvChkRes = await fetch(`${baseUrl}/api/v1/orders/${pdvOrder.id}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenPdv}` },
      body: JSON.stringify({
        paymentMethod: 'CASH',
        idempotencyKey: 'chk-pdv-a02',
      }),
    });
    assert.equal(pdvChkRes.status, 201);
    const pdvChk = (await pdvChkRes.json()) as { order: OrderDetailDto };
    assert.equal(pdvChk.order.status, 'CONFIRMADO');
    const pdvTicket = pdvChk.order.tickets[0]!;

    // Tentar usar o cupom UNICO50 novamente em outro hold -> deve falhar com 409 Conflict (cupom esgotado)
    const holdExtraRes = await fetch(`${baseUrl}/api/v1/sessions/${sessionId}/holds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenOperacao}` },
      body: JSON.stringify({
        sectorId,
        channelType: 'SITE',
        quantity: 1,
        idempotencyKey: 'hold-extra-cpn-test',
      }),
    });
    const holdExtra = (await holdExtraRes.json()) as InventoryHoldDto;

    const exhaustedCpnOrderRes = await fetch(`${baseUrl}/api/v1/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenOperacao}` },
      body: JSON.stringify({
        eventId,
        sessionId,
        customerId,
        holdId: holdExtra.id,
        priceLotId,
        channelType: 'SITE',
        couponCode: 'UNICO50',
        idempotencyKey: 'ord-exhausted-cpn',
      }),
    });
    assert.equal(exhaustedCpnOrderRes.status, 409);

    // Cancelar o ingresso emitido no PDV -> libera o assento A-02 e invalida o QR na catraca
    const cancelRes = await fetch(`${baseUrl}/api/v1/tickets/${pdvTicket.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenOperacao}` },
      body: JSON.stringify({ reasonPtBr: 'Teste E2E de cancelamento e invalidação de QR' }),
    });
    assert.equal(cancelRes.status, 201);
    const cancelledTicket = (await cancelRes.json()) as TicketDetailDto;
    assert.equal(cancelledTicket.validityStatus, 'CANCELADO');

    // Tentar passar na catraca com o QR do ingresso cancelado -> DENIED_INVALID_STATUS
    const cancelledCheckinRes = await fetch(`${baseUrl}/api/v1/checkins/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenPortaria}` },
      body: JSON.stringify({
        eventId,
        sessionId,
        gateDeviceCode: 'COLETOR-PORTARIA-01',
        qrToken: pdvTicket.qrCredential!.qrToken,
        signatureHmac: pdvTicket.qrCredential!.signatureHmac,
      }),
    });
    assert.equal(cancelledCheckinRes.status, 201);
    const cancelledCheckin = (await cancelledCheckinRes.json()) as CheckinValidationResultDto;
    assert.equal(cancelledCheckin.allowed, false);
    assert.equal(cancelledCheckin.outcome, 'DENIED_INVALID_STATUS');

    // Verificar que o assento A-02 voltou para AVAILABLE no mapa da sessão
    const availRes = await fetch(`${baseUrl}/api/v1/sessions/${sessionId}/availability`, {
      headers: { Authorization: `Bearer ${tokenOperacao}` },
    });
    const avail = (await availRes.json()) as SessionAvailabilityDto;
    const seatA02AfterCancel = avail.sectors[0]!.seats.find((s) => s.id === seatA02Id);
    assert.equal(seatA02AfterCancel?.status, 'AVAILABLE');
  });

  it('6. Quota de Cortesias emite ingresso gratuito dentro do limite autorizado e bloqueia emissão excedente', async () => {
    const quotaRes = await fetch(`${baseUrl}/api/v1/courtesy-quotas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenOperacao}` },
      body: JSON.stringify({
        eventId,
        sessionId,
        sectorId,
        authorizedQuantity: 1,
      }),
    });
    assert.equal(quotaRes.status, 201);
    const quota = (await quotaRes.json()) as CourtesyQuotaDto;

    // 1ª emissão de cortesia -> 201 Created
    const issue1Res = await fetch(`${baseUrl}/api/v1/courtesy-quotas/${quota.id}/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenOperacao}` },
      body: JSON.stringify({
        customerId,
        priceLotId,
        idempotencyKey: 'crt-issue-01',
      }),
    });
    assert.equal(issue1Res.status, 201);
    const crtOrder = (await issue1Res.json()) as OrderDetailDto;
    assert.equal(crtOrder.channelType, 'CORTESIA');
    assert.equal(crtOrder.totalChargedCents, 0);
    assert.equal(crtOrder.tickets.length, 1);
    assert.equal(PUBLIC_TICKET_CODE_REGEX.test(crtOrder.tickets[0]!.publicCode), true);

    // 2ª emissão acima da quota autorizada (1/1) -> 409 Conflict
    const issue2Res = await fetch(`${baseUrl}/api/v1/courtesy-quotas/${quota.id}/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenOperacao}` },
      body: JSON.stringify({
        customerId,
        priceLotId,
        idempotencyKey: 'crt-issue-02-exceeded',
      }),
    });
    assert.equal(issue2Res.status, 409);
  });
});
