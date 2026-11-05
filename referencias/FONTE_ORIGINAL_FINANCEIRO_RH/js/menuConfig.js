/**
 * Configuração Oficial de Menus por Perfil (Limitless Single-Sidebar Architecture)
 * 
 * REGRA ESTRITA:
 * perfil === "PRODUTOR"      -> menuProdutor (11 itens canônicos)
 * perfil === "FINANCEIRO"    -> menuFinanceiroCompleto (23 itens canônicos estruturados)
 * perfil === "ADMINISTRADOR" -> menuAdministradorCompleto (23 itens + permissões master)
 */

export const menuProdutor = [
  {
    id: 'overview',
    label: 'Visão Geral',
    icon: 'ph-chart-pie-slice'
  },
  {
    id: 'saldos',
    label: 'Saldos',
    icon: 'ph-currency-circle-dollar'
  },
  {
    id: 'extrato',
    label: 'Extrato',
    icon: 'ph-receipt'
  },
  {
    id: 'repasses',
    label: 'Repasses',
    icon: 'ph-hand-coins',
    subItems: [
      { id: 'repasses', label: 'Solicitar Repasse', action: 'openPayoutModal' },
      { id: 'repasses', label: 'Minhas Solicitações', filterArg: 'all' }
    ]
  },
  {
    id: 'antecipacoes',
    label: 'Antecipações',
    icon: 'ph-trend-up',
    subItems: [
      { id: 'antecipacoes', label: 'Simular', filterArg: 'simular' },
      { id: 'antecipacoes', label: 'Solicitar Antecipação', filterArg: 'solicitar' },
      { id: 'antecipacoes', label: 'Minhas Solicitações', filterArg: 'historico' }
    ]
  },
  {
    id: 'vendas',
    label: 'Vendas e Recebimentos',
    icon: 'ph-shopping-cart'
  },
  {
    id: 'taxas',
    label: 'Taxas e Descontos',
    icon: 'ph-percent',
    hidden: true
  },
  {
    id: 'estornos',
    label: 'Estornos e Chargebacks',
    icon: 'ph-warning-octagon',
    hidden: true
  },
  {
    id: 'bordero',
    label: 'Borderôs',
    icon: 'ph-signature',
    hidden: true,
    subItems: [
      { id: 'bordero', label: 'Em Aberto', filterArg: 'aberto' },
      { id: 'bordero', label: 'Aguardando Assinatura', filterArg: 'aguardando' },
      { id: 'bordero', label: 'Finalizados', filterArg: 'finalizados' }
    ]
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    icon: 'ph-file-text'
  },
  {
    id: 'comprovantes',
    label: 'Comprovantes e Transações',
    icon: 'ph-files'
  },
  {
    id: 'dadosBancarios',
    label: 'Dados Bancários',
    icon: 'ph-credit-card'
  }
];

export const menuFinanceiroCompleto = [
  {
    id: 'diskDashboard',
    label: 'VISÃO GERAL',
    icon: 'ph-chart-pie-slice',
    subItems: [
      { id: 'diskDashboard', label: 'Dashboard Financeiro', filterArg: 'dashboard' },
      { id: 'diskPosicaoGeral', label: 'Posição Geral', filterArg: 'posicao' },
      { id: 'diskIndicadores', label: 'Indicadores', filterArg: 'indicadores' },
      { id: 'diskInteligencia', label: 'Inteligência Financeira', filterArg: 'inteligencia' }
    ]
  },
  {
    id: 'diskProdutores',
    label: 'PRODUTORES E EVENTOS',
    icon: 'ph-buildings',
    subItems: [
      { id: 'diskProdutores', label: 'Produtores', filterArg: 'all' },
      { id: 'diskEventos', label: 'Eventos', filterArg: 'all' },
      { id: 'diskContaFinanceira', label: 'Conta Financeira do Produtor', filterArg: 'conta' },
      { id: 'diskSaldos', label: 'Saldos por Produtor', filterArg: 'produtor' },
      { id: 'diskSaldos', label: 'Saldos por Evento', filterArg: 'evento' }
    ]
  },
  {
    id: 'diskSolicitacoes',
    label: 'SOLICITAÇÕES E OPERAÇÕES',
    icon: 'ph-scales',
    badge: 'pendingCount',
    subItems: [
      { id: 'diskSolicitacoes', label: 'Central de Solicitações', filterArg: 'all' },
      { id: 'diskAprovacoes', label: 'Central de Aprovações', filterArg: 'pendentes' },
      { id: 'diskRepasses', label: 'Repasses', filterArg: 'all' },
      { id: 'diskPoliticaRepasse', label: 'Política de Repasse', filterArg: 'politica' },
      { id: 'diskAntecipacoes', label: 'Antecipações', filterArg: 'all' },
      { id: 'diskDivisaoReceitas', label: 'Divisão de Receitas', filterArg: 'split' },
      { id: 'diskTransferencias', label: 'Transferências entre Eventos', action: 'openTransferModal' },
      { id: 'diskAssinaturas', label: 'Assinaturas Pendentes', filterArg: 'pendentes' }
    ]
  },
  {
    id: 'diskRecebiveis',
    label: 'RECEBÍVEIS E LIQUIDAÇÕES',
    icon: 'ph-wallet',
    subItems: [
      { id: 'diskContasReceber', label: 'Contas a Receber', filterArg: 'overview' },
      { id: 'diskRecebiveis', label: 'Recebíveis', filterArg: 'recebiveis' },
      { id: 'diskRecebiveis', label: 'Agenda de Recebíveis', filterArg: 'agenda' },
      { id: 'diskRecebiveis', label: 'Liquidações', filterArg: 'liquidados' },
      { id: 'diskRecebiveis', label: 'Agenda Financeira', filterArg: 'agenda_financeira' }
    ]
  },
  {
    id: 'diskGateways',
    label: 'GATEWAYS E ADQUIRENTES',
    icon: 'ph-cpu',
    subItems: [
      { id: 'diskGateways', label: 'Gateways', filterArg: 'gateways' },
      { id: 'diskGateways', label: 'Adquirentes', filterArg: 'adquirentes' },
      { id: 'diskGateways', label: 'Bandeiras', filterArg: 'bandeiras' },
      { id: 'diskGateways', label: 'MDR', filterArg: 'mdr' },
      { id: 'diskGateways', label: 'Parcelamento', filterArg: 'parcelamento' },
      { id: 'diskGateways', label: 'Métodos de Pagamento', filterArg: 'metodos' },
      { id: 'diskGateways', label: 'Regras Comerciais', filterArg: 'regra' },
      { id: 'diskGateways', label: 'Pagamentos Customizados', filterArg: 'customizados' }
    ]
  },
  {
    id: 'diskTaxas',
    label: 'TAXAS E REGRAS COMERCIAIS',
    icon: 'ph-percent',
    subItems: [
      { id: 'diskTaxas', label: 'Taxas e Custos', filterArg: 'disk' },
      { id: 'diskSpread', label: 'Spread & Adquirentes', filterArg: 'spread' },
      { id: 'diskTaxas', label: 'Simulador Financeiro', filterArg: 'simulador' },
      { id: 'diskTaxas', label: 'Taxas do Produtor', filterArg: 'produtor' },
      { id: 'diskTaxas', label: 'Taxas do Cliente', filterArg: 'cliente' },
      { id: 'diskTaxas', label: 'Histórico de Regras', filterArg: 'historico' }
    ]
  },
  {
    id: 'diskTesouraria',
    label: 'TESOURARIA',
    icon: 'ph-vault',
    subItems: [
      { id: 'diskTesouraria', label: 'Contas Bancárias', filterArg: 'contas' },
      { id: 'diskPix', label: 'PIX', filterArg: 'pix' },
      { id: 'diskCnab', label: 'CNAB', filterArg: 'cnab' },
      { id: 'diskContasPagar', label: 'Contas a Pagar', filterArg: 'overview' },
      { id: 'diskTesouraria', label: 'Pagamentos', filterArg: 'pagamentos' },
      { id: 'diskPagamentosLote', label: 'Pagamentos em Lote', filterArg: 'lote' },
      { id: 'diskTransferencias', label: 'Transferências', filterArg: 'transferencias' },
      { id: 'diskAgendaPagamentos', label: 'Agenda de Pagamentos', filterArg: 'agenda' }
    ]
  },
  {
    id: 'diskConciliacao',
    label: 'CONCILIAÇÃO',
    icon: 'ph-arrows-left-right',
    subItems: [
      { id: 'diskConciliacao', label: 'Bancária', filterArg: 'bancaria' },
      { id: 'diskConciliacao', label: 'Gateways', filterArg: 'gateways' },
      { id: 'diskConciliacao', label: 'Adquirentes', filterArg: 'adquirentes' },
      { id: 'diskConciliacao', label: 'Repasses', filterArg: 'repasses' },
      { id: 'diskConciliacao', label: 'Recebíveis', filterArg: 'recebiveis' },
      { id: 'diskConciliacao', label: 'Divergências', filterArg: 'divergencias' }
    ]
  },
  {
    id: 'diskEstornos',
    label: 'ESTORNOS E CHARGEBACKS',
    icon: 'ph-warning-octagon',
    subItems: [
      { id: 'diskCentralEstornos', label: 'Central de Estornos', filterArg: 'estornos' },
      { id: 'diskEstornos', label: 'Chargebacks e Contestações', filterArg: 'chargebacks' },
      { id: 'diskEstornos', label: 'Impacto Financeiro', filterArg: 'impacto' }
    ]
  },
  {
    id: 'diskFechamentos',
    label: 'FECHAMENTOS E DOSSIÊS',
    icon: 'ph-folder-lock',
    subItems: [
      { id: 'diskFechamentos', label: 'Fechamentos e Dossiês', filterArg: 'fechamentos' },
      { id: 'diskBordero', label: 'Borderôs', filterArg: 'borderos' },
      { id: 'diskFechamentos', label: 'Fechamento por Evento', filterArg: 'evento' },
      { id: 'diskFechamentos', label: 'Dossiê Financeiro', filterArg: 'dossie' },
      { id: 'diskBordero', label: 'Histórico de Fechamentos', filterArg: 'historico' }
    ]
  },
  {
    id: 'diskControladoria',
    label: 'CONTROLADORIA FINANCEIRA',
    icon: 'ph-chart-line-up',
    subItems: [
      { id: 'diskControladoria', label: 'Visão Geral', filterArg: 'visao' },
      { id: 'diskFluxoCaixa', label: 'Fluxo de Caixa', filterArg: 'fluxo' },
      { id: 'diskProjecoes', label: 'Projeção de Caixa', filterArg: 'projecoes' },
      { id: 'diskDre', label: 'DRE Gerencial', filterArg: 'dre' },
      { id: 'diskAdvanced', label: 'Financeiro Advanced', filterArg: 'advanced' },
      { id: 'diskRentabilidade', label: 'Rentabilidade', filterArg: 'rentabilidade' },
      { id: 'diskCentrosCustos', label: 'Centros de Custos', filterArg: 'centros' },
      { id: 'diskOrcamentos', label: 'Orçamentos', filterArg: 'orcamentos' }
    ]
  },
  {
    id: 'diskFornecedores',
    label: 'FORNECEDORES',
    icon: 'ph-truck',
    subItems: [
      { id: 'diskFornecedores', label: 'Cadastro', filterArg: 'cadastro' },
      { id: 'diskFornecedores', label: 'Contratos', filterArg: 'contratos' },
      { id: 'diskFornecedores', label: 'Documentos', filterArg: 'documentos' },
      { id: 'diskFornecedores', label: 'Cotações', filterArg: 'cotacoes' },
      { id: 'diskFornecedores', label: 'Pedidos', filterArg: 'pedidos' },
      { id: 'diskFornecedores', label: 'Recebimentos', filterArg: 'recebimentos' },
      { id: 'diskFornecedores', label: 'Parcelas', filterArg: 'parcelas' },
      { id: 'diskFornecedores', label: 'Vencimentos', filterArg: 'vencimentos' }
    ]
  },
  {
    id: 'diskLedger',
    label: 'LEDGER FINANCEIRO',
    icon: 'ph-book-bookmark',
    subItems: [
      { id: 'diskLedger', label: 'Movimentações', filterArg: 'movimentacoes' },
      { id: 'diskLedger', label: 'Lançamentos', filterArg: 'lancamentos' },
      { id: 'diskLedger', label: 'Ajustes', filterArg: 'ajustes' },
      { id: 'diskLedger', label: 'Reservas', filterArg: 'reservas' },
      { id: 'diskLedger', label: 'Rastreabilidade', filterArg: 'rastreabilidade' }
    ]
  },
  {
    id: 'diskRelatorios',
    label: 'RELATÓRIOS',
    icon: 'ph-file-text',
    subItems: [
      { id: 'diskRelatorios_extrato', label: 'Extrato Financeiro' },
      { id: 'diskRelatorios_evento', label: 'Relatórios por Evento' },
      { id: 'diskRelatorios_produtor', label: 'Relatórios por Produtor' },
      { id: 'diskRelatorios_consolidado', label: 'Relatório Consolidado' },
      { id: 'diskRelatorios_receitas', label: 'Receitas' },
      { id: 'diskRelatorios_despesas', label: 'Despesas' },
      { id: 'diskRelatorios_taxas', label: 'Taxas' },
      { id: 'diskRelatorios_repasses', label: 'Repasses' },
      { id: 'diskRelatorios_antecipacoes', label: 'Antecipações' }
    ]
  },
  {
    id: 'diskAssinaturas',
    label: 'ASSINATURAS E INTEGRAÇÕES',
    icon: 'ph-seal-check',
    subItems: [
      { id: 'diskIntegracao_assinaturas', label: 'Central de Assinaturas', filterArg: 'assinaturas' },
      { id: 'diskIntegracao_documentos', label: 'Documentos', filterArg: 'documentos' },
      { id: 'diskIntegracao_autentique', label: 'Autentique', filterArg: 'autentique' },
      { id: 'diskIntegracao_contaazul', label: 'Conta Azul', filterArg: 'contaazul' },
      { id: 'diskIntegracao_sincronizacoes', label: 'Sincronizações', filterArg: 'sincronizacoes' },
      { id: 'diskIntegracao_logs', label: 'Logs de Integração', filterArg: 'logs' }
    ]
  },
  {
    id: 'diskGovernanca',
    label: 'GOVERNANÇA FINANCEIRA',
    icon: 'ph-shield-check',
    subItems: [
      { id: 'diskGovernanca_visao', label: 'Visão Geral', filterArg: 'visao' },
      { id: 'diskGovernanca_usuarios', label: 'Usuários Financeiros', filterArg: 'usuarios' },
      { id: 'diskGovernanca_perfis', label: 'Perfis e Permissões', filterArg: 'perfis' },
      { id: 'diskGovernanca_alcadas', label: 'Alçadas de Aprovação', filterArg: 'alcadas' },
      { id: 'diskGovernanca_fluxos', label: 'Fluxos de Aprovação', filterArg: 'fluxos' },
      { id: 'diskGovernanca_segregacao', label: 'Segregação de Funções', filterArg: 'segregacao' },
      { id: 'diskGovernanca_sensiveis', label: 'Operações Sensíveis', filterArg: 'sensiveis' },
      { id: 'diskGovernanca_bloqueios', label: 'Bloqueios e Exceções', filterArg: 'bloqueios' },
      { id: 'diskGovernanca_acessos', label: 'Auditoria de Acessos', filterArg: 'acessos' },
      { id: 'diskGovernanca_configuracoes', label: 'Configurações', filterArg: 'configuracoes' }
    ]
  },
  {
    id: 'diskRH',
    label: 'RECURSOS HUMANOS (RH DISK)',
    icon: 'ph-users-three',
    subItems: [
      { id: 'diskRH_visao', label: 'Visão Geral RH', filterArg: 'visao', icon: 'ph-squares-four' },
      { id: 'diskRH_aprovacoes', label: 'Central de Aprovações', filterArg: 'aprovacoes', icon: 'ph-check-square-offset' },
      { id: 'diskRH_grupo_pessoas', label: 'PESSOAS E ESTRUTURA', icon: 'ph-identification-card', group: true, subItems: [
        { id: 'diskRH_dashPessoas', label: 'Dashboard de Pessoas', filterArg: 'dash_pessoas', icon: 'ph-gauge' },
        { id: 'diskRH_colaboradores', label: 'Colaboradores', filterArg: 'colaboradores' },
        { id: 'diskRH_organograma', label: 'Estrutura Organizacional', filterArg: 'organograma' },
        { id: 'diskRH_cargosSalarios', label: 'Cargos e Salários', filterArg: 'cargos_salarios' },
        { id: 'diskRH_documentos', label: 'Documentos e Assinaturas', filterArg: 'documentos' },
        { id: 'diskRH_patrimonio', label: 'Patrimônio do Colaborador', filterArg: 'patrimonio' }
      ]},
      { id: 'diskRH_grupo_dp', label: 'DEPARTAMENTO PESSOAL', icon: 'ph-briefcase', group: true, subItems: [
        { id: 'diskRH_dashDP', label: 'Dashboard Departamento Pessoal', filterArg: 'dash_dp', icon: 'ph-gauge' },
        { id: 'diskRH_admissao', label: 'Admissão Digital', filterArg: 'admissao' },
        { id: 'diskRH_onboarding', label: 'Onboarding', filterArg: 'onboarding' },
        { id: 'diskRH_ferias', label: 'Férias', filterArg: 'ferias' },
        { id: 'diskRH_ausencias', label: 'Ausências e Afastamentos', filterArg: 'ausencias' },
        { id: 'diskRH_atestados', label: 'Atestados', filterArg: 'atestados' },
        { id: 'diskRH_folha', label: 'Folha e Pagamentos RH', filterArg: 'folha' },
        { id: 'diskRH_folhaCompleta', label: 'Folha de Pagamento Completa', filterArg: 'folha_completa' },
        { id: 'diskRH_decimo', label: '13º Salário', filterArg: 'decimo' },
        { id: 'diskRH_beneficios', label: 'Benefícios', filterArg: 'beneficios' },
        { id: 'diskRH_rescisoes', label: 'Rescisões', filterArg: 'rescisoes' },
        { id: 'diskRH_desligamentos', label: 'Desligamentos e Offboarding', filterArg: 'desligamentos' },
        { id: 'diskRH_esocial', label: 'eSocial', filterArg: 'esocial' }
      ]},
      { id: 'diskRH_grupo_ponto', label: 'PONTO E JORNADA', icon: 'ph-clock', group: true, subItems: [
        { id: 'diskRH_dashPonto', label: 'Dashboard Ponto e Jornada', filterArg: 'dash_ponto', icon: 'ph-gauge' },
        { id: 'diskRH_ponto', label: 'Ponto e Jornada', filterArg: 'ponto' },
        { id: 'diskRH_geofences', label: 'Cercas Virtuais (Geofences)', filterArg: 'geofences' }
      ]},
      { id: 'diskRH_grupo_talentos', label: 'TALENTOS E DESENVOLVIMENTO', icon: 'ph-chart-line-up', group: true, subItems: [
        { id: 'diskRH_dashTalentos', label: 'Dashboard de Talentos', filterArg: 'dash_talentos', icon: 'ph-gauge' },
        { id: 'diskRH_recrutamento', label: 'Recrutamento e Seleção', filterArg: 'recrutamento' },
        { id: 'diskRH_desempenho', label: 'Desempenho e PDI', filterArg: 'desempenho' },
        { id: 'diskRH_treinamentos', label: 'Treinamentos', filterArg: 'treinamentos' }
      ]},
      { id: 'diskRH_grupo_sst', label: 'SAÚDE E SEGURANÇA', icon: 'ph-first-aid-kit', group: true, subItems: [
        { id: 'diskRH_dashSST', label: 'Dashboard SST', filterArg: 'dash_sst', icon: 'ph-gauge' },
        { id: 'diskRH_sst', label: 'SST e Medicina do Trabalho', filterArg: 'sst' },
        { id: 'diskRH_epis', label: 'EPIs e Segurança', filterArg: 'epis' }
      ]},
      { id: 'diskRH_grupo_eventos', label: 'EVENTOS E CUSTOS', icon: 'ph-calendar-check', group: true, subItems: [
        { id: 'diskRH_dashEventos', label: 'Dashboard Eventos e Custos', filterArg: 'dash_eventos', icon: 'ph-gauge' },
        { id: 'diskRH_equipesEvento', label: 'Equipes por Evento', filterArg: 'equipes_evento' },
        { id: 'diskRH_freelancers', label: 'Temporários e Freelancers', filterArg: 'freelancers' },
        { id: 'diskRH_custosEvento', label: 'Custos de Pessoal por Evento', filterArg: 'custos_evento' },
        { id: 'diskRH_centroCustos', label: 'Centro de Custos de RH', filterArg: 'centro_custos' },
        { id: 'diskRH_reembolsos', label: 'Despesas e Reembolsos', filterArg: 'reembolsos' }
      ]},
      { id: 'diskRH_grupo_portais', label: 'PORTAIS E GESTÃO', icon: 'ph-user-switch', group: true, subItems: [
        { id: 'diskRH_dashGestao', label: 'Dashboard do Gestor', filterArg: 'dash_gestao', icon: 'ph-gauge' },
        { id: 'diskRH_portalColaborador', label: 'Portal do Colaborador', filterArg: 'portal_colaborador' },
        { id: 'diskRH_portalGestor', label: 'Portal do Gestor', filterArg: 'portal_gestor' },
        { id: 'diskRH_relatorios', label: 'Relatórios e People Analytics', filterArg: 'relatorios' }
      ]},
      { id: 'diskRH_grupo_admin', label: 'ADMINISTRAÇÃO DO RH', icon: 'ph-gear-six', group: true, subItems: [
        { id: 'diskRH_dashAdmin', label: 'Dashboard Administração RH', filterArg: 'dash_admin', icon: 'ph-gauge' },
        { id: 'diskRH_integracoes', label: 'Integrações de RH', filterArg: 'integracoes' },
        { id: 'diskRH_configuracoes', label: 'Configurações de RH', filterArg: 'configuracoes' },
        { id: 'diskRH_auditoria', label: 'Auditoria e LGPD', filterArg: 'auditoria' }
      ]}
    ]
  }];

export const menuAdministradorCompleto = menuFinanceiroCompleto.map(item => ({
  ...item
}));

export const menusPorPerfil = {
  PRODUTOR: menuProdutor,
  FINANCEIRO: menuFinanceiroCompleto,
  ADMINISTRADOR: menuAdministradorCompleto,
};
