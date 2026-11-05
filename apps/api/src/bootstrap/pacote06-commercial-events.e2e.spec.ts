import 'reflect-metadata';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from '../common/errors/api-exception.filter';
import { DatabaseService } from '../common/database/database.service';
import { IdentityService } from '../modules/identity/identity.service';
import { Pacote06Service } from '../modules/pacote06/pacote06.service';

describe('BRAVO_II — Pacote 06 E2E: Produtores PJ (CNPJ Alfanumérico 2026), Taxa Disk por Evento (Basis Points/Centavos), Event Builder 10 Etapas, 4 Aprovações e Publicação Idempotente', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let p06Service: Pacote06Service;
  let baseUrl: string;

  let tokenComercialA: string;
  let tokenComercialB: string;
  let tokenOperacao: string;
  let tokenFinanceiro: string;
  let tokenProdutor: string;

  let producerId: string;
  let eventPercentId: string;
  let eventFixedId: string;

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
    p06Service = app.get(Pacote06Service);
    const identity = app.get(IdentityService);
    await identity.syncCanonicalRolesAndPermissions();

    await identity.ensureOperatorAccount({
      id: '66000000-0000-4000-8000-000000000001',
      email: 'comercial.a.p06@diskingressos.test',
      fullName: 'Analista Comercial A (Pacote 06)',
      plainPassword: 'BravoTest#ComercialA2026',
      role: 'COMERCIAL_DISK',
    });

    await identity.ensureOperatorAccount({
      id: '66000000-0000-4000-8000-000000000002',
      email: 'comercial.b.p06@diskingressos.test',
      fullName: 'Gerente Comercial B (Pacote 06)',
      plainPassword: 'BravoTest#ComercialB2026',
      role: 'COMERCIAL_DISK',
    });

    await identity.ensureOperatorAccount({
      id: '66000000-0000-4000-8000-000000000003',
      email: 'operacao.p06@diskingressos.test',
      fullName: 'Coordenador de Operações e Publicação (Pacote 06)',
      plainPassword: 'BravoTest#Operacao2026',
      role: 'OPERACAO_EVENTOS',
    });

    await identity.ensureOperatorAccount({
      id: '66000000-0000-4000-8000-000000000004',
      email: 'financeiro.p06@diskingressos.test',
      fullName: 'Gestor Financeiro Disk (Pacote 06)',
      plainPassword: 'BravoTest#Financeiro2026',
      role: 'FINANCEIRO_DISK',
    });

    await identity.ensureOperatorAccount({
      id: '66000000-0000-4000-8000-000000000005',
      email: 'produtor.p06@pdt.diskingressos.test',
      fullName: 'Produtor Externo PDT (Pacote 06)',
      plainPassword: 'BravoTest#Produtor2026',
      role: 'PRODUTOR_PDT',
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

    tokenComercialA = await login('comercial.a.p06@diskingressos.test', 'BravoTest#ComercialA2026');
    tokenComercialB = await login('comercial.b.p06@diskingressos.test', 'BravoTest#ComercialB2026');
    tokenOperacao = await login('operacao.p06@diskingressos.test', 'BravoTest#Operacao2026');
    tokenFinanceiro = await login('financeiro.p06@diskingressos.test', 'BravoTest#Financeiro2026');
    tokenProdutor = await login('produtor.p06@pdt.diskingressos.test', 'BravoTest#Produtor2026');
  });

  after(async () => {
    if (app) {
      await app.close();
    }
  });

  it('1. Cadastra Produtor PJ com CNPJ alfanumérico oficial 2026, valida documentos seguros e aplica maker-checker na aprovação cadastral', async () => {
    // 1.1 Rejeita CNPJ inválido
    const invalidRes = await fetch(`${baseUrl}/api/v1/p06/produtores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenComercialA}`,
      },
      body: JSON.stringify({
        legalName: 'Produtora Inválida Ltda',
        cnpj: '12.ABC.345/01DE-99',
        email: 'contato@invalida.com.br',
        phone: '41999998888',
        address: {
          street: 'Rua XV de Novembro',
          number: '100',
          district: 'Centro',
          city: 'Curitiba',
          state: 'PR',
          postalCode: '80020310',
        },
        legalRepresentative: {
          name: 'Carlos Mendes',
          email: 'carlos@invalida.com.br',
          role: 'Sócio-Administrador',
        },
      }),
    });
    assert.equal(invalidRes.status, 400);

    // 1.2 Cadastra Produtor PJ válido com CNPJ alfanumérico 2026 (12.ABC.345/01DE-35)
    const createRes = await fetch(`${baseUrl}/api/v1/p06/produtores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenComercialA}`,
      },
      body: JSON.stringify({
        legalName: 'Bravo Cultural Produções S.A.',
        tradeName: 'Bravo Cultural',
        cnpj: '12.abc.345/01de-35',
        email: 'juridico@bravocultural.com.br',
        phone: '41988887777',
        address: {
          street: 'Av. Batel',
          number: '1500',
          district: 'Batel',
          city: 'Curitiba',
          state: 'PR',
          postalCode: '80420090',
        },
        legalRepresentative: {
          name: 'Helena Rocha',
          email: 'helena@bravocultural.com.br',
          role: 'Diretora Executiva',
        },
      }),
    });
    assert.equal(createRes.status, 201);
    const created = (await createRes.json()) as { id: string; cnpj: string; status: string };
    assert.equal(created.cnpj, '12ABC34501DE35');
    assert.equal(created.status, 'EM_VALIDACAO');
    producerId = created.id;

    // 1.3 Bloqueia aprovação do produtor antes de ter documento validado
    const prematureApprove = await fetch(`${baseUrl}/api/v1/p06/produtores/${producerId}/aprovar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenComercialB}`,
      },
      body: JSON.stringify({ decision: 'APROVADO' }),
    });
    assert.equal(prematureApprove.status, 400);

    // 1.4 Anexa e valida documento privado (secure:// + checksum SHA-256)
    const docRes = await fetch(`${baseUrl}/api/v1/p06/produtores/${producerId}/documentos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenComercialA}`,
      },
      body: JSON.stringify({
        kind: 'CONTRATO_SOCIAL',
        storageKey: 'secure://producers/12ABC34501DE35/contrato-social-v1.pdf',
        checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      }),
    });
    assert.equal(docRes.status, 201);
    const doc = (await docRes.json()) as { id: string };

    const valDocRes = await fetch(
      `${baseUrl}/api/v1/p06/produtores/${producerId}/documentos/${doc.id}/validar`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenComercialB}`,
        },
        body: JSON.stringify({ status: 'VALIDADO' }),
      }
    );
    assert.equal(valDocRes.status, 201);

    // 1.5 Bloqueia autoaprovação pelo mesmo usuário que criou o produtor (Comercial A)
    const selfApprove = await fetch(`${baseUrl}/api/v1/p06/produtores/${producerId}/aprovar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenComercialA}`,
      },
      body: JSON.stringify({ decision: 'APROVADO' }),
    });
    assert.equal(selfApprove.status, 403);

    // 1.6 Aprova com segundo usuário (Comercial B - maker-checker)
    const approveRes = await fetch(`${baseUrl}/api/v1/p06/produtores/${producerId}/aprovar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenComercialB}`,
      },
      body: JSON.stringify({ decision: 'APROVADO', reason: 'Contrato social e CNPJ 2026 conferidos.' }),
    });
    assert.equal(approveRes.status, 201);
    const approvedProducer = (await approveRes.json()) as { status: string; verificationStatus: string };
    assert.equal(approvedProducer.status, 'APROVADO');
    assert.equal(approvedProducer.verificationStatus, 'VERIFIED');
  });

  it('2. Cria dois eventos para o mesmo produtor e negocia Taxas Disk distintas (625 bps = 6,25% vs R$ 4,50 fixa) com maker-checker e ocultação total no PDT', async () => {
    const createEvent = async (name: string) => {
      const res = await fetch(`${baseUrl}/api/v1/p06/eventos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenComercialA}`,
        },
        body: JSON.stringify({
          name,
          description: 'Descrição oficial completa com mais de vinte caracteres para o anúncio público.',
          venueName: 'Teatro Guaíra',
          venueCity: 'Curitiba',
          venueState: 'PR',
          startAt: '2027-08-15T18:00:00.000Z',
          endAt: '2027-08-15T23:30:00.000Z',
          salesStartAt: '2027-02-01T10:00:00.000Z',
          ageRating: '16 anos',
          policyUrl: 'https://www.diskingressos.com.br/politica-meia-entrada',
          primaryProducerId: producerId,
        }),
      });
      assert.equal(res.status, 201);
      return (await res.json()) as { id: string };
    };

    eventPercentId = (await createEvent('Festival Sinfônico Bravo 2027')).id;
    eventFixedId = (await createEvent('Mostra Acústica Curitiba 2027')).id;

    // 2.1 Propõe Taxa Percentual (625 basis points = 6,25%) no Evento 1
    const prop1 = await fetch(`${baseUrl}/api/v1/p06/comercial/eventos/${eventPercentId}/taxas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenComercialA}`,
      },
      body: JSON.stringify({
        type: 'PERCENTUAL',
        percentBasisPoints: 625,
        effectiveFrom: '2027-02-01T00:00:00.000Z',
        negotiationReference: 'PROPOSTA-COM-2027-001',
      }),
    });
    assert.equal(prop1.status, 201);
    const fee1 = (await prop1.json()) as { id: string; version: number; percentBasisPoints: number };
    assert.equal(fee1.version, 1);
    assert.equal(fee1.percentBasisPoints, 625);

    // 2.2 Propõe Taxa Fixa (450 centavos = R$ 4,50) no Evento 2 do MESMO produtor
    const prop2 = await fetch(`${baseUrl}/api/v1/p06/comercial/eventos/${eventFixedId}/taxas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenComercialA}`,
      },
      body: JSON.stringify({
        type: 'FIXA',
        fixedCents: 450,
        effectiveFrom: '2027-02-01T00:00:00.000Z',
        negotiationReference: 'PROPOSTA-COM-2027-002',
      }),
    });
    assert.equal(prop2.status, 201);
    const fee2 = (await prop2.json()) as { id: string; version: number; fixedCents: number };
    assert.equal(fee2.version, 1);
    assert.equal(fee2.fixedCents, 450);

    // 2.3 Bloqueia autoaprovação da Taxa Disk pelo proponente (Comercial A)
    const selfApproveFee = await fetch(
      `${baseUrl}/api/v1/p06/comercial/eventos/${eventPercentId}/taxas/${fee1.id}/aprovar`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenComercialA}` },
      }
    );
    assert.equal(selfApproveFee.status, 403);

    // 2.4 Bloqueia acesso do Produtor PDT às rotas de Taxa Disk interna
    const pdtFeeRes = await fetch(`${baseUrl}/api/v1/p06/comercial/eventos/${eventPercentId}/taxas`, {
      headers: { Authorization: `Bearer ${tokenProdutor}` },
    });
    assert.equal(pdtFeeRes.status, 403);

    // 2.5 Aprova ambas as taxas com segundo usuário (Financeiro Disk)
    const app1 = await fetch(
      `${baseUrl}/api/v1/p06/comercial/eventos/${eventPercentId}/taxas/${fee1.id}/aprovar`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenFinanceiro}` },
      }
    );
    assert.equal(app1.status, 201);

    const app2 = await fetch(
      `${baseUrl}/api/v1/p06/comercial/eventos/${eventFixedId}/taxas/${fee2.id}/aprovar`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenFinanceiro}` },
      }
    );
    assert.equal(app2.status, 201);

    // Confere independência entre os dois eventos do mesmo produtor
    const list1 = await fetch(`${baseUrl}/api/v1/p06/comercial/eventos/${eventPercentId}/taxas`, {
      headers: { Authorization: `Bearer ${tokenComercialB}` },
    });
    const fees1 = (await list1.json()) as Array<{ type: string; percentBasisPoints: number; status: string }>;
    assert.equal(fees1[0].type, 'PERCENTUAL');
    assert.equal(fees1[0].percentBasisPoints, 625);
    assert.equal(fees1[0].status, 'APROVADA');

    const list2 = await fetch(`${baseUrl}/api/v1/p06/comercial/eventos/${eventFixedId}/taxas`, {
      headers: { Authorization: `Bearer ${tokenComercialB}` },
    });
    const fees2 = (await list2.json()) as Array<{ type: string; fixedCents: number; status: string }>;
    assert.equal(fees2[0].type, 'FIXA');
    assert.equal(fees2[0].fixedCents, 450);
    assert.equal(fees2[0].status, 'APROVADA');
  });

  it('3. Monta o Event Builder completo, valida capacidade lote <= sessão, bloqueia edição após submissão e executa as 4 aprovações sequenciais sem autoaprovação', async () => {
    // 3.1 Adiciona sessão dentro da janela do evento
    const sesRes = await fetch(`${baseUrl}/api/v1/p06/eventos/${eventPercentId}/sessoes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenOperacao}`,
      },
      body: JSON.stringify({
        startsAt: '2027-08-15T19:00:00.000Z',
        endsAt: '2027-08-15T22:00:00.000Z',
        capacity: 500,
      }),
    });
    assert.equal(sesRes.status, 201);
    const session = (await sesRes.json()) as { id: string };

    // 3.2 Rejeita setor numerado com assento duplicado
    const dupSeatRes = await fetch(`${baseUrl}/api/v1/p06/eventos/${eventPercentId}/setores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenOperacao}`,
      },
      body: JSON.stringify({
        sessionId: session.id,
        name: 'Plateia A',
        capacity: 200,
        isNumbered: true,
        seats: [
          { rowLabel: 'A', seatNumber: '01' },
          { rowLabel: 'A', seatNumber: '01' },
        ],
      }),
    });
    assert.equal(dupSeatRes.status, 400);

    // 3.3 Cria setor numerado válido
    const areaRes = await fetch(`${baseUrl}/api/v1/p06/eventos/${eventPercentId}/setores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenOperacao}`,
      },
      body: JSON.stringify({
        sessionId: session.id,
        name: 'Plateia Ouro',
        capacity: 500,
        isNumbered: true,
        seats: [
          { rowLabel: 'A', seatNumber: '01' },
          { rowLabel: 'A', seatNumber: '02' },
        ],
      }),
    });
    assert.equal(areaRes.status, 201);
    const area = (await areaRes.json()) as { id: string };

    // 3.4 Cadastra modalidade de ingresso
    const catRes = await fetch(`${baseUrl}/api/v1/p06/eventos/${eventPercentId}/modalidades`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenOperacao}`,
      },
      body: JSON.stringify({ name: 'Inteira', requiresProof: false }),
    });
    assert.equal(catRes.status, 201);

    // 3.5 Rejeita lote cuja capacidade excede a capacidade da sessão (600 > 500)
    const overLotRes = await fetch(`${baseUrl}/api/v1/p06/eventos/${eventPercentId}/lotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenOperacao}`,
      },
      body: JSON.stringify({
        sessionId: session.id,
        areaId: area.id,
        name: '1º Lote Excedente',
        faceValueCents: 15000,
        capacity: 600,
        startsAt: '2027-02-01T10:00:00.000Z',
        endsAt: '2027-08-15T18:00:00.000Z',
      }),
    });
    assert.equal(overLotRes.status, 400);

    // 3.6 Cria lote válido (300 <= 500)
    const lotRes = await fetch(`${baseUrl}/api/v1/p06/eventos/${eventPercentId}/lotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenOperacao}`,
      },
      body: JSON.stringify({
        sessionId: session.id,
        areaId: area.id,
        name: '1º Lote Plateia Ouro',
        faceValueCents: 18000,
        capacity: 300,
        startsAt: '2027-02-01T10:00:00.000Z',
        endsAt: '2027-08-15T18:00:00.000Z',
      }),
    });
    assert.equal(lotRes.status, 201);

    // 3.7 Habilita canais de venda (ONLINE e PDV) e anexa mídia segura
    const chRes = await fetch(`${baseUrl}/api/v1/p06/eventos/${eventPercentId}/canais`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenOperacao}`,
      },
      body: JSON.stringify({ channels: ['ONLINE', 'PDV'] }),
    });
    assert.equal(chRes.status, 201);

    const mediaRes = await fetch(`${baseUrl}/api/v1/p06/eventos/${eventPercentId}/midias`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenOperacao}`,
      },
      body: JSON.stringify({
        kind: 'BANNER_PRINCIPAL',
        storageKey: 'secure://events/festival-sinfonico-2027/banner.webp',
        altText: 'Banner Oficial Festival Sinfônico Bravo 2027',
      }),
    });
    assert.equal(mediaRes.status, 201);

    // 3.8 Submete para revisão com Comercial A
    const subRes = await fetch(`${baseUrl}/api/v1/p06/eventos/${eventPercentId}/submeter`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenComercialA}` },
    });
    assert.equal(subRes.status, 201);

    // 3.9 Confirma bloqueio de edição direta após submissão (409 EDICAO_BLOQUEADA)
    const editBlockedRes = await fetch(`${baseUrl}/api/v1/p06/eventos/${eventPercentId}/sessoes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenOperacao}`,
      },
      body: JSON.stringify({
        startsAt: '2027-08-15T20:00:00.000Z',
        endsAt: '2027-08-15T22:00:00.000Z',
        capacity: 100,
      }),
    });
    assert.equal(editBlockedRes.status, 409);

    // 3.10 Bloqueia aprovação fora de ordem (COMERCIAL antes de CADASTRAL -> 409 ETAPA_FORA_ORDEM)
    const outOfOrderRes = await fetch(`${baseUrl}/api/v1/p06/eventos/${eventPercentId}/aprovacoes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenComercialB}`,
      },
      body: JSON.stringify({ step: 'COMERCIAL', decision: 'APROVADO' }),
    });
    assert.equal(outOfOrderRes.status, 409);

    // 3.11 Bloqueia autoaprovação pelo solicitante (Comercial A -> 403 AUTOAPROVACAO)
    const selfAppEventRes = await fetch(`${baseUrl}/api/v1/p06/eventos/${eventPercentId}/aprovacoes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenComercialA}`,
      },
      body: JSON.stringify({ step: 'CADASTRAL', decision: 'APROVADO' }),
    });
    assert.equal(selfAppEventRes.status, 403);

    // 3.12 Aprova as 4 etapas em ordem: CADASTRAL -> COMERCIAL -> OPERACIONAL -> PUBLICACAO
    for (const [step, token] of [
      ['CADASTRAL', tokenComercialB],
      ['COMERCIAL', tokenComercialB],
      ['OPERACIONAL', tokenOperacao],
      ['PUBLICACAO', tokenOperacao],
    ] as const) {
      const stepRes = await fetch(`${baseUrl}/api/v1/p06/eventos/${eventPercentId}/aprovacoes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ step, decision: 'APROVADO', reason: `Etapa ${step} conferida.` }),
      });
      assert.equal(stepRes.status, 201);
    }

    const evAfterApprovals = await fetch(`${baseUrl}/api/v1/p06/eventos/${eventPercentId}`, {
      headers: { Authorization: `Bearer ${tokenOperacao}` },
    });
    const evData = (await evAfterApprovals.json()) as { status: string };
    assert.equal(evData.status, 'APROVADO');
  });

  it('4. Solicita publicação de forma idempotente (PUBLICACAO_SOLICITADA / PENDENTE_INTEGRACAO), confirma apenas via worker confiável, protege projeção pública e abre caso de ocorrência sem estorno automático', async () => {
    // 4.1 Verifica prontidão de publicação
    const readyRes = await fetch(`${baseUrl}/api/v1/p06/eventos/${eventPercentId}/prontidao-publicacao`, {
      headers: { Authorization: `Bearer ${tokenOperacao}` },
    });
    assert.equal(readyRes.status, 200);
    const readiness = (await readyRes.json()) as { ready: boolean; issues: string[] };
    assert.equal(readiness.ready, true);
    assert.deepEqual(readiness.issues, []);

    // 4.2 Solicita publicação (gera comando idempotente no outbox e status PUBLICACAO_SOLICITADA)
    const pubReq1 = await fetch(`${baseUrl}/api/v1/p06/eventos/${eventPercentId}/solicitar-publicacao`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenOperacao}` },
    });
    assert.equal(pubReq1.status, 201);
    const pub1 = (await pubReq1.json()) as {
      id: string;
      status: string;
      idempotencyKey: string;
    };
    assert.equal(pub1.status, 'PENDENTE_INTEGRACAO');
    assert.equal(pub1.idempotencyKey, `publication:${eventPercentId}:v1`);

    const evCheck = await fetch(`${baseUrl}/api/v1/p06/eventos/${eventPercentId}`, {
      headers: { Authorization: `Bearer ${tokenOperacao}` },
    });
    const evAfterPubReq = (await evCheck.json()) as { status: string };
    assert.equal(evAfterPubReq.status, 'PUBLICACAO_SOLICITADA');

    // 4.3 Confirma publicação via worker confiável com recibo externo verificado
    const confirmed = await p06Service.confirmFromTrustedWorker({
      eventId: eventPercentId,
      idempotencyKey: pub1.idempotencyKey,
      externalPublicationId: 'DISKINGRESSOS-SITE-2027-0001',
      workerActorId: '66000000-0000-4000-8000-000000000003',
      correlationId: 'corr-worker-pub-001',
    });
    assert.equal(confirmed.status, 'PUBLICADO');
    assert.equal(confirmed.externalPublicationId, 'DISKINGRESSOS-SITE-2027-0001');

    // 4.4 Confere que projeção pública para o site NUNCA expõe Taxa Disk nem CNPJ do produtor
    const projRes = await fetch(`${baseUrl}/api/v1/p06/eventos/${eventPercentId}/projecao-publica`, {
      headers: { Authorization: `Bearer ${tokenOperacao}` },
    });
    assert.equal(projRes.status, 200);
    const projText = JSON.stringify(await projRes.json());
    assert.equal(projText.includes('625'), false);
    assert.equal(projText.includes('12ABC34501DE35'), false);
    assert.equal(projText.includes('PROPOSTA-COM-2027-001'), false);

    // 4.5 Abre caso de ocorrência formal (ADIAMENTO) sem alterar diretamente o evento nem gerar estornos
    const caseRes = await fetch(`${baseUrl}/api/v1/p06/eventos/${eventPercentId}/ocorrencias`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenOperacao}`,
      },
      body: JSON.stringify({
        changeType: 'ADIAMENTO',
        reason: 'Solicitação de ajuste de calendário da orquestra para avaliação da diretoria.',
      }),
    });
    assert.equal(caseRes.status, 201);
    const changeCase = (await caseRes.json()) as { status: string; changeType: string };
    assert.equal(changeCase.status, 'ABERTO');
    assert.equal(changeCase.changeType, 'ADIAMENTO');

    const outboxCheck = await db.query<{ event_name: string }>(
      `SELECT event_name FROM outbox_events WHERE event_id = $1 ORDER BY created_at ASC`,
      [eventPercentId]
    );
    const names = outboxCheck.rows.map((r) => r.event_name);
    assert.equal(names.includes('commercial.event_fee_approved.v1'), true);
    assert.equal(names.includes('EVENT_PUBLICATION_REQUESTED'), true);
    assert.equal(names.includes('EVENT_CHANGE_CASE_OPENED'), true);
  });
});
