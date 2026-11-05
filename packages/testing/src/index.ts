import type { RoleCode } from '@bravo-ii/contracts';

/**
 * Fixtures ESTRITAMENTE isoladas para suítes de testes automatizados (NODE_ENV === 'test').
 * Jamais utilizadas como seed de dados de negócio em ambientes de operação.
 */
export const ISOLATED_TEST_FIXTURES = {
  users: {
    financeiro: {
      id: '10000000-0000-4000-8000-000000000001',
      email: 'financeiro.teste@diskingressos.test',
      fullName: 'Operador Financeiro Disk (Teste)',
      plainPassword: 'BravoTest#Financeiro2026',
      role: 'FINANCEIRO_DISK' as RoleCode,
    },
    sac: {
      id: '10000000-0000-4000-8000-000000000002',
      email: 'sac.teste@diskingressos.test',
      fullName: 'Atendente SAC Disk (Teste)',
      plainPassword: 'BravoTest#Sac2026',
      role: 'SAC_ATENDIMENTO' as RoleCode,
    },
    produtorAlpha: {
      id: '10000000-0000-4000-8000-000000000003',
      email: 'produtor.alpha@pdt.test',
      fullName: 'Produtor Alpha Eventos (Teste PDT)',
      plainPassword: 'BravoTest#Produtor2026',
      role: 'PRODUTOR_PDT' as RoleCode,
    },
    rhDisk: {
      id: '10000000-0000-4000-8000-000000000004',
      email: 'rh.teste@diskingressos.test',
      fullName: 'Gestor RH & DP Disk (Teste)',
      plainPassword: 'BravoTest#RhDisk2026',
      role: 'RH_DP_DISK' as RoleCode,
    },
  },
  producers: {
    alpha: {
      id: '20000000-0000-4000-8000-000000000001',
      cnpj: '11.111.111/0001-11',
      legalName: 'Alpha Produções Artísticas Ltda (Fixture Teste)',
      tradeName: 'Alpha Produções',
    },
    beta: {
      id: '20000000-0000-4000-8000-000000000002',
      cnpj: '22.222.222/0001-22',
      legalName: 'Beta Entretenimento S.A. (Fixture Teste)',
      tradeName: 'Beta Entretenimento',
    },
  },
  events: {
    alphaShow: {
      id: '30000000-0000-4000-8000-000000000001',
      code: 'EVT-TEST-ALPHA-01',
      title: 'Festival Sinfônico Alpha (Fixture Teste)',
      venueName: 'Teatro Guaíra',
      city: 'Curitiba',
      stateUf: 'PR',
      status: 'PUBLICADO',
      startsAt: '2026-12-10T23:00:00.000Z',
      feeAgreement: {
        id: '40000000-0000-4000-8000-000000000001',
        agreementVersion: 1,
        calculationType: 'PERCENTAGE' as const,
        percentageRate: 12.5,
        fixedAmountCents: null,
        payer: 'CUSTOMER' as const,
        status: 'APPROVED' as const,
        approvalReference: 'COM-2026-ALPHA-01',
      },
    },
    betaConcert: {
      id: '30000000-0000-4000-8000-000000000002',
      code: 'EVT-TEST-BETA-02',
      title: 'Mostra Cultural Beta (Fixture Teste)',
      venueName: 'Ópera de Arame',
      city: 'Curitiba',
      stateUf: 'PR',
      status: 'PUBLICADO',
      startsAt: '2026-12-18T22:00:00.000Z',
      feeAgreement: {
        id: '40000000-0000-4000-8000-000000000002',
        agreementVersion: 1,
        calculationType: 'FIXED' as const,
        percentageRate: null,
        fixedAmountCents: 1800,
        payer: 'CUSTOMER' as const,
        status: 'APPROVED' as const,
        approvalReference: 'COM-2026-BETA-02',
      },
    },
  },
  refundRequest: {
    id: '50000000-0000-4000-8000-000000000001',
    orderReference: 'ORD-TEST-0001',
    amountCents: 15000,
    reasonPtBr: 'Solicitação de estorno em ambiente de teste para validação de alçada.',
  },
} as const;
