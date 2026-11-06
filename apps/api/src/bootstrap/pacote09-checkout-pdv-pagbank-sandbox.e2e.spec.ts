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

describe('BRAVO_II — Pacote 09 E2E: Checkout por Pedido com Idempotência, Sandbox PagBank Somente-Leitura, Terminais PDV Bloqueados e Segregação RBAC', () => {
  let app: INestApplication;
  let baseUrl: string;
  const appOrigin = 'http://localhost:3000';

  let publishedEventId: string;
  let publishedSessionId: string;
  let publishedLotId: string;
  let customerId: string;
  let orderId1: string;
  let orderId2: string;
  let attemptId1: string;

  const loginAs = async (email: string, password: string) => {
    const res = await fetch(`${baseUrl}/v1/auth/login`, {
      method: 'POST',
      headers: { Origin: appOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(res.status, 200);
    const cookie = (res.headers.get('set-cookie') ?? '').split(';')[0];
    const body = (await res.json()) as { csrfToken: string };
    return { cookie, csrf: body.csrfToken };
  };

  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.BRAVO_ENV = 'HOMOLOGACAO';
    process.env.PGLITE_DATA_DIR = 'memory://';
    process.env.APP_ORIGIN = appOrigin;
    process.env.COOKIE_SECURE = 'false';
    process.env.CPF_HASH_PEPPER = 'p09_homologacao_secret_pepper_with_at_least_32_characters_2026';
    process.env.ENABLE_EXTERNAL_PUBLICATION = 'false';
    process.env.ENABLE_REAL_PAYMENTS = 'false';
    process.env.ENABLE_REAL_REFUNDS = 'false';
    process.env.ENABLE_PAGBANK_SANDBOX = 'false';
    process.env.PAGBANK_SANDBOX_TOKEN = '';
    process.env.ENABLE_PDV_OPERATIONS = 'false';
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

    const accounts = [
      {
        id: '99000000-0000-4000-8000-000000000001',
        email: 'admin.p09@diskingressos.test',
        fullName: 'Admin Homologação P09',
        plainPassword: 'BravoP09#AdminPassword2026',
        role: 'ADMIN_BRAVO' as const,
      },
      {
        id: '99000000-0000-4000-8000-000000000002',
        email: 'operacoes.p09@diskingressos.test',
        fullName: 'Operações Homologação P09',
        plainPassword: 'BravoP09#OperacoesPassword2026',
        role: 'OPERACAO_EVENTOS' as const,
      },
      {
        id: '99000000-0000-4000-8000-000000000003',
        email: 'financeiro.p09@diskingressos.test',
        fullName: 'Financeiro Homologação P09',
        plainPassword: 'BravoP09#FinanceiroPassword2026',
        role: 'FINANCEIRO_DISK' as const,
      },
      {
        id: '99000000-0000-4000-8000-000000000004',
        email: 'sac.p09@diskingressos.test',
        fullName: 'SAC Homologação P09',
        plainPassword: 'BravoP09#SacPassword2026',
        role: 'SAC_ATENDIMENTO' as const,
      },
      {
        id: '99000000-0000-4000-8000-000000000005',
        email: 'pdv.p09@diskingressos.test',
        fullName: 'Operador PDV Homologação P09',
        plainPassword: 'BravoP09#PdvPassword2026',
        role: 'PDV_CAIXA' as const,
      },
      {
        id: '99000000-0000-4000-8000-000000000006',
        email: 'produtor.p09@pdt.diskingressos.test',
        fullName: 'Produtor PDT Homologação P09',
        plainPassword: 'BravoP09#ProdutorPassword2026',
        role: 'PRODUTOR_PDT' as const,
      },
      {
        id: '99000000-0000-4000-8000-000000000007',
        email: 'comercial.p09@diskingressos.test',
        fullName: 'Comercial 1 Homologação P09',
        plainPassword: 'BravoP09#ComercialPassword2026',
        role: 'COMERCIAL_DISK' as const,
      },
      {
        id: '99000000-0000-4000-8000-000000000008',
        email: 'comercial2.p09@diskingressos.test',
        fullName: 'Comercial 2 Homologação P09',
        plainPassword: 'BravoP09#Comercial2Password2026',
        role: 'COMERCIAL_DISK' as const,
      },
    ];

    for (const acc of accounts) {
      await identity.ensureOperatorAccount(acc);
    }

    // Cria produtor homologado, evento publicado, cliente e 2 pedidos reservados para os ensaios de checkout
    const comercial = await loginAs('comercial.p09@diskingressos.test', 'BravoP09#ComercialPassword2026');
    const comercial2 = await loginAs('comercial2.p09@diskingressos.test', 'BravoP09#Comercial2Password2026');
    const financeiro = await loginAs('financeiro.p09@diskingressos.test', 'BravoP09#FinanceiroPassword2026');
    const operacoes = await loginAs('operacoes.p09@diskingressos.test', 'BravoP09#OperacoesPassword2026');

    const prodRes = await fetch(`${baseUrl}/v1/comercial/produtores`, {
      method: 'POST',
      headers: {
        Cookie: comercial.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': comercial.csrf,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        legalName: 'Produtora Homologação P09 S.A.',
        tradeName: 'Produtora P09',
        cnpj: '11.222.333/0001-81',
        email: 'produtor@p09.com.br',
        phone: '41999990009',
        address: {
          street: 'Av. Batel',
          number: '1500',
          district: 'Batel',
          city: 'Curitiba',
          state: 'PR',
          postalCode: '80420090',
        },
        legalRepresentative: {
          name: 'Helena Costa',
          email: 'helena@p09.com.br',
          role: 'Diretora',
        },
      }),
    });
    assert.equal(prodRes.status, 201);
    const producer = (await prodRes.json()) as { id: string };

    for (const kind of ['CONTRATO_SOCIAL', 'CARTAO_CNPJ', 'DOCUMENTO_REPRESENTANTE']) {
      const docRes = await fetch(`${baseUrl}/v1/comercial/produtores/${producer.id}/documentos`, {
        method: 'POST',
        headers: {
          Cookie: comercial.cookie,
          Origin: appOrigin,
          'X-CSRF-Token': comercial.csrf,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kind,
          storageKey: `secure://p09/${kind.toLowerCase()}.pdf`,
          checksum: 'b'.repeat(64),
        }),
      });
      assert.equal(docRes.status, 201);
      const doc = (await docRes.json()) as { id: string };

      const valDocRes = await fetch(
        `${baseUrl}/v1/comercial/produtores/${producer.id}/documentos/${doc.id}/validar`,
        {
          method: 'POST',
          headers: {
            Cookie: comercial2.cookie,
            Origin: appOrigin,
            'X-CSRF-Token': comercial2.csrf,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'VALIDADO' }),
        }
      );
      assert.equal(valDocRes.status, 201);
    }

    const approveProdRes = await fetch(`${baseUrl}/v1/comercial/produtores/${producer.id}/aprovar`, {
      method: 'POST',
      headers: {
        Cookie: comercial2.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': comercial2.csrf,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ decision: 'APROVADO' }),
    });
    assert.equal(approveProdRes.status, 201);

    const now = Date.now();
    const salesStartAt = new Date(now - 2 * 3600_000).toISOString();
    const startsAt = new Date(now + 15 * 24 * 3600_000).toISOString();
    const endsAt = new Date(now + 15 * 24 * 3600_000 + 4 * 3600_000).toISOString();
    const lotEndsAt = new Date(now + 10 * 24 * 3600_000).toISOString();

    const evRes = await fetch(`${baseUrl}/v1/eventos`, {
      method: 'POST',
      headers: {
        Cookie: operacoes.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoes.csrf,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        primaryProducerId: producer.id,
        name: 'Festival Homologação Pacote 09',
        description: 'Evento de teste para checkout e PDV do Pacote 09 com mais de vinte caracteres.',
        venueName: 'Ópera de Arame',
        venueCity: 'Curitiba',
        venueState: 'PR',
        startAt: startsAt,
        endAt: endsAt,
        salesStartAt,
        ageRating: 'Livre',
        policyUrl: 'https://www.diskingressos.com.br/politica-p09',
      }),
    });
    assert.equal(evRes.status, 201);
    const ev = (await evRes.json()) as { id: string };
    publishedEventId = ev.id;

    // Taxa Disk secreta por evento (1200 bps = 12%)
    const feeRes = await fetch(`${baseUrl}/v1/comercial/eventos/${publishedEventId}/taxas`, {
      method: 'POST',
      headers: {
        Cookie: comercial.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': comercial.csrf,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'PERCENTUAL',
        percentBasisPoints: 1200,
        effectiveFrom: new Date(now - 24 * 3600_000).toISOString(),
        negotiationReference: 'NEG-P09-2026-SECRET',
      }),
    });
    assert.equal(feeRes.status, 201);
    const fee = (await feeRes.json()) as { id: string };

    const appFeeRes = await fetch(
      `${baseUrl}/v1/comercial/eventos/${publishedEventId}/taxas/${fee.id}/aprovar`,
      {
        method: 'POST',
        headers: {
          Cookie: financeiro.cookie,
          Origin: appOrigin,
          'X-CSRF-Token': financeiro.csrf,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );
    assert.equal(appFeeRes.status, 201);

    const sessRes = await fetch(`${baseUrl}/v1/eventos/${publishedEventId}/sessoes`, {
      method: 'POST',
      headers: {
        Cookie: operacoes.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoes.csrf,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Sessão Noite P09',
        startsAt,
        endsAt,
        capacity: 100,
      }),
    });
    assert.equal(sessRes.status, 201);
    publishedSessionId = ((await sessRes.json()) as { id: string }).id;

    const areaRes = await fetch(`${baseUrl}/v1/eventos/${publishedEventId}/areas`, {
      method: 'POST',
      headers: {
        Cookie: operacoes.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoes.csrf,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: publishedSessionId,
        label: 'Plateia P09',
        capacity: 100,
        isNumbered: false,
      }),
    });
    assert.equal(areaRes.status, 201);
    const areaId = ((await areaRes.json()) as { id: string }).id;

    const lotRes = await fetch(`${baseUrl}/v1/eventos/${publishedEventId}/lotes`, {
      method: 'POST',
      headers: {
        Cookie: operacoes.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoes.csrf,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: publishedSessionId,
        areaId,
        name: '1º Lote Inteira P09',
        faceValueCents: 15000,
        capacity: 50,
        startsAt: salesStartAt,
        endsAt: lotEndsAt,
      }),
    });
    assert.equal(lotRes.status, 201);
    publishedLotId = ((await lotRes.json()) as { id: string }).id;

    const chanRes = await fetch(`${baseUrl}/v1/eventos/${publishedEventId}/canais`, {
      method: 'POST',
      headers: {
        Cookie: operacoes.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoes.csrf,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channels: ['ONLINE', 'PDV'] }),
    });
    assert.equal(chanRes.status, 201);

    const db = app.get(DatabaseService);
    await db.query(`UPDATE events SET status = 'PUBLICADO' WHERE id = $1`, [publishedEventId]);
    await db.query(`UPDATE event_sessions SET status = 'ATIVA' WHERE event_id = $1`, [publishedEventId]);
    await db.query(`UPDATE event_price_lots SET status = 'ATIVO' WHERE event_id = $1`, [publishedEventId]);

    // Cria cliente e 2 pedidos reservados no banco de homologação
    const custRes = await fetch(`${baseUrl}/v1/clientes`, {
      method: 'POST',
      headers: {
        Cookie: operacoes.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoes.csrf,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: 'Cliente Checkout P09',
        cpf: '529.982.247-25',
        email: 'cliente.p09@exemplo.com',
        phone: '41988887766',
      }),
    });
    assert.equal(custRes.status, 201);
    customerId = ((await custRes.json()) as { id: string }).id;

    const ord1Res = await fetch(`${baseUrl}/v1/pedidos/reservas`, {
      method: 'POST',
      headers: {
        Cookie: operacoes.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoes.csrf,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId,
        eventId: publishedEventId,
        sessionId: publishedSessionId,
        lotId: publishedLotId,
        quantity: 2,
        channel: 'ONLINE',
        idempotencyKey: randomUUID(),
      }),
    });
    assert.equal(ord1Res.status, 201);
    orderId1 = ((await ord1Res.json()) as { id: string }).id;

    const ord2Res = await fetch(`${baseUrl}/v1/pedidos/reservas`, {
      method: 'POST',
      headers: {
        Cookie: operacoes.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoes.csrf,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId,
        eventId: publishedEventId,
        sessionId: publishedSessionId,
        lotId: publishedLotId,
        quantity: 1,
        channel: 'ONLINE',
        idempotencyKey: randomUUID(),
      }),
    });
    assert.equal(ord2Res.status, 201);
    orderId2 = ((await ord2Res.json()) as { id: string }).id;
  });

  after(async () => {
    delete process.env.APP_ORIGIN;
    if (app) {
      await app.close();
    }
  });

  it('1. Bloqueia acesso anônimo (401), Origin falso (403), ausência de CSRF (403) e perfis não autorizados (SAC/PDV/Produtor -> 403)', async () => {
    // Anônimo -> 401
    for (const route of [
      `/v1/checkout/pedidos/${orderId1}/tentativas`,
      '/v1/pdv/terminais',
    ]) {
      const res = await fetch(`${baseUrl}${route}`);
      assert.equal(res.status, 401);
    }

    // Origin falso -> 403
    for (const route of [
      `/v1/checkout/pedidos/${orderId1}/tentativas`,
      '/v1/pdv/terminais',
    ]) {
      const res = await fetch(`${baseUrl}${route}`, {
        method: 'POST',
        headers: { Origin: 'https://site-falso.invalid', 'Content-Type': 'application/json' },
        body: '{}',
      });
      assert.equal(res.status, 403);
    }

    // SAC, PDV e Produtor não acessam checkout
    const sac = await loginAs('sac.p09@diskingressos.test', 'BravoP09#SacPassword2026');
    const pdv = await loginAs('pdv.p09@diskingressos.test', 'BravoP09#PdvPassword2026');
    const produtor = await loginAs('produtor.p09@pdt.diskingressos.test', 'BravoP09#ProdutorPassword2026');

    for (const actor of [sac, pdv, produtor]) {
      const getChk = await fetch(`${baseUrl}/v1/checkout/pedidos/${orderId1}/tentativas`, {
        headers: { Cookie: actor.cookie },
      });
      assert.equal(getChk.status, 403);
    }

    // Financeiro pode consultar tentativas (200), mas não pode preparar tentativa (403)
    const financeiro = await loginAs('financeiro.p09@diskingressos.test', 'BravoP09#FinanceiroPassword2026');
    const finList = await fetch(`${baseUrl}/v1/checkout/pedidos/${orderId1}/tentativas`, {
      headers: { Cookie: financeiro.cookie },
    });
    assert.equal(finList.status, 200);

    const finPrepare = await fetch(`${baseUrl}/v1/checkout/pedidos/${orderId1}/tentativas`, {
      method: 'POST',
      headers: {
        Cookie: financeiro.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': financeiro.csrf,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'PAGBANK',
        method: 'PIX',
        idempotencyKey: randomUUID(),
      }),
    });
    assert.equal(finPrepare.status, 403);
  });

  it('2. Prepara tentativa de checkout idempotente, recusa divergência/segunda tentativa, não muda pedido para PAGO, não gera ingresso e não expõe Taxa Disk', async () => {
    const operacoes = await loginAs('operacoes.p09@diskingressos.test', 'BravoP09#OperacoesPassword2026');
    const idemKey = randomUUID();

    // 2.1 Primeira chamada cria tentativa em PENDENTE_HOMOLOGACAO
    const prep1 = await fetch(`${baseUrl}/v1/checkout/pedidos/${orderId1}/tentativas`, {
      method: 'POST',
      headers: {
        Cookie: operacoes.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoes.csrf,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'PAGBANK',
        method: 'PIX',
        idempotencyKey: idemKey,
      }),
    });
    assert.equal(prep1.status, 201);
    const body1 = (await prep1.json()) as {
      id: string;
      status: string;
      alreadyCreated: boolean;
      amountCents: number;
    };
    assert.equal(body1.status, 'PENDENTE_HOMOLOGACAO');
    assert.equal(body1.alreadyCreated, false);
    assert.equal(body1.amountCents, 30000);
    attemptId1 = body1.id;

    // 2.2 Repetir mesmo UUID e mesmos dados retorna a mesma tentativa (alreadyCreated: true)
    const prepSame = await fetch(`${baseUrl}/v1/checkout/pedidos/${orderId1}/tentativas`, {
      method: 'POST',
      headers: {
        Cookie: operacoes.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoes.csrf,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'PAGBANK',
        method: 'PIX',
        idempotencyKey: idemKey,
      }),
    });
    assert.equal(prepSame.status, 201);
    const bodySame = (await prepSame.json()) as { id: string; alreadyCreated: boolean };
    assert.equal(bodySame.id, attemptId1);
    assert.equal(bodySame.alreadyCreated, true);

    // 2.3 Repetir mesmo UUID com dados divergentes retorna 409 Conflict
    const prepDiffPayload = await fetch(`${baseUrl}/v1/checkout/pedidos/${orderId1}/tentativas`, {
      method: 'POST',
      headers: {
        Cookie: operacoes.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoes.csrf,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'PAGBANK',
        method: 'CARTAO_CREDITO',
        idempotencyKey: idemKey,
      }),
    });
    assert.equal(prepDiffPayload.status, 409);

    // 2.4 Segunda tentativa para o mesmo pedido com novo UUID é recusada (409 Conflict)
    const prepSecondForOrder = await fetch(`${baseUrl}/v1/checkout/pedidos/${orderId1}/tentativas`, {
      method: 'POST',
      headers: {
        Cookie: operacoes.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoes.csrf,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'REDE',
        method: 'CARTAO_CREDITO',
        idempotencyKey: randomUUID(),
      }),
    });
    assert.equal(prepSecondForOrder.status, 409);

    // 2.5 Verifica no PostgreSQL que o pedido continua RESERVADO, sem ingresso emitido e sem confirmação
    const db = app.get(DatabaseService);
    const orderCheck = await db.query<{ status: string; confirmed_at: string | null }>(
      `SELECT status, confirmed_at FROM p08_sale_orders WHERE id = $1`,
      [orderId1]
    );
    assert.equal(orderCheck.rows[0].status, 'RESERVADO');
    assert.equal(orderCheck.rows[0].confirmed_at, null);

    const ticketsCheck = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM p08_issued_tickets WHERE order_id = $1`,
      [orderId1]
    );
    assert.equal(Number(ticketsCheck.rows[0].count), 0);

    // 2.6 Consulta da tentativa não expõe Taxa Disk por evento nem segredos/cartão
    const listRes = await fetch(`${baseUrl}/v1/checkout/pedidos/${orderId1}/tentativas`, {
      headers: { Cookie: operacoes.cookie },
    });
    assert.equal(listRes.status, 200);
    const rawJson = await listRes.text();
    assert(!rawJson.includes('1200'));
    assert(!rawJson.includes('NEG-P09-2026-SECRET'));
    assert(!rawJson.includes('percentBasisPoints'));
    assert(!rawJson.includes('fixedCents'));
    assert(!rawJson.includes('diskFee'));
    assert(!rawJson.includes('cardNumber'));
    assert(!rawJson.includes('cvv'));
  });

  it('3. Valida adaptador Sandbox PagBank isolado (bloqueado por padrão, restrito a ADMIN, informativo issuedTickets: 0 e marca RESULTADO_INDETERMINADO em falha)', async () => {
    const admin = await loginAs('admin.p09@diskingressos.test', 'BravoP09#AdminPassword2026');
    const operacoes = await loginAs('operacoes.p09@diskingressos.test', 'BravoP09#OperacoesPassword2026');

    // 3.1 Operações não pode iniciar sandbox (somente ADMIN)
    const opStart = await fetch(`${baseUrl}/v1/checkout/tentativas/${attemptId1}/iniciar-sandbox`, {
      method: 'POST',
      headers: {
        Cookie: operacoes.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoes.csrf,
      },
    });
    assert.equal(opStart.status, 403);

    // 3.2 Com ENABLE_PAGBANK_SANDBOX=false (padrão), ADMIN recebe 400 informando que sandbox está desabilitado
    const disabledStart = await fetch(`${baseUrl}/v1/checkout/tentativas/${attemptId1}/iniciar-sandbox`, {
      method: 'POST',
      headers: {
        Cookie: admin.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': admin.csrf,
      },
    });
    assert.equal(disabledStart.status, 400);

    // 3.3 Habilita sandbox em teste controlado interceptando apenas chamadas para https://sandbox.api.pagseguro.com
    const originalFetch = global.fetch;
    const capturedUrls: string[] = [];
    process.env.ENABLE_PAGBANK_SANDBOX = 'true';
    process.env.PAGBANK_SANDBOX_TOKEN = 'sandbox-token-homologacao-p09-0123456789';

    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.startsWith('https://sandbox.api.pagseguro.com')) {
        capturedUrls.push(url);
        if (url === 'https://sandbox.api.pagseguro.com/checkouts' && init?.method === 'POST') {
          return new Response(JSON.stringify({ id: 'CHEC_SANDBOX_P09_0001' }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (url === 'https://sandbox.api.pagseguro.com/checkouts/CHEC_SANDBOX_P09_0001') {
          return new Response(JSON.stringify({ id: 'CHEC_SANDBOX_P09_0001', status: 'PAID' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
      return originalFetch(input, init);
    }) as typeof fetch;

    try {
      const startRes = await originalFetch(`${baseUrl}/v1/checkout/tentativas/${attemptId1}/iniciar-sandbox`, {
        method: 'POST',
        headers: {
          Cookie: admin.cookie,
          Origin: appOrigin,
          'X-CSRF-Token': admin.csrf,
        },
      });
      assert.equal(startRes.status, 201);
      const startBody = (await startRes.json()) as {
        id: string;
        status: string;
        sandboxCheckoutId: string;
        paid: boolean;
        issuedTickets: number;
      };
      assert.equal(startBody.status, 'CRIADO_SANDBOX');
      assert.equal(startBody.sandboxCheckoutId, 'CHEC_SANDBOX_P09_0001');
      assert.equal(startBody.paid, false);
      assert.equal(startBody.issuedTickets, 0);
      assert(capturedUrls.includes('https://sandbox.api.pagseguro.com/checkouts'));

      // Consultar sandbox mesmo retornando PAID lá fora NUNCA liquida pedido nem emite ingresso
      const consultRes = await originalFetch(
        `${baseUrl}/v1/checkout/tentativas/${attemptId1}/consultar-sandbox`,
        {
          headers: { Cookie: admin.cookie },
        }
      );
      assert.equal(consultRes.status, 200);
      const consultBody = (await consultRes.json()) as {
        externalStatus: string;
        informationalOnly: boolean;
        requiresVerifiedWebhookAndReconciliation: boolean;
        issuedTickets: number;
      };
      assert.equal(consultBody.externalStatus, 'PAID');
      assert.equal(consultBody.informationalOnly, true);
      assert.equal(consultBody.requiresVerifiedWebhookAndReconciliation, true);
      assert.equal(consultBody.issuedTickets, 0);

      const db = app.get(DatabaseService);
      const orderAfterConsult = await db.query<{ status: string }>(
        `SELECT status FROM p08_sale_orders WHERE id = $1`,
        [orderId1]
      );
      assert.equal(orderAfterConsult.rows[0].status, 'RESERVADO');

      const ticketsAfterConsult = await db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM p08_issued_tickets WHERE order_id = $1`,
        [orderId1]
      );
      assert.equal(Number(ticketsAfterConsult.rows[0].count), 0);

      // 3.4 Simula falha de rede no segundo pedido -> status vira RESULTADO_INDETERMINADO e bloqueia reenvio automático
      const prep2 = await originalFetch(`${baseUrl}/v1/checkout/pedidos/${orderId2}/tentativas`, {
        method: 'POST',
        headers: {
          Cookie: admin.cookie,
          Origin: appOrigin,
          'X-CSRF-Token': admin.csrf,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'PAGBANK',
          method: 'PIX',
          idempotencyKey: randomUUID(),
        }),
      });
      assert.equal(prep2.status, 201);
      const attemptId2 = ((await prep2.json()) as { id: string }).id;

      global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (url.startsWith('https://sandbox.api.pagseguro.com')) {
          throw new Error('TIMEOUT_REDE_SANDBOX');
        }
        return originalFetch(input, init);
      }) as typeof fetch;

      const failStart = await originalFetch(`${baseUrl}/v1/checkout/tentativas/${attemptId2}/iniciar-sandbox`, {
        method: 'POST',
        headers: {
          Cookie: admin.cookie,
          Origin: appOrigin,
          'X-CSRF-Token': admin.csrf,
        },
      });
      assert.equal(failStart.status, 503);

      const attCheck = await db.query<{ status: string; last_error: string }>(
        `SELECT status, last_error FROM p09_checkout_attempts WHERE id = $1`,
        [attemptId2]
      );
      assert.equal(attCheck.rows[0].status, 'RESULTADO_INDETERMINADO');
      assert.equal(attCheck.rows[0].last_error, 'TIMEOUT_REDE_SANDBOX');

      // Reenvio automático de tentativa em RESULTADO_INDETERMINADO é bloqueado com 409
      const retryStart = await originalFetch(
        `${baseUrl}/v1/checkout/tentativas/${attemptId2}/iniciar-sandbox`,
        {
          method: 'POST',
          headers: {
            Cookie: admin.cookie,
            Origin: appOrigin,
            'X-CSRF-Token': admin.csrf,
          },
        }
      );
      assert.equal(retryStart.status, 409);
    } finally {
      global.fetch = originalFetch;
      process.env.ENABLE_PAGBANK_SANDBOX = 'false';
      process.env.PAGBANK_SANDBOX_TOKEN = '';
    }
  });

  it('4. Registra terminal PDV como BLOQUEADO_HOMOLOGACAO com trilha de auditoria e mantém abertura de turno e reserva PDV negadas', async () => {
    const admin = await loginAs('admin.p09@diskingressos.test', 'BravoP09#AdminPassword2026');
    const pdv = await loginAs('pdv.p09@diskingressos.test', 'BravoP09#PdvPassword2026');

    // 4.1 Operador PDV não pode cadastrar terminal (403), mas ADMIN cadastra (201)
    const pdvRegisterAttempt = await fetch(`${baseUrl}/v1/pdv/terminais`, {
      method: 'POST',
      headers: {
        Cookie: pdv.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': pdv.csrf,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: 'PDV_CWB_001',
        label: 'Bilheteria Principal 01',
        venue: 'Ópera de Arame',
      }),
    });
    assert.equal(pdvRegisterAttempt.status, 403);

    const adminRegister = await fetch(`${baseUrl}/v1/pdv/terminais`, {
      method: 'POST',
      headers: {
        Cookie: admin.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': admin.csrf,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: 'PDV_CWB_001',
        label: 'Bilheteria Principal 01',
        venue: 'Ópera de Arame',
      }),
    });
    assert.equal(adminRegister.status, 201);
    const terminal = (await adminRegister.json()) as { id: string; code: string; status: string };
    assert.equal(terminal.code, 'PDV_CWB_001');
    assert.equal(terminal.status, 'BLOQUEADO_HOMOLOGACAO');

    // 4.2 Verifica trilha de auditoria imutável da criação do terminal
    const db = app.get(DatabaseService);
    const auditRes = await db.query<{ canonical_action: string; after_state: { status: string } }>(
      `SELECT canonical_action, after_state
       FROM audit_records
       WHERE resource_type = 'PDV' AND resource_id = $1`,
      [terminal.id]
    );
    assert.equal(auditRes.rows.length, 1);
    assert.equal(auditRes.rows[0].canonical_action, 'PDV_TERMINAL_REGISTRADO');
    assert.equal(auditRes.rows[0].after_state.status, 'BLOQUEADO_HOMOLOGACAO');

    // 4.3 Perfil PDV pode consultar a listagem de terminais configurados
    const pdvList = await fetch(`${baseUrl}/v1/pdv/terminais`, {
      headers: { Cookie: pdv.cookie },
    });
    assert.equal(pdvList.status, 200);
    const listBody = (await pdvList.json()) as { items: Array<{ id: string; status: string }> };
    assert(listBody.items.some((t) => t.id === terminal.id && t.status === 'BLOQUEADO_HOMOLOGACAO'));

    // 4.4 Abertura de turno permanece negada (503) com ENABLE_PDV_OPERATIONS=false
    const openShiftRes = await fetch(`${baseUrl}/v1/pdv/terminais/${terminal.id}/turnos`, {
      method: 'POST',
      headers: {
        Cookie: pdv.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': pdv.csrf,
      },
    });
    assert.equal(openShiftRes.status, 503);

    // 4.5 Reserva via rota de PDV permanece negada (503)
    const pdvReserveRes = await fetch(
      `${baseUrl}/v1/pdv/terminais/${terminal.id}/turnos/${randomUUID()}/reservas`,
      {
        method: 'POST',
        headers: {
          Cookie: pdv.cookie,
          Origin: appOrigin,
          'X-CSRF-Token': pdv.csrf,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          eventId: publishedEventId,
          sessionId: publishedSessionId,
          lotId: publishedLotId,
          quantity: 1,
          idempotencyKey: randomUUID(),
        }),
      }
    );
    assert.equal(pdvReserveRes.status, 503);
  });
});
