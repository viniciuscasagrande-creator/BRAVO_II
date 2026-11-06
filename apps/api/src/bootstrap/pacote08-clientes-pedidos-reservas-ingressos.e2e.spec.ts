import 'reflect-metadata';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { settlementCanonical } from '@bravo-ii/domain-p08';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from '../common/errors/api-exception.filter';
import { DatabaseService } from '../common/database/database.service';
import { IdentityService } from '../modules/identity/identity.service';
import { Pacote06Service } from '../modules/pacote06/pacote06.service';
import { BravoOrdersService } from '../modules/pacote08/order.service';

describe('BRAVO_II — Pacote 08 E2E: Central de Clientes PF (CPF HMAC-SHA256), Pedidos, Reservas Atômicas, Idempotência, Concorrência, Expiração e Ingressos de 8 Dígitos', () => {
  let app: INestApplication;
  let baseUrl: string;
  let db: DatabaseService;
  let p06Service: Pacote06Service;
  let p08Orders: BravoOrdersService;
  const appOrigin = 'http://localhost:3000';

  const loginAndGetSession = async (email: string, password: string) => {
    const res = await fetch(`${baseUrl}/v1/auth/login`, {
      method: 'POST',
      headers: {
        Origin: appOrigin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(res.status, 200, `Login falhou para ${email}`);
    const cookie = (res.headers.get('set-cookie') ?? '').split(';')[0];
    const body = (await res.json()) as {
      csrfToken: string;
      token: string;
      user: { id: string; email: string; roles: string[] };
    };
    return { cookie, csrfToken: body.csrfToken, user: body.user };
  };

  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PGLITE_DATA_DIR = 'memory://';
    process.env.APP_ORIGIN = appOrigin;
    process.env.COOKIE_SECURE = 'false';
    process.env.ENABLE_EXTERNAL_PUBLICATION = 'false';
    process.env.ENABLE_REAL_PAYMENTS = 'false';
    process.env.ENABLE_REAL_REFUNDS = 'false';
    process.env.ALLOW_REAL_PAYMENT_GATEWAY = 'false';
    process.env.ALLOW_REAL_REFUND_EXECUTION = 'false';
    process.env.ALLOW_REAL_PAYOUT_EXECUTION = 'false';
    process.env.CPF_HASH_PEPPER = 'p08-test-only-hmac-pepper-secret-minimum-32-chars-2026';

    app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.listen(0);

    const server = app.getHttpServer();
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;

    db = app.get(DatabaseService);
    p06Service = app.get(Pacote06Service);
    p08Orders = app.get(BravoOrdersService);

    const identity = app.get(IdentityService);
    await identity.syncCanonicalRolesAndPermissions();

    const accounts = [
      {
        id: '88000000-0000-4000-8000-000000000001',
        email: 'admin.p08@diskingressos.test',
        fullName: 'Admin Homologação P08',
        plainPassword: 'BravoP08#AdminPassword2026',
        role: 'ADMIN_BRAVO' as const,
      },
      {
        id: '88000000-0000-4000-8000-000000000002',
        email: 'comercial.p08@diskingressos.test',
        fullName: 'Comercial Homologação P08',
        plainPassword: 'BravoP08#ComercialPassword2026',
        role: 'COMERCIAL_DISK' as const,
      },
      {
        id: '88000000-0000-4000-8000-000000000007',
        email: 'comercial2.p08@diskingressos.test',
        fullName: 'Comercial Revisor Homologação P08',
        plainPassword: 'BravoP08#Comercial2Password2026',
        role: 'COMERCIAL_DISK' as const,
      },
      {
        id: '88000000-0000-4000-8000-000000000003',
        email: 'operacoes.p08@diskingressos.test',
        fullName: 'Operações Homologação P08',
        plainPassword: 'BravoP08#OperacoesPassword2026',
        role: 'OPERACAO_EVENTOS' as const,
      },
      {
        id: '88000000-0000-4000-8000-000000000004',
        email: 'sac.p08@diskingressos.test',
        fullName: 'SAC Homologação P08',
        plainPassword: 'BravoP08#SacPassword2026',
        role: 'SAC_ATENDIMENTO' as const,
      },
      {
        id: '88000000-0000-4000-8000-000000000005',
        email: 'financeiro.p08@diskingressos.test',
        fullName: 'Financeiro Homologação P08',
        plainPassword: 'BravoP08#FinanceiroPassword2026',
        role: 'FINANCEIRO_DISK' as const,
      },
      {
        id: '88000000-0000-4000-8000-000000000006',
        email: 'produtor.p08@pdt.diskingressos.test',
        fullName: 'Produtor PDT Homologação P08',
        plainPassword: 'BravoP08#ProdutorPassword2026',
        role: 'PRODUTOR_PDT' as const,
      },
    ];

    for (const acc of accounts) {
      await identity.ensureOperatorAccount(acc);
    }
  });

  after(async () => {
    delete process.env.APP_ORIGIN;
    if (app) {
      await app.close();
    }
  });

  it('1. Bloqueia acesso não autenticado (401), Origem inválida (403), ausência de CSRF (403) e valida RBAC de menu e rotas P08', async () => {
    for (const path of ['/v1/clientes?busca=maria', '/v1/pedidos', '/v1/ingressos?numero=00000001']) {
      const unauth = await fetch(`${baseUrl}${path}`);
      assert.equal(unauth.status, 401, `Rota ${path} deveria retornar 401 sem sessão`);
    }

    const sacSession = await loginAndGetSession('sac.p08@diskingressos.test', 'BravoP08#SacPassword2026');
    const prodSession = await loginAndGetSession(
      'produtor.p08@pdt.diskingressos.test',
      'BravoP08#ProdutorPassword2026'
    );

    // Origem inválida -> 403
    const badOrigin = await fetch(`${baseUrl}/v1/clientes`, {
      method: 'POST',
      headers: {
        Cookie: sacSession.cookie,
        Origin: 'https://origem-falsa.invalid',
        'X-CSRF-Token': sacSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    assert.equal(badOrigin.status, 403);

    // Sem X-CSRF-Token -> 403
    const noCsrf = await fetch(`${baseUrl}/v1/clientes`, {
      method: 'POST',
      headers: {
        Cookie: sacSession.cookie,
        Origin: appOrigin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    assert.equal(noCsrf.status, 403);

    // Menu de SAC contém clientes, pedidos e ingressos, mas não financeiro nem taxas
    const sacMenuRes = await fetch(`${baseUrl}/v1/navegacao/menu`, {
      headers: { Cookie: sacSession.cookie },
    });
    assert.equal(sacMenuRes.status, 200);
    const sacMenu = (await sacMenuRes.json()) as { items: Array<{ id: string; status: string }> };
    const sacMenuIds = sacMenu.items.map((i) => i.id);
    assert.equal(sacMenuIds.includes('clientes'), true);
    assert.equal(sacMenuIds.includes('pedidos'), true);
    assert.equal(sacMenuIds.includes('ingressos'), true);
    assert.equal(sacMenuIds.includes('financeiro'), false);
    assert.equal(sacMenuIds.includes('taxas'), false);

    // Produtor PDT recebe 403 em /v1/clientes e /v1/pedidos
    const prodCustRes = await fetch(`${baseUrl}/v1/clientes?busca=maria`, {
      headers: { Cookie: prodSession.cookie },
    });
    assert.equal(prodCustRes.status, 403);

    const prodOrdersRes = await fetch(`${baseUrl}/v1/pedidos`, {
      headers: { Cookie: prodSession.cookie },
    });
    assert.equal(prodOrdersRes.status, 403);

    // SAC não tem alçada para criar reservas (apenas ADMIN e OPERACOES)
    const sacReserveRes = await fetch(`${baseUrl}/v1/pedidos/reservas`, {
      method: 'POST',
      headers: {
        Cookie: sacSession.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': sacSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    assert.equal(sacReserveRes.status, 403);
  });

  it('2. Cadastra pessoa física na Central de Clientes, valida CPF matematicamente, deduplica por HMAC-SHA256 e nunca persiste CPF em claro', async () => {
    const sacSession = await loginAndGetSession('sac.p08@diskingressos.test', 'BravoP08#SacPassword2026');

    // CPF inválido -> 400
    const badCpfRes = await fetch(`${baseUrl}/v1/clientes`, {
      method: 'POST',
      headers: {
        Cookie: sacSession.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': sacSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: 'Cliente CPF Inválido',
        cpf: '529.982.247-26',
        email: 'invalido@exemplo.test',
        phone: '41999990000',
      }),
    });
    assert.equal(badCpfRes.status, 400);

    // Cadastro válido de PF
    const createRes = await fetch(`${baseUrl}/v1/clientes`, {
      method: 'POST',
      headers: {
        Cookie: sacSession.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': sacSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: 'Maria de Souza Teste P08',
        cpf: '529.982.247-25',
        email: 'MARIA.P08@EXEMPLO.TEST',
        phone: '(41) 99988-7766',
        birthDate: '1992-05-14',
        marketingOptIn: false,
      }),
    });
    assert.equal(createRes.status, 201);
    const created = (await createRes.json()) as {
      id: string;
      fullName: string;
      cpfDisplay: string;
      email: string;
      marketingOptIn: boolean;
    };
    assert.equal(created.fullName, 'Maria de Souza Teste P08');
    assert.equal(created.cpfDisplay, '***.***.***-25');
    assert.equal(created.email, 'maria.p08@exemplo.test');
    assert.equal(created.marketingOptIn, false);

    // Verifica que CPF em claro NÃO foi gravado no banco nem na auditoria
    const dbRowRes = await db.query<{ cpf_hash: string; cpf_fingerprint: string; cpf_masked: string }>(
      `SELECT cpf_hash, cpf_fingerprint, cpf_masked FROM customers WHERE id = $1`,
      [created.id]
    );
    assert.equal(dbRowRes.rows.length, 1);
    assert.equal(dbRowRes.rows[0].cpf_fingerprint.length, 64);
    assert.equal(dbRowRes.rows[0].cpf_fingerprint.includes('52998224725'), false);
    assert.equal(dbRowRes.rows[0].cpf_masked, '***.***.***-25');

    const auditRes = await db.query<{ after_state: unknown }>(
      `SELECT after_state FROM audit_records WHERE resource_id = $1 AND canonical_action = 'CLIENTE_CADASTRADO'`,
      [created.id]
    );
    assert.equal(auditRes.rows.length, 1);
    const auditJson = JSON.stringify(auditRes.rows[0].after_state);
    assert.equal(auditJson.includes('52998224725'), false);
    assert.equal(auditJson.includes('maria.p08@exemplo.test'), false);

    // Tentativa de duplicar o mesmo CPF -> 409 Conflict
    const dupRes = await fetch(`${baseUrl}/v1/clientes`, {
      method: 'POST',
      headers: {
        Cookie: sacSession.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': sacSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: 'Outra Pessoa Mesmo CPF',
        cpf: '52998224725',
        email: 'outra@exemplo.test',
        phone: '41999887766',
      }),
    });
    assert.equal(dupRes.status, 409);

    // Busca com menos de 4 caracteres -> 400
    const shortSearch = await fetch(`${baseUrl}/v1/clientes?busca=mar`, {
      headers: { Cookie: sacSession.cookie },
    });
    assert.equal(shortSearch.status, 400);

    // Busca válida por nome/e-mail -> 200
    const searchRes = await fetch(`${baseUrl}/v1/clientes?busca=maria.p08`, {
      headers: { Cookie: sacSession.cookie },
    });
    assert.equal(searchRes.status, 200);
    const searchBody = (await searchRes.json()) as { items: Array<{ id: string; cpfDisplay: string }> };
    assert.equal(searchBody.items.length, 1);
    assert.equal(searchBody.items[0].id, created.id);
    assert.equal(searchBody.items[0].cpfDisplay, '***.***.***-25');
  });

  it('3. Executa jornada completa de Reservas (bloqueio antes de PUBLICADO, bloqueio de PDV e assentos numerados, idempotência, concorrência de estoque, cancelamento, expiração e emissão de ingresso de 8 dígitos com recibo assinado)', async () => {
    const adminSession = await loginAndGetSession('admin.p08@diskingressos.test', 'BravoP08#AdminPassword2026');
    const comercialSession = await loginAndGetSession(
      'comercial.p08@diskingressos.test',
      'BravoP08#ComercialPassword2026'
    );
    const comercial2Session = await loginAndGetSession(
      'comercial2.p08@diskingressos.test',
      'BravoP08#Comercial2Password2026'
    );
    const financeiroSession = await loginAndGetSession(
      'financeiro.p08@diskingressos.test',
      'BravoP08#FinanceiroPassword2026'
    );
    const operacoesSession = await loginAndGetSession(
      'operacoes.p08@diskingressos.test',
      'BravoP08#OperacoesPassword2026'
    );
    const sacSession = await loginAndGetSession('sac.p08@diskingressos.test', 'BravoP08#SacPassword2026');

    // Obtém o cliente cadastrado no teste anterior
    const custSearch = await fetch(`${baseUrl}/v1/clientes?busca=maria.p08`, {
      headers: { Cookie: sacSession.cookie },
    });
    const customerId = ((await custSearch.json()) as { items: Array<{ id: string }> }).items[0].id;

    // 3.1 Cria e valida Produtor PJ para o evento de teste P08
    const prodRes = await fetch(`${baseUrl}/v1/comercial/produtores`, {
      method: 'POST',
      headers: {
        Cookie: comercialSession.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': comercialSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        legalName: 'Produtora Eventos Pacote 08 S.A.',
        tradeName: 'Produtora P08',
        cnpj: '11.222.333/0001-81',
        email: 'financeiro@produtorap08.test',
        phone: '4133334444',
        address: {
          street: 'Av. Batel',
          number: '1200',
          district: 'Batel',
          city: 'Curitiba',
          state: 'PR',
          postalCode: '80420090',
        },
        legalRepresentative: {
          name: 'Carlos Eduardo',
          email: 'carlos@produtorap08.test',
          role: 'Diretor',
        },
      }),
    });
    assert.equal(prodRes.status, 201);
    const producer = (await prodRes.json()) as { id: string };

    // Anexa e valida os 3 documentos obrigatórios + aprova produtor com usuário diferente (maker-checker)
    for (const kind of ['CONTRATO_SOCIAL', 'CARTAO_CNPJ', 'DOCUMENTO_REPRESENTANTE']) {
      const docRes = await fetch(`${baseUrl}/v1/comercial/produtores/${producer.id}/documentos`, {
        method: 'POST',
        headers: {
          Cookie: comercialSession.cookie,
          Origin: appOrigin,
          'X-CSRF-Token': comercialSession.csrfToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kind,
          storageKey: `secure://p08/${kind.toLowerCase()}.pdf`,
          checksum: 'a'.repeat(64),
        }),
      });
      assert.equal(docRes.status, 201);
      const doc = (await docRes.json()) as { id: string };

      const valDocRes = await fetch(
        `${baseUrl}/v1/comercial/produtores/${producer.id}/documentos/${doc.id}/validar`,
        {
          method: 'POST',
          headers: {
            Cookie: comercial2Session.cookie,
            Origin: appOrigin,
            'X-CSRF-Token': comercial2Session.csrfToken,
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
        Cookie: comercial2Session.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': comercial2Session.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ decision: 'APROVADO' }),
    });
    assert.equal(approveProdRes.status, 201);

    // 3.2 Cria Evento, Sessão, Área Pista (não numerada) e Área Numerada, Lotes, Canais e Taxa Disk por evento
    const now = Date.now();
    const salesStartAt = new Date(now - 2 * 3600_000).toISOString();
    const startsAt = new Date(now + 15 * 24 * 3600_000).toISOString();
    const endsAt = new Date(now + 15 * 24 * 3600_000 + 4 * 3600_000).toISOString();
    const lotEndsAt = new Date(now + 10 * 24 * 3600_000).toISOString();

    const evRes = await fetch(`${baseUrl}/v1/eventos`, {
      method: 'POST',
      headers: {
        Cookie: operacoesSession.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoesSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        primaryProducerId: producer.id,
        name: 'Festival Sinfônico BRAVO_II Pacote 08',
        description: 'Evento de homologação para reservas atômicas e ingressos de 8 dígitos no Pacote 08.',
        venueName: 'Ópera de Arame',
        venueCity: 'Curitiba',
        venueState: 'PR',
        startAt: startsAt,
        endAt: endsAt,
        salesStartAt,
        ageRating: 'Livre',
        policyUrl: 'https://www.diskingressos.com.br/politica-p08',
      }),
    });
    assert.equal(evRes.status, 201);
    const event = (await evRes.json()) as { id: string };

    // Propõe e aprova Taxa Disk por evento (maker-checker)
    const feeRes = await fetch(`${baseUrl}/v1/comercial/eventos/${event.id}/taxas`, {
      method: 'POST',
      headers: {
        Cookie: comercialSession.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': comercialSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'PERCENTUAL',
        percentBasisPoints: 850,
        effectiveFrom: new Date(now - 24 * 3600_000).toISOString(),
        negotiationReference: 'PROPOSTA-COMERCIAL-P08-850BPS',
      }),
    });
    assert.equal(feeRes.status, 201);
    const fee = (await feeRes.json()) as { id: string };

    const appFeeRes = await fetch(`${baseUrl}/v1/comercial/eventos/${event.id}/taxas/${fee.id}/aprovar`, {
      method: 'POST',
      headers: {
        Cookie: financeiroSession.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': financeiroSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    assert.equal(appFeeRes.status, 201);

    // Sessão
    const sessRes = await fetch(`${baseUrl}/v1/eventos/${event.id}/sessoes`, {
      method: 'POST',
      headers: {
        Cookie: operacoesSession.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoesSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Sessão Única Noite',
        startsAt,
        endsAt,
        capacity: 100,
      }),
    });
    assert.equal(sessRes.status, 201);
    const sessionId = ((await sessRes.json()) as { id: string }).id;

    // Área 1: Pista (isNumbered: false)
    const areaPistaRes = await fetch(`${baseUrl}/v1/eventos/${event.id}/areas`, {
      method: 'POST',
      headers: {
        Cookie: operacoesSession.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoesSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        label: 'Pista Premium',
        capacity: 50,
        isNumbered: false,
      }),
    });
    assert.equal(areaPistaRes.status, 201);
    const pistaAreaId = ((await areaPistaRes.json()) as { id: string }).id;

    // Área 2: Camarote Numerado (isNumbered: true)
    const areaNumRes = await fetch(`${baseUrl}/v1/eventos/${event.id}/areas`, {
      method: 'POST',
      headers: {
        Cookie: operacoesSession.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoesSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        label: 'Camarote Numerado',
        capacity: 20,
        isNumbered: true,
        seats: [{ rowLabel: 'A', seatNumber: '01' }],
      }),
    });
    assert.equal(areaNumRes.status, 201);
    const numberedAreaId = ((await areaNumRes.json()) as { id: string }).id;

    // Lote 1: Pista (capacidade 5 ingressos para testar concorrência no limite)
    const lotPistaRes = await fetch(`${baseUrl}/v1/eventos/${event.id}/lotes`, {
      method: 'POST',
      headers: {
        Cookie: operacoesSession.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoesSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        areaId: pistaAreaId,
        name: '1º Lote Pista Inteira',
        faceValueCents: 12000,
        capacity: 5,
        startsAt: salesStartAt,
        endsAt: lotEndsAt,
      }),
    });
    assert.equal(lotPistaRes.status, 201);
    const pistaLotId = ((await lotPistaRes.json()) as { id: string }).id;

    // Lote 2: Numerado (deve ser recusado na reserva do Pacote 08)
    const lotNumRes = await fetch(`${baseUrl}/v1/eventos/${event.id}/lotes`, {
      method: 'POST',
      headers: {
        Cookie: operacoesSession.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoesSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        areaId: numberedAreaId,
        name: 'Lote Camarote Numerado',
        faceValueCents: 25000,
        capacity: 5,
        startsAt: salesStartAt,
        endsAt: lotEndsAt,
      }),
    });
    assert.equal(lotNumRes.status, 201);
    const numberedLotId = ((await lotNumRes.json()) as { id: string }).id;

    // Habilita canal ONLINE
    const chanRes = await fetch(`${baseUrl}/v1/eventos/${event.id}/canais`, {
      method: 'POST',
      headers: {
        Cookie: operacoesSession.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoesSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channels: ['ONLINE'] }),
    });
    assert.equal(chanRes.status, 201);

    // Submete com comercial1 e aprova nas 4 etapas (comercial2 para CADASTRAL/COMERCIAL e operacoes para OPERACIONAL/PUBLICACAO)
    const subRes = await fetch(`${baseUrl}/v1/eventos/${event.id}/submeter`, {
      method: 'POST',
      headers: {
        Cookie: comercialSession.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': comercialSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    assert.equal(subRes.status, 201);

    for (const [step, reviewer] of [
      ['CADASTRAL', comercial2Session],
      ['COMERCIAL', comercial2Session],
      ['OPERACIONAL', operacoesSession],
      ['PUBLICACAO', operacoesSession],
    ] as const) {
      const decRes = await fetch(`${baseUrl}/v1/eventos/${event.id}/aprovacoes`, {
        method: 'POST',
        headers: {
          Cookie: reviewer.cookie,
          Origin: appOrigin,
          'X-CSRF-Token': reviewer.csrfToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ step, decision: 'APROVADO' }),
      });
      assert.equal(decRes.status, 201);
    }

    // Solicita publicação -> Evento fica em PUBLICACAO_SOLICITADA
    const reqPubRes = await fetch(`${baseUrl}/v1/eventos/${event.id}/solicitar-publicacao`, {
      method: 'POST',
      headers: {
        Cookie: operacoesSession.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoesSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    assert.equal(reqPubRes.status, 201);
    const pubData = (await reqPubRes.json()) as { idempotencyKey: string };

    // 3.3 Tentativa de reserva ANTES da confirmação externa de publicação deve falhar com 400
    const reserveBeforePub = await fetch(`${baseUrl}/v1/pedidos/reservas`, {
      method: 'POST',
      headers: {
        Cookie: operacoesSession.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoesSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId: event.id,
        sessionId,
        lotId: pistaLotId,
        customerId,
        quantity: 1,
        channel: 'ONLINE',
        idempotencyKey: randomUUID(),
      }),
    });
    assert.equal(reserveBeforePub.status, 400);

    // 3.4 Confirma publicação pelo worker confiável na fixture de teste isolada
    await p06Service.confirmFromTrustedWorker({
      eventId: event.id,
      idempotencyKey: pubData.idempotencyKey,
      externalPublicationId: 'EXT-PUB-P08-TEST-001',
      workerActorId: adminSession.user.id,
      correlationId: 'corr-p08-pub-confirm',
    });

    // 3.5 Bloqueio do canal PDV (503 ServiceUnavailable)
    const pdvAttempt = await fetch(`${baseUrl}/v1/pedidos/reservas`, {
      method: 'POST',
      headers: {
        Cookie: operacoesSession.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoesSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId: event.id,
        sessionId,
        lotId: pistaLotId,
        customerId,
        quantity: 1,
        channel: 'PDV',
        idempotencyKey: randomUUID(),
      }),
    });
    assert.equal(pdvAttempt.status, 503);

    // 3.6 Bloqueio de lote em área numerada (400 BadRequest)
    const numberedAttempt = await fetch(`${baseUrl}/v1/pedidos/reservas`, {
      method: 'POST',
      headers: {
        Cookie: operacoesSession.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoesSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId: event.id,
        sessionId,
        lotId: numberedLotId,
        customerId,
        quantity: 1,
        channel: 'ONLINE',
        idempotencyKey: randomUUID(),
      }),
    });
    assert.equal(numberedAttempt.status, 400);

    // 3.7 Reserva válida de 3 ingressos (em lote de capacidade 5) + Idempotência
    const idemKey1 = randomUUID();
    const res1 = await fetch(`${baseUrl}/v1/pedidos/reservas`, {
      method: 'POST',
      headers: {
        Cookie: operacoesSession.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoesSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId: event.id,
        sessionId,
        lotId: pistaLotId,
        customerId,
        quantity: 3,
        channel: 'ONLINE',
        idempotencyKey: idemKey1,
      }),
    });
    assert.equal(res1.status, 201);
    const order1 = (await res1.json()) as {
      id: string;
      status: string;
      totalCents: number;
      reused: boolean;
    };
    assert.equal(order1.status, 'RESERVADO');
    assert.equal(order1.totalCents, 36000);
    assert.equal(order1.reused, false);

    // Repetição idêntica da mesma chave retorna o mesmo pedido (reused: true) sem consumir mais estoque
    const res1Repeat = await fetch(`${baseUrl}/v1/pedidos/reservas`, {
      method: 'POST',
      headers: {
        Cookie: operacoesSession.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoesSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId: event.id,
        sessionId,
        lotId: pistaLotId,
        customerId,
        quantity: 3,
        channel: 'ONLINE',
        idempotencyKey: idemKey1,
      }),
    });
    assert.equal(res1Repeat.status, 201);
    const order1Repeat = (await res1Repeat.json()) as { id: string; reused: boolean };
    assert.equal(order1Repeat.id, order1.id);
    assert.equal(order1Repeat.reused, true);

    // Mesma chave com quantidade diferente -> 409 Conflict
    const res1Conflict = await fetch(`${baseUrl}/v1/pedidos/reservas`, {
      method: 'POST',
      headers: {
        Cookie: operacoesSession.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoesSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId: event.id,
        sessionId,
        lotId: pistaLotId,
        customerId,
        quantity: 1,
        channel: 'ONLINE',
        idempotencyKey: idemKey1,
      }),
    });
    assert.equal(res1Conflict.status, 409);

    // 3.8 Concorrência real pelos últimos 2 ingressos do lote (capacidade = 5, reservado = 3 -> restam 2)
    // Dois operadores tentam reservar 2 ingressos simultaneamente: apenas 1 vence (201), o outro recebe 409!
    const [concA, concB] = await Promise.all([
      fetch(`${baseUrl}/v1/pedidos/reservas`, {
        method: 'POST',
        headers: {
          Cookie: operacoesSession.cookie,
          Origin: appOrigin,
          'X-CSRF-Token': operacoesSession.csrfToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event.id,
          sessionId,
          lotId: pistaLotId,
          customerId,
          quantity: 2,
          channel: 'ONLINE',
          idempotencyKey: randomUUID(),
        }),
      }),
      fetch(`${baseUrl}/v1/pedidos/reservas`, {
        method: 'POST',
        headers: {
          Cookie: adminSession.cookie,
          Origin: appOrigin,
          'X-CSRF-Token': adminSession.csrfToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event.id,
          sessionId,
          lotId: pistaLotId,
          customerId,
          quantity: 2,
          channel: 'ONLINE',
          idempotencyKey: randomUUID(),
        }),
      }),
    ]);

    const statuses = [concA.status, concB.status].sort();
    assert.deepEqual(statuses, [201, 409], `Esperado um 201 e um 409, obteve ${statuses.join(', ')}`);

    const winningRes = concA.status === 201 ? concA : concB;
    const order2 = (await winningRes.json()) as { id: string; status: string; totalCents: number };
    assert.equal(order2.status, 'RESERVADO');
    assert.equal(order2.totalCents, 24000);

    // Confere no banco que reserved_count === 5 (nunca ultrapassa a capacidade 5)
    const lotCheck1 = await db.query<{ reserved_count: number; issued_count: number }>(
      `SELECT reserved_count, issued_count FROM event_price_lots WHERE id = $1`,
      [pistaLotId]
    );
    assert.equal(Number(lotCheck1.rows[0].reserved_count), 5);
    assert.equal(Number(lotCheck1.rows[0].issued_count), 0);

    // 3.9 Consulta detalhe do pedido: nunca diz PAGO após reservar, não gera ingresso antes de pagar e não expõe Taxa Disk
    const getOrderRes = await fetch(`${baseUrl}/v1/pedidos/${order1.id}`, {
      headers: { Cookie: sacSession.cookie },
    });
    assert.equal(getOrderRes.status, 200);
    const order1Detail = (await getOrderRes.json()) as {
      id: string;
      status: string;
      tickets: unknown[];
      fees?: unknown;
      percentBasisPoints?: unknown;
    };
    assert.equal(order1Detail.status, 'RESERVADO');
    assert.equal(order1Detail.tickets.length, 0);
    assert.equal(order1Detail.fees, undefined);
    assert.equal(order1Detail.percentBasisPoints, undefined);

    // 3.10 Cancelamento de reserva não paga (order1 de 3 ingressos) devolve 3 ao estoque (reserved_count: 5 -> 2)
    const cancelRes = await fetch(`${baseUrl}/v1/pedidos/${order1.id}/cancelar-reserva`, {
      method: 'POST',
      headers: {
        Cookie: operacoesSession.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoesSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    assert.equal(cancelRes.status, 201);
    const cancelBody = (await cancelRes.json()) as { status: string; alreadyCancelled: boolean };
    assert.equal(cancelBody.status, 'CANCELADO');
    assert.equal(cancelBody.alreadyCancelled, false);

    const lotCheckAfterCancel = await db.query<{ reserved_count: number }>(
      `SELECT reserved_count FROM event_price_lots WHERE id = $1`,
      [pistaLotId]
    );
    assert.equal(Number(lotCheckAfterCancel.rows[0].reserved_count), 2);

    // 3.11 Cria nova reserva de 1 ingresso e simula vencimento de 15 min -> libera via /v1/pedidos/reservas/expiradas/processar
    const expOrderRes = await fetch(`${baseUrl}/v1/pedidos/reservas`, {
      method: 'POST',
      headers: {
        Cookie: operacoesSession.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoesSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId: event.id,
        sessionId,
        lotId: pistaLotId,
        customerId,
        quantity: 1,
        channel: 'ONLINE',
        idempotencyKey: randomUUID(),
      }),
    });
    assert.equal(expOrderRes.status, 201);
    const expOrder = (await expOrderRes.json()) as { id: string };

    await db.query(
      `UPDATE p08_sale_orders SET expires_at = NOW() - INTERVAL '16 minutes' WHERE id = $1`,
      [expOrder.id]
    );

    const processExpRes = await fetch(`${baseUrl}/v1/pedidos/reservas/expiradas/processar`, {
      method: 'POST',
      headers: {
        Cookie: operacoesSession.cookie,
        Origin: appOrigin,
        'X-CSRF-Token': operacoesSession.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    assert.equal(processExpRes.status, 201);
    const processExpBody = (await processExpRes.json()) as { expired: number };
    assert.equal(processExpBody.expired, 1);

    const lotCheckAfterExpire = await db.query<{ reserved_count: number }>(
      `SELECT reserved_count FROM event_price_lots WHERE id = $1`,
      [pistaLotId]
    );
    assert.equal(Number(lotCheckAfterExpire.rows[0].reserved_count), 2);

    // 3.12 Verifica que confirmVerifiedSettlement é bloqueado quando ENABLE_REAL_PAYMENTS=false
    await assert.rejects(
      () =>
        p08Orders.confirmVerifiedSettlement({
          orderId: order2.id,
          provider: 'ADQUIRENTE_TESTE',
          providerRef: 'REF-001',
          amountCents: 24000,
          verifiedAt: new Date().toISOString(),
          signature: 'a'.repeat(64),
        }),
      /Liquidação real proibida neste ambiente/
    );

    // 3.13 Testa emissão interna de ingressos de 8 dígitos em harness controlado com recibo assinado HMAC-SHA256
    const signingSecret = 'adapter-test-signing-secret-32-chars-minimum-p08';
    process.env.ENABLE_REAL_PAYMENTS = 'true';
    process.env.PAYMENT_ADAPTER_SIGNING_SECRET = signingSecret;
    try {
      const verifiedAt = new Date().toISOString();
      const unsignedReceipt = {
        orderId: order2.id,
        provider: 'SANDBOX_ADAPTER_P08',
        providerRef: 'SETTLE-P08-0001',
        amountCents: 24000,
        verifiedAt,
      };
      const signature = createHmac('sha256', signingSecret)
        .update(settlementCanonical(unsignedReceipt))
        .digest('hex');

      const settled = await p08Orders.confirmVerifiedSettlement({
        ...unsignedReceipt,
        signature,
      });
      assert.equal(settled.status, 'PAGO');
      assert.equal(settled.tickets, 2);
      assert.equal(settled.alreadyProcessed, false);

      // Idempotência de webhook/recibo repetido do adaptador
      const settledRepeat = await p08Orders.confirmVerifiedSettlement({
        ...unsignedReceipt,
        signature,
      });
      assert.equal(settledRepeat.status, 'PAGO');
      assert.equal(settledRepeat.alreadyProcessed, true);
    } finally {
      process.env.ENABLE_REAL_PAYMENTS = 'false';
      delete process.env.PAYMENT_ADAPTER_SIGNING_SECRET;
    }

    // Confere estoque após liquidação: reserved_count = 0, issued_count = 2
    const lotCheckAfterSettle = await db.query<{ reserved_count: number; issued_count: number }>(
      `SELECT reserved_count, issued_count FROM event_price_lots WHERE id = $1`,
      [pistaLotId]
    );
    assert.equal(Number(lotCheckAfterSettle.rows[0].reserved_count), 0);
    assert.equal(Number(lotCheckAfterSettle.rows[0].issued_count), 2);

    // 3.14 Consulta SAC por número de 8 dígitos (/v1/ingressos?numero=00000001 e 00000002)
    const ticket1Res = await fetch(`${baseUrl}/v1/ingressos?numero=00000001`, {
      headers: { Cookie: sacSession.cookie },
    });
    assert.equal(ticket1Res.status, 200);
    const ticket1 = (await ticket1Res.json()) as {
      number: string;
      status: string;
      orderId: string;
      customerName: string;
      event: { name: string };
    };
    assert.equal(ticket1.number, '00000001');
    assert.equal(ticket1.status, 'EMITIDO');
    assert.equal(ticket1.orderId, order2.id);
    assert.equal(ticket1.customerName, 'Maria de Souza Teste P08');
    assert.equal(ticket1.event.name, 'Festival Sinfônico BRAVO_II Pacote 08');

    const ticket2Res = await fetch(`${baseUrl}/v1/ingressos?numero=00000002`, {
      headers: { Cookie: sacSession.cookie },
    });
    assert.equal(ticket2Res.status, 200);

    // Formato fora de 8 dígitos -> 400
    const badTicketNum = await fetch(`${baseUrl}/v1/ingressos?numero=123`, {
      headers: { Cookie: sacSession.cookie },
    });
    assert.equal(badTicketNum.status, 400);
  });
});
