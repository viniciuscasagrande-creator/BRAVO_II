/**
 * Database Seed - População Inicial para Demonstração no VS Code
 * Cenário Completo: 3 Usuários, 3 Produtores, 8 Eventos, Motor de Workflow, Assinaturas e Ledger
 */

export const mockSeedData = {
  usuarios: [
    {
      id: "usr-prod-01",
      nome: "João Silva",
      email: "produtor@demo.disk",
      perfil: "PRODUTOR",
      cargo: "Diretor Geral / Sócio",
      produtorId: "prod-abc",
      telefone: "(41) 99882-1100"
    },
    {
      id: "usr-fin-01",
      nome: "Karine",
      email: "karine@diskingressos.com.br",
      perfil: "FINANCEIRO",
      cargo: "Administradora do Financeiro",
      produtorId: null,
      telefone: "(41) 3315-0820"
    },
    {
      id: "usr-adm-01",
      nome: "Karine",
      email: "karine@diskingressos.com.br",
      perfil: "ADMINISTRADOR",
      cargo: "Administradora do Financeiro",
      produtorId: null,
      telefone: "(41) 3315-0801"
    }
  ],

  produtores: [
    {
      id: "prod-abc",
      razaoSocial: "Produtora ABC Ltda.",
      nomeFantasia: "ABC Produções & Grandes Eventos",
      cnpj: "14.829.301/0001-92",
      email: "financeiro@produtoraabc.com.br",
      telefone: "(41) 3315-0800",
      gerenteConta: "Carlos Menezes (Disk Ingressos)",
      rating: "Tier A - Premium",
      scoreRisco: 94,
      bloqueioAtivo: false,
      taxaDiskPercent: 10.0,
      taxaProcessamentoMdr: 2.9,
      taxaAntecipacaoMensal: 2.0,
      regraLiquidacaoDias: "D+2 após o evento",
      contasBancarias: [
        {
          id: "bnk-001",
          bancoNome: "Itaú Unibanco (341)",
          bancoCodigo: "341",
          agencia: "0432",
          numeroConta: "48291-0",
          tipoConta: "Conta Corrente PJ",
          chavePix: "14.829.301/0001-92 (CNPJ)",
          titular: "Produtora ABC Ltda.",
          cnpjTitular: "14.829.301/0001-92",
          padrao: true,
          validadaBacen: true
        }
      ]
    },
    {
      id: "prod-xyz",
      razaoSocial: "Eventos XYZ Produções Artísticas",
      nomeFantasia: "XYZ Live Entretenimento",
      cnpj: "22.418.990/0001-44",
      email: "pagamentos@xyzlive.com.br",
      telefone: "(11) 3044-9900",
      gerenteConta: "Mariana Souza (Disk Ingressos)",
      rating: "Tier B - Padrão",
      scoreRisco: 78,
      bloqueioAtivo: false,
      taxaDiskPercent: 12.0,
      taxaProcessamentoMdr: 3.1,
      taxaAntecipacaoMensal: 2.4,
      regraLiquidacaoDias: "D+2 após o evento",
      contasBancarias: [
        {
          id: "bnk-002",
          bancoNome: "Santander Brasil (033)",
          bancoCodigo: "033",
          agencia: "2234",
          numeroConta: "77812-4",
          tipoConta: "Conta Corrente PJ",
          chavePix: "22.418.990/0001-44",
          titular: "Eventos XYZ Produções Artísticas",
          cnpjTitular: "22.418.990/0001-44",
          padrao: true,
          validadaBacen: true
        }
      ]
    },
    {
      id: "prod-premium",
      razaoSocial: "Grupo Premium Entretenimento S.A.",
      nomeFantasia: "Premium Shows & Festivais",
      cnpj: "08.992.114/0001-08",
      email: "adm@premiumshows.com.br",
      telefone: "(48) 3221-5000",
      gerenteConta: "Carlos Menezes (Disk Ingressos)",
      rating: "Tier A - Premium",
      scoreRisco: 96,
      bloqueioAtivo: false,
      taxaDiskPercent: 9.5,
      taxaProcessamentoMdr: 2.8,
      taxaAntecipacaoMensal: 1.9,
      regraLiquidacaoDias: "D+1 após o evento",
      contasBancarias: [
        {
          id: "bnk-003",
          bancoNome: "Banco do Brasil (001)",
          bancoCodigo: "001",
          agencia: "1890",
          numeroConta: "34991-8",
          tipoConta: "Conta Corrente PJ",
          chavePix: "adm@premiumshows.com.br",
          titular: "Grupo Premium Entretenimento S.A.",
          cnpjTitular: "08.992.114/0001-08",
          padrao: true,
          validadaBacen: true
        }
      ]
    }
  ],

  eventos: [
    // 1. Festival Curitiba 2026 (Números exatos da especificação de fechamento do usuário)
    {
      id: "evt-001",
      produtorId: "prod-abc",
      nome: "Festival Curitiba 2026",
      categoria: "Festival de Música",
      dataEvento: new Date("2026-11-14T14:00:00Z"),
      local: "Pedreira Paulo Leminski",
      cidade: "Curitiba/PR",
      capacidadeTotal: 5000,
      ingressosVendidos: 4250,
      saldo: {
        vendasBrutas: 500000.00,
        cancelamentos: 10000.00,
        taxasDisk: 35000.00,
        chargebacks: 5000.00,
        liquidoApurado: 450000.00,
        repassadoAcumulado: 150000.00,
        recebiveisFuturos: 80000.00,
        bloqueadoReserva: 20000.00,
        disponivelImediato: 200000.00 // R$ 200.000,00 livre para repasse imediato
      }
    },
    // 2. Show Artista A
    {
      id: "evt-002",
      produtorId: "prod-abc",
      nome: "Show Artista A - Turnê Especial",
      categoria: "Show Nacional",
      dataEvento: new Date("2026-10-05T20:30:00Z"),
      local: "Teatro Guaíra",
      cidade: "Curitiba/PR",
      capacidadeTotal: 2100,
      ingressosVendidos: 2050,
      saldo: {
        vendasBrutas: 280000.00,
        cancelamentos: 5000.00,
        taxasDisk: 22000.00,
        chargebacks: 3000.00,
        liquidoApurado: 250000.00,
        repassadoAcumulado: 85000.00,
        recebiveisFuturos: 60000.00,
        bloqueadoReserva: 10000.00,
        disponivelImediato: 95000.00
      }
    },
    // 3. Evento Corporativo Tech Summit
    {
      id: "evt-003",
      produtorId: "prod-abc",
      nome: "Evento Corporativo Tech Summit 2026",
      categoria: "Congresso & Palestras",
      dataEvento: new Date("2026-09-18T08:00:00Z"),
      local: "Viasoft Experience",
      cidade: "Curitiba/PR",
      capacidadeTotal: 1200,
      ingressosVendidos: 1180,
      saldo: {
        vendasBrutas: 147520.00,
        cancelamentos: 2000.00,
        taxasDisk: 10520.00,
        chargebacks: 0.00,
        liquidoApurado: 135000.00,
        repassadoAcumulado: 120000.00,
        recebiveisFuturos: 0.00,
        bloqueadoReserva: 0.00,
        disponivelImediato: 15000.00
      }
    },
    // 4. Knife Show Curitiba
    {
      id: "evt-004",
      produtorId: "prod-abc",
      nome: "Knife Show Curitiba 2026",
      categoria: "Feira & Exposição",
      dataEvento: new Date("2026-10-24T10:00:00Z"),
      local: "Pavilhão Expo Barigui",
      cidade: "Curitiba/PR",
      capacidadeTotal: 3000,
      ingressosVendidos: 1800,
      saldo: {
        vendasBrutas: 95000.00,
        cancelamentos: 1500.00,
        taxasDisk: 8500.00,
        chargebacks: 1000.00,
        liquidoApurado: 84000.00,
        repassadoAcumulado: 30000.00,
        recebiveisFuturos: 24000.00,
        bloqueadoReserva: 5000.00,
        disponivelImediato: 25000.00
      }
    },
    // 5. Música & Natureza
    {
      id: "evt-005",
      produtorId: "prod-xyz",
      nome: "Música & Natureza Sunset",
      categoria: "Festival Open Air",
      dataEvento: new Date("2026-11-28T16:00:00Z"),
      local: "Parque das Pedras",
      cidade: "São Paulo/SP",
      capacidadeTotal: 2500,
      ingressosVendidos: 1950,
      saldo: {
        vendasBrutas: 180000.00,
        cancelamentos: 3000.00,
        taxasDisk: 16000.00,
        chargebacks: 2000.00,
        liquidoApurado: 159000.00,
        repassadoAcumulado: 60000.00,
        recebiveisFuturos: 45000.00,
        bloqueadoReserva: 5000.00,
        disponivelImediato: 49000.00
      }
    },
    // 6. Turnê Sertaneja Premium
    {
      id: "evt-006",
      produtorId: "prod-premium",
      nome: "Turnê Sertaneja Premium Floripa",
      categoria: "Mega Show",
      dataEvento: new Date("2026-12-05T21:00:00Z"),
      local: "Arena Stage Floripa",
      cidade: "Florianópolis/SC",
      capacidadeTotal: 8000,
      ingressosVendidos: 6500,
      saldo: {
        vendasBrutas: 750000.00,
        cancelamentos: 15000.00,
        taxasDisk: 65000.00,
        chargebacks: 8000.00,
        liquidoApurado: 662000.00,
        repassadoAcumulado: 300000.00,
        recebiveisFuturos: 160000.00,
        bloqueadoReserva: 15000.00,
        disponivelImediato: 187000.00
      }
    },
    // 7. Festival Rock Curitiba
    {
      id: "evt-007",
      produtorId: "prod-abc",
      nome: "Curitiba Rock Night 2026",
      categoria: "Show",
      dataEvento: new Date("2026-12-12T19:00:00Z"),
      local: "Live Curitiba",
      cidade: "Curitiba/PR",
      capacidadeTotal: 3500,
      ingressosVendidos: 2200,
      saldo: {
        vendasBrutas: 160000.00,
        cancelamentos: 4000.00,
        taxasDisk: 14000.00,
        chargebacks: 2000.00,
        liquidoApurado: 140000.00,
        repassadoAcumulado: 40000.00,
        recebiveisFuturos: 50000.00,
        bloqueadoReserva: 10000.00,
        disponivelImediato: 40000.00
      }
    },
    // 8. Encontro de Dança Sul
    {
      id: "evt-008",
      produtorId: "prod-xyz",
      nome: "Encontro Sul-Brasileiro de Dança",
      categoria: "Mostra Artística",
      dataEvento: new Date("2026-10-17T15:00:00Z"),
      local: "Ópera de Arame",
      cidade: "Curitiba/PR",
      capacidadeTotal: 1500,
      ingressosVendidos: 1300,
      saldo: {
        vendasBrutas: 70000.00,
        cancelamentos: 1000.00,
        taxasDisk: 6500.00,
        chargebacks: 500.00,
        liquidoApurado: 62000.00,
        repassadoAcumulado: 25000.00,
        recebiveisFuturos: 15000.00,
        bloqueadoReserva: 2000.00,
        disponivelImediato: 20000.00
      }
    }
  ],

  solicitacoes: [
    // 1. REP-000129: Solicitação de Repasse Ativa (O foco da demonstração do fluxo!)
    {
      id: "sol-001",
      codigo: "REP-000129",
      tipo: "REPASSE",
      status: "AGUARDANDO_ANALISE",
      produtorId: "prod-abc",
      eventoId: "evt-001",
      valorSolicitado: 80000.00,
      taxaOperacao: 0.0,
      valorLiquido: 80000.00,
      solicitadoPorId: "usr-prod-01",
      solicitadoEm: new Date("2026-09-29T09:14:00Z"),
      documentoId: "DOC-9821",
      termoDocumento: "Termo Oficial de Liberação de Repasse Financeiro nº 9821/2026"
    },
    // 2. ANT-000104: Antecipação de Recebíveis
    {
      id: "sol-002",
      codigo: "ANT-000104",
      tipo: "ANTECIPACAO",
      status: "AGUARDANDO_ANALISE",
      produtorId: "prod-abc",
      eventoId: "evt-002",
      valorSolicitado: 35000.00,
      taxaOperacao: 700.00, // 2.0% taxa mensal
      valorLiquido: 34300.00,
      solicitadoPorId: "usr-prod-01",
      solicitadoEm: new Date("2026-09-28T16:20:00Z"),
      documentoId: "DOC-9740"
    },
    // 3. BOR-000042: Fechamento de Borderô
    {
      id: "sol-003",
      codigo: "BOR-000042",
      tipo: "BORDERO",
      status: "AGUARDANDO_ASSINATURA_PRODUTOR",
      produtorId: "prod-abc",
      eventoId: "evt-003",
      valorSolicitado: 15000.00,
      taxaOperacao: 0.0,
      valorLiquido: 15000.00,
      solicitadoPorId: "usr-prod-01",
      solicitadoEm: new Date("2026-09-27T10:00:00Z"),
      analisadoPorId: "usr-fin-01",
      analisadoEm: new Date("2026-09-27T14:30:00Z"),
      decisao: "APROVADO",
      documentoId: "DOC-9610"
    }
  ],

  gateways: [
    { nome: "Cielo", mdrDebito: 1.15, mdrCreditoVista: 2.25, mdrParcelado: 3.75, spreadDisk: 1.22, status: "Operacional 100%" },
    { nome: "Rede Itaú", mdrDebito: 1.18, mdrCreditoVista: 2.28, mdrParcelado: 3.85, spreadDisk: 1.22, status: "Operacional 100%" },
    { nome: "Stone", mdrDebito: 1.20, mdrCreditoVista: 2.30, mdrParcelado: 3.90, spreadDisk: 1.22, status: "Operacional 100%" },
    { nome: "PagBank", mdrDebito: 1.25, mdrCreditoVista: 2.45, mdrParcelado: 4.10, spreadDisk: 1.22, status: "Operacional 100%" }
  ]
};
