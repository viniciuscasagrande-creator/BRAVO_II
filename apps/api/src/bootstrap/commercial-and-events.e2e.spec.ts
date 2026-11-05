import 'reflect-metadata';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from '../common/errors/api-exception.filter';
import { DatabaseService } from '../common/database/database.service';
import { IdentityService } from '../modules/identity/identity.service';
import type {
  AuditRecordDto,
  EventBuilderFullViewDto,
  EventFeeSnapshotDto,
  ProducerDetailDto,
} from '@bravo-ii/contracts';

describe('BRAVO_II — Fases 02 e 03 E2E: Comercial, Produtores PJ, Taxa Disk Prospectiva e Event Builder', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let baseUrl: string;

  let tokenComercial: string;
  let tokenOperacao: string;
  let tokenFinanceiro: string;
  let tokenProdutor: string;

  let producerId: string;
  let event1Id: string;
  let event2Id: string;

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
      id: '11000000-0000-4000-8000-000000000001',
      email: 'comercial.e2e@diskingressos.test',
      fullName: 'Comercial Disk E2E',
      plainPassword: 'BravoTest#Comercial2026',
      role: 'COMERCIAL_DISK',
    });

    await identity.ensureOperatorAccount({
      id: '11000000-0000-4000-8000-000000000002',
      email: 'operacao.e2e@diskingressos.test',
      fullName: 'Operação de Eventos Disk E2E',
      plainPassword: 'BravoTest#Operacao2026',
      role: 'OPERACAO_EVENTOS',
    });

    await identity.ensureOperatorAccount({
      id: '11000000-0000-4000-8000-000000000003',
      email: 'financeiro.e2e@diskingressos.test',
      fullName: 'Financeiro Disk E2E',
      plainPassword: 'BravoTest#Financeiro2026',
      role: 'FINANCEIRO_DISK',
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

    tokenComercial = await login('comercial.e2e@diskingressos.test', 'BravoTest#Comercial2026');
    tokenOperacao = await login('operacao.e2e@diskingressos.test', 'BravoTest#Operacao2026');
    tokenFinanceiro = await login('financeiro.e2e@diskingressos.test', 'BravoTest#Financeiro2026');
  });

  after(async () => {
    if (app) {
      await app.close();
    }
  });

  it('1. Comercial cadastra Produtor PJ completo (responsável, documento societário, contrato) e homologa como VERIFIED', async () => {
    const createRes = await fetch(`${baseUrl}/api/v1/producers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenComercial}`,
      },
      body: JSON.stringify({
        cnpj: '33.444.555/0001-66',
        legalName: ' Horizonte Cultural Produções Artísticas S.A.',
        tradeName: 'Horizonte Cultural',
      }),
    });
    assert.equal(createRes.status, 201);
    const createdProducer = (await createRes.json()) as ProducerDetailDto;
    assert.equal(createdProducer.verificationStatus, 'PENDING');
    assert.equal(createdProducer.cnpj, '33.444.555/0001-66');
    producerId = createdProducer.id;

    // Adicionar responsável legal
    const contactRes = await fetch(`${baseUrl}/api/v1/producers/${producerId}/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenComercial}`,
      },
      body: JSON.stringify({
        fullName: 'Marina Soares',
        email: 'marina.soares@horizontecultural.test',
        phone: '+5541999990000',
        roleType: 'LEGAL_REPRESENTATIVE',
        isPrimary: true,
      }),
    });
    assert.equal(contactRes.status, 201);

    // Adicionar documento societário
    const docRes = await fetch(`${baseUrl}/api/v1/producers/${producerId}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenComercial}`,
      },
      body: JSON.stringify({
        documentType: 'CONTRATO_SOCIAL',
        documentReference: 'S3://bravo-docs/horizonte-contrato-social-v1.pdf',
      }),
    });
    assert.equal(docRes.status, 201);

    // Adicionar contrato comercial B2B
    const contractRes = await fetch(`${baseUrl}/api/v1/producers/${producerId}/contracts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenComercial}`,
      },
      body: JSON.stringify({
        contractNumber: 'CTR-DISK-2026-0001',
        title: 'Contrato Quadro de Prestação de Serviços de Bilheteria',
        status: 'ACTIVE',
      }),
    });
    assert.equal(contractRes.status, 201);

    // Verificar produtor
    const verifyRes = await fetch(`${baseUrl}/api/v1/producers/${producerId}/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenComercial}` },
    });
    assert.equal(verifyRes.status, 201);
    const verifiedProducer = (await verifyRes.json()) as ProducerDetailDto;
    assert.equal(verifiedProducer.verificationStatus, 'VERIFIED');
    assert.equal(verifiedProducer.contacts.length, 1);
    assert.equal(verifiedProducer.documents.length, 1);
    assert.equal(verifiedProducer.contracts.length, 1);

    // Criar operador PDT vinculado a este produtor
    const identity = app.get(IdentityService);
    await identity.ensureOperatorAccount({
      id: '11000000-0000-4000-8000-000000000004',
      email: 'produtor.horizonte@pdt.test',
      fullName: 'Produtor Horizonte (PDT)',
      plainPassword: 'BravoTest#Produtor2026',
      role: 'PRODUTOR_PDT',
      producerScopeIds: [producerId],
    });

    const pdtLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'produtor.horizonte@pdt.test',
        password: 'BravoTest#Produtor2026',
      }),
    });
    assert.equal(pdtLoginRes.status, 201);
    tokenProdutor = ((await pdtLoginRes.json()) as { token: string }).token;
  });

  it('2. Event Builder cria dois eventos do MESMO produtor com estrutura completa, mas rejeita aprovação/publicação antes da aprovação comercial da Taxa Disk', async () => {
    const buildCompleteEventStructure = async (code: string, title: string): Promise<string> => {
      const evtRes = await fetch(`${baseUrl}/api/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenOperacao}`,
        },
        body: JSON.stringify({
          code,
          title,
          venueName: 'Teatro Positivo',
          city: 'Curitiba',
          stateUf: 'PR',
          timezone: 'America/Sao_Paulo',
          startsAt: '2026-12-20T23:00:00.000Z',
          primaryProducerId: producerId,
        }),
      });
      assert.equal(evtRes.status, 201);
      const evt = (await evtRes.json()) as EventBuilderFullViewDto;

      const sesRes = await fetch(`${baseUrl}/api/v1/events/${evt.id}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenOperacao}`,
        },
        body: JSON.stringify({
          code: 'SES-NOITE',
          title: 'Sessão Noite 20h',
          startsAt: '2026-12-20T23:00:00.000Z',
          endsAt: '2026-12-21T02:00:00.000Z',
          totalCapacity: 2000,
        }),
      });
      assert.equal(sesRes.status, 201);
      const ses = (await sesRes.json()) as { id: string };

      const secRes = await fetch(`${baseUrl}/api/v1/events/${evt.id}/sectors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenOperacao}`,
        },
        body: JSON.stringify({
          sessionId: ses.id,
          code: 'PLATEIA-INFERIOR',
          name: 'Plateia Inferior Numerada',
          areaType: 'SEATED',
          capacity: 1000,
          blockedQuantity: 50,
        }),
      });
      assert.equal(secRes.status, 201);
      const sec = (await secRes.json()) as { id: string };

      const lotRes = await fetch(`${baseUrl}/api/v1/events/${evt.id}/price-lots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenOperacao}`,
        },
        body: JSON.stringify({
          sessionId: ses.id,
          sectorId: sec.id,
          modalityName: 'Inteira 1º Lote',
          categoryType: 'INTEIRA',
          lotNumber: 1,
          nominalPriceCents: 10000,
          maxQuantity: 500,
        }),
      });
      assert.equal(lotRes.status, 201);

      const chanRes = await fetch(`${baseUrl}/api/v1/events/${evt.id}/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenOperacao}`,
        },
        body: JSON.stringify({
          channelType: 'SITE',
          channelCode: 'SITE-DISKINGRESSOS',
          channelName: 'Site Oficial DiskIngressos',
          allowedPaymentMethods: ['PIX', 'CREDIT_CARD'],
          channelServiceFeeCents: 0,
          isEnabled: true,
        }),
      });
      assert.equal(chanRes.status, 201);

      const submitRes = await fetch(`${baseUrl}/api/v1/events/${evt.id}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenOperacao}` },
      });
      assert.equal(submitRes.status, 201);

      return evt.id;
    };

    event1Id = await buildCompleteEventStructure('EVT-HORIZONTE-01', 'Concerto de Verão Horizonte');
    event2Id = await buildCompleteEventStructure('EVT-HORIZONTE-02', 'Festival Acústico Horizonte');

    // Tentar aprovar ou publicar Evento 1 SEM aprovação comercial da Taxa Disk -> DEVE FALHAR com EVENT_FEE_APPROVAL_REQUIRED
    const prematureApproveRes = await fetch(`${baseUrl}/api/v1/events/${event1Id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenOperacao}`,
      },
      body: JSON.stringify({ notes: 'Tentativa sem taxa aprovada' }),
    });
    assert.equal(prematureApproveRes.status, 400);
    const prematureApproveErr = (await prematureApproveRes.json()) as { error: { code: string } };
    assert.equal(prematureApproveErr.error.code, 'EVENT_FEE_APPROVAL_REQUIRED');

    const prematurePublishRes = await fetch(`${baseUrl}/api/v1/events/${event1Id}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenOperacao}` },
    });
    assert.equal(prematurePublishRes.status, 400);
    const prematurePublishErr = (await prematurePublishRes.json()) as { error: { code: string } };
    assert.equal(prematurePublishErr.error.code, 'EVENT_FEE_APPROVAL_REQUIRED');
  });

  it('3. Dois eventos do mesmo produtor recebem Taxas Disk distintas (PERCENTAGE 10% vs FIXED R$ 15,00), aprovam e publicam sem interferência', async () => {
    // Propor e aprovar Taxa Disk de 10% (PERCENTAGE) no Evento 1
    const prop1Res = await fetch(`${baseUrl}/api/v1/events/${event1Id}/fee-agreements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenComercial}`,
      },
      body: JSON.stringify({
        calculationType: 'PERCENTAGE',
        percentageRate: 10,
        fixedAmountCents: null,
        payer: 'CUSTOMER',
      }),
    });
    assert.equal(prop1Res.status, 201);

    const app1Res = await fetch(`${baseUrl}/api/v1/events/${event1Id}/fee-agreements/1/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenComercial}`,
      },
      body: JSON.stringify({ approvalReference: 'COM-HORIZONTE-EVT1-V1' }),
    });
    assert.equal(app1Res.status, 201);

    // Propor e aprovar Taxa Disk de R$ 15,00 / 1500 centavos (FIXED) no Evento 2 do mesmo produtor
    const prop2Res = await fetch(`${baseUrl}/api/v1/events/${event2Id}/fee-agreements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenComercial}`,
      },
      body: JSON.stringify({
        calculationType: 'FIXED',
        percentageRate: null,
        fixedAmountCents: 1500,
        payer: 'CUSTOMER',
      }),
    });
    assert.equal(prop2Res.status, 201);

    const app2Res = await fetch(`${baseUrl}/api/v1/events/${event2Id}/fee-agreements/1/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenComercial}`,
      },
      body: JSON.stringify({ approvalReference: 'COM-HORIZONTE-EVT2-V1' }),
    });
    assert.equal(app2Res.status, 201);

    // Agora ambos os eventos têm todas as pré-condições atendidas -> aprovar operacionalmente e publicar!
    for (const evtId of [event1Id, event2Id]) {
      const opApproveRes = await fetch(`${baseUrl}/api/v1/events/${evtId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenOperacao}`,
        },
        body: JSON.stringify({ notes: 'Aprovado após validação comercial e estrutural.' }),
      });
      assert.equal(opApproveRes.status, 201);
      const approvedView = (await opApproveRes.json()) as EventBuilderFullViewDto;
      assert.equal(approvedView.status, 'APROVADO');

      const pubRes = await fetch(`${baseUrl}/api/v1/events/${evtId}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenOperacao}` },
      });
      assert.equal(pubRes.status, 201);
      const publishedView = (await pubRes.json()) as EventBuilderFullViewDto;
      assert.equal(publishedView.status, 'PUBLICADO');
    }

    // Conferir pelo Financeiro que Evento 1 manteve 10% (PERCENTAGE) e Evento 2 manteve 1500 centavos (FIXED)
    const finEvt1Res = await fetch(`${baseUrl}/api/v1/events/${event1Id}`, {
      headers: { Authorization: `Bearer ${tokenFinanceiro}` },
    });
    const finEvt1 = (await finEvt1Res.json()) as EventBuilderFullViewDto;
    assert.equal(finEvt1.internalDiskFeeAgreement?.calculationType, 'PERCENTAGE');
    assert.equal(finEvt1.internalDiskFeeAgreement?.percentageRate, 10);

    const finEvt2Res = await fetch(`${baseUrl}/api/v1/events/${event2Id}`, {
      headers: { Authorization: `Bearer ${tokenFinanceiro}` },
    });
    const finEvt2 = (await finEvt2Res.json()) as EventBuilderFullViewDto;
    assert.equal(finEvt2.internalDiskFeeAgreement?.calculationType, 'FIXED');
    assert.equal(finEvt2.internalDiskFeeAgreement?.fixedAmountCents, 1500);
  });

  it('4. Alteração prospectiva de Taxa Disk (v1 10% -> v2 15%) preserva intactos os snapshots contratuais emitidos na v1', async () => {
    // Emitir snapshot contratual na v1 (10% sobre R$ 100,00 = 1000 centavos)
    const snapV1Res = await fetch(`${baseUrl}/api/v1/events/${event1Id}/fee-snapshots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenFinanceiro}`,
      },
      body: JSON.stringify({
        referenceType: 'ORDER_ITEM',
        referenceId: 'ORD-ITEM-V1-0001',
        ticketNominalPriceCents: 10000,
      }),
    });
    assert.equal(snapV1Res.status, 201);
    const snapV1 = (await snapV1Res.json()) as EventFeeSnapshotDto;
    assert.equal(snapV1.agreementVersion, 1);
    assert.equal(snapV1.calculatedDiskFeeCents, 1000);

    // Comercial propõe e aprova nova versão v2 (15%) para o Evento 1
    const propV2Res = await fetch(`${baseUrl}/api/v1/events/${event1Id}/fee-agreements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenComercial}`,
      },
      body: JSON.stringify({
        calculationType: 'PERCENTAGE',
        percentageRate: 15,
        fixedAmountCents: null,
        payer: 'CUSTOMER',
      }),
    });
    assert.equal(propV2Res.status, 201);
    const propV2 = (await propV2Res.json()) as { agreementVersion: number };
    assert.equal(propV2.agreementVersion, 2);

    const appV2Res = await fetch(`${baseUrl}/api/v1/events/${event1Id}/fee-agreements/2/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenComercial}`,
      },
      body: JSON.stringify({ approvalReference: 'COM-HORIZONTE-EVT1-V2-PROSPECTIVA' }),
    });
    assert.equal(appV2Res.status, 201);

    // Emitir segundo snapshot já na vigência da v2 (15% sobre R$ 100,00 = 1500 centavos)
    const snapV2Res = await fetch(`${baseUrl}/api/v1/events/${event1Id}/fee-snapshots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenFinanceiro}`,
      },
      body: JSON.stringify({
        referenceType: 'ORDER_ITEM',
        referenceId: 'ORD-ITEM-V2-0002',
        ticketNominalPriceCents: 10000,
      }),
    });
    assert.equal(snapV2Res.status, 201);
    const snapV2 = (await snapV2Res.json()) as EventFeeSnapshotDto;
    assert.equal(snapV2.agreementVersion, 2);
    assert.equal(snapV2.calculatedDiskFeeCents, 1500);

    // Consultar detalhe do Evento 1 como Financeiro:
    // - Histórico mostra v2 (APPROVED) e v1 (SUPERSEDED)
    // - Snapshot antigo (ORD-ITEM-V1-0001) permanece em 1000 centavos (v1) sem recálculo retroativo!
    const detailFinRes = await fetch(`${baseUrl}/api/v1/events/${event1Id}`, {
      headers: { Authorization: `Bearer ${tokenFinanceiro}` },
    });
    assert.equal(detailFinRes.status, 200);
    const detailFin = (await detailFinRes.json()) as EventBuilderFullViewDto;

    const v1History = detailFin.internalFeeHistory?.find((h) => h.agreementVersion === 1);
    const v2History = detailFin.internalFeeHistory?.find((h) => h.agreementVersion === 2);
    assert.equal(v1History?.status, 'SUPERSEDED');
    assert.equal(v2History?.status, 'APPROVED');

    const storedSnapV1 = detailFin.internalFeeSnapshots?.find((s) => s.referenceId === 'ORD-ITEM-V1-0001');
    const storedSnapV2 = detailFin.internalFeeSnapshots?.find((s) => s.referenceId === 'ORD-ITEM-V2-0002');
    assert.equal(storedSnapV1?.agreementVersion, 1);
    assert.equal(storedSnapV1?.calculatedDiskFeeCents, 1000);
    assert.equal(storedSnapV2?.agreementVersion, 2);
    assert.equal(storedSnapV2?.calculatedDiskFeeCents, 1500);

    // Verificar imutabilidade da tabela event_fee_snapshots no banco
    await assert.rejects(
      async () => {
        await db.query(`UPDATE event_fee_snapshots SET calculated_disk_fee_cents = 9999`);
      },
      /imutáveis/i
    );
  });

  it('5. Produtor PDT consulta a estrutura do próprio evento, mas NUNCA recebe Taxa Disk, histórico de versões nem snapshots internos', async () => {
    const pdtDetailRes = await fetch(`${baseUrl}/api/v1/events/${event1Id}`, {
      headers: { Authorization: `Bearer ${tokenProdutor}` },
    });
    assert.equal(pdtDetailRes.status, 200);
    const pdtDetail = (await pdtDetailRes.json()) as EventBuilderFullViewDto;

    assert.equal(pdtDetail.sessions.length, 1);
    assert.equal(pdtDetail.sectors.length, 1);
    assert.equal(pdtDetail.priceLots.length, 1);
    assert.equal(pdtDetail.internalDiskFeeAgreement, undefined);
    assert.equal(pdtDetail.internalFeeHistory, undefined);
    assert.equal(pdtDetail.internalFeeSnapshots, undefined);

    const pdtForbiddenSnapshotsRes = await fetch(`${baseUrl}/api/v1/events/${event1Id}/fee-snapshots`, {
      headers: { Authorization: `Bearer ${tokenProdutor}` },
    });
    assert.equal(pdtForbiddenSnapshotsRes.status, 403);

    // Verificar registros de auditoria antes/depois gravados
    const auditRes = await fetch(`${baseUrl}/api/v1/audit-records`, {
      headers: { Authorization: `Bearer ${tokenFinanceiro}` },
    });
    assert.equal(auditRes.status, 200);
    const audits = ((await auditRes.json()) as { items: AuditRecordDto[] }).items;
    assert.equal(audits.some((a) => a.canonicalAction === 'producer.verified' && a.outcome === 'SUCCESS'), true);
    assert.equal(
      audits.some((a) => a.canonicalAction === 'event.approval.denied_missing_commercial_fee' && a.outcome === 'DENIED'),
      true
    );
    assert.equal(audits.some((a) => a.canonicalAction === 'event.published' && a.outcome === 'SUCCESS'), true);
  });
});
