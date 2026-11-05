/**
 * Definição Oficial da Estrutura de Navegação do Financeiro Disk (Backoffice Enterprise)
 * Arquivo: src/financeiro/menuFinanceiro.ts
 */

import { MenuItem } from '../produtor/menuProdutor';

export const menuFinanceiro: MenuItem[] = [
  {
    id: "fin-dashboard",
    label: "Dashboard Geral",
    rota: "/financeiro/dashboard",
    icone: "ph-chart-pie-slice"
  },
  {
    id: "fin-produtores",
    label: "Produtores",
    rota: "/financeiro/produtores",
    icone: "ph-buildings",
    subitens: [
      {
        id: "produtores-todos",
        label: "Todos os Produtores",
        rota: "/financeiro/produtores",
        icone: "ph-users"
      },
      {
        id: "produtores-conta",
        label: "Conta Financeira",
        rota: "/financeiro/produtores/conta",
        icone: "ph-bank"
      },
      {
        id: "produtores-historico",
        label: "Histórico",
        rota: "/financeiro/produtores/historico",
        icone: "ph-clock-counter-clockwise"
      }
    ]
  },
  {
    id: "fin-eventos",
    label: "Eventos",
    rota: "/financeiro/eventos",
    icone: "ph-calendar",
    subitens: [
      {
        id: "eventos-todos",
        label: "Todos os Eventos",
        rota: "/financeiro/eventos",
        icone: "ph-calendar-check"
      },
      {
        id: "eventos-posicao",
        label: "Posição Financeira",
        rota: "/financeiro/eventos/posicao",
        icone: "ph-chart-line-up"
      },
      {
        id: "eventos-fechamentos",
        label: "Fechamentos",
        rota: "/financeiro/eventos/fechamentos",
        icone: "ph-file-lock"
      }
    ]
  },
  {
    id: "fin-solicitacoes",
    label: "Solicitações",
    rota: "/financeiro/solicitacoes",
    icone: "ph-files",
    subitens: [
      {
        id: "sol-todas",
        label: "Todas as Solicitações",
        rota: "/financeiro/solicitacoes",
        icone: "ph-stack"
      },
      {
        id: "sol-repasses",
        label: "Repasses",
        rota: "/financeiro/solicitacoes/repasses",
        icone: "ph-money"
      },
      {
        id: "sol-antecipacoes",
        label: "Antecipações",
        rota: "/financeiro/solicitacoes/antecipacoes",
        icone: "ph-trend-up"
      },
      {
        id: "sol-borderos",
        label: "Borderôs",
        rota: "/financeiro/solicitacoes/borderos",
        icone: "ph-signature"
      }
    ]
  },
  {
    id: "fin-aprovacoes",
    label: "Central de Aprovações",
    rota: "/financeiro/aprovacoes",
    icone: "ph-scales",
    badge: "17",
    badgeCor: "danger",
    subitens: [
      {
        id: "aprov-pendentes",
        label: "Pendentes",
        rota: "/financeiro/aprovacoes/pendentes",
        icone: "ph-hourglass",
        badge: "17",
        badgeCor: "danger"
      },
      {
        id: "aprov-analise",
        label: "Em Análise",
        rota: "/financeiro/aprovacoes/em-analise",
        icone: "ph-magnifying-glass"
      },
      {
        id: "aprov-aprovadas",
        label: "Aprovadas",
        rota: "/financeiro/aprovacoes/aprovadas",
        icone: "ph-check-circle"
      },
      {
        id: "aprov-rejeitadas",
        label: "Rejeitadas",
        rota: "/financeiro/aprovacoes/rejeitadas",
        icone: "ph-x-circle"
      }
    ]
  },
  {
    id: "fin-saldos",
    label: "Saldos",
    rota: "/financeiro/saldos",
    icone: "ph-currency-circle-dollar"
  },
  {
    id: "fin-repasses",
    label: "Repasses",
    rota: "/financeiro/repasses",
    icone: "ph-hand-coins"
  },
  {
    id: "fin-antecipacoes",
    label: "Antecipações",
    rota: "/financeiro/antecipacoes",
    icone: "ph-trend-up"
  },
  {
    id: "fin-recebiveis",
    label: "Recebíveis",
    rota: "/financeiro/recebiveis",
    icone: "ph-arrow-up-right"
  },
  {
    id: "fin-taxas",
    label: "Taxas e Regras Comerciais",
    rota: "/financeiro/taxas",
    icone: "ph-percent"
  },
  {
    id: "fin-gateways",
    label: "Gateways e Adquirentes",
    rota: "/financeiro/gateways",
    icone: "ph-cpu"
  },
  {
    id: "fin-estornos",
    label: "Estornos e Chargebacks",
    rota: "/financeiro/estornos-chargebacks",
    icone: "ph-warning-octagon"
  },
  {
    id: "fin-conciliacao",
    label: "Conciliação",
    rota: "/financeiro/conciliacao",
    icone: "ph-arrows-left-right"
  },
  {
    id: "fin-contas-pagar",
    label: "Contas a Pagar",
    rota: "/financeiro/contas-pagar",
    icone: "ph-trend-down"
  },
  {
    id: "fin-contas-receber",
    label: "Contas a Receber",
    rota: "/financeiro/contas-receber",
    icone: "ph-arrow-up-right"
  },
  {
    id: "fin-tesouraria",
    label: "Tesouraria",
    rota: "/financeiro/tesouraria",
    icone: "ph-vault"
  },
  {
    id: "fin-ledger",
    label: "Ledger Financeiro",
    rota: "/financeiro/ledger",
    icone: "ph-book-bookmark"
  },
  {
    id: "fin-borderos",
    label: "Borderôs e Fechamentos",
    rota: "/financeiro/borderos",
    icone: "ph-signature"
  },
  {
    id: "fin-fluxo-caixa",
    label: "Fluxo de Caixa",
    rota: "/financeiro/fluxo-caixa",
    icone: "ph-presentation-chart"
  },
  {
    id: "fin-assinaturas",
    label: "Assinaturas Digitais",
    rota: "/financeiro/assinaturas",
    icone: "ph-signature"
  },
  {
    id: "fin-relatorios",
    label: "Relatórios",
    rota: "/financeiro/relatorios",
    icone: "ph-file-text"
  },
  {
    id: "fin-auditoria",
    label: "Auditoria",
    rota: "/financeiro/auditoria",
    icone: "ph-scroll"
  },
  {
    id: "fin-configuracoes",
    label: "Configurações",
    rota: "/financeiro/configuracoes",
    icone: "ph-gear"
  }
];
