/**
 * Definição Oficial da Estrutura de Navegação do Portal do Produtor
 * Arquivo: src/produtor/menuProdutor.ts
 * 
 * Regra: O Produtor não possui sequer as rotas administrativas no menu.
 */

export interface MenuItem {
  id: string;
  label: string;
  rota: string;
  icone: string;
  badge?: string;
  badgeCor?: string;
  subitens?: MenuItem[];
}

export const menuProdutor: MenuItem[] = [
  {
    id: "visao-geral",
    label: "Visão Geral",
    rota: "/produtor/dashboard",
    icone: "ph-chart-pie-slice"
  },
  {
    id: "saldos",
    label: "Saldos",
    rota: "/produtor/saldos",
    icone: "ph-currency-circle-dollar"
  },
  {
    id: "extrato",
    label: "Extrato",
    rota: "/produtor/extrato",
    icone: "ph-receipt"
  },
  {
    id: "repasses",
    label: "Repasses",
    rota: "/produtor/repasses",
    icone: "ph-hand-coins",
    subitens: [
      {
        id: "repasses-solicitar",
        label: "Solicitar Repasse",
        rota: "/produtor/repasses/novo",
        icone: "ph-plus-circle"
      },
      {
        id: "repasses-minhas-solicitacoes",
        label: "Minhas Solicitações",
        rota: "/produtor/repasses/historico",
        icone: "ph-clock-countdown"
      }
    ]
  },
  {
    id: "antecipacoes",
    label: "Antecipações",
    rota: "/produtor/antecipacoes",
    icone: "ph-trend-up",
    subitens: [
      {
        id: "antecipacoes-simular",
        label: "Simular",
        rota: "/produtor/antecipacoes/simular",
        icone: "ph-calculator"
      },
      {
        id: "antecipacoes-solicitar",
        label: "Solicitar Antecipação",
        rota: "/produtor/antecipacoes/solicitar",
        icone: "ph-arrow-up-right"
      },
      {
        id: "antecipacoes-minhas",
        label: "Minhas Solicitações",
        rota: "/produtor/antecipacoes/historico",
        icone: "ph-files"
      }
    ]
  },
  {
    id: "vendas",
    label: "Vendas e Recebimentos",
    rota: "/produtor/vendas",
    icone: "ph-shopping-cart"
  },
  {
    id: "taxas",
    label: "Taxas e Descontos",
    rota: "/produtor/taxas",
    icone: "ph-percent"
  },
  {
    id: "estornos",
    label: "Estornos e Chargebacks",
    rota: "/produtor/ocorrencias",
    icone: "ph-warning-octagon"
  },
  {
    id: "borderos",
    label: "Borderôs",
    rota: "/produtor/borderos",
    icone: "ph-signature",
    subitens: [
      {
        id: "borderos-abertos",
        label: "Em Aberto",
        rota: "/produtor/borderos/em-aberto",
        icone: "ph-hourglass"
      },
      {
        id: "borderos-assinatura",
        label: "Aguardando Assinatura",
        rota: "/produtor/borderos/aguardando-assinatura",
        icone: "ph-pencil-simple-line",
        badge: "1",
        badgeCor: "warning"
      },
      {
        id: "borderos-finalizados",
        label: "Finalizados",
        rota: "/produtor/borderos/finalizados",
        icone: "ph-check-circle"
      }
    ]
  },
  {
    id: "relatorios",
    label: "Relatórios",
    rota: "/produtor/relatorios",
    icone: "ph-file-text"
  },
  {
    id: "dados-bancarios",
    label: "Dados Bancários",
    rota: "/produtor/dados-bancarios",
    icone: "ph-credit-card"
  }
];
