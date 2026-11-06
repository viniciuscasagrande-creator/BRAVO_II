import 'reflect-metadata';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from '../common/errors/api-exception.filter';
import { DatabaseService } from '../common/database/database.service';
import { IdentityService } from '../modules/identity/identity.service';
import { BravoRefundService } from '../modules/pacote10/refund.service';

interface SessionCookies {
  cookieHeader: string;
  csrfToken: string;
  userId: string;
}

describe('BRAVO_II — Pacote 10 E2E: SAC, Pós-Venda, Trocas, Cancelamentos, Concorrência PostgreSQL e Dupla Aprovação de Estornos pelo Financeiro Disk', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let baseUrl: string;
  const appOrigin = 'http://localhost:3000';

  const sessions: Record<string, SessionCookies> = {};

  // Dados de teste semeados no PostgreSQL (PGlite / bravo_ii_hml)
  const producerId = '10000000-0000-4000-8000-000000000101';
  const eventId = '10000000-0000-4000-8000-000000000201';
  const session1Id = '10000000-0000-4000-8000-000000000301';
  const session2Id = '10000000-0000-4000-8000-000000000302';
  const categoryId = '10000000-0000-4000-8000-000000000401';
  const lot1Id = '10000000-0000-4000-8000-000000000501';
  const lot2EqualPriceId = '10000000-0000-4000-8000-000000000502';
  const lot3DiffPriceId = '10000000-0000-4000-8000-000000000503';
  const customerId = '10000000-0000-4000-8000-000000000601';
  const paidOrder1Id = '10000000-0000-4000-8000-000000000701';
  const paidOrder2Id = '10000000-0000-4000-8000-000000000702';
  const unpaidOrderId = '10000000-0000-4000-8000-000000000703';
  const ticket1Id = '10000000-0000-4000-8000-000000000801';
  const ticket2Id = '10000000-0000-4000-8000-000000000802';
  const ticket3Id = '10000000-0000-4000-8000-000000000803';
  const eventCancelCaseId = '10000000-0000-4000-8000-000000000901';

  async function loginAs(email: string, password: string): Promise<SessionCookies> {
    const res = await fetch(`${baseUrl}/v1/auth/login`, {
      method: 'POST',
      headers: {
        Origin: appOrigin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(res.status, 200, `Falha no login de ${email}: ${res.status}`);
    const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    const cookieHeader = setCookies.map((c) => c.split(';')[0]).join('; ');
    const body = (await res.json()) as { csrfToken: string; user: { id: string } };
    return {
      cookieHeader,
      csrfToken: body.csrfToken,
      userId: body.user.id,
    };
  }

  async function apiGet(who: SessionCookies, path: string) {
    const res = await fetch(`${baseUrl}/v1/${path}`, {
      headers: {
        Cookie: who.cookieHeader,
      },
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  async function apiPost(who: SessionCookies, path: string, body: unknown = {}) {
    const res = await fetch(`${baseUrl}/v1/${path}`, {
      method: 'POST',
      headers: {
        Origin: appOrigin,
        Cookie: who.cookieHeader,
        'X-CSRF-Token': who.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.BRAVO_ENV = 'HOMOLOGACAO';
    process.env.PGLITE_DATA_DIR = 'memory://';
    process.env.APP_ORIGIN = appOrigin;
    process.env.COOKIE_SECURE = 'false';
    process.env.ENABLE_EXTERNAL_PUBLICATION = 'false';
    process.env.ENABLE_REAL_PAYMENTS = 'false';
    process.env.ENABLE_REAL_REFUNDS = 'false';
    process.env.ALLOW_REAL_PAYMENT_GATEWAY = 'false';
    process.env.ALLOW_REAL_REFUND_EXECUTION = 'false';
    process.env.ALLOW_REAL_PAYOUT_EXECUTION = 'false';
    process.env.ENABLE_TICKET_REPLACEMENT = 'false';
    process.env.ACCESS_GATE_INTEGRATED = 'false';
    process.env.ENABLE_PDV_OPERATIONS = 'false';

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

    const accounts = [
      {
        key: 'admin',
        id: '10000000-0000-4000-8000-000000000001',
        email: 'admin.p10@diskingressos.test',
        fullName: 'Admin Homologação P10',
        plainPassword: 'BravoP10#AdminPassword2026',
        role: 'ADMIN_BRAVO' as const,
      },
      {
        key: 'sac',
        id: '10000000-0000-4000-8000-000000000002',
        email: 'sac.p10@diskingressos.test',
        fullName: 'Agente SAC P10',
        plainPassword: 'BravoP10#SacPassword2026',
        role: 'SAC_ATENDIMENTO' as const,
      },
      {
        key: 'operacoes',
        id: '10000000-0000-4000-8000-000000000003',
        email: 'operacoes.p10@diskingressos.test',
        fullName: 'Supervisor Operações P10',
        plainPassword: 'BravoP10#OperacoesPassword2026',
        role: 'OPERACAO_EVENTOS' as const,
      },
      {
        key: 'fin1',
        id: '10000000-0000-4000-8000-000000000004',
        email: 'fin1.p10@diskingressos.test',
        fullName: 'Analista Financeiro Disk 1',
        plainPassword: 'BravoP10#Fin1Password2026',
        role: 'FINANCEIRO_DISK' as const,
      },
      {
        key: 'fin2',
        id: '10000000-0000-4000-8000-000000000005',
        email: 'fin2.p10@diskingressos.test',
        fullName: 'Analista Financeiro Disk 2',
        plainPassword: 'BravoP10#Fin2Password2026',
        role: 'FINANCEIRO_DISK' as const,
      },
      {
        key: 'fin3',
        id: '10000000-0000-4000-8000-000000000006',
        email: 'fin3.p10@diskingressos.test',
        fullName: 'Analista Financeiro Disk 3',
        plainPassword: 'BravoP10#Fin3Password2026',
        role: 'FINANCEIRO_DISK' as const,
      },
      {
        key: 'auditor',
        id: '10000000-0000-4000-8000-000000000007',
        email: 'auditor.p10@diskingressos.test',
        fullName: 'Auditor Interno P10',
        plainPassword: 'BravoP10#AuditorPassword2026',
        role: 'AUDITOR_INTERNO' as const,
      },
      {
        key: 'produtor',
        id: '10000000-0000-4000-8000-000000000008',
        email: 'produtor.p10@pdt.diskingressos.test',
        fullName: 'Produtor Externo PDT P10',
        plainPassword: 'BravoP10#ProdutorPassword2026',
        role: 'PRODUTOR_PDT' as const,
      },
    ];

    for (const acc of accounts) {
      await identity.ensureOperatorAccount(acc);
      sessions[acc.key] = await loginAs(acc.email, acc.plainPassword);
    }

    // Semeia produtor, evento publicado, 2 sessões futuras, 3 lotes, cliente, 2 pedidos pagos + 1 reservado e 3 ingressos emitidos
    const futureStart1 = new Date(Date.now() + 7 * 24 * 3600_000).toISOString();
    const futureEnd1 = new Date(Date.now() + 7 * 24 * 3600_000 + 3 * 3600_000).toISOString();
    const futureStart2 = new Date(Date.now() + 14 * 24 * 3600_000).toISOString();
    const futureEnd2 = new Date(Date.now() + 14 * 24 * 3600_000 + 3 * 3600_000).toISOString();
    const sector1Id = '10000000-0000-4000-8000-000000000451';
    const sector2Id = '10000000-0000-4000-8000-000000000452';

    await db.query(
      `INSERT INTO producers (
         id, cnpj, legal_name, trade_name, verification_status, p06_status, created_by
       ) VALUES (
         $1, '11222333000181', 'Produtora Cultural P10 Ltda', 'Produtora P10',
         'VERIFIED', 'APROVADO', $2
       ) ON CONFLICT (id) DO NOTHING`,
      [producerId, sessions.admin.userId]
    );

    await db.query(
      `INSERT INTO events (
         id, code, title, venue_name, city, state_uf, timezone,
         starts_at, ends_at, status, revision
       ) VALUES (
         $1, 'EVT-P10-001', 'Festival Sinfônico P10',
         'Teatro Guaíra', 'Curitiba', 'PR', 'America/Sao_Paulo',
         $2::timestamptz, $3::timestamptz, 'PUBLICADO', 1
       ) ON CONFLICT (id) DO NOTHING`,
      [eventId, futureStart1, futureEnd2]
    );

    await db.query(
      `INSERT INTO event_sessions (
         id, event_id, code, title, starts_at, ends_at, doors_open_at, total_capacity, status
       ) VALUES
         ($1, $3, 'SES-01', 'Sessão Sábado 20h', $4::timestamptz, $5::timestamptz, $4::timestamptz, 1000, 'ON_SALE'),
         ($2, $3, 'SES-02', 'Sessão Domingo 19h', $6::timestamptz, $7::timestamptz, $6::timestamptz, 1000, 'ON_SALE')
       ON CONFLICT (id) DO NOTHING`,
      [session1Id, session2Id, eventId, futureStart1, futureEnd1, futureStart2, futureEnd2]
    );

    await db.query(
      `INSERT INTO event_sectors (
         id, event_id, session_id, code, name, area_type, capacity
       ) VALUES
         ($1, $3, $4, 'SEC-01', 'Plateia Sábado', 'STANDING', 1000),
         ($2, $3, $5, 'SEC-02', 'Plateia Domingo', 'STANDING', 1000)
       ON CONFLICT (id) DO NOTHING`,
      [sector1Id, sector2Id, eventId, session1Id, session2Id]
    );

    await db.query(
      `INSERT INTO event_ticket_categories (
         id, event_id, name, requires_proof
       ) VALUES ($1, $2, 'Inteira', false)
       ON CONFLICT (id) DO NOTHING`,
      [categoryId, eventId]
    );

    await db.query(
      `INSERT INTO event_price_lots (
         id, event_id, session_id, sector_id, modality_name, category_type,
         lot_number, nominal_price_cents, max_quantity, reserved_count, issued_count,
         starts_at, ends_at, status
       ) VALUES
         ($1, $4, $5, $7, 'Plateia Lote 1', 'INTEIRA', 1, 10000, 500, 1, 3, NOW() - INTERVAL '1 day', $9::timestamptz, 'ATIVO'),
         ($2, $4, $6, $8, 'Plateia Domingo Igual', 'INTEIRA', 1, 10000, 500, 0, 0, NOW() - INTERVAL '1 day', $10::timestamptz, 'ATIVO'),
         ($3, $4, $6, $8, 'Plateia Domingo VIP', 'INTEIRA', 2, 15000, 500, 0, 0, NOW() - INTERVAL '1 day', $10::timestamptz, 'ATIVO')
       ON CONFLICT (id) DO NOTHING`,
      [
        lot1Id,
        lot2EqualPriceId,
        lot3DiffPriceId,
        eventId,
        session1Id,
        session2Id,
        sector1Id,
        sector2Id,
        futureStart1,
        futureStart2,
      ]
    );

    await db.query(
      `INSERT INTO customers (
         id, cpf_hash, cpf_masked, full_name, email, phone, status, cpf_fingerprint, cpf_last4
       ) VALUES (
         $1, 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
         '***.456.789-**', 'Helena Souza P10', 'helena.p10@cliente.test', '41999998888',
         'ACTIVE', 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', '7890'
       ) ON CONFLICT (id) DO NOTHING`,
      [customerId]
    );

    await db.query(
      `INSERT INTO p08_sale_orders (
         id, customer_id, event_id, session_id, lot_id, channel,
         quantity, unit_cents, total_cents, status,
         idempotency_key, request_hash, expires_at, confirmed_at, created_by
       ) VALUES
         ($1, $4, $5, $6, $7, 'ONLINE', 2, 10000, 20000, 'PAGO', '10000000-0000-4000-8000-000000000791', 'hash-order-p10-1', NOW() + INTERVAL '1 hour', NOW(), $8),
         ($2, $4, $5, $6, $7, 'ONLINE', 1, 10000, 10000, 'PAGO', '10000000-0000-4000-8000-000000000792', 'hash-order-p10-2', NOW() + INTERVAL '1 hour', NOW(), $8),
         ($3, $4, $5, $6, $7, 'ONLINE', 1, 10000, 10000, 'RESERVADO', '10000000-0000-4000-8000-000000000793', 'hash-order-p10-3', NOW() + INTERVAL '1 hour', NULL, $8)
       ON CONFLICT (id) DO NOTHING`,
      [
        paidOrder1Id,
        paidOrder2Id,
        unpaidOrderId,
        customerId,
        eventId,
        session1Id,
        lot1Id,
        sessions.operacoes.userId,
      ]
    );

    await db.query(
      `INSERT INTO p08_payment_confirmations (
         id, order_id, provider, provider_ref, amount_cents, evidence_hash
       ) VALUES
         ($1, $3, 'PAGBANK', 'PB-CONF-P10-001', 20000, 'e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1'),
         ($2, $4, 'PAGBANK', 'PB-CONF-P10-002', 10000, 'e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2')
       ON CONFLICT (order_id) DO NOTHING`,
      [randomUUID(), randomUUID(), paidOrder1Id, paidOrder2Id]
    );

    await db.query(
      `INSERT INTO p08_issued_tickets (
         id, number, order_id, event_id, session_id, lot_id, status
       ) VALUES
         ($1, '00001001', $4, $6, $7, $8, 'EMITIDO'),
         ($2, '00001002', $4, $6, $7, $8, 'EMITIDO'),
         ($3, '00001003', $5, $6, $7, $8, 'EMITIDO')
       ON CONFLICT (id) DO NOTHING`,
      [
        ticket1Id,
        ticket2Id,
        ticket3Id,
        paidOrder1Id,
        paidOrder2Id,
        eventId,
        session1Id,
        lot1Id,
      ]
    );

    await db.query(
      `INSERT INTO event_change_cases (
         id, event_id, change_type, status, reason,
         requested_by, approved_by, decided_at, finance_review_status
       ) VALUES (
         $1, $2, 'CANCELAMENTO', 'APROVADO', 'Cancelamento formal homologado para teste de lote',
         $3, $4, NOW(), 'APROVADO'
       ) ON CONFLICT (id) DO NOTHING`,
      [eventCancelCaseId, eventId, sessions.operacoes.userId, sessions.admin.userId]
    );
  });

  after(async () => {
    delete process.env.APP_ORIGIN;
    if (app) {
      await app.close();
    }
  });

  it('1. Bloqueia acesso sem autenticação (401), mutação sem CSRF (403) e perfil externo PRODUTOR_PDT (403) em todas as rotas do Pacote 10', async () => {
    for (const route of [
      'sac/indicadores',
      'sac/chamados',
      'pos-venda/trocas',
      'pos-venda/cancelamentos',
      'estornos',
      'estornos/impacto',
    ]) {
      const unauth = await fetch(`${baseUrl}/v1/${route}`);
      assert.equal(unauth.status, 401, `Rota /v1/${route} deveria exigir sessão`);

      const forbiddenPdt = await apiGet(sessions.produtor, route);
      assert.equal(forbiddenPdt.status, 403, `Produtor PDT não pode acessar /v1/${route}`);
    }

    const noCsrf = await fetch(`${baseUrl}/v1/sac/equipes`, {
      method: 'POST',
      headers: {
        Origin: appOrigin,
        Cookie: sessions.admin.cookieHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Equipe Sem CSRF' }),
    });
    assert.equal(noCsrf.status, 403);
  });

  it('2. Ciclo completo de Atendimento SAC: SLA versionado, equipes/filas/agentes, abertura de chamado, interações (firstResponseAt), transições ITIL, base de conhecimento e CSAT', async () => {
    // SAC não pode criar política de SLA (exclusivo ADMIN)
    const slaForbidden = await apiPost(sessions.sac, 'sac/politicas-sla', {
      category: 'ALTERACAO',
      priority: 'ALTA',
      responseMinutes: 30,
      resolutionMinutes: 240,
    });
    assert.equal(slaForbidden.status, 403);

    // ADMIN cadastra política de SLA v1 e depois v2
    const slaV1 = await apiPost(sessions.admin, 'sac/politicas-sla', {
      category: 'ALTERACAO',
      priority: 'ALTA',
      responseMinutes: 30,
      resolutionMinutes: 240,
    });
    assert.equal(slaV1.status, 201);
    assert.equal(slaV1.data.version, 1);

    const slaV2 = await apiPost(sessions.admin, 'sac/politicas-sla', {
      category: 'ALTERACAO',
      priority: 'ALTA',
      responseMinutes: 20,
      resolutionMinutes: 180,
    });
    assert.equal(slaV2.status, 201);
    assert.equal(slaV2.data.version, 2);

    // OPERACOES cria equipe, fila e vincula agente SAC
    const teamRes = await apiPost(sessions.operacoes, 'sac/equipes', {
      name: 'Atendimento Pós-Venda Nível 1',
    });
    assert.equal(teamRes.status, 201);
    const teamId = teamRes.data.id as string;

    const queueRes = await apiPost(sessions.operacoes, 'sac/filas', {
      name: 'Fila Alterações e Trocas',
      teamId,
    });
    assert.equal(queueRes.status, 201);
    const queueId = queueRes.data.id as string;

    const memberRes = await apiPost(sessions.operacoes, `sac/equipes/${teamId}/agentes`, {
      userId: sessions.sac.userId,
    });
    assert.equal(memberRes.status, 201);

    // SAC abre chamado vinculado ao pedido pago
    const caseRes = await apiPost(sessions.sac, 'sac/chamados', {
      subject: 'Solicitação de troca de sessão para domingo',
      description: 'Cliente Helena solicita orientação sobre troca de sessão do pedido pago.',
      category: 'ALTERACAO',
      channel: 'TELEFONE',
      priority: 'ALTA',
      customerId,
      orderId: paidOrder1Id,
      eventId,
      ticketId: ticket1Id,
      queueId,
    });
    assert.equal(caseRes.status, 201);
    assert.match(caseRes.data.protocol, /^SAC-[0-9A-F]{18}$/);
    const caseId = caseRes.data.id as string;

    // Atribuição do chamado ao agente SAC
    const assignRes = await apiPost(sessions.operacoes, `sac/chamados/${caseId}/atribuir`, {
      assigneeId: sessions.sac.userId,
      queueId,
    });
    assert.equal(assignRes.status, 201);
    assert.equal(assignRes.data.assignedTo, sessions.sac.userId);

    // Transição ABERTO -> EM_ATENDIMENTO
    const startRes = await apiPost(sessions.sac, `sac/chamados/${caseId}/status`, {
      status: 'EM_ATENDIMENTO',
      reason: 'Agente SAC assumiu o atendimento do chamado.',
    });
    assert.equal(startRes.status, 201);
    assert.equal(startRes.data.status, 'EM_ATENDIMENTO');

    // Primeira interação registra firstResponseAt
    const interRes = await apiPost(sessions.sac, `sac/chamados/${caseId}/interacoes`, {
      kind: 'RESPOSTA_CLIENTE',
      body: 'Confirmamos a titularidade do pedido e encaminhamos para análise operacional.',
    });
    assert.equal(interRes.status, 201);

    const detailAfterInter = await apiGet(sessions.sac, `sac/chamados/${caseId}`);
    assert.equal(detailAfterInter.status, 200);
    assert.ok(detailAfterInter.data.firstResponseAt, 'firstResponseAt deve ser preenchido');
    assert.equal(detailAfterInter.data.interactions.length, 1);

    // Abertura de incidente ITIL vinculado ao chamado
    const incRes = await apiPost(sessions.sac, `sac/chamados/${caseId}/incidente`, {
      severity: 'SEV2',
      serviceName: 'Portal de Atendimento',
      isMajor: true,
    });
    assert.equal(incRes.status, 201);
    const incidentId = incRes.data.id as string;

    // Atualização do incidente ITIL por OPERACOES
    const incStep1 = await apiPost(sessions.operacoes, `sac/incidentes/${incidentId}/status`, {
      status: 'EM_TRATAMENTO',
      reason: 'Equipe de operações iniciou diagnóstico.',
    });
    assert.equal(incStep1.status, 201);

    const incStep2 = await apiPost(sessions.operacoes, `sac/incidentes/${incidentId}/status`, {
      status: 'RESOLVIDO',
      reason: 'Atendimento normalizado e documentado.',
    });
    assert.equal(incStep2.status, 201);

    // Registro e evolução de Problema ITIL
    const probRes = await apiPost(sessions.operacoes, 'sac/problemas', {
      title: 'Dúvida recorrente sobre regras de troca de sessão',
      rootCause: 'Falta de artigo na base interna sobre prazo de 48h',
      workaround: 'Consultar tabela operacional do evento',
    });
    assert.equal(probRes.status, 201);
    const problemId = probRes.data.id as string;

    const probStep1 = await apiPost(sessions.operacoes, `sac/problemas/${problemId}/status`, {
      status: 'CAUSA_IDENTIFICADA',
      reason: 'Causa raiz confirmada pela supervisão.',
    });
    assert.equal(probStep1.status, 201);

    const probStep2 = await apiPost(sessions.operacoes, `sac/problemas/${problemId}/status`, {
      status: 'RESOLVIDO',
      reason: 'Procedimento publicado na base de conhecimento.',
    });
    assert.equal(probStep2.status, 201);

    // Base de Conhecimento: rascunho pelo SAC e publicação por OPERACOES
    const artRes = await apiPost(sessions.sac, 'sac/conhecimento', {
      title: 'Procedimento Oficial de Solicitação de Troca de Sessão',
      category: 'POS_VENDA',
      content: 'Verificar se o pedido está PAGO, se o ingresso está EMITIDO e se a sessão de destino é futura.',
    });
    assert.equal(artRes.status, 201);
    assert.equal(artRes.data.status, 'RASCUNHO');

    const pubForbidden = await apiPost(sessions.sac, `sac/conhecimento/${artRes.data.id}/publicar`);
    assert.equal(pubForbidden.status, 403);

    const pubOk = await apiPost(sessions.operacoes, `sac/conhecimento/${artRes.data.id}/publicar`);
    assert.equal(pubOk.status, 201);
    assert.equal(pubOk.data.status, 'PUBLICADO');

    // Fechamento direto sem RESOLVIDO deve ser bloqueado (409)
    const prematureClose = await apiPost(sessions.sac, `sac/chamados/${caseId}/status`, {
      status: 'FECHADO',
      reason: 'Tentativa inválida de pular etapa RESOLVIDO.',
    });
    assert.equal(prematureClose.status, 409);

    // RESOLVIDO -> FECHADO -> CSAT
    const resolveRes = await apiPost(sessions.sac, `sac/chamados/${caseId}/status`, {
      status: 'RESOLVIDO',
      reason: 'Orientação concluída e registrada com sucesso.',
    });
    assert.equal(resolveRes.status, 201);
    assert.equal(resolveRes.data.status, 'RESOLVIDO');

    const closeRes = await apiPost(sessions.sac, `sac/chamados/${caseId}/status`, {
      status: 'FECHADO',
      reason: 'Cliente confirmou recebimento das informações.',
    });
    assert.equal(closeRes.status, 201);
    assert.equal(closeRes.data.status, 'FECHADO');

    const csatRes = await apiPost(sessions.sac, `sac/chamados/${caseId}/csat`, {
      score: 5,
      comment: 'Atendimento rápido e esclarecedor.',
    });
    assert.equal(csatRes.status, 201);
    assert.equal(csatRes.data.score, 5);

    const metricsRes = await apiGet(sessions.sac, 'sac/indicadores');
    assert.equal(metricsRes.status, 200);
    assert.equal(metricsRes.data.closed, 1);
  });

  it('3. Pós-Venda e Concorrência PostgreSQL em Trocas: bloqueia duplicidade concorrente no mesmo ingresso, exige maker-checker, qualifica preço e mantém execução física bloqueada (503 fail-closed)', async () => {
    // Dispara duas solicitações concorrentes de troca para o mesmo ticket1Id
    const payload = {
      orderId: paidOrder1Id,
      ticketId: ticket1Id,
      targetSessionId: session2Id,
      targetLotId: lot2EqualPriceId,
      reason: 'Cliente precisa alterar de sábado para domingo na mesma categoria.',
    };

    const [r1, r2] = await Promise.all([
      apiPost(sessions.sac, 'pos-venda/trocas', payload),
      apiPost(sessions.operacoes, 'pos-venda/trocas', payload),
    ]);

    const statuses = [r1.status, r2.status].sort();
    assert.deepEqual(statuses, [201, 409], 'Apenas uma solicitação concorrente deve vencer (201) e a outra receber 409');

    const winner = r1.status === 201 ? r1 : r2;
    const changeId = winner.data.id as string;

    // Quem abriu a solicitação não pode revisar a própria solicitação (maker-checker)
    const requesterSession =
      winner.data.requestedBy === sessions.operacoes.userId ? sessions.operacoes : sessions.admin;
    if (winner.data.requestedBy === sessions.operacoes.userId) {
      const selfReview = await apiPost(sessions.operacoes, `pos-venda/trocas/${changeId}/analisar`, {
        decision: 'ANALISAR',
        reason: 'Tentativa de auto-revisão.',
      });
      assert.equal(selfReview.status, 403);
    }

    const reviewerSession =
      winner.data.requestedBy === sessions.operacoes.userId ? sessions.admin : sessions.operacoes;

    // SOLICITADA -> EM_ANALISE -> APROVADA_OPERACAO
    const stepAnalyze = await apiPost(reviewerSession, `pos-venda/trocas/${changeId}/analisar`, {
      decision: 'ANALISAR',
      reason: 'Iniciando conferência de disponibilidade da sessão de domingo.',
    });
    assert.equal(stepAnalyze.status, 201);
    assert.equal(stepAnalyze.data.status, 'EM_ANALISE');

    const stepApprove = await apiPost(reviewerSession, `pos-venda/trocas/${changeId}/analisar`, {
      decision: 'APROVAR',
      reason: 'Sessão de domingo possui disponibilidade confirmada.',
    });
    assert.equal(stepApprove.status, 201);
    assert.equal(stepApprove.data.status, 'APROVADA_OPERACAO');

    // Qualificação de preço igual -> PRONTA_EXECUCAO (differenceCents = 0)
    const qualEqual = await apiPost(reviewerSession, `pos-venda/trocas/${changeId}/qualificar`);
    assert.equal(qualEqual.status, 201);
    assert.equal(qualEqual.data.status, 'PRONTA_EXECUCAO');
    assert.equal(qualEqual.data.differenceCents, 0);

    // Execução física deve falhar fail-closed com 503 ServiceUnavailableException
    const execRes = await apiPost(sessions.operacoes, `pos-venda/trocas/${changeId}/executar`);
    assert.equal(execRes.status, 503);

    // Confirma que o ingresso original permanece EMITIDO e nenhum TicketReplacement foi criado
    const ticketCheck = await db.query<{ status: string }>(
      `SELECT status FROM p08_issued_tickets WHERE id = $1`,
      [ticket1Id]
    );
    assert.equal(ticketCheck.rows[0].status, 'EMITIDO');
    const repCheck = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM p10_ticket_replacements`
    );
    assert.equal(Number(repCheck.rows[0].count), 0);

    // Testa qualificação com diferença de preço no ticket2Id -> AGUARDANDO_PAGAMENTO
    const diffReq = await apiPost(sessions.sac, 'pos-venda/trocas', {
      orderId: paidOrder1Id,
      ticketId: ticket2Id,
      targetSessionId: session2Id,
      targetLotId: lot3DiffPriceId,
      reason: 'Mudança para lote VIP de domingo com valor maior.',
    });
    assert.equal(diffReq.status, 201);
    await apiPost(sessions.operacoes, `pos-venda/trocas/${diffReq.data.id}/analisar`, {
      decision: 'ANALISAR',
      reason: 'Em análise operacional.',
    });
    await apiPost(sessions.operacoes, `pos-venda/trocas/${diffReq.data.id}/analisar`, {
      decision: 'APROVAR',
      reason: 'Aprovado para cálculo de diferença.',
    });
    const qualDiff = await apiPost(sessions.operacoes, `pos-venda/trocas/${diffReq.data.id}/qualificar`);
    assert.equal(qualDiff.status, 201);
    assert.equal(qualDiff.data.status, 'AGUARDANDO_PAGAMENTO');
    assert.equal(qualDiff.data.differenceCents, 5000);
  });

  it('4. Cancelamentos operacionais (Ingresso, Pedido, Evento) e Planejamento Formal de Lote pelo Financeiro Disk', async () => {
    // SAC solicita cancelamento de ingresso individual do pedido 1
    const cancelTicket = await apiPost(sessions.sac, 'pos-venda/cancelamentos', {
      type: 'INGRESSO',
      orderId: paidOrder1Id,
      ticketId: ticket1Id,
      reason: 'Solicitação de cancelamento individual de um ingresso dentro do prazo legal.',
    });
    assert.equal(cancelTicket.status, 201);
    assert.equal(cancelTicket.data.status, 'SOLICITADO');

    // OPERACOES analisa e aprova operacionalmente
    const rev1 = await apiPost(
      sessions.operacoes,
      `pos-venda/cancelamentos/${cancelTicket.data.id}/analisar`,
      {
        decision: 'ANALISAR',
        reason: 'Conferindo elegibilidade do ingresso.',
      }
    );
    assert.equal(rev1.status, 201);
    assert.equal(rev1.data.status, 'EM_ANALISE');

    const rev2 = await apiPost(
      sessions.operacoes,
      `pos-venda/cancelamentos/${cancelTicket.data.id}/analisar`,
      {
        decision: 'APROVAR_OPERACAO',
        reason: 'Aprovado operacionalmente para encaminhamento financeiro.',
      }
    );
    assert.equal(rev2.status, 201);
    assert.equal(rev2.data.status, 'APROVADO_OPERACAO');

    // Planejamento de lote de evento exige perfil FINANCEIRO_DISK
    const batchForbidden = await apiPost(
      sessions.operacoes,
      `pos-venda/eventos/${eventId}/lotes-estorno/${eventCancelCaseId}/planejar`
    );
    assert.equal(batchForbidden.status, 403);

    const batchOk = await apiPost(
      sessions.fin1,
      `pos-venda/eventos/${eventId}/lotes-estorno/${eventCancelCaseId}/planejar`
    );
    assert.equal(batchOk.status, 201);
    assert.equal(batchOk.data.status, 'PLANEJADO');
    assert.equal(batchOk.data.eligibleOrders, 2);
    assert.equal(batchOk.data.plannedValueCents, '30000');
  });

  it('5. Estornos: Concorrência PostgreSQL no teto financeiro do pedido, Idempotência, Dupla Aprovação exclusiva do Financeiro Disk e Outbox de retenção sem conector externo', async () => {
    // Pedido sem pagamento confirmado (RESERVADO) não pode receber solicitação de estorno (409)
    const unpaidAttempt = await apiPost(sessions.sac, 'estornos', {
      orderId: unpaidOrderId,
      amountCents: 5000,
      reason: 'Tentativa em pedido ainda não liquidado.',
      idempotencyKey: randomUUID(),
    });
    assert.equal(unpaidAttempt.status, 409);

    // Concorrência no teto financeiro do paidOrder2Id (totalCents = 10000):
    // Duas requisições simultâneas de 7000 centavos com chaves idempotentes distintas
    const [conc1, conc2] = await Promise.all([
      apiPost(sessions.sac, 'estornos', {
        orderId: paidOrder2Id,
        amountCents: 7000,
        reason: 'Estorno parcial concorrente A no pedido 2.',
        idempotencyKey: randomUUID(),
      }),
      apiPost(sessions.operacoes, 'estornos', {
        orderId: paidOrder2Id,
        amountCents: 7000,
        reason: 'Estorno parcial concorrente B no pedido 2.',
        idempotencyKey: randomUUID(),
      }),
    ]);

    const concStatuses = [conc1.status, conc2.status].sort();
    assert.deepEqual(
      concStatuses,
      [201, 409],
      'Reserva serializável deve aprovar apenas 1 estorno de 7000 e bloquear o segundo com 409'
    );

    const sumRes = await db.query<{ total: number }>(
      `SELECT COALESCE(SUM(amount_cents), 0)::int AS total
       FROM p10_refund_requests
       WHERE order_id = $1 AND status <> 'NEGADO'`,
      [paidOrder2Id]
    );
    assert.equal(sumRes.rows[0].total, 7000);

    // Solicitação no paidOrder1Id (totalCents = 20000) com teste de idempotência
    const idemKey = randomUUID();
    const refReq = await apiPost(sessions.sac, 'estornos', {
      orderId: paidOrder1Id,
      amountCents: 10000,
      reason: 'Devolução referente ao ingresso cancelado do pedido 1.',
      idempotencyKey: idemKey,
    });
    assert.equal(refReq.status, 201);
    assert.equal(refReq.data.reused, false);
    const refundId = refReq.data.id as string;

    // Reuso da mesma chave idempotente com mesmo payload retorna reused=true
    const refReuse = await apiPost(sessions.sac, 'estornos', {
      orderId: paidOrder1Id,
      amountCents: 10000,
      reason: 'Devolução referente ao ingresso cancelado do pedido 1.',
      idempotencyKey: idemKey,
    });
    assert.equal(refReuse.status, 201);
    assert.equal(refReuse.data.reused, true);
    assert.equal(refReuse.data.id, refundId);

    // Reuso da mesma chave com valor diferente retorna 409 Conflict
    const refDivergent = await apiPost(sessions.sac, 'estornos', {
      orderId: paidOrder1Id,
      amountCents: 8000,
      reason: 'Devolução referente ao ingresso cancelado do pedido 1.',
      idempotencyKey: idemKey,
    });
    assert.equal(refDivergent.status, 409);

    // SAC e ADMIN (sem papel FINANCEIRO_DISK) não podem analisar nem aprovar estorno
    for (const actor of [sessions.sac, sessions.operacoes, sessions.admin, sessions.auditor]) {
      const deniedReview = await apiPost(actor, `estornos/${refundId}/analisar`);
      assert.equal(deniedReview.status, 403);
      const deniedApprove = await apiPost(actor, `estornos/${refundId}/aprovar`, {
        reason: 'Tentativa sem alçada do Financeiro Disk',
      });
      assert.equal(deniedApprove.status, 403);
    }

    // Se um analista FINANCEIRO_DISK criar uma solicitação, ele mesmo não pode analisá-la nem aprová-la
    const selfFinReq = await apiPost(sessions.fin3, 'estornos', {
      orderId: paidOrder2Id,
      amountCents: 3000,
      reason: 'Saldo remanescente de 3000 centavos do pedido 2.',
      idempotencyKey: randomUUID(),
    });
    assert.equal(selfFinReq.status, 201);
    const selfAnalyze = await apiPost(sessions.fin3, `estornos/${selfFinReq.data.id}/analisar`);
    assert.equal(selfAnalyze.status, 403, 'Solicitante não pode analisar o próprio estorno');

    // Fluxo de Dupla Aprovação no refundId (solicitado por SAC):
    // 1) Analista Financeiro 1 inicia análise (EM_ANALISE)
    const reviewOk = await apiPost(sessions.fin1, `estornos/${refundId}/analisar`);
    assert.equal(reviewOk.status, 201);
    assert.equal(reviewOk.data.status, 'EM_ANALISE');

    // 2) Analista Financeiro 1 registra 1ª aprovação (APROVADO_1)
    const app1 = await apiPost(sessions.fin1, `estornos/${refundId}/aprovar`, {
      reason: 'Primeira alçada financeira conferida com comprovante PagBank.',
    });
    assert.equal(app1.status, 201);
    assert.equal(app1.data.status, 'APROVADO_1');
    assert.equal(app1.data.step, 1);
    assert.equal(app1.data.externalExecution, false);

    // 3) Mesmo Analista Financeiro 1 tenta aprovar a 2ª etapa -> bloqueado (403)
    const duplicateApprover = await apiPost(sessions.fin1, `estornos/${refundId}/aprovar`, {
      reason: 'Tentativa de segunda assinatura pelo mesmo aprovador.',
    });
    assert.equal(duplicateApprover.status, 403);

    // 4) Analista Financeiro 2 registra 2ª aprovação (APROVADO_2)
    const app2 = await apiPost(sessions.fin2, `estornos/${refundId}/aprovar`, {
      reason: 'Segunda alçada financeira conferida; retido aguardando conector homologado.',
    });
    assert.equal(app2.status, 201);
    assert.equal(app2.data.status, 'APROVADO_2');
    assert.equal(app2.data.step, 2);
    assert.equal(app2.data.externalExecution, false);

    // 5) Terceira aprovação é bloqueada
    const thirdApproval = await apiPost(sessions.fin3, `estornos/${refundId}/aprovar`, {
      reason: 'Tentativa de terceira aprovação.',
    });
    assert.equal(thirdApproval.status, 403);

    // 6) Verifica Outbox de retenção BRAVO_REFUND_APPROVED_HOLD com externalExecutionAllowed = false
    const outboxRes = await db.query<{
      event_name: string;
      payload: { refundId: string; action: string; externalExecutionAllowed: boolean };
    }>(
      `SELECT event_name, payload FROM outbox_events WHERE aggregate_id = $1 AND event_name = 'BRAVO_REFUND_APPROVED_HOLD'`,
      [refundId]
    );
    assert.equal(outboxRes.rows.length, 1);
    assert.equal(outboxRes.rows[0].payload.externalExecutionAllowed, false);
    assert.equal(outboxRes.rows[0].payload.action, 'AGUARDAR_CONECTOR_HOMOLOGADO');

    // 7) Confirma que nenhuma rota HTTP de execução/liquidação/webhook de estorno existe (404)
    for (const forbiddenRoute of [
      `estornos/${refundId}/executar-estorno`,
      `estornos/${refundId}/confirmar-estorno`,
      `estornos/${refundId}/liquidar`,
      `estornos/webhook-estorno`,
    ]) {
      const res = await apiPost(sessions.fin1, forbiddenRoute, {});
      assert.equal(res.status, 404);
    }

    // 8) Confirma que método interno dispatchApprovedRefund falha fechado (ServiceUnavailableException)
    const refundService = app.get(BravoRefundService);
    await assert.rejects(
      () => refundService.dispatchApprovedRefund(refundId),
      /Estorno bancário real não implementado/
    );

    // 9) Consulta projeção de impacto financeiro e trilha de auditoria imutável
    const impactRes = await apiGet(sessions.fin1, 'estornos/impacto');
    assert.equal(impactRes.status, 200);
    assert.ok(Array.isArray(impactRes.data.items));

    const audits = await db.query<{ canonical_action: string }>(
      `SELECT canonical_action FROM audit_records WHERE resource_id = $1 ORDER BY occurred_at ASC`,
      [refundId]
    );
    assert.deepEqual(
      audits.rows.map((r) => r.canonical_action),
      [
        'ESTORNO_SOLICITADO',
        'ESTORNO_ANALISE',
        'ESTORNO_APROVADO_ETAPA_1',
        'ESTORNO_APROVADO_ETAPA_2',
      ]
    );
  });
});
