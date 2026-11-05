/**
 * Módulo Financeiro Disk Ingressos - Core Financeiro Unificado
 * Base de dados compartilhada entre Portal do Produtor e Backoffice Financeiro Disk
 */

export const initialMockDatabase = {
  financialDocuments: [
    { id: "DOC-FIN-001", producerId: "prod-abc", eventId: "evt-001", eventName: "Festival Curitiba 2026", type: "Repasse", amount: 50000, date: "30/09/2026", reference: "REP-2026-00128", description: "Comprovante de liquidação de repasse", fileName: "comprovante_repasse_00128.pdf", visibleToProducer: true, uploadedBy: "Financeiro Disk" },
    { id: "DOC-FIN-002", producerId: "prod-abc", eventId: "evt-001", eventName: "Festival Curitiba 2026", type: "Pagamento", amount: 12000, date: "01/10/2026", reference: "PAG-ECAD-001", description: "Documento interno de obrigação do evento", fileName: "pagamento_ecad.pdf", visibleToProducer: false, uploadedBy: "Financeiro Disk" }
  ],
  // Lista de Produtores Homologados na Plataforma Disk
  producers: [
    {
      id: "prod-abc",
      name: "Produtora ABC Ltda.",
      tradeName: "ABC Produções & Eventos",
      cnpj: "14.829.301/0001-92",
      contactEmail: "financeiro@produtoraabc.com.br",
      phone: "(41) 3315-0800",
      accountManager: "Carlos Menezes (Disk Ingressos)",
      rating: "Tier A - Premium",
      status: "Ativo",
      riskScore: "Baixo Risco (Score 94/100)",
      governance: { registrationStatus: "Completo", homologationStatus: "Homologação Concluída", lastReview: "03/10/2026" },
      responsibles: [{ name: "Ana Martins", role: "Financeiro", email: "financeiro@produtoraabc.com.br", phone: "(41) 3315-0800" }],
      financialDocuments: [{ id:"fin-doc-abc-1", date:"02/10/2026", type:"Repasse", eventName:"Festival Curitiba 2026", amount:85000, fileName:"comprovante-repasse-85000.pdf", visibleToProducer:true }],
      auditHistory: [{ at:"03/10/2026 10:00", by:"Financeiro Disk", action:"Revisão cadastral e homologação confirmadas" }],
      hasBlock: false,
      blockedAmount: 20000.00,
      companyDetails: {
        stateRegistration: "908.765.432-11",
        municipalRegistration: "7.654.321-0",
        cnae: "90.01-9-01 - Produção de espetáculos teatrais e musicais",
        companySize: "Médio Porte (EPP)",
        taxRegime: "Lucro Real",
        openedAt: "10/05/2015"
      },
      address: {
        street: "Rua Comendador Araújo, 510, Conj. 801",
        neighborhood: "Batel",
        city: "Curitiba",
        state: "PR",
        zipCode: "80420-000"
      },
      legalRepresentatives: [
        {
          name: "João Silva",
          cpf: "223.445.667-89",
          role: "Diretor Geral / Sócio Administrador (60%)",
          email: "joao@produtoraabc.com.br",
          phone: "(41) 98877-6655"
        }
      ],
      financialContacts: [
        {
          name: "Ana Beatriz",
          role: "Gerente Financeira",
          email: "financeiro@produtoraabc.com.br",
          phone: "(41) 3315-0800"
        }
      ],
      contract: {
        number: "DISK-CTR-2025-089",
        diskFeePercent: 10.0,
        processingFeePercent: 2.9,
        anticipationRateMonthly: 2.0,
        settlementDaysRule: "D+2 após evento ou liberação sob demanda",
        retainedReservePercent: 5.0,
        creditLimit: 150000.00
      },
      documents: [
        {
          id: "DOC-SOC-ABC-01",
          type: "Contrato Social",
          name: "Contrato Social Consolidado 2025",
          fileName: "contrato_social_abc.pdf",
          uploadDate: "10/01/2026",
          status: "Válido",
          visibleToProducer: true
        },
        {
          id: "DOC-SOC-ABC-02",
          type: "Cartão CNPJ",
          name: "Comprovante de Inscrição RFB",
          fileName: "cartao_cnpj_abc.pdf",
          uploadDate: "10/01/2026",
          status: "Válido",
          visibleToProducer: true
        },
        {
          id: "DOC-SOC-ABC-03",
          type: "Certidão Negativa",
          name: "CND Municipal Curitiba",
          fileName: "cnd_municipal_curitiba.pdf",
          uploadDate: "05/02/2026",
          status: "Válido",
          visibleToProducer: false
        }
      ],
      auditLog: [
        {
          id: "AUD-ABC-01",
          timestamp: "10/01/2026 14:00",
          user: "Carlos Menezes (Disk Ingressos)",
          action: "Renovação Contratual",
          summary: "Renovação do Contrato Master DISK-CTR-2025-089 para temporada 2026."
        }
      ],
      // Números consolidados 100% conciliados com a soma dos 4 eventos vinculados (evt-001, evt-002, evt-003, evt-inverno)
      totals: {
        grossSales: 1410000.00,
        netSales: 1268000.00,
        totalBalance: 1060000.00,        // Disponível (750k) + A receber (190k) + Reservas/Retenções/Bloqueios (120k)
        availableBalance: 750000.00,     // Soma exata do Saldo Disponível dos 4 eventos (200k + 80k + 50k + 420k)
        futureReceivables: 190000.00,    // Soma exata do A Receber Futuro dos 4 eventos (80k + 30k + 20k + 60k)
        transferredAmount: 398000.00,    // Soma exata dos repasses liquidados nos 4 eventos (160k + 123k + 75k + 40k)
        reservedBalance: 50000.00,       // Reserva operacional ativa (REP-2026-00128 em análise)
        retainedBalance: 45000.00,       // Retenções contratuais/garantias ativas (30k evt-001 + 15k evt-002)
        blockedBalance: 25000.00,        // Bloqueios cautelares (10k evt-001 + 5k evt-002 + 10k evt-inverno)
        refundsAndChargebacks: 39000.00  // Cancelamentos (27k) + Chargebacks (12k)
      },
      bankAccounts: [
        {
          id: "bnk-001",
          bankName: "Itaú Unibanco (341)",
          accountType: "Conta Corrente PJ",
          agency: "0432",
          accountNumber: "48291-0",
          holderName: "Produtora ABC Ltda.",
          cnpj: "14.829.301/0001-92",
          pixKey: "14.829.301/0001-92 (CNPJ)",
          isDefault: true,
          status: "Validada & Ativa",
          validatedAt: "15/01/2025 via Bacen/CIP"
        },
        {
          id: "bnk-002",
          bankName: "Banco Bradesco (237)",
          accountType: "Conta Corrente PJ",
          agency: "1120",
          accountNumber: "19283-9",
          holderName: "Produtora ABC Ltda.",
          cnpj: "14.829.301/0001-92",
          pixKey: "financeiro@produtoraabc.com.br",
          isDefault: false,
          status: "Validada & Ativa",
          validatedAt: "20/03/2025"
        }
      ]
    },
    {
      id: "prod-xyz",
      name: "XYZ Produções Artísticas e Eventos Ltda.",
      tradeName: "XYZ Produções",
      cnpj: "12.345.678/0001-90",
      contactEmail: "pagamentos@xyzproducoes.com.br",
      phone: "(11) 3044-9900",
      accountManager: "Mariana Souza (Disk Ingressos)",
      rating: "Tier B - Padrão",
      status: "Ativo",
      riskScore: "Médio Risco (Score 78/100)",
      governance: { registrationStatus: "Completo", homologationStatus: "Homologação Concluída", lastReview: "03/10/2026" },
      responsibles: [{ name: "Paulo Lima", role: "Administrativo Financeiro", email: "pagamentos@xyzproducoes.com.br", phone: "(11) 3044-9900" }],
      financialDocuments: [],
      auditHistory: [],
      hasBlock: false,
      blockedAmount: 10000.00,
      companyDetails: {
        stateRegistration: "109.876.543.210",
        municipalRegistration: "8.765.432-1",
        cnae: "90.01-9-02 - Produção musical e eventos",
        companySize: "Médio Porte (EPP)",
        taxRegime: "Lucro Presumido",
        openedAt: "14/08/2018"
      },
      address: {
        street: "Av. Brigadeiro Faria Lima, 2000, 10º andar",
        neighborhood: "Itaim Bibi",
        city: "São Paulo",
        state: "SP",
        zipCode: "01452-000"
      },
      legalRepresentatives: [
        {
          name: "Roberto Souza",
          cpf: "112.334.556-78",
          role: "Sócio Administrador (80%)",
          email: "roberto@xyzproducoes.com.br",
          phone: "(11) 99876-5432"
        }
      ],
      financialContacts: [
        {
          name: "Carla Pires",
          role: "Coordenadora Financeira",
          email: "carla.pires@xyzproducoes.com.br",
          phone: "(11) 98765-4321"
        }
      ],
      contract: {
        number: "DISK-CTR-2025-112",
        diskFeePercent: 12.0,
        processingFeePercent: 3.1,
        anticipationRateMonthly: 2.4,
        settlementDaysRule: "D+2 após evento",
        retainedReservePercent: 5.0,
        creditLimit: 80000.00
      },
      documents: [
        {
          id: "DOC-SOC-XYZ-01",
          type: "Contrato Social",
          name: "5ª Alteração Contratual Consolidada",
          fileName: "contrato_social_xyz_2025.pdf",
          uploadDate: "15/01/2026",
          status: "Válido",
          visibleToProducer: true
        },
        {
          id: "DOC-SOC-XYZ-02",
          type: "Cartão CNPJ",
          name: "Comprovante de Inscrição RFB",
          fileName: "cartao_cnpj_rfb_2026.pdf",
          uploadDate: "02/02/2026",
          status: "Válido",
          visibleToProducer: true
        },
        {
          id: "DOC-SOC-XYZ-03",
          type: "Certidão Negativa",
          name: "CND Federal / Previdenciária",
          fileName: "cnd_receita_federal_2026.pdf",
          uploadDate: "10/03/2026",
          status: "Válido",
          visibleToProducer: false
        }
      ],
      auditLog: [
        {
          id: "AUD-XYZ-01",
          timestamp: "15/01/2026 10:30",
          user: "Karine Santos (Controladoria Disk)",
          action: "Homologação Cadastral",
          summary: "Homologação do Cadastro Mestre concluída com parecer favorável."
        }
      ],
      totals: {
        grossSales: 350000.00,
        netSales: 308000.00,
        totalBalance: 215000.00,
        availableBalance: 95000.00,
        futureReceivables: 110000.00,
        transferredAmount: 240000.00,
        blockedBalance: 10000.00,
        refundsAndChargebacks: 8000.00
      },
      bankAccounts: [
        {
          id: "bnk-xyz-1",
          bankName: "Santander Brasil (033)",
          accountType: "Conta Corrente PJ",
          agency: "2234",
          accountNumber: "77812-4",
          holderName: "XYZ Produções Artísticas e Eventos Ltda.",
          cnpj: "12.345.678/0001-90",
          pixKey: "12.345.678/0001-90",
          isDefault: true,
          status: "Validada & Ativa",
          validatedAt: "10/02/2025"
        }
      ]
    },
    {
      id: "prod-premium",
      name: "Grupo Premium Entretenimento",
      tradeName: "Premium Shows",
      cnpj: "08.992.114/0001-08",
      contactEmail: "adm@premiumshows.com.br",
      phone: "(48) 3221-5000",
      accountManager: "Carlos Menezes (Disk Ingressos)",
      rating: "Tier A - Premium",
      status: "Ativo",
      riskScore: "Baixo Risco (Score 96/100)",
      governance: { registrationStatus: "Completo", homologationStatus: "Homologação Concluída", lastReview: "03/10/2026" },
      responsibles: [{ name: "Luciana Duarte", role: "Diretora Financeira", email: "adm@premiumshows.com.br", phone: "(48) 3221-5000" }],
      financialDocuments: [],
      auditHistory: [],
      hasBlock: false,
      blockedAmount: 0.00,
      companyDetails: {
        stateRegistration: "258.963.147",
        municipalRegistration: "147.258-9",
        cnae: "90.01-9-02 - Produção musical e eventos",
        companySize: "Grande Porte",
        taxRegime: "Lucro Real",
        openedAt: "12/03/2010"
      },
      address: {
        street: "Rodovia Maurício Sirotsky Sobrinho, 5000",
        neighborhood: "Jurerê Internacional",
        city: "Florianópolis",
        state: "SC",
        zipCode: "88053-700"
      },
      legalRepresentatives: [
        {
          name: "Eduardo Camargo",
          cpf: "334.556.778-90",
          role: "Presidente Executivo",
          email: "eduardo@premiumshows.com.br",
          phone: "(48) 99988-7766"
        }
      ],
      financialContacts: [
        {
          name: "Juliana Mendes",
          role: "Diretora Financeira",
          email: "juliana@premiumshows.com.br",
          phone: "(48) 3221-5000"
        }
      ],
      contract: {
        number: "DISK-CTR-2024-045",
        diskFeePercent: 9.5,
        processingFeePercent: 2.8,
        anticipationRateMonthly: 1.9,
        settlementDaysRule: "D+1 após evento",
        retainedReservePercent: 3.0,
        creditLimit: 300000.00
      },
      documents: [
        {
          id: "DOC-SOC-PREM-01",
          type: "Contrato Social",
          name: "Estatuto Social Consolidado",
          fileName: "estatuto_social_premium.pdf",
          uploadDate: "05/11/2024",
          status: "Válido",
          visibleToProducer: true
        }
      ],
      auditLog: [
        {
          id: "AUD-PREM-01",
          timestamp: "05/11/2024 11:00",
          user: "Carlos Menezes (Disk Ingressos)",
          action: "Homologação Tier A",
          summary: "Classificação Tier A - Premium aprovada pela Controladoria."
        }
      ],
      totals: {
        grossSales: 1200000.00,
        netSales: 1086000.00,
        totalBalance: 580000.00,
        availableBalance: 420000.00,
        futureReceivables: 160000.00,
        transferredAmount: 1800000.00,
        blockedBalance: 0.00,
        refundsAndChargebacks: 14000.00
      },
      bankAccounts: [
        {
          id: "bnk-prem-1",
          bankName: "Banco do Brasil (001)",
          accountType: "Conta Corrente PJ",
          agency: "1890",
          accountNumber: "34991-8",
          holderName: "Grupo Premium Entretenimento",
          cnpj: "08.992.114/0001-08",
          pixKey: "adm@premiumshows.com.br",
          isDefault: true,
          status: "Validada & Ativa",
          validatedAt: "05/11/2024"
        }
      ]
    }
  ],

  // Eventos de Todos os Produtores (com o Festival Curitiba configurado exatamente conforme o exemplo do usuário)
  events: [
    {
      id: "evt-001",
      producerId: "prod-abc",
      producerName: "Produtora ABC Ltda.",
      name: "Festival Curitiba 2026",
      category: "Festival de Música",
      date: "14/11/2026",
      venue: "Pedreira Paulo Leminski - Curitiba/PR",
      status: "Vendas Abertas",
      capacity: 5000,
      soldTickets: 4250,
      salesTarget: 1000000.00,
      // Estrutura de fechamento exata citada na especificação do usuário:
      // Vendas brutas: R$ 500.000 | Cancelamentos: R$ 10.000 | Taxas: R$ 35.000 | Estornos/Chargebacks: R$ 5.000 -> Líquido R$ 450.000
      // Repassado: R$ 150.000 | A receber: R$ 80.000 | Bloqueado: R$ 20.000 -> Saldo Disponível: R$ 200.000,00
      // Regra Transferível: Saldo (200k) - Reservado (50k) - Retido (30k) - Bloqueado (10k) = R$ 110.000,00
      grossSales: 500000.00,
      cancellations: 10000.00,
      diskFees: 35000.00,
      chargebacks: 5000.00,
      netRevenue: 450000.00,
      payoutsDone: 160000.00,
      payoutsDoneUnderPolicy: 0.00,
      payoutBlockedBalance: 0.00,
      payoutReservedBalance: 0.00,
      payoutRetainedBalance: 0.00,
      futureReceivables: 80000.00,
      financialBalance: 200000.00,
      availableBalance: 200000.00, // Disponível inicial R$ 200.000,00 (450k líquido - 160k repassado - 50k reservado - 30k retido - 10k bloqueado)
      reservedBalance: 50000.00,
      retainedBalance: 30000.00,
      blockedBalance: 10000.00,
      totalBalance: 370000.00,     // Disponível (200k) + A receber (80k) + Reservado/Retido/Bloqueado (90k)
      chargebackCases: 2,
      bannerColor: "#2563eb"
    },
    {
      id: "evt-002",
      producerId: "prod-abc",
      producerName: "Produtora ABC Ltda.",
      name: "Show Artista A - Turnê Especial",
      category: "Show Nacional",
      date: "05/10/2026",
      venue: "Teatro Guaíra - Curitiba/PR",
      status: "Últimos Ingressos",
      capacity: 3000,
      soldTickets: 2800,
      salesTarget: 600000.00,
      grossSales: 250000.00,
      cancellations: 5000.00,
      diskFees: 20000.00,
      chargebacks: 2000.00,
      netRevenue: 223000.00,
      payoutsDone: 123000.00,
      payoutsDoneUnderPolicy: 140000.00,
      futureReceivables: 30000.00,
      financialBalance: 80000.00,
      availableBalance: 80000.00,
      reservedBalance: 0.00,
      retainedBalance: 15000.00,
      blockedBalance: 5000.00,
      totalBalance: 130000.00,
      chargebackCases: 0,
      bannerColor: "#7c3aed"
    },
    {
      id: "evt-003",
      producerId: "prod-abc",
      producerName: "Produtora ABC Ltda.",
      name: "Evento Corporativo Tech Summit 2026",
      category: "Congresso & Tech",
      date: "22/10/2026",
      venue: "Viasoft Experience - Curitiba/PR",
      status: "Vendas Abertas",
      capacity: 1000,
      soldTickets: 850,
      salesTarget: 200000.00,
      grossSales: 140000.00,
      cancellations: 2000.00,
      diskFees: 12000.00,
      chargebacks: 1000.00,
      netRevenue: 125000.00,
      payoutsDone: 75000.00,
      futureReceivables: 20000.00,
      reservedBalance: 0.00,
      retainedBalance: 0.00,
      blockedBalance: 0.00,
      availableBalance: 50000.00,
      totalBalance: 70000.00,
      chargebackCases: 0,
      bannerColor: "#059669"
    },
    {
      id: "evt-inverno",
      producerId: "prod-abc",
      producerName: "Produtora ABC Ltda.",
      name: "Festival de Inverno 2026",
      category: "Festival Musical",
      date: "12/11/2026",
      venue: "Pedreira Paulo Leminski - Curitiba/PR",
      status: "Vendas Abertas",
      capacity: 8000,
      soldTickets: 4160,
      salesTarget: 1000000.00,
      grossSales: 520000.00,
      cancellations: 10000.00,
      diskFees: 36000.00,
      chargebacks: 4000.00,
      netRevenue: 470000.00,
      payoutsDone: 40000.00,
      futureReceivables: 60000.00,
      financialBalance: 420000.00,
      availableBalance: 420000.00,
      reservedBalance: 0.00,
      retainedBalance: 0.00,
      blockedBalance: 10000.00,
      totalBalance: 490000.00,
      chargebackCases: 0,
      bannerColor: "#0284c7"
    },
    {
      id: "evt-xyz-1",
      producerId: "prod-xyz",
      producerName: "Eventos XYZ Produções Artísticas",
      name: "Show Nacional de Rock Curitiba",
      category: "Show",
      date: "18/10/2026",
      venue: "Live Curitiba",
      status: "Vendas Abertas",
      capacity: 4000,
      soldTickets: 2100,
      salesTarget: 700000.00,
      grossSales: 350000.00,
      cancellations: 8000.00,
      diskFees: 34000.00,
      chargebacks: 8000.00,
      netRevenue: 300000.00,
      payoutsDone: 240000.00,
      futureReceivables: 110000.00,
      blockedBalance: 10000.00,
      availableBalance: 95000.00,
      totalBalance: 215000.00,
      chargebackCases: 1,
      bannerColor: "#f59e0b"
    },
    {
      id: "evt-prem-1",
      producerId: "prod-premium",
      producerName: "Grupo Premium Entretenimento",
      name: "Festival de Verão Floripa 2026",
      category: "Festival",
      date: "28/12/2026",
      venue: "P12 Jurerê Internacional",
      status: "Vendas Abertas",
      capacity: 8000,
      soldTickets: 6100,
      salesTarget: 1500000.00,
      grossSales: 1200000.00,
      cancellations: 12000.00,
      diskFees: 102000.00,
      chargebacks: 14000.00,
      netRevenue: 1072000.00,
      payoutsDone: 1800000.00,
      futureReceivables: 160000.00,
      blockedBalance: 0.00,
      availableBalance: 420000.00,
      totalBalance: 580000.00,
      chargebackCases: 3,
      bannerColor: "#ec4899"
    }
  ],

  // CENTRAL DE APROVAÇÕES UNIFICADA (Fila Operacional Única)
  approvalQueue: [
    {
      id: "REP-00291",
      type: "Repasse",
      producerId: "prod-abc",
      producerName: "Produtora ABC Ltda.",
      eventId: "evt-001",
      eventName: "Festival Curitiba 2026",
      requestedAmount: 80000.00,
      requestDate: "29/09/2026 09:15",
      status: "Pendente", // Pendente -> Em Análise -> Aprovado -> Programado -> Pago / Recusado
      stepIndex: 1,
      bankName: "Itaú Unibanco (341)",
      bankAccount: "Ag 0432 • C/C 48291-0",
      pixKey: "14.829.301/0001-92 (CNPJ)",
      checklist: {
        balanceSufficient: true,
        bankDataValidated: true,
        eventRegular: true,
        noActiveBlocks: true,
        limitPermitted: true,
        chargebackWarning: "2 chargebacks em acompanhamento (R$ 5.000)"
      },
      auditPosition: {
        grossSales: 500000.00,
        netRevenue: 450000.00,
        availableBefore: 200000.00,
        requested: 80000.00,
        availableAfter: 120000.00
      },
      notes: "Solicitação padrão para pagamento de fornecedores de sonorização e riders técnicos."
    },
    {
      id: "REP-00290",
      type: "Repasse",
      producerId: "prod-xyz",
      producerName: "Eventos XYZ Produções Artísticas",
      eventId: "evt-xyz-1",
      eventName: "Show Nacional de Rock Curitiba",
      requestedAmount: 35000.00,
      requestDate: "29/09/2026 08:30",
      status: "Pendente",
      stepIndex: 1,
      bankName: "Santander Brasil (033)",
      bankAccount: "Ag 2234 • C/C 77812-4",
      pixKey: "22.418.990/0001-44",
      checklist: {
        balanceSufficient: true,
        bankDataValidated: true,
        eventRegular: true,
        noActiveBlocks: true,
        limitPermitted: true,
        chargebackWarning: "Nenhuma pendência crítica"
      },
      auditPosition: {
        grossSales: 350000.00,
        netRevenue: 300000.00,
        availableBefore: 95000.00,
        requested: 35000.00,
        availableAfter: 60000.00
      },
      notes: "Adiantamento de despesas de bilheteria e segurança."
    },
    {
      id: "REP-00289",
      type: "Repasse",
      producerId: "prod-premium",
      producerName: "Grupo Premium Entretenimento",
      eventId: "evt-prem-1",
      eventName: "Festival de Verão Floripa 2026",
      requestedAmount: 92000.00,
      requestDate: "28/09/2026 17:40",
      status: "Em Análise",
      stepIndex: 2,
      bankName: "Banco do Brasil (001)",
      bankAccount: "Ag 1890 • C/C 34991-8",
      pixKey: "adm@premiumshows.com.br",
      checklist: {
        balanceSufficient: true,
        bankDataValidated: true,
        eventRegular: true,
        noActiveBlocks: true,
        limitPermitted: true,
        chargebackWarning: "3 contestações sendo defendidas"
      },
      auditPosition: {
        grossSales: 1200000.00,
        netRevenue: 1072000.00,
        availableBefore: 420000.00,
        requested: 92000.00,
        availableAfter: 328000.00
      },
      notes: "Parcela contratual do artista headliner."
    },
    {
      id: "ANT-00105",
      type: "Antecipação",
      producerId: "prod-abc",
      producerName: "Produtora ABC Ltda.",
      eventId: "evt-001",
      eventName: "Festival Curitiba 2026",
      requestedAmount: 50000.00,
      ratePercent: 2.0,
      discountFee: 1000.00,
      netAmount: 49000.00,
      requestDate: "29/09/2026 09:20",
      status: "Pendente",
      bankName: "Itaú Unibanco (341)",
      bankAccount: "Ag 0432 • C/C 48291-0",
      notes: "Antecipação de parcelas de cartão com vencimento em novembro/2026."
    },
    {
      id: "BNK-00012",
      type: "Alteração Bancária",
      producerId: "prod-xyz",
      producerName: "Eventos XYZ Produções Artísticas",
      requestDate: "28/09/2026 15:20",
      status: "Pendente",
      bankName: "Nubank (260)",
      bankAccount: "Ag 0001 • C/C 99120-1",
      pixKey: "financeiro@xyzlive.com.br",
      notes: "Cadastro de conta secundária para liquidação PIX."
    },
    {
      id: "CHG-00042",
      type: "Chargeback",
      producerId: "prod-abc",
      producerName: "Produtora ABC Ltda.",
      eventId: "evt-001",
      eventName: "Festival Curitiba 2026",
      requestedAmount: 450.00,
      requestDate: "24/09/2026 11:00",
      status: "Em Disputa",
      notes: "Contestação de compra não reconhecida (Cartão Visa Elo Final 8912). Defesa enviada à Cielo."
    }
  ],

  // LEDGER CONTÁBIL CENTRAL (Partidas Dobradas e Auditoria)
  ledgerEntries: [
    {
      id: "LEDG-89104",
      timestamp: "29/09/2026 09:10",
      eventType: "VENDA_INGRESSO_PIX",
      producerId: "prod-abc",
      eventId: "evt-001",
      debitAccount: "Ativo: Conta Transitória Liquidação PIX Disk",
      creditAccount: "Passivo: Saldo Disponível Produtora ABC",
      creditAccount2: "Receita: Taxa Serviço Disk (10%)",
      amount: 1000.00,
      netProducer: 900.00,
      feeDisk: 100.00,
      refOrder: "PED-98301",
      conciliated: true
    },
    {
      id: "LEDG-89103",
      timestamp: "28/09/2026 14:00",
      eventType: "REPASSE_PROGRAMADO",
      producerId: "prod-abc",
      eventId: "evt-001",
      debitAccount: "Passivo: Saldo Disponível Produtora ABC",
      creditAccount: "Passivo: Obrigações com Produtores a Pagar (CNAB)",
      amount: 80000.00,
      netProducer: 80000.00,
      feeDisk: 0.00,
      refOrder: "REP-00291",
      conciliated: true
    }
  ],

  // GATEWAYS & ADQUIRENTES (MDR interno, taxas reais da Disk, volume)
  gateways: [
    {
      id: "gw-cielo",
      name: "Cielo eCommerce 3.0",
      mdrCredit: "1.68%",
      mdrDebit: "0.85%",
      mdrPix: "0.45%",
      spreadDisk: "1.22%",
      volumeShare: 42,
      totalVolumeProcessed: 1450000.00,
      status: "Operacional (99.98% SLA)"
    },
    {
      id: "gw-rede",
      name: "Rede Itaú Link",
      mdrCredit: "1.72%",
      mdrDebit: "0.89%",
      mdrPix: "0.40%",
      spreadDisk: "1.18%",
      volumeShare: 33,
      totalVolumeProcessed: 1120000.00,
      status: "Operacional (99.95% SLA)"
    },
    {
      id: "gw-stone",
      name: "Stone Pagamentos",
      mdrCredit: "1.55%",
      mdrDebit: "0.80%",
      mdrPix: "0.38%",
      spreadDisk: "1.35%",
      volumeShare: 15,
      totalVolumeProcessed: 520000.00,
      status: "Operacional (99.99% SLA)"
    },
    {
      id: "gw-pagbank",
      name: "PagBank / PagSeguro",
      mdrCredit: "1.85%",
      mdrDebit: "0.95%",
      mdrPix: "0.48%",
      spreadDisk: "1.05%",
      volumeShare: 10,
      totalVolumeProcessed: 340000.00,
      status: "Backup / Failover"
    }
  ],

  // CONCILIAÇÃO BANCÁRIA E ADQUIRENTES
  reconciliation: {
    ordersVsGateway: { matched: 12450, divergent: 0, accuracy: "100.0%" },
    gatewayVsLedger: { matched: 12450, divergent: 0, accuracy: "100.0%" },
    ledgerVsBank: { matched: 12448, divergent: 2, accuracy: "99.98%", divergentAmount: 180.00 }
  },

  // REMESSA BANCÁRIA CNAB 240 (Tesouraria Disk)
  cnabBatches: [
    {
      batchId: "CNAB-240-20260929-01",
      bank: "Banco do Brasil S.A. (001)",
      agencyAccount: "Ag 1890-X • C/C 55400-1",
      scheduledDate: "30/09/2026",
      count: 14,
      totalAmount: 642890.00,
      status: "Pronto para Transmissão VAN Bancária"
    }
  ],

  // MEIOS DE PAGAMENTO E DISTRIBUIÇÃO DE VENDAS (100% conciliado com R$ 1.410.000,00 de vendas brutas consolidadas)
  paymentBreakdown: {
    byMethod: [
      { method: "PIX (Compensação D+0)", share: 48, amount: 676800.00, transactions: 5400, avgTicket: 125.33, color: "#10b981", settlement: "Confirmação D+0 • Liberação no Saldo D+0 • Repasse sob aprovação" },
      { method: "Cartão de Crédito à Vista", share: 26, amount: 366600.00, transactions: 2725, avgTicket: 134.53, color: "#3b82f6", settlement: "Autorização Online • Liquidação D+30 (ou D+1 conforme adquirente)" },
      { method: "Cartão Parcelado (2x a 12x)", share: 20, amount: 282000.00, transactions: 1550, avgTicket: 181.94, color: "#8b5cf6", settlement: "Agenda D+30 por parcela • Elegível à Antecipação" },
      { method: "Boleto Bancário Registrado", share: 6, amount: 84600.00, transactions: 618, avgTicket: 136.89, color: "#f59e0b", settlement: "Compensação CIP em D+1 útil" }
    ],
    byChannel: [
      { channel: "Portal Web Desktop / Mobile", share: 65, amount: 916500.00 },
      { channel: "Aplicativo DiskIngressos (iOS/Android)", share: 25, amount: 352500.00 },
      { channel: "PDVs Físicos e Bilheterias Parceiras", share: 10, amount: 141000.00 }
    ]
  },

  // ANTECIPAÇÃO DE RECEBÍVEIS
  anticipations: {
    eligibleAmount: 245000.00,
    monthlyRate: 2.0,
    history: [
      { id: "ANT-00105", requestDate: "27/09/2026", eventName: "Festival Curitiba 2026", grossRequested: 50000.00, netReleased: 49000.00, feeDeducted: 1000.00, status: "Aguardando análise", effectiveDate: "29/09/2026" },
      { id: "ANT-00102", requestDate: "15/08/2026", eventName: "Festival Curitiba 2026", grossRequested: 80000.00, netReleased: 78400.00, feeDeducted: 1600.00, status: "Pago", effectiveDate: "15/08/2026" }
    ]
  },

  // CONDIÇÕES CONTRATUAIS DE TAXAS DO PRODUTOR
  producerFeesContract: [
    { name: "Taxa de Conveniência Disk", type: "Percentual por Ingresso", rate: "10,00%", payer: "Comprador (Cliente)", description: "Cobrada do consumidor final na compra online dos ingressos. Não deduzida da cota do produtor." },
    { name: "Taxa de Administração Bilheteria", type: "Percentual Bruto", rate: "10,00%", payer: "Produtor (Contratual)", description: "Taxa contratual acordada para operação, plataforma, tecnologia de controle de acesso e conciliação." },
    { name: "Processamento Adquirência e Antifraude", type: "Percentual Transacional", rate: "2,90%", payer: "Produtor (Contratual)", description: "Cobre MDR transacional unificado de bandeiras Visa, Mastercard, Elo e verificação antifraude de ponta." },
    { name: "Taxa de Antecipação de Recebíveis", type: "Percentual ao Mês", rate: "2,00% a.m.", payer: "Produtor (Opcional)", description: "Aplicável exclusivamente quando houver contratação voluntária de adiantamento de cartão de crédito." }
  ],

  // ESTORNOS, CANCELAMENTOS E CHARGEBACKS
  chargebacksAndRefunds: [
    { id: "DSP-00041", orderId: "ORD-99120", eventName: "Festival Curitiba 2026", buyer: "Lucas Mendes", date: "28/09/2026", type: "Chargeback (Contestação)", reason: "Alegação de transação não reconhecida junto ao banco emissor.", impact: "- R$ 450,00", status: "Em Disputa" },
    { id: "CAN-00038", orderId: "ORD-98441", eventName: "Festival Curitiba 2026", buyer: "Juliana Ferreira", date: "25/09/2026", type: "Cancelamento CDC (7 dias)", reason: "Direito de arrependimento formal exercido dentro do prazo legal do CDC.", impact: "- R$ 380,00", status: "Estornado" },
    { id: "CAN-00032", orderId: "ORD-97100", eventName: "Show Nacional Rock", buyer: "Roberto Alves", date: "18/09/2026", type: "Estorno Voluntário", reason: "Duplicidade de compra reportada pelo cliente e autorizada pela produção.", impact: "- R$ 260,00", status: "Estornado" }
  ],

  // BORDERÔ OFICIAL DE FECHAMENTO
  bordero: {
    eventId: "evt-001",
    eventName: "Festival Curitiba 2026",
    venue: "Pedreira Paulo Leminski - Curitiba/PR",
    closureDate: "29/09/2026 (Prévia Contábil Parcial)",
    lots: [
      { sector: "Pista Premium", lot: "1º Lote", price: 240.00, soldQty: 1800, compQty: 50, grossTotal: 432000.00 },
      { sector: "Pista Comum", lot: "1º Lote", price: 120.00, soldQty: 2400, compQty: 80, grossTotal: 288000.00 },
      { sector: "Camarote Open Bar", lot: "1º Lote", price: 450.00, soldQty: 350, compQty: 20, grossTotal: 157500.00 },
      { sector: "Área VIP", lot: "1º Lote", price: 320.00, soldQty: 300, compQty: 15, grossTotal: 96000.00 }
    ],
    summary: {
      totalSoldTickets: 4850,
      totalComps: 165,
      grossRevenue: 973500.00,
      diskFeePercent: 10.0,
      deductions: {
        diskServiceFee: 97350.00,
        processingFee: 28231.50,
        refundsSubtotal: 15400.00,
        otherDeductions: 1200.00
      },
      netEventBalance: 831318.50,
      alreadyTransferred: 320000.00,
      remainingBalance: 511318.50
    }
  },

  // LANÇAMENTOS DO EXTRATO / LIVRO-CAIXA
  statementEntries: [
    {
      id: "EXT-00491",
      eventId: "evt-001",
      eventName: "Festival Curitiba 2026",
      date: "29/09/2026 09:15",
      type: "Venda PIX (Lote Aprovado)",
      orderRef: "ORD-99840 a ORD-99852",
      paymentMethod: "PIX",
      grossAmount: 14800.00,
      deductions: 1480.00,
      netAmount: 13320.00,
      balanceAfter: 310000.00,
      status: "Liquidado"
    },
    {
      id: "EXT-00490",
      eventId: "evt-001",
      eventName: "Festival Curitiba 2026",
      date: "28/09/2026 18:30",
      type: "Venda Cartão de Crédito",
      orderRef: "ORD-99710 a ORD-99732",
      paymentMethod: "Cartão de Crédito",
      grossAmount: 28500.00,
      deductions: 3676.50,
      netAmount: 24823.50,
      balanceAfter: 296680.00,
      status: "A Liquidar (D+30)"
    },
    {
      id: "EXT-00489",
      eventId: "evt-001",
      eventName: "Festival Curitiba 2026",
      date: "26/09/2026 14:00",
      type: "Repasse Bancário Programado",
      orderRef: "REP-00288",
      paymentMethod: "TED / PIX PJ",
      grossAmount: -80000.00,
      deductions: 0.00,
      netAmount: -80000.00,
      balanceAfter: 271856.50,
      status: "Pago"
    },
    {
      id: "EXT-00488",
      eventId: "evt-001",
      eventName: "Festival Curitiba 2026",
      date: "25/09/2026 11:20",
      type: "Estorno CDC (Cancelamento)",
      orderRef: "ORD-98441",
      paymentMethod: "Cartão de Crédito",
      grossAmount: -380.00,
      deductions: 0.00,
      netAmount: -380.00,
      balanceAfter: 351856.50,
      status: "Estornado"
    },
    {
      id: "EXT-00487",
      eventId: "evt-002",
      eventName: "Show Artista A (Teatro)",
      date: "24/09/2026 16:45",
      type: "Venda Bilheteria PDV",
      orderRef: "PDV-001-CUR",
      paymentMethod: "Cartão de Débito",
      grossAmount: 9400.00,
      deductions: 940.00,
      netAmount: 8460.00,
      balanceAfter: 352236.50,
      status: "Liquidado"
    }
  ],

  // Política Oficial de Repasse Disk (Parametrização Dinâmica & Precedência: Geral Disk → Produtor → Evento)
  payoutPolicies: {
    global: {
      minSalesPercent: 50,
      releasePercent: 20,
      considerRefunds: true,
      considerChargebacks: true,
      considerMdr: true,
      requireValidatedBank: true,
      requireDiskApproval: true,
      requireDigitalSignature: true,
      allowAdministrativeException: true,
      updatedAt: "2026-09-30 10:00:00",
      updatedBy: "Diretoria Financeira Disk"
    },
    byProducer: {},
    byEvent: {}
  },

  // Registro de Autorizações Excepcionais (A Trava Humana da Mesa Financeira Disk)
  exceptionalAuthorizations: [
    {
      id: "AUT-2026-00088",
      protocol: "AUT-2026-00088",
      eventId: "evt-002",
      eventName: "Show Artista A - Turnê Especial",
      producerId: "prod-abc",
      producerName: "Produtora ABC Ltda.",
      amount: 45000.00,
      reason: "Adiantamento emergencial de cachê artístico acordado em comitê comercial Disk.",
      authorizedBy: "Karine Mendes (Financeiro Disk)",
      createdAt: "2026-09-28T14:30:00.000Z",
      createdDate: "28/09/2026 14:30",
      status: "ATIVA",
      consumed: false,
      payoutId: null
    }
  ],

  // --------------------------------------------------------------------------
  // MÓDULO CORPORATIVO DISK INTERNO: RECURSOS HUMANOS (RH DISK) & DISK PONTO
  // --------------------------------------------------------------------------
  rhDepartamentos: [
    { id: "dep-01", nome: "Operações e Bilheteria de Eventos", sigla: "OPE-EVT", centroCusto: "CC-2040", responsavel: "Carlos Eduardo Mendes", colaboradoresCount: 18 },
    { id: "dep-02", nome: "Tecnologia da Informação & Core", sigla: "TI-COR", centroCusto: "CC-3010", responsavel: "Vinicius Master", colaboradoresCount: 12 },
    { id: "dep-03", nome: "Financeiro, Controladoria e Tesouraria", sigla: "FIN-TES", centroCusto: "CC-1020", responsavel: "Maria Valente", colaboradoresCount: 9 },
    { id: "dep-04", nome: "Comercial, Parcerias e Atendimento", sigla: "COM-ATE", centroCusto: "CC-4010", responsavel: "Juliana Rocha", colaboradoresCount: 15 },
    { id: "dep-05", nome: "Gente, Gestão & Recursos Humanos", sigla: "GGR-RH", centroCusto: "CC-1050", responsavel: "Patricia Albuquerque", colaboradoresCount: 5 }
  ],

  rhCargos: [
    { id: "crg-01", titulo: "Coordenador de Bilheteria de Campo", cbo: "1423-05", departamento: "Operações e Bilheteria de Eventos", nivel: "Sênior", salarioBase: 4800.00, tipoContratoDefault: "CLT" },
    { id: "crg-02", titulo: "Supervisor de Atendimento e Acesso", cbo: "1423-20", departamento: "Operações e Bilheteria de Eventos", nivel: "Pleno", salarioBase: 3800.00, tipoContratoDefault: "CLT" },
    { id: "crg-03", titulo: "Operador de Bilheteria / Caixa Freelancer", cbo: "4211-25", departamento: "Operações e Bilheteria de Eventos", nivel: "Operacional", salarioBase: 0.00, valorDiariaDefault: 180.00, tipoContratoDefault: "FREELANCER_EVENTO" },
    { id: "crg-04", titulo: "Analista Financeiro Pleno", cbo: "2525-05", departamento: "Financeiro, Controladoria e Tesouraria", nivel: "Pleno", salarioBase: 4600.00, tipoContratoDefault: "CLT" },
    { id: "crg-05", titulo: "Engenheiro de Software Fullstack", cbo: "2124-05", departamento: "Tecnologia da Informação & Core", nivel: "Sênior", salarioBase: 9500.00, tipoContratoDefault: "CLT" }
  ],

  rhGeofences: [
    {
      id: "geo-sede-disk",
      nome: "Sede DiskIngressos Curitiba",
      tipo: "SEDE",
      latitude: -25.4284,
      longitude: -49.2733,
      raioMetros: 150,
      endereco: "Rua Visconde de Nácar, 1505 - Centro",
      cidade: "Curitiba",
      uf: "PR",
      ativo: true,
      colaboradoresVinculados: 35
    },
    {
      id: "geo-arena-baixada",
      nome: "Arena da Baixada (Ligga Arena)",
      tipo: "ARENA_EVENTO",
      latitude: -25.4484,
      longitude: -49.2770,
      raioMetros: 350,
      endereco: "Rua Buenos Aires, 1260 - Água Verde",
      cidade: "Curitiba",
      uf: "PR",
      ativo: true,
      eventoId: "evt-xyz-1",
      eventoNome: "Show Nacional de Rock Curitiba",
      colaboradoresVinculados: 24
    },
    {
      id: "geo-pedreira-paulo-leminski",
      nome: "Pedreira Paulo Leminski",
      tipo: "ARENA_EVENTO",
      latitude: -25.3855,
      longitude: -49.2789,
      raioMetros: 400,
      endereco: "Rua João Gava, 970 - Abranches",
      cidade: "Curitiba",
      uf: "PR",
      ativo: true,
      eventoId: "evt-001",
      eventoNome: "Festival Curitiba 2026",
      colaboradoresVinculados: 40
    },
    {
      id: "geo-teatro-positivo",
      nome: "Teatro Positivo Grande Auditório",
      tipo: "ARENA_EVENTO",
      latitude: -25.4503,
      longitude: -49.3601,
      raioMetros: 250,
      endereco: "Rua Prof. Pedro Viriato Parigot de Souza, 5300",
      cidade: "Curitiba",
      uf: "PR",
      ativo: true,
      eventoId: "evt-002",
      eventoNome: "Show Artista A - Turnê Especial",
      colaboradoresVinculados: 12
    }
  ],

  rhColaboradores: [
    {
      id: "colab-001",
      matricula: "DISK-00101",
      nome: "Carlos Eduardo Mendes",
      cpf: "234.567.890-12",
      rg: "8.912.345-1 SSP/PR",
      email: "carlos.mendes@diskingressos.com.br",
      telefone: "(41) 98822-1144",
      fotoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
      cargoId: "crg-01",
      cargoNome: "Coordenador de Bilheteria de Campo",
      departamentoId: "dep-01",
      departamentoNome: "Operações e Bilheteria de Eventos",
      tipoContrato: "CLT",
      status: "ATIVO",
      dataAdmissao: "15/03/2021",
      salario: 4800.00,
      chavePix: "23456789012",
      tipoChavePix: "CPF",
      banco: "033 - Santander",
      agencia: "3210",
      conta: "98765-4",
      geofencePadraoId: "geo-sede-disk",
      jornada: "08:00 às 17:48 (Seg-Sex) - 44h",
      saldoBancoHoras: "+14h 20m"
    },
    {
      id: "colab-002",
      matricula: "DISK-00205",
      nome: "Camila Fernandes Silveira",
      cpf: "456.789.012-34",
      rg: "10.456.789-2 SSP/PR",
      email: "camila.silveira@diskingressos.com.br",
      telefone: "(41) 99755-4433",
      fotoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
      cargoId: "crg-02",
      cargoNome: "Supervisora de Atendimento e Acesso",
      departamentoId: "dep-01",
      departamentoNome: "Operações e Bilheteria de Eventos",
      tipoContrato: "CLT",
      status: "ATIVO",
      dataAdmissao: "02/08/2022",
      salario: 3800.00,
      chavePix: "camila.silveira@diskingressos.com.br",
      tipoChavePix: "EMAIL",
      banco: "260 - Nu Pagamentos",
      agencia: "0001",
      conta: "1234567-8",
      geofencePadraoId: "geo-sede-disk",
      jornada: "08:00 às 17:48 (Seg-Sex) - 44h",
      saldoBancoHoras: "+06h 45m"
    },
    {
      id: "colab-003",
      matricula: "DISK-00388",
      nome: "Lucas Gabriel Pinheiro",
      cpf: "678.901.234-56",
      rg: "12.789.012-3 SSP/PR",
      email: "lucas.pinheiro.ops@gmail.com",
      telefone: "(41) 99111-2233",
      fotoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
      cargoId: "crg-03",
      cargoNome: "Operador de Bilheteria / Caixa Freelancer",
      departamentoId: "dep-01",
      departamentoNome: "Operações e Bilheteria de Eventos",
      tipoContrato: "FREELANCER_EVENTO",
      status: "ATIVO",
      dataAdmissao: "10/01/2024",
      salario: 0.00,
      valorDiariaEvento: 180.00,
      chavePix: "67890123456",
      tipoChavePix: "CPF",
      banco: "341 - Itaú Unibanco",
      agencia: "0412",
      conta: "55441-2",
      geofencePadraoId: "geo-arena-baixada",
      jornada: "Por Escala de Evento",
      saldoBancoHoras: "0h"
    },
    {
      id: "colab-004",
      matricula: "DISK-00412",
      nome: "Beatriz Nogueira Ramos",
      cpf: "789.012.345-67",
      rg: "11.234.567-4 SSP/PR",
      email: "beatriz.ramos@diskingressos.com.br",
      telefone: "(41) 98444-5566",
      fotoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80",
      cargoId: "crg-04",
      cargoNome: "Analista Financeiro Pleno",
      departamentoId: "dep-03",
      departamentoNome: "Financeiro, Controladoria e Tesouraria",
      tipoContrato: "CLT",
      status: "ATIVO",
      dataAdmissao: "04/05/2023",
      salario: 4600.00,
      chavePix: "beatriz.ramos@diskingressos.com.br",
      tipoChavePix: "EMAIL",
      banco: "001 - Banco do Brasil",
      agencia: "1822",
      conta: "33211-9",
      geofencePadraoId: "geo-sede-disk",
      jornada: "08:30 às 18:18 (Seg-Sex) - 44h",
      saldoBancoHoras: "-01h 15m"
    },
    {
      id: "colab-005",
      matricula: "DISK-00520",
      nome: "Rodrigo Almeida Siqueira",
      cpf: "890.123.456-78",
      rg: "9.876.543-8 SSP/PR",
      email: "rodrigo.siqueira.ops@outlook.com",
      telefone: "(41) 99666-7788",
      fotoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
      cargoId: "crg-03",
      cargoNome: "Operador de Bilheteria / Caixa Freelancer",
      departamentoId: "dep-01",
      departamentoNome: "Operações e Bilheteria de Eventos",
      tipoContrato: "FREELANCER_EVENTO",
      status: "ATIVO",
      dataAdmissao: "15/02/2024",
      salario: 0.00,
      valorDiariaEvento: 180.00,
      chavePix: "89012345678",
      tipoChavePix: "CPF",
      banco: "237 - Bradesco",
      agencia: "2104",
      conta: "44120-0",
      geofencePadraoId: "geo-arena-baixada",
      jornada: "Por Escala de Evento",
      saldoBancoHoras: "0h"
    }
  ],

  rhRegistrosPonto: [
    {
      id: "ponto-1001",
      nsr: 1001,
      colaboradorId: "colab-001",
      colaboradorNome: "Carlos Eduardo Mendes",
      tipo: "ENTRADA",
      dataHoraMarcacao: "2026-10-03T07:58:12.000Z",
      dataHoraFormatada: "03/10/2026 07:58:12",
      latitude: -25.42841,
      longitude: -49.27329,
      precisaoMetros: 8.5,
      geofenceId: "geo-sede-disk",
      geofenceNome: "Sede DiskIngressos Curitiba",
      dentroGeofence: true,
      distanciaGeofence: 4.2,
      modoCaptura: "APP_ONLINE",
      hashIntegridade: "a7f9c2d1e4b8650f9a2b4c6d8e0f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f",
      comprovanteNsr: "MTE671-000001001-A7F9C2D1",
      dispositivoInfo: "Samsung Galaxy A54 (Android 14) - Disk Ponto APK v1.0",
      sincronizado: true
    },
    {
      id: "ponto-1002",
      nsr: 1002,
      colaboradorId: "colab-001",
      colaboradorNome: "Carlos Eduardo Mendes",
      tipo: "INTERVALO_INICIO",
      dataHoraMarcacao: "2026-10-03T12:02:44.000Z",
      dataHoraFormatada: "03/10/2026 12:02:44",
      latitude: -25.42839,
      longitude: -49.27331,
      precisaoMetros: 9.1,
      geofenceId: "geo-sede-disk",
      geofenceNome: "Sede DiskIngressos Curitiba",
      dentroGeofence: true,
      distanciaGeofence: 6.8,
      modoCaptura: "APP_ONLINE",
      hashIntegridade: "b8e1f3a5c7d9e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2",
      comprovanteNsr: "MTE671-000001002-B8E1F3A5",
      dispositivoInfo: "Samsung Galaxy A54 (Android 14) - Disk Ponto APK v1.0",
      sincronizado: true
    },
    {
      id: "ponto-1003",
      nsr: 1003,
      colaboradorId: "colab-001",
      colaboradorNome: "Carlos Eduardo Mendes",
      tipo: "INTERVALO_FIM",
      dataHoraMarcacao: "2026-10-03T13:01:10.000Z",
      dataHoraFormatada: "03/10/2026 13:01:10",
      latitude: -25.42840,
      longitude: -49.27330,
      precisaoMetros: 7.4,
      geofenceId: "geo-sede-disk",
      geofenceNome: "Sede DiskIngressos Curitiba",
      dentroGeofence: true,
      distanciaGeofence: 5.1,
      modoCaptura: "APP_ONLINE",
      hashIntegridade: "c9d2e4f6a8b0c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d3",
      comprovanteNsr: "MTE671-000001003-C9D2E4F6",
      dispositivoInfo: "Samsung Galaxy A54 (Android 14) - Disk Ponto APK v1.0",
      sincronizado: true
    },
    {
      id: "ponto-1004",
      nsr: 1004,
      colaboradorId: "colab-003",
      colaboradorNome: "Lucas Gabriel Pinheiro",
      tipo: "ENTRADA",
      dataHoraMarcacao: "2026-10-03T14:30:00.000Z",
      dataHoraFormatada: "03/10/2026 14:30:00",
      latitude: -25.44845,
      longitude: -49.27698,
      precisaoMetros: 11.2,
      geofenceId: "geo-arena-baixada",
      geofenceNome: "Arena da Baixada (Ligga Arena)",
      dentroGeofence: true,
      distanciaGeofence: 22.4,
      modoCaptura: "APP_ONLINE",
      hashIntegridade: "d0e3f5a7b9c1d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e4",
      comprovanteNsr: "MTE671-000001004-D0E3F5A7",
      dispositivoInfo: "Motorola Edge 40 - Disk Ponto APK v1.0",
      sincronizado: true
    }
  ],

  rhAjustesPonto: [
    {
      id: "ajuste-2026-001",
      colaboradorId: "colab-004",
      colaboradorNome: "Beatriz Nogueira Ramos",
      dataPonto: "02/10/2026",
      tipoAjuste: "SAIDA",
      horarioCorreto: "18:18",
      motivo: "ESQUECIMENTO",
      justificativa: "Fiquei em reunião com a gerência financeira até às 18:20 e acabei não registrando a saída no aplicativo móvel.",
      comprovanteUrl: null,
      status: "PENDENTE",
      criadoEm: "03/10/2026 09:15"
    }
  ],

  rhEquipesCustosEvento: [
    {
      id: "custo-mo-001",
      eventoId: "evt-xyz-1",
      eventoNome: "Show Nacional de Rock Curitiba",
      produtorId: "prod-xyz",
      colaboradorId: "colab-001",
      colaboradorNome: "Carlos Eduardo Mendes",
      cargoFuncao: "Coordenador Geral de Bilheteria & Catracas",
      tipoContratacao: "CLT",
      valorDiaria: 350.00,
      horasTrabalhadas: 10.0,
      valorHorasExtras: 120.00,
      auxilioAlimentacao: 50.00,
      auxilioTransporte: 40.00,
      valorTotal: 560.00,
      statusPagamento: "AUTORIZADO_RH",
      chavePix: "23456789012",
      tipoChavePix: "CPF",
      banco: "033 - Santander"
    },
    {
      id: "custo-mo-002",
      eventoId: "evt-xyz-1",
      eventoNome: "Show Nacional de Rock Curitiba",
      produtorId: "prod-xyz",
      colaboradorId: "colab-002",
      colaboradorNome: "Camila Fernandes Silveira",
      cargoFuncao: "Supervisora de Catracas e Atendimento VIP",
      tipoContratacao: "CLT",
      valorDiaria: 280.00,
      horasTrabalhadas: 9.5,
      valorHorasExtras: 90.00,
      auxilioAlimentacao: 50.00,
      auxilioTransporte: 40.00,
      valorTotal: 460.00,
      statusPagamento: "AUTORIZADO_RH",
      chavePix: "camila.silveira@diskingressos.com.br",
      tipoChavePix: "EMAIL",
      banco: "260 - Nu Pagamentos"
    },
    {
      id: "custo-mo-003",
      eventoId: "evt-xyz-1",
      eventoNome: "Show Nacional de Rock Curitiba",
      produtorId: "prod-xyz",
      colaboradorId: "colab-003",
      colaboradorNome: "Lucas Gabriel Pinheiro",
      cargoFuncao: "Operador de Caixa e Bilheteria Portão Principal",
      tipoContratacao: "FREELANCER_EVENTO",
      valorDiaria: 180.00,
      horasTrabalhadas: 8.0,
      valorHorasExtras: 0.00,
      auxilioAlimentacao: 40.00,
      auxilioTransporte: 30.00,
      valorTotal: 250.00,
      statusPagamento: "PREVISTO",
      chavePix: "67890123456",
      tipoChavePix: "CPF",
      banco: "341 - Itaú Unibanco"
    },
    {
      id: "custo-mo-004",
      eventoId: "evt-xyz-1",
      eventoNome: "Show Nacional de Rock Curitiba",
      produtorId: "prod-xyz",
      colaboradorId: "colab-005",
      colaboradorNome: "Rodrigo Almeida Siqueira",
      cargoFuncao: "Operador de Caixa e Bilheteria Portão Pista Premium",
      tipoContratacao: "FREELANCER_EVENTO",
      valorDiaria: 180.00,
      horasTrabalhadas: 8.0,
      valorHorasExtras: 0.00,
      auxilioAlimentacao: 40.00,
      auxilioTransporte: 30.00,
      valorTotal: 250.00,
      statusPagamento: "PREVISTO",
      chavePix: "89012345678",
      tipoChavePix: "CPF",
      banco: "237 - Bradesco"
    }
  ],

  rhAuditLogs: [
    {
      id: "log-rh-001",
      at: "03/10/2026 08:00:15",
      by: "Carlos Eduardo Mendes",
      colaboradorAfetado: "Carlos Eduardo Mendes (DISK-00101)",
      acao: "REGISTRO_PONTO",
      entidade: "RegistroPonto",
      detalhes: "Ponto batido via Disk Ponto APK (Entrada às 07:58:12). Validação de geofence Sede Disk: DENTRO (distância 4.2m).",
      ip: "189.112.45.10"
    },
    {
      id: "log-rh-002",
      at: "03/10/2026 09:15:22",
      by: "Beatriz Nogueira Ramos",
      colaboradorAfetado: "Beatriz Nogueira Ramos (DISK-00412)",
      acao: "SOLICITACAO_AJUSTE",
      entidade: "SolicitacaoAjustePonto",
      detalhes: "Solicitação de inclusão de saída em 02/10 às 18:18 por esquecimento.",
      ip: "177.92.10.88"
    },
    {
      id: "log-rh-003",
      at: "03/10/2026 11:30:00",
      by: "Patricia Albuquerque (RH)",
      colaboradorAfetado: "Equipe Show Nacional de Rock Curitiba",
      acao: "ESCALA_EVENTO_CRIADA",
      entidade: "CustoMaoDeObraEvento",
      detalhes: "Alocação de 4 profissionais para a Ligga Arena (Show Nacional de Rock Curitiba). Custo previsto de mão de obra direta: R$ 1.520,00.",
      ip: "10.0.1.15"
    }
  ]
};

// Cópia profunda para permitir reset instantâneo na demo
export const getFreshDatabase = () => JSON.parse(JSON.stringify(initialMockDatabase));
