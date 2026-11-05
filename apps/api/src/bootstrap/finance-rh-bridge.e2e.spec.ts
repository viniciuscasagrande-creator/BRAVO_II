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
  CatalogFunctionItemDto,
  CatalogSummaryDto,
  CostCenterDto,
  FinanceLedgerEntryDto,
  RhEmployeeDto,
  RhGeofenceDto,
  RhPaymentBatchDto,
  RhTimePunchDto,
} from '@bravo-ii/contracts';

describe('BRAVO_II — Pacote Mestre Financeiro (104) + RH & DP (45) + Bridge RH→Financeiro E2E', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let baseUrl: string;

  let tokenFinanceiro: string;
  let tokenRh: string;
  let tokenProdutor: string;

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

    await identity.ensureOperatorAccount({
      id: ISOLATED_TEST_FIXTURES.users.financeiro.id,
      email: ISOLATED_TEST_FIXTURES.users.financeiro.email,
      fullName: ISOLATED_TEST_FIXTURES.users.financeiro.fullName,
      plainPassword: ISOLATED_TEST_FIXTURES.users.financeiro.plainPassword,
      role: ISOLATED_TEST_FIXTURES.users.financeiro.role,
    });

    await identity.ensureOperatorAccount({
      id: ISOLATED_TEST_FIXTURES.users.rhDisk.id,
      email: ISOLATED_TEST_FIXTURES.users.rhDisk.email,
      fullName: ISOLATED_TEST_FIXTURES.users.rhDisk.fullName,
      plainPassword: ISOLATED_TEST_FIXTURES.users.rhDisk.plainPassword,
      role: ISOLATED_TEST_FIXTURES.users.rhDisk.role,
    });

    // Inserir Produtor Alpha e Evento Alpha ANTES de vincular o escopo de produtorAlpha
    await db.query(
      `INSERT INTO producers (id, cnpj, legal_name, trade_name, verification_status)
       VALUES ($1, $2, $3, $4, 'VERIFIED')`,
      [
        ISOLATED_TEST_FIXTURES.producers.alpha.id,
        ISOLATED_TEST_FIXTURES.producers.alpha.cnpj,
        ISOLATED_TEST_FIXTURES.producers.alpha.legalName,
        ISOLATED_TEST_FIXTURES.producers.alpha.tradeName,
      ]
    );
    await db.query(
      `INSERT INTO events (id, code, title, venue_name, city, state_uf, status, starts_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        ISOLATED_TEST_FIXTURES.events.alphaShow.id,
        ISOLATED_TEST_FIXTURES.events.alphaShow.code,
        ISOLATED_TEST_FIXTURES.events.alphaShow.title,
        ISOLATED_TEST_FIXTURES.events.alphaShow.venueName,
        ISOLATED_TEST_FIXTURES.events.alphaShow.city,
        ISOLATED_TEST_FIXTURES.events.alphaShow.stateUf,
        ISOLATED_TEST_FIXTURES.events.alphaShow.status,
        ISOLATED_TEST_FIXTURES.events.alphaShow.startsAt,
      ]
    );

    await identity.ensureOperatorAccount({
      id: ISOLATED_TEST_FIXTURES.users.produtorAlpha.id,
      email: ISOLATED_TEST_FIXTURES.users.produtorAlpha.email,
      fullName: ISOLATED_TEST_FIXTURES.users.produtorAlpha.fullName,
      plainPassword: ISOLATED_TEST_FIXTURES.users.produtorAlpha.plainPassword,
      role: ISOLATED_TEST_FIXTURES.users.produtorAlpha.role,
      producerScopeIds: [ISOLATED_TEST_FIXTURES.producers.alpha.id],
      eventScopeIds: [ISOLATED_TEST_FIXTURES.events.alphaShow.id],
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

    tokenFinanceiro = await login(
      ISOLATED_TEST_FIXTURES.users.financeiro.email,
      ISOLATED_TEST_FIXTURES.users.financeiro.plainPassword
    );
    tokenRh = await login(
      ISOLATED_TEST_FIXTURES.users.rhDisk.email,
      ISOLATED_TEST_FIXTURES.users.rhDisk.plainPassword
    );
    tokenProdutor = await login(
      ISOLATED_TEST_FIXTURES.users.produtorAlpha.email,
      ISOLATED_TEST_FIXTURES.users.produtorAlpha.plainPassword
    );
  });

  after(async () => {
    if (app) {
      await app.close();
    }
  });

  it('1. Preservação integral das 149 funções (104 Financeiro + 45 RH em 17 grupos) no PostgreSQL', async () => {
    const res = await fetch(`${baseUrl}/api/v1/catalog/functions`, {
      headers: { Authorization: `Bearer ${tokenFinanceiro}` },
    });
    assert.equal(res.status, 200);
    const summary = (await res.json()) as CatalogSummaryDto;

    assert.equal(summary.totalCataloged, 149);
    assert.equal(summary.totalFinanceiro, 104);
    assert.equal(summary.totalRh, 45);
    assert.equal(summary.totalMainGroups, 17);
    assert.equal(summary.items.length, 149);

    // Verificar consulta individual da opção #001 (Financeiro) e #149 (RH)
    const f1Res = await fetch(`${baseUrl}/api/v1/catalog/functions/1`, {
      headers: { Authorization: `Bearer ${tokenFinanceiro}` },
    });
    assert.equal(f1Res.status, 200);
    const f1 = (await f1Res.json()) as CatalogFunctionItemDto;
    assert.equal(f1.dominio, 'FINANCEIRO');
    assert.equal(f1.rota, '/financeiro/visao-geral-dashboard-financeiro-001');

    const f149Res = await fetch(
      `${baseUrl}/api/v1/catalog/functions/recursos-humanos-rh-disk-administracao-do-rh-auditoria-e-lgpd-149`,
      {
        headers: { Authorization: `Bearer ${tokenRh}` },
      }
    );
    assert.equal(f149Res.status, 200);
    const f149 = (await f149Res.json()) as CatalogFunctionItemDto;
    assert.equal(f149.numero, 149);
    assert.equal(f149.dominio, 'RH');
  });

  it('2. Correção dos 2 bloqueadores P0 do legado: endpoints RH exigem autenticação/RBAC e login valida senha real', async () => {
    // 2.1. Chamada sem token em /api/v1/rh/employees -> 401 Unauthorized (corrige bug P0 de /api/rh aberto)
    const noAuthRes = await fetch(`${baseUrl}/api/v1/rh/employees`);
    assert.equal(noAuthRes.status, 401);

    // 2.2. Login com senha incorreta para usuário RH existente -> 401 Unauthorized (corrige bug P0 de login sem senha)
    const wrongPassRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ISOLATED_TEST_FIXTURES.users.rhDisk.email,
        password: 'SenhaIncorreta#123',
      }),
    });
    assert.equal(wrongPassRes.status, 401);

    // 2.3. Financeiro Disk não pode listar cadastro individual de colaboradores/salários do RH -> 403 Forbidden
    const finReadRhRes = await fetch(`${baseUrl}/api/v1/rh/employees`, {
      headers: { Authorization: `Bearer ${tokenFinanceiro}` },
    });
    assert.equal(finReadRhRes.status, 403);

    // 2.4. Produtor PDT não pode acessar catálogo interno Financeiro/RH nem Ledger -> 403 Forbidden
    const pdtCatRes = await fetch(`${baseUrl}/api/v1/catalog/functions`, {
      headers: { Authorization: `Bearer ${tokenProdutor}` },
    });
    assert.equal(pdtCatRes.status, 403);

    const pdtLedgerRes = await fetch(`${baseUrl}/api/v1/finance/ledger`, {
      headers: { Authorization: `Bearer ${tokenProdutor}` },
    });
    assert.equal(pdtLedgerRes.status, 403);
  });

  it('3. Cadastro Canônico de Colaboradores (LGPD) e Disk Ponto com Cerca Virtual Haversine + Portaria 671 + NSR', async () => {
    // 3.1. Cadastrar colaborador pelo perfil RH_DP_DISK
    const empRes = await fetch(`${baseUrl}/api/v1/rh/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenRh}`,
      },
      body: JSON.stringify({
        matricula: 'MAT-2026-001',
        fullName: 'Carolina Mendes (Analista RH)',
        cpf: '123.456.789-01',
        email: 'carolina.mendes@diskingressos.test',
        contractType: 'CLT',
        department: 'Operações',
        roleTitle: 'Coordenadora de Campo',
        baseSalaryCents: 620000,
        admittedAt: '2026-11-01',
      }),
    });
    assert.equal(empRes.status, 201);
    const employee = (await empRes.json()) as RhEmployeeDto;
    assert.equal(employee.matricula, 'MAT-2026-001');
    assert.equal(employee.cpfMasked, '***.456.789-**');
    assert.equal(employee.baseSalaryCents, 620000);

    // 3.2. Criar Cerca Virtual (Geofence) na Sede Curitiba (raio 150m)
    const geoRes = await fetch(`${baseUrl}/api/v1/rh/geofences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenRh}`,
      },
      body: JSON.stringify({
        code: 'SEDE-CURITIBA',
        name: 'Sede Administrativa DiskIngressos',
        latitude: -25.4284,
        longitude: -49.2733,
        radiusMeters: 150,
      }),
    });
    assert.equal(geoRes.status, 201);
    const geofence = (await geoRes.json()) as RhGeofenceDto;
    assert.equal(geofence.code, 'SEDE-CURITIBA');

    // 3.3. Registrar marcação DENTRO do raio (mesmas coordenadas -> 0m -> VALIDADA, NSR #1)
    const punchInsideRes = await fetch(`${baseUrl}/api/v1/rh/time-punches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenRh}`,
      },
      body: JSON.stringify({
        employeeId: employee.id,
        geofenceId: geofence.id,
        punchType: 'ENTRADA',
        latitude: -25.4284,
        longitude: -49.2733,
        accuracyMeters: 8,
        idempotencyKey: 'offline-sync-punch-001',
      }),
    });
    assert.equal(punchInsideRes.status, 201);
    const punchInside = (await punchInsideRes.json()) as RhTimePunchDto;
    assert.equal(punchInside.nsr, 1);
    assert.equal(punchInside.validationStatus, 'VALIDADA');
    assert.equal(punchInside.distanceMeters, 0);
    assert.equal(punchInside.authenticityHash.length, 64);

    // 3.4. Replay idempotente da fila offline retorna o mesmo NSR #1 sem duplicar
    const punchReplayRes = await fetch(`${baseUrl}/api/v1/rh/time-punches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenRh}`,
      },
      body: JSON.stringify({
        employeeId: employee.id,
        geofenceId: geofence.id,
        punchType: 'ENTRADA',
        latitude: -25.4284,
        longitude: -49.2733,
        accuracyMeters: 8,
        idempotencyKey: 'offline-sync-punch-001',
      }),
    });
    assert.equal(punchReplayRes.status, 201);
    const punchReplay = (await punchReplayRes.json()) as RhTimePunchDto;
    assert.equal(punchReplay.id, punchInside.id);
    assert.equal(punchReplay.nsr, 1);

    // 3.5. Registrar marcação FORA do raio (~2.5km de distância -> FORA_DA_AREA, NSR #2)
    const punchOutsideRes = await fetch(`${baseUrl}/api/v1/rh/time-punches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenRh}`,
      },
      body: JSON.stringify({
        employeeId: employee.id,
        geofenceId: geofence.id,
        punchType: 'SAIDA',
        latitude: -25.4500,
        longitude: -49.2733,
        accuracyMeters: 12,
        idempotencyKey: 'offline-sync-punch-002',
      }),
    });
    assert.equal(punchOutsideRes.status, 201);
    const punchOutside = (await punchOutsideRes.json()) as RhTimePunchDto;
    assert.equal(punchOutside.nsr, 2);
    assert.equal(punchOutside.validationStatus, 'FORA_DA_AREA');
    assert.equal(punchOutside.distanceMeters > 150, true);
  });

  it('4. Ponte Transacional RH → Financeiro: Centros de Custo, Segregação de Funções (SoD), Tesouraria Sandbox e Ledger Imutável', async () => {
    // 4.1. Financeiro cria Centro de Custo Corporativo RH e Centro de Custo de Evento
    const ccCorpRes = await fetch(`${baseUrl}/api/v1/finance/cost-centers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenFinanceiro}`,
      },
      body: JSON.stringify({
        code: 'CC-RH-CORP-01',
        name: 'Folha Corporativa DiskIngressos',
        centerType: 'CORPORATIVO_RH',
      }),
    });
    assert.equal(ccCorpRes.status, 201);
    const ccCorp = (await ccCorpRes.json()) as CostCenterDto;

    const ccEventRes = await fetch(`${baseUrl}/api/v1/finance/cost-centers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenFinanceiro}`,
      },
      body: JSON.stringify({
        code: 'CC-STAFF-EVT-ALPHA',
        name: 'Staff Operacional Festival Sinfônico Alpha',
        centerType: 'EVENTO_STAFF',
        eventId: ISOLATED_TEST_FIXTURES.events.alphaShow.id,
      }),
    });
    assert.equal(ccEventRes.status, 201);
    const ccEvent = (await ccEventRes.json()) as CostCenterDto;

    // 4.2. Bloqueio de mistura contábil: tentar lançar FOLHA corporativa em centro EVENTO_STAFF -> 400 Bad Request
    const invalidMixRes = await fetch(`${baseUrl}/api/v1/rh/payment-batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenRh}`,
      },
      body: JSON.stringify({
        batchCode: 'FOLHA-MIX-INVALIDA',
        originType: 'FOLHA',
        competencia: '2026-11',
        costCenterId: ccEvent.id,
        headcount: 10,
        grossAmountCents: 5000000,
        deductionsAmountCents: 500000,
        encargosAmountCents: 1000000,
        netAmountCents: 4500000,
      }),
    });
    assert.equal(invalidMixRes.status, 400);

    // 4.3. RH submete lote válido de EQUIPE_EVENTO vinculado ao Evento Alpha
    const validBatchRes = await fetch(`${baseUrl}/api/v1/rh/payment-batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenRh}`,
      },
      body: JSON.stringify({
        batchCode: 'STAFF-ALPHA-2026-11',
        originType: 'EQUIPE_EVENTO',
        competencia: '2026-11',
        costCenterId: ccEvent.id,
        eventId: ISOLATED_TEST_FIXTURES.events.alphaShow.id,
        headcount: 25,
        grossAmountCents: 3800000,
        deductionsAmountCents: 300000,
        encargosAmountCents: 400000,
        netAmountCents: 3500000,
      }),
    });
    assert.equal(validBatchRes.status, 201);
    const batch = (await validBatchRes.json()) as RhPaymentBatchDto;
    assert.equal(batch.status, 'AGUARDANDO_FINANCEIRO');
    assert.equal(batch.requestedByUserId, ISOLATED_TEST_FIXTURES.users.rhDisk.id);

    // Verificar que o evento na outbox (rh.pagamento_aprovado.v1) NÃO contém CPF nem salários individuais
    const outboxRes = await db.query<{ payload: Record<string, unknown> }>(
      `SELECT payload FROM outbox_events WHERE aggregate_id = $1 AND event_name = 'rh.pagamento_aprovado.v1'`,
      [batch.id]
    );
    assert.equal(outboxRes.rows.length, 1);
    const outboxPayload = outboxRes.rows[0].payload;
    assert.equal(outboxPayload.containsIndividualSalaryPii, false);
    assert.equal('cpf' in outboxPayload, false);

    // 4.4. Teste de Segregação de Funções (SoD): se concedermos temporariamente finance:approve-rh-payment ao próprio solicitante RH, o FinanceService bloqueia a autoaprovação (403 SOD_VIOLATION_REQUESTER_CANNOT_APPROVE)
    await db.query(
      `INSERT INTO user_role_grants (user_id, role_code) VALUES ($1, 'FINANCEIRO_DISK') ON CONFLICT DO NOTHING`,
      [ISOLATED_TEST_FIXTURES.users.rhDisk.id]
    );
    const selfApproveRes = await fetch(
      `${baseUrl}/api/v1/finance/rh-payment-batches/${batch.id}/approve`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenRh}` },
      }
    );
    assert.equal(selfApproveRes.status, 403);
    const selfApproveErr = (await selfApproveRes.json()) as { error: { code: string } };
    assert.equal(selfApproveErr.error.code, 'SOD_VIOLATION_REQUESTER_CANNOT_APPROVE');

    // Remover grant temporário
    await db.query(
      `DELETE FROM user_role_grants WHERE user_id = $1 AND role_code = 'FINANCEIRO_DISK'`,
      [ISOLATED_TEST_FIXTURES.users.rhDisk.id]
    );

    // 4.5. Operador distinto do Financeiro Disk aprova o lote -> APROVADO_FINANCEIRO
    const finApproveRes = await fetch(
      `${baseUrl}/api/v1/finance/rh-payment-batches/${batch.id}/approve`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenFinanceiro}` },
      }
    );
    assert.equal(finApproveRes.status, 201);
    const approvedBatch = (await finApproveRes.json()) as RhPaymentBatchDto;
    assert.equal(approvedBatch.status, 'APROVADO_FINANCEIRO');
    assert.equal(approvedBatch.approvedByFinanceUserId, ISOLATED_TEST_FIXTURES.users.financeiro.id);

    // 4.6. Financeiro prepara instrução de Tesouraria Sandbox -> PENDENTE_INTEGRACAO_BANCARIA
    const prepRes = await fetch(
      `${baseUrl}/api/v1/finance/rh-payment-batches/${batch.id}/prepare-treasury`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenFinanceiro}` },
      }
    );
    assert.equal(prepRes.status, 201);
    const preparedBatch = (await prepRes.json()) as RhPaymentBatchDto;
    assert.equal(preparedBatch.status, 'PENDENTE_INTEGRACAO_BANCARIA');

    // 4.7. Tentativa de liquidar sem comprovante bancário externo -> 400 Bad Request
    const emptySettleRes = await fetch(
      `${baseUrl}/api/v1/finance/rh-payment-batches/${batch.id}/confirm-settlement`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenFinanceiro}`,
        },
        body: JSON.stringify({ externalConfirmationRef: '' }),
      }
    );
    assert.equal(emptySettleRes.status, 400);

    // 4.8. Confirmação de liquidação com comprovante bancário externo -> LIQUIDADO + Partida Dobrada no Ledger
    const settleRes = await fetch(
      `${baseUrl}/api/v1/finance/rh-payment-batches/${batch.id}/confirm-settlement`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenFinanceiro}`,
        },
        body: JSON.stringify({ externalConfirmationRef: 'SANDBOX-RET-20261105-991' }),
      }
    );
    assert.equal(settleRes.status, 201);
    const settledBody = (await settleRes.json()) as {
      batch: RhPaymentBatchDto;
      ledgerEntry: FinanceLedgerEntryDto;
    };
    assert.equal(settledBody.batch.status, 'LIQUIDADO');
    assert.equal(settledBody.batch.externalConfirmationRef, 'SANDBOX-RET-20261105-991');
    assert.equal(settledBody.ledgerEntry.amountCents, 3500000);
    assert.equal(settledBody.ledgerEntry.debitAccount, '3.1.02.01-CUSTO_EQUIPE_EVENTO_RH');
    assert.equal(settledBody.ledgerEntry.creditAccount, '1.1.01.02-TESOURARIA_BANCOS_SANDBOX');

    // 4.9. Verificar imutabilidade do Ledger Financeiro (trigger bloqueia UPDATE e DELETE)
    await assert.rejects(
      async () => {
        await db.query(`DELETE FROM finance_ledger_entries WHERE id = $1`, [
          settledBody.ledgerEntry.id,
        ]);
      },
      /imutáveis/i
    );
  });
});
