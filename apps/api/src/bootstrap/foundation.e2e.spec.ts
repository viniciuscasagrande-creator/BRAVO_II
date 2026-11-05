import 'reflect-metadata';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from '../common/errors/api-exception.filter';
import { DatabaseService } from '../common/database/database.service';
import { IdentityService } from '../modules/identity/identity.service';
import { ISOLATED_TEST_FIXTURES } from '@bravo-ii/testing';
import type {
  AuditRecordDto,
  EventSummaryViewDto,
  NavigationMenuItem,
  OperationalOverviewDto,
} from '@bravo-ii/contracts';

describe('BRAVO_II — Fase 01 E2E: Core, RBAC, Escopo Cruzado, Taxa Disk por Evento e Auditoria', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let baseUrl: string;

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

    db = app.get(DatabaseService);
    const identity = app.get(IdentityService);
    await identity.syncCanonicalRolesAndPermissions();
  });

  after(async () => {
    if (app) {
      await app.close();
    }
  });

  it('1. GET /health retorna status operacional, migrations aplicadas e bloqueio de gateways reais', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      status: string;
      database: string;
      migrationsApplied: number;
      realFinancialGatewaysBlocked: boolean;
    };
    assert.equal(body.status, 'ok');
    assert.equal(body.database, 'connected');
    assert.equal(body.migrationsApplied >= 1, true);
    assert.equal(body.realFinancialGatewaysBlocked, true);
  });

  it('2. Estado inicial honesto: banco sem fixtures de negócio retorna 0 eventos e 0 estornos pendentes', async () => {
    const identity = app.get(IdentityService);
    await identity.ensureOperatorAccount({
      id: ISOLATED_TEST_FIXTURES.users.financeiro.id,
      email: ISOLATED_TEST_FIXTURES.users.financeiro.email,
      fullName: ISOLATED_TEST_FIXTURES.users.financeiro.fullName,
      plainPassword: ISOLATED_TEST_FIXTURES.users.financeiro.plainPassword,
      role: ISOLATED_TEST_FIXTURES.users.financeiro.role,
    });

    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ISOLATED_TEST_FIXTURES.users.financeiro.email,
        password: ISOLATED_TEST_FIXTURES.users.financeiro.plainPassword,
      }),
    });
    assert.equal(loginRes.status, 201);
    const { token } = (await loginRes.json()) as { token: string };

    const overviewRes = await fetch(`${baseUrl}/api/v1/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(overviewRes.status, 200);
    const overview = (await overviewRes.json()) as OperationalOverviewDto;
    assert.equal(overview.counters.visibleEventsCount, 0);
    assert.equal(overview.counters.publishedEventsCount, 0);
    assert.equal(overview.counters.pendingRefundApprovalsCount, 0);
  });

  it('3. Semeia fixtures isoladas de teste (2 produtores, 2 eventos com Taxas Disk distintas) e valida os 3 perfis (Financeiro Disk, Produtor PDT, SAC)', async () => {
    // Inserir Produtores Alpha e Beta
    await db.query(
      `INSERT INTO producers (id, cnpj, legal_name, trade_name, verification_status)
       VALUES ($1, $2, $3, $4, 'VERIFIED'), ($5, $6, $7, $8, 'VERIFIED')`,
      [
        ISOLATED_TEST_FIXTURES.producers.alpha.id,
        ISOLATED_TEST_FIXTURES.producers.alpha.cnpj,
        ISOLATED_TEST_FIXTURES.producers.alpha.legalName,
        ISOLATED_TEST_FIXTURES.producers.alpha.tradeName,
        ISOLATED_TEST_FIXTURES.producers.beta.id,
        ISOLATED_TEST_FIXTURES.producers.beta.cnpj,
        ISOLATED_TEST_FIXTURES.producers.beta.legalName,
        ISOLATED_TEST_FIXTURES.producers.beta.tradeName,
      ]
    );

    // Inserir Eventos Alpha e Beta
    await db.query(
      `INSERT INTO events (id, code, title, venue_name, city, state_uf, status, starts_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8), ($9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        ISOLATED_TEST_FIXTURES.events.alphaShow.id,
        ISOLATED_TEST_FIXTURES.events.alphaShow.code,
        ISOLATED_TEST_FIXTURES.events.alphaShow.title,
        ISOLATED_TEST_FIXTURES.events.alphaShow.venueName,
        ISOLATED_TEST_FIXTURES.events.alphaShow.city,
        ISOLATED_TEST_FIXTURES.events.alphaShow.stateUf,
        ISOLATED_TEST_FIXTURES.events.alphaShow.status,
        ISOLATED_TEST_FIXTURES.events.alphaShow.startsAt,
        ISOLATED_TEST_FIXTURES.events.betaConcert.id,
        ISOLATED_TEST_FIXTURES.events.betaConcert.code,
        ISOLATED_TEST_FIXTURES.events.betaConcert.title,
        ISOLATED_TEST_FIXTURES.events.betaConcert.venueName,
        ISOLATED_TEST_FIXTURES.events.betaConcert.city,
        ISOLATED_TEST_FIXTURES.events.betaConcert.stateUf,
        ISOLATED_TEST_FIXTURES.events.betaConcert.status,
        ISOLATED_TEST_FIXTURES.events.betaConcert.startsAt,
      ]
    );

    // Vincular Produtores aos respectivos Eventos
    await db.query(
      `INSERT INTO event_producers (event_id, producer_id, relationship_role, revenue_share_percentage)
       VALUES ($1, $2, 'PRIMARY', 100.00), ($3, $4, 'PRIMARY', 100.00)`,
      [
        ISOLATED_TEST_FIXTURES.events.alphaShow.id,
        ISOLATED_TEST_FIXTURES.producers.alpha.id,
        ISOLATED_TEST_FIXTURES.events.betaConcert.id,
        ISOLATED_TEST_FIXTURES.producers.beta.id,
      ]
    );

    // Inserir Taxa Disk por Evento (Percentual 12.5% no Evento Alpha; Fixa R$ 18,00 no Evento Beta)
    await db.query(
      `INSERT INTO event_fee_agreements (
        id, event_id, agreement_version, calculation_type, percentage_rate, fixed_amount_cents,
        payer, visibility, status, approval_reference
      ) VALUES
        ($1, $2, 1, 'PERCENTAGE', 12.5000, NULL, 'CUSTOMER', 'INTERNAL_DISK', 'APPROVED', $3),
        ($4, $5, 1, 'FIXED', NULL, 1800, 'CUSTOMER', 'INTERNAL_DISK', 'APPROVED', $6)`,
      [
        ISOLATED_TEST_FIXTURES.events.alphaShow.feeAgreement.id,
        ISOLATED_TEST_FIXTURES.events.alphaShow.id,
        ISOLATED_TEST_FIXTURES.events.alphaShow.feeAgreement.approvalReference,
        ISOLATED_TEST_FIXTURES.events.betaConcert.feeAgreement.id,
        ISOLATED_TEST_FIXTURES.events.betaConcert.id,
        ISOLATED_TEST_FIXTURES.events.betaConcert.feeAgreement.approvalReference,
      ]
    );

    // Criar operadores SAC e Produtor Alpha (restrito ao Evento Alpha / Produtor Alpha)
    const identity = app.get(IdentityService);
    await identity.ensureOperatorAccount({
      id: ISOLATED_TEST_FIXTURES.users.sac.id,
      email: ISOLATED_TEST_FIXTURES.users.sac.email,
      fullName: ISOLATED_TEST_FIXTURES.users.sac.fullName,
      plainPassword: ISOLATED_TEST_FIXTURES.users.sac.plainPassword,
      role: ISOLATED_TEST_FIXTURES.users.sac.role,
    });

    await identity.ensureOperatorAccount({
      id: ISOLATED_TEST_FIXTURES.users.produtorAlpha.id,
      email: ISOLATED_TEST_FIXTURES.users.produtorAlpha.email,
      fullName: ISOLATED_TEST_FIXTURES.users.produtorAlpha.fullName,
      plainPassword: ISOLATED_TEST_FIXTURES.users.produtorAlpha.plainPassword,
      role: ISOLATED_TEST_FIXTURES.users.produtorAlpha.role,
      producerScopeIds: [ISOLATED_TEST_FIXTURES.producers.alpha.id],
      eventScopeIds: [ISOLATED_TEST_FIXTURES.events.alphaShow.id],
    });

    // Inserir solicitação de estorno aberta pelo SAC
    await db.query(
      `INSERT INTO refund_requests (id, event_id, order_reference, requested_by, amount_cents, reason_pt_br, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'AGUARDANDO_APROVACAO_FINANCEIRA')`,
      [
        ISOLATED_TEST_FIXTURES.refundRequest.id,
        ISOLATED_TEST_FIXTURES.events.alphaShow.id,
        ISOLATED_TEST_FIXTURES.refundRequest.orderReference,
        ISOLATED_TEST_FIXTURES.users.sac.id,
        ISOLATED_TEST_FIXTURES.refundRequest.amountCents,
        ISOLATED_TEST_FIXTURES.refundRequest.reasonPtBr,
      ]
    );

    // Login dos 3 perfis
    const loginHelper = async (email: string, password: string): Promise<string> => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      assert.equal(res.status, 201);
      const data = (await res.json()) as { token: string };
      return data.token;
    };

    const tokenFinanceiro = await loginHelper(
      ISOLATED_TEST_FIXTURES.users.financeiro.email,
      ISOLATED_TEST_FIXTURES.users.financeiro.plainPassword
    );
    const tokenSac = await loginHelper(
      ISOLATED_TEST_FIXTURES.users.sac.email,
      ISOLATED_TEST_FIXTURES.users.sac.plainPassword
    );
    const tokenProdutorAlpha = await loginHelper(
      ISOLATED_TEST_FIXTURES.users.produtorAlpha.email,
      ISOLATED_TEST_FIXTURES.users.produtorAlpha.plainPassword
    );

    // 3.1. Verificar que Financeiro Disk enxerga ambos os eventos e suas respectivas Taxas Disk internas (Percentual vs Fixa)
    const finEventsRes = await fetch(`${baseUrl}/api/v1/events`, {
      headers: { Authorization: `Bearer ${tokenFinanceiro}` },
    });
    assert.equal(finEventsRes.status, 200);
    const finEvents = ((await finEventsRes.json()) as { items: EventSummaryViewDto[] }).items;
    assert.equal(finEvents.length, 2);

    const alphaFinView = finEvents.find((e) => e.id === ISOLATED_TEST_FIXTURES.events.alphaShow.id)!;
    const betaFinView = finEvents.find((e) => e.id === ISOLATED_TEST_FIXTURES.events.betaConcert.id)!;
    assert.equal(alphaFinView.internalDiskFeeAgreement?.calculationType, 'PERCENTAGE');
    assert.equal(alphaFinView.internalDiskFeeAgreement?.percentageRate, 12.5);
    assert.equal(betaFinView.internalDiskFeeAgreement?.calculationType, 'FIXED');
    assert.equal(betaFinView.internalDiskFeeAgreement?.fixedAmountCents, 1800);

    // 3.2. Verificar que SAC consulta eventos para atendimento, mas NÃO recebe a Taxa Disk contratual interna
    const sacEventsRes = await fetch(`${baseUrl}/api/v1/events`, {
      headers: { Authorization: `Bearer ${tokenSac}` },
    });
    assert.equal(sacEventsRes.status, 200);
    const sacEvents = ((await sacEventsRes.json()) as { items: EventSummaryViewDto[] }).items;
    assert.equal(sacEvents.length, 2);
    assert.equal(sacEvents[0].internalDiskFeeAgreement, undefined);
    assert.equal(sacEvents[1].internalDiskFeeAgreement, undefined);

    // 3.3. Verificar que Produtor Alpha (PDT) enxerga APENAS seu próprio evento e NUNCA recebe a Taxa Disk interna
    const pdtEventsRes = await fetch(`${baseUrl}/api/v1/events`, {
      headers: { Authorization: `Bearer ${tokenProdutorAlpha}` },
    });
    assert.equal(pdtEventsRes.status, 200);
    const pdtEvents = ((await pdtEventsRes.json()) as { items: EventSummaryViewDto[] }).items;
    assert.equal(pdtEvents.length, 1);
    assert.equal(pdtEvents[0].id, ISOLATED_TEST_FIXTURES.events.alphaShow.id);
    assert.equal(pdtEvents[0].internalDiskFeeAgreement, undefined);

    // 3.4. Tentativa de acesso cruzado (IDOR): Produtor Alpha tenta acessar Evento Beta de outro produtor -> 403 FORBIDDEN
    const crossAccessRes = await fetch(
      `${baseUrl}/api/v1/events/${ISOLATED_TEST_FIXTURES.events.betaConcert.id}`,
      {
        headers: { Authorization: `Bearer ${tokenProdutorAlpha}` },
      }
    );
    assert.equal(crossAccessRes.status, 403);
    const crossErr = (await crossAccessRes.json()) as { error: { code: string } };
    assert.equal(crossErr.error.code, 'CROSS_EVENT_SCOPE_FORBIDDEN');

    // 3.5. Segregação SAC vs Financeiro no Estorno: SAC tenta aprovar estorno -> 403 FORBIDDEN
    const sacApproveRes = await fetch(
      `${baseUrl}/api/v1/refunds/${ISOLATED_TEST_FIXTURES.refundRequest.id}/approve`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenSac}` },
      }
    );
    assert.equal(sacApproveRes.status, 403);

    // 3.6. Financeiro Disk aprova estorno -> status passa para APROVADO (nunca direto para CONCLUIDO sem callback do provedor)
    const finApproveRes = await fetch(
      `${baseUrl}/api/v1/refunds/${ISOLATED_TEST_FIXTURES.refundRequest.id}/approve`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenFinanceiro}` },
      }
    );
    assert.equal(finApproveRes.status, 201);
    const finApproveBody = (await finApproveRes.json()) as {
      status: string;
      providerConfirmed: boolean;
    };
    assert.equal(finApproveBody.status, 'APROVADO');
    assert.equal(finApproveBody.providerConfirmed, false);

    // 3.7. Verificar navegação dinâmica por perfil sem links órfãos
    const navProdutorRes = await fetch(`${baseUrl}/api/v1/navigation`, {
      headers: { Authorization: `Bearer ${tokenProdutorAlpha}` },
    });
    assert.equal(navProdutorRes.status, 200);
    const navProdutor = ((await navProdutorRes.json()) as { items: NavigationMenuItem[] }).items;
    assert.equal(navProdutor.some((i) => i.href === '/financeiro'), false);
    assert.equal(navProdutor.some((i) => i.href === '/produtores-pdt'), true);

    // 3.8. Verificar que todas as tentativas negadas e aprovadas ficaram registradas no Audit Log imutável
    const auditListRes = await fetch(`${baseUrl}/api/v1/audit-records`, {
      headers: { Authorization: `Bearer ${tokenFinanceiro}` },
    });
    assert.equal(auditListRes.status, 200);
    const auditRecords = ((await auditListRes.json()) as { items: AuditRecordDto[] }).items;

    assert.equal(
      auditRecords.some(
        (a) =>
          a.canonicalAction === 'event.access.denied_cross_scope' &&
          a.outcome === 'DENIED' &&
          a.eventId === ISOLATED_TEST_FIXTURES.events.betaConcert.id
      ),
      true
    );
    assert.equal(
      auditRecords.some(
        (a) => a.canonicalAction === 'auth.permission.denied:refund:approve' && a.outcome === 'DENIED'
      ),
      true
    );
    assert.equal(
      auditRecords.some(
        (a) => a.canonicalAction === 'refund.request.approved_by_finance' && a.outcome === 'SUCCESS'
      ),
      true
    );
  });

  it('4. Imutabilidade do Audit Log: trigger PostgreSQL bloqueia UPDATE e DELETE em audit_records', async () => {
    await assert.rejects(
      async () => {
        await db.query(`DELETE FROM audit_records`);
      },
      /imutáveis/i
    );

    await assert.rejects(
      async () => {
        await db.query(`UPDATE audit_records SET outcome = 'SUCCESS'`);
      },
      /imutáveis/i
    );
  });
});
