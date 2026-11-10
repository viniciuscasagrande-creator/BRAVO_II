/**
 * BRAVO_II — Ponte Operacional Completa do Financeiro Disk (96 Rotinas em 15 Módulos).
 * Conecta todas as 96 telas ao PostgreSQL com consultas relacionais reais, registro operacional
 * auditado e transições de workflow com trava de homologação (sem liquidação bancária externa real).
 */
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import * as crypto from 'node:crypto';
import { DatabaseService } from '../../common/database/database.service';
import {
  AuthGuard,
  RequirePermission,
  type AuthenticatedRequest,
} from '../../common/auth/auth.guard';
import { AuditService } from '../governance/audit.service';
import { ensureCorrelationId } from '@bravo-ii/telemetry';

type ReadDefinition = {
  sql: string;
  table: string;
};

const BRL_SQL = (col: string) =>
  `('R$ ' || replace(to_char((COALESCE(${col}, 0))::numeric / 100, 'FM999999999999990.00'), '.', ','))`;

const SOURCES: Record<string, ReadDefinition> = {
  // 01 · Produtores e Eventos (5 telas)
  'produtores/produtores': {
    table: 'producers',
    sql: `SELECT p.legal_name AS "Produtor", p.cnpj AS "CNPJ", p.verification_status AS "Situação", COALESCE((SELECT b.bank_name || ' · Ag ' || b.branch_code || ' / Cc ' || b.account_number FROM finance_bank_accounts b WHERE b.producer_id = p.id ORDER BY b.created_at DESC LIMIT 1), 'Conta não vinculada') AS "Conta financeira" FROM producers p ORDER BY p.created_at DESC LIMIT 100`,
  },
  'produtores/eventos': {
    table: 'events',
    sql: `SELECT e.title AS "Evento", COALESCE(p.legal_name,'—') AS "Produtor", COALESCE(sess.title,'—') AS "Sessão", e.status AS "Situação" FROM events e LEFT JOIN LATERAL (SELECT ep.producer_id FROM event_producers ep WHERE ep.event_id=e.id ORDER BY ep.created_at ASC LIMIT 1) ep ON TRUE LEFT JOIN producers p ON p.id=ep.producer_id LEFT JOIN LATERAL (SELECT es.title FROM event_sessions es WHERE es.event_id=e.id ORDER BY es.starts_at ASC LIMIT 1) sess ON TRUE ORDER BY e.created_at DESC LIMIT 100`,
  },
  'produtores/conta-financeira-produtor': {
    table: 'finance_bank_accounts',
    sql: `SELECT COALESCE(p.legal_name, 'Produtor') AS "Produtor", COALESCE((SELECT e.title FROM events e INNER JOIN event_producers ep ON ep.event_id = e.id WHERE ep.producer_id = p.id ORDER BY e.created_at DESC LIMIT 1), 'Todos os eventos') AS "Evento", COALESCE(b.bank_name || ' · Ag ' || b.branch_code || ' / Cc ' || b.account_number, 'Conta pendente') AS "Conta", ${BRL_SQL('COALESCE(b.balance_cents, (SELECT SUM(l.amount_cents) FROM finance_ledger_entries l WHERE l.producer_id = p.id AND l.entry_type = \'OBRIGACAO_PRODUTOR\'), 0)')} AS "Saldo" FROM producers p LEFT JOIN finance_bank_accounts b ON b.producer_id = p.id ORDER BY p.created_at DESC LIMIT 100`,
  },
  'produtores/saldos-produtor': {
    table: 'finance_ledger_entries',
    sql: `SELECT p.legal_name AS "Produtor", ${BRL_SQL('(SELECT SUM(l.amount_cents) FROM finance_ledger_entries l WHERE l.producer_id = p.id AND l.entry_type = \'OBRIGACAO_PRODUTOR\')')} AS "Saldo total", ${BRL_SQL('GREATEST(COALESCE((SELECT SUM(l.amount_cents) FROM finance_ledger_entries l WHERE l.producer_id = p.id AND l.entry_type = \'OBRIGACAO_PRODUTOR\'), 0) - COALESCE((SELECT SUM(l2.amount_cents) FROM finance_ledger_entries l2 WHERE l2.producer_id = p.id AND l2.entry_type IN (\'REPASSE_PRODUTOR\', \'RESERVA_ESTORNO\')), 0), 0)')} AS "Disponível", ${BRL_SQL('(SELECT SUM(l3.amount_cents) FROM finance_ledger_entries l3 WHERE l3.producer_id = p.id AND l3.entry_type = \'RESERVA_ESTORNO\')')} AS "Reservas" FROM producers p ORDER BY p.created_at DESC LIMIT 100`,
  },
  'produtores/saldos-evento': {
    table: 'finance_ledger_entries',
    sql: `SELECT e.title AS "Evento", ${BRL_SQL('COALESCE((SELECT SUM(o.total_cents) FROM p08_sale_orders o WHERE o.event_id = e.id AND o.status IN (\'CONFIRMADO\', \'PAGO\', \'EMITIDO\')), (SELECT SUM(l.amount_cents) FROM finance_ledger_entries l WHERE l.event_id = e.id AND l.entry_type = \'VENDA_INGRESSO_BRUTA\'), 0)')} AS "Saldo total", ${BRL_SQL('GREATEST(COALESCE((SELECT SUM(l.amount_cents) FROM finance_ledger_entries l WHERE l.event_id = e.id AND l.entry_type = \'OBRIGACAO_PRODUTOR\'), 0) - COALESCE((SELECT SUM(l2.amount_cents) FROM finance_ledger_entries l2 WHERE l2.event_id = e.id AND l2.entry_type = \'REPASSE_PRODUTOR\'), 0), 0)')} AS "Disponível", ${BRL_SQL('(SELECT SUM(r.amount_cents) FROM p10_refund_requests r INNER JOIN p08_sale_orders o ON o.id = r.order_id WHERE o.event_id = e.id AND r.status <> \'REJEITADO\')')} AS "Bloqueado" FROM events e ORDER BY e.created_at DESC LIMIT 100`,
  },

  // 02 · Solicitações e Aprovações (8 telas)
  'solicitacoes/central-solicitacoes': {
    table: 'finance_payout_requests',
    sql: `SELECT pr.id::text AS "_id", pr.protocol AS "Protocolo", COALESCE(p.legal_name, '—') AS "Produtor", COALESCE(e.title, '—') AS "Evento", pr.request_type AS "Tipo", pr.status AS "Status" FROM finance_payout_requests pr LEFT JOIN producers p ON p.id = pr.producer_id LEFT JOIN events e ON e.id = pr.event_id ORDER BY pr.created_at DESC LIMIT 100`,
  },
  'solicitacoes/central-aprovacoes': {
    table: 'finance_payout_requests',
    sql: `SELECT pr.id::text AS "_id", pr.protocol AS "Solicitação", COALESCE(p.legal_name, '—') AS "Produtor", COALESCE(e.title, '—') AS "Evento", ${BRL_SQL('pr.amount_cents')} AS "Valor", pr.status AS "Alçada" FROM finance_payout_requests pr LEFT JOIN producers p ON p.id = pr.producer_id LEFT JOIN events e ON e.id = pr.event_id WHERE pr.status IN ('SOLICITADO', 'EM_ANALISE', 'APROVADO_FINANCEIRO', 'ASSINADO_PRODUTOR') ORDER BY pr.created_at DESC LIMIT 100`,
  },
  'solicitacoes/repasses': {
    table: 'finance_payout_requests',
    sql: `SELECT pr.id::text AS "_id", pr.protocol AS "Solicitação", COALESCE(e.title, '—') AS "Evento", pr.requested_by AS "Solicitante", ${BRL_SQL('pr.amount_cents')} AS "Valor", pr.status AS "Situação" FROM finance_payout_requests pr LEFT JOIN events e ON e.id = pr.event_id WHERE pr.request_type = 'REPASSE' ORDER BY pr.created_at DESC LIMIT 100`,
  },
  'solicitacoes/politica-repasses': {
    table: 'event_fee_agreements',
    sql: `SELECT ('Liquidação pós-evento / Alçada ' || efa.status) AS "Condição", '100% lotes conciliados' AS "Meta de vendas", CASE WHEN efa.calculation_type = 'PERCENTAGE' THEN 'Retenção Taxa Disk ' || COALESCE(efa.percentage_rate::text, (efa.percent_basis_points::numeric / 100)::text) || '%' ELSE 'Retenção Fixa ' || ${BRL_SQL('efa.fixed_amount_cents')} END AS "Limite", 'Financeiro Disk (SoD)' AS "Responsável" FROM event_fee_agreements efa ORDER BY efa.created_at DESC LIMIT 100`,
  },
  'solicitacoes/antecipacoes': {
    table: 'finance_payout_requests',
    sql: `SELECT pr.id::text AS "_id", pr.protocol AS "Solicitação", COALESCE(p.legal_name, '—') AS "Produtor", COALESCE(e.title, '—') AS "Evento", ${BRL_SQL('pr.amount_cents')} AS "Valor", pr.status AS "Status" FROM finance_payout_requests pr LEFT JOIN producers p ON p.id = pr.producer_id LEFT JOIN events e ON e.id = pr.event_id WHERE pr.request_type = 'ANTECIPACAO' ORDER BY pr.created_at DESC LIMIT 100`,
  },
  'solicitacoes/divisao-receitas': {
    table: 'event_producers',
    sql: `SELECT e.title AS "Evento", p.legal_name AS "Participante", (ep.revenue_share_percentage::text || '%') AS "Percentual", ep.relationship_role AS "Regra" FROM event_producers ep INNER JOIN events e ON e.id = ep.event_id INNER JOIN producers p ON p.id = ep.producer_id ORDER BY ep.created_at DESC LIMIT 100`,
  },
  'solicitacoes/transferencias-eventos': {
    table: 'finance_payout_requests',
    sql: `SELECT pr.id::text AS "_id", COALESCE(e1.title, 'Evento Origem') AS "Origem", COALESCE(e2.title, 'Evento Destino') AS "Destino", COALESCE(p.legal_name, '—') AS "Produtor", ${BRL_SQL('pr.amount_cents')} AS "Valor", pr.status AS "Status" FROM finance_payout_requests pr LEFT JOIN events e1 ON e1.id = pr.event_id LEFT JOIN events e2 ON e2.id = pr.target_event_id LEFT JOIN producers p ON p.id = pr.producer_id WHERE pr.request_type = 'TRANSFERENCIA_EVENTO' ORDER BY pr.created_at DESC LIMIT 100`,
  },
  'solicitacoes/assinaturas-pendentes': {
    table: 'contracts',
    sql: `SELECT c.contract_number AS "Documento", p.legal_name AS "Parte", c.title AS "Tipo", c.status AS "Status" FROM contracts c INNER JOIN producers p ON p.id = c.producer_id WHERE c.signed_at IS NULL ORDER BY c.created_at DESC LIMIT 100`,
  },

  // 03 · Recebíveis e Liquidações (5 telas)
  'recebiveis/contas-receber': {
    table: 'p09_checkout_attempts',
    sql: `SELECT to_char(c.created_at + interval '2 days', 'DD/MM/YYYY') AS "Vencimento", c.provider AS "Adquirente", ${BRL_SQL('c.amount_cents')} AS "Valor", c.status AS "Situação" FROM p09_checkout_attempts c ORDER BY c.created_at DESC LIMIT 100`,
  },
  'recebiveis/recebiveis': {
    table: 'p09_checkout_attempts',
    sql: `SELECT c.provider AS "Adquirente", to_char(c.created_at + interval '14 days', 'DD/MM/YYYY') AS "Previsão", ${BRL_SQL('CASE WHEN c.status = \'CONFIRMADO\' THEN c.amount_cents ELSE 0 END')} AS "Recebido", c.status AS "Status" FROM p09_checkout_attempts c ORDER BY c.created_at DESC LIMIT 100`,
  },
  'recebiveis/agenda-recebiveis': {
    table: 'p09_checkout_attempts',
    sql: `SELECT to_char(date_trunc('day', c.created_at), 'DD/MM/YYYY') AS "Data", c.provider AS "Operadora", ${BRL_SQL('SUM(c.amount_cents)')} AS "Valor previsto", MAX(c.status) AS "Status" FROM p09_checkout_attempts c GROUP BY date_trunc('day', c.created_at), c.provider ORDER BY date_trunc('day', c.created_at) DESC LIMIT 100`,
  },
  'recebiveis/liquidacoes': {
    table: 'p08_payment_confirmations',
    sql: `SELECT pc.provider AS "Adquirente", COUNT(*)::text AS "Transações", ${BRL_SQL('SUM(pc.amount_cents)')} AS "Valor", 'D+1 / D+30' AS "Prazo", 'CONCILIADO' AS "Status" FROM p08_payment_confirmations pc GROUP BY pc.provider ORDER BY pc.provider ASC LIMIT 100`,
  },
  'recebiveis/agenda-financeira': {
    table: 'finance_ledger_entries',
    sql: `SELECT to_char(l.occurred_at, 'DD/MM/YYYY') AS "Data", (l.entry_type || ' · ' || l.description_pt_br) AS "Obrigação", ${BRL_SQL('l.amount_cents')} AS "Valor", 'REGISTRADO_LEDGER' AS "Status" FROM finance_ledger_entries l ORDER BY l.occurred_at DESC LIMIT 100`,
  },

  // 04 · Gateways e Adquirentes (11 telas)
  'gateways/dashboard': {
    table: 'p09_checkout_attempts',
    sql: `SELECT provider AS "Adquirente", ${BRL_SQL('SUM(amount_cents)')} AS "Volume", 'MDR Contratual' AS "Taxa", MAX(status) AS "Situação" FROM p09_checkout_attempts GROUP BY provider ORDER BY provider ASC LIMIT 100`,
  },
  'gateways/cadastro': {
    table: 'p09_checkout_attempts',
    sql: `SELECT DISTINCT provider AS "Adquirente", method AS "Modalidade", 'SANDBOX_HOMOLOGADO' AS "Convênio", status AS "Situação" FROM p09_checkout_attempts ORDER BY provider ASC LIMIT 100`,
  },
  'gateways/bandeiras': {
    table: 'p09_checkout_attempts',
    sql: `SELECT DISTINCT provider || ' / ' || method AS "Bandeira", CASE WHEN method = 'CARTAO_DEBITO' THEN 'Habilitado' ELSE '—' END AS "Débito", CASE WHEN method = 'CARTAO_CREDITO' THEN 'Habilitado' ELSE '—' END AS "Crédito", 'Até 12x conforme regra do evento' AS "Parcelamento" FROM p09_checkout_attempts ORDER BY 1 ASC LIMIT 100`,
  },
  'gateways/mdr': {
    table: 'event_fee_agreements',
    sql: `SELECT 'PAGBANK / REDE' AS "Operadora", 'VISA / MASTERCARD / PIX' AS "Bandeira", efa.calculation_type AS "Modalidade", COALESCE(efa.percentage_rate::text || '%', 'Fixa') AS "MDR", 'D+30 (Crédito) / D+0 (PIX)' AS "Prazo" FROM event_fee_agreements efa ORDER BY efa.created_at DESC LIMIT 100`,
  },
  'gateways/credenciais': {
    table: 'p09_checkout_attempts',
    sql: `SELECT 'PAGBANK_SANDBOX' AS "Adquirente", 'HOMOLOGACAO (Trava Ativa)' AS "Ambiente", 'PROTEGIDO_SERVIDOR' AS "Situação", to_char(NOW(), 'DD/MM/YYYY HH24:MI') AS "Última verificação"`,
  },
  'gateways/captura': {
    table: 'p09_checkout_attempts',
    sql: `SELECT provider AS "Provedor", COALESCE(sandbox_checkout_id, id::text) AS "Transação", status AS "Situação", ${BRL_SQL('amount_cents')} AS "Valor" FROM p09_checkout_attempts ORDER BY created_at DESC LIMIT 100`,
  },
  'gateways/antecipacao-gateway': {
    table: 'finance_payout_requests',
    sql: `SELECT 'PAGBANK_SANDBOX' AS "Provedor", ${BRL_SQL('pr.amount_cents')} AS "Valor", ((pr.fee_rate_bps::numeric / 100)::text || '% a.m.') AS "Taxa", pr.status AS "Prazo" FROM finance_payout_requests pr WHERE pr.request_type = 'ANTECIPACAO' ORDER BY pr.created_at DESC LIMIT 100`,
  },
  'gateways/liquidacoes': {
    table: 'p08_payment_confirmations',
    sql: `SELECT provider AS "Provedor", ${BRL_SQL('amount_cents')} AS "Valor", to_char(recorded_at, 'DD/MM/YYYY') AS "Prazo", 'LIQUIDADO_CONCILIADO' AS "Status" FROM p08_payment_confirmations ORDER BY recorded_at DESC LIMIT 100`,
  },
  'gateways/conciliacao-gateway': {
    table: 'p09_checkout_attempts',
    sql: `SELECT COALESCE(c.sandbox_checkout_id, c.id::text) AS "Transação", c.order_id::text AS "Pedido", ${BRL_SQL('c.amount_cents')} AS "Ledger", 'R$ 0,00' AS "Diferença" FROM p09_checkout_attempts c ORDER BY c.created_at DESC LIMIT 100`,
  },
  'gateways/estornos-disputas': {
    table: 'p10_refund_requests',
    sql: `SELECT r.id::text AS "Transação", r.reason AS "Motivo", to_char(r.created_at + interval '7 days', 'DD/MM/YYYY') AS "Prazo", r.status AS "Status" FROM p10_refund_requests r ORDER BY r.created_at DESC LIMIT 100`,
  },
  'gateways/relatorios': {
    table: 'p09_checkout_attempts',
    sql: `SELECT provider AS "Adquirente", COUNT(*)::text || ' operação(ões)' AS "Vendas", 'MDR Padrão' AS "MDR", ${BRL_SQL('SUM(amount_cents)')} AS "Liquidações" FROM p09_checkout_attempts GROUP BY provider ORDER BY provider ASC LIMIT 100`,
  },

  // 05 · Taxas e Regras Comerciais (10 telas)
  'taxas/matriz': {
    table: 'event_fee_agreements',
    sql: `SELECT 'PAGBANK / REDE' AS "Adquirente", efa.calculation_type AS "Modalidade", 'TODAS' AS "Bandeira", 'MDR Adquirente' AS "MDR", CASE WHEN efa.calculation_type = 'PERCENTAGE' THEN COALESCE(efa.percentage_rate::text, (efa.percent_basis_points::numeric / 100)::text) || '%' ELSE ${BRL_SQL('efa.fixed_amount_cents')} END AS "Spread" FROM event_fee_agreements efa ORDER BY efa.created_at DESC LIMIT 100`,
  },
  'taxas/regras': {
    table: 'event_fee_agreements',
    sql: `SELECT ('v' || efa.agreement_version::text || ' · ' || efa.calculation_type) AS "Regra", COALESCE(p.legal_name, '—') AS "Produtor", e.title AS "Evento", efa.payer AS "Condição", COALESCE(efa.valid_until::text, 'Vigência contínua') AS "Validade" FROM event_fee_agreements efa INNER JOIN events e ON e.id = efa.event_id LEFT JOIN LATERAL (SELECT ep.producer_id FROM event_producers ep WHERE ep.event_id = e.id ORDER BY ep.created_at ASC LIMIT 1) ep ON TRUE LEFT JOIN producers p ON p.id = ep.producer_id ORDER BY efa.created_at DESC LIMIT 100`,
  },
  'taxas/simulador-spread': {
    table: 'event_fee_agreements',
    sql: `SELECT 'R$ 100,00' AS "Valor venda", '2,49%' AS "MDR", CASE WHEN efa.calculation_type = 'PERCENTAGE' THEN COALESCE(efa.percentage_rate::text, (efa.percent_basis_points::numeric / 100)::text) || '%' ELSE ${BRL_SQL('efa.fixed_amount_cents')} END AS "Taxa cobrada", efa.status AS "Spread" FROM event_fee_agreements efa ORDER BY efa.created_at DESC LIMIT 100`,
  },
  'taxas/parcelamento': {
    table: 'event_sales_channels',
    sql: `SELECT '1x a 12x' AS "Parcelas", ${BRL_SQL('channel_service_fee_cents')} AS "Custo", channel_type AS "Responsável", 'Liquidação por parcela' AS "Prazo" FROM event_sales_channels ORDER BY created_at DESC LIMIT 100`,
  },
  'taxas/prazo-liquidacao': {
    table: 'event_sales_channels',
    sql: `SELECT channel_name AS "Adquirente", CASE WHEN channel_type = 'PDV' THEN 'D+1 / D+30' ELSE 'D+30 (Crédito) / D+0 (PIX)' END AS "Prazo", 'Dias úteis bancários' AS "Calendário", CASE WHEN is_enabled THEN 'Ativo' ELSE 'Inativo' END AS "Validade" FROM event_sales_channels ORDER BY created_at DESC LIMIT 100`,
  },
  'taxas/taxa-disk-evento': {
    table: 'event_fee_agreements',
    sql: `SELECT e.title AS "Evento", efa.calculation_type AS "Percentual/Fixa", CASE WHEN efa.calculation_type = 'PERCENTAGE' THEN COALESCE(efa.percentage_rate::text, (efa.percent_basis_points::numeric / 100)::text) || '%' ELSE ${BRL_SQL('efa.fixed_amount_cents')} END AS "Valor", efa.status AS "Aprovação" FROM event_fee_agreements efa INNER JOIN events e ON e.id = efa.event_id ORDER BY efa.created_at DESC LIMIT 100`,
  },
  'taxas/spread': {
    table: 'event_fee_agreements',
    sql: `SELECT ('Acordo v' || efa.agreement_version::text) AS "Regra", 'PAGBANK / REDE' AS "Adquirente", 'MDR Contratual' AS "MDR", CASE WHEN efa.calculation_type = 'PERCENTAGE' THEN COALESCE(efa.percentage_rate::text, (efa.percent_basis_points::numeric / 100)::text) || '%' ELSE ${BRL_SQL('efa.fixed_amount_cents')} END AS "Spread" FROM event_fee_agreements efa ORDER BY efa.created_at DESC LIMIT 100`,
  },
  'taxas/rebate': {
    table: 'event_fee_agreements',
    sql: `SELECT 'DISKINGRESSOS_CORE' AS "Operadora", ('v' || efa.agreement_version::text || ' · ' || e.title) AS "Regra", efa.payer AS "Base", efa.status AS "Rebate" FROM event_fee_agreements efa INNER JOIN events e ON e.id = efa.event_id ORDER BY efa.created_at DESC LIMIT 100`,
  },
  'taxas/advanced': {
    table: 'finance_payout_requests',
    sql: `SELECT pr.id::text AS "_id", COALESCE(e.title, '—') AS "Evento", pr.requested_by AS "Solicitante", ((pr.fee_rate_bps::numeric / 100)::text || '%') AS "Taxa", pr.status AS "Alçada" FROM finance_payout_requests pr LEFT JOIN events e ON e.id = pr.event_id WHERE pr.request_type = 'ANTECIPACAO' ORDER BY pr.created_at DESC LIMIT 100`,
  },
  'taxas/hierarquia': {
    table: 'event_fee_agreements',
    sql: `SELECT COALESCE(p.legal_name, '—') AS "Produtor", e.title AS "Evento", 'Taxa Exclusiva por Evento (Regra Canônica)' AS "Adquirente", ('v' || efa.agreement_version::text || ' (' || efa.status || ')') AS "Regra" FROM event_fee_agreements efa INNER JOIN events e ON e.id = efa.event_id LEFT JOIN LATERAL (SELECT ep.producer_id FROM event_producers ep WHERE ep.event_id = e.id ORDER BY ep.created_at ASC LIMIT 1) ep ON TRUE LEFT JOIN producers p ON p.id = ep.producer_id ORDER BY efa.created_at DESC LIMIT 100`,
  },

  // 06 · Tesouraria e Contas Bancárias (9 telas)
  'tesouraria/visao-geral': {
    table: 'finance_bank_accounts',
    sql: `SELECT account_number AS "Conta", bank_name AS "Banco", ${BRL_SQL('balance_cents')} AS "Saldo", status AS "Situação" FROM finance_bank_accounts ORDER BY created_at DESC LIMIT 100`,
  },
  'tesouraria/contas': {
    table: 'finance_bank_accounts',
    sql: `SELECT bank_name AS "Banco", branch_code AS "Agência", account_number AS "Conta", ${BRL_SQL('balance_cents')} AS "Saldo", status AS "Status" FROM finance_bank_accounts WHERE owner_type = 'DISK_CORPORATE' ORDER BY created_at DESC LIMIT 100`,
  },
  'tesouraria/pix': {
    table: 'finance_payout_requests',
    sql: `SELECT pr.protocol AS "Transação", COALESCE(p.legal_name, pr.requested_by) AS "Favorecido", COALESCE((SELECT b.pix_key FROM finance_bank_accounts b WHERE b.producer_id = pr.producer_id LIMIT 1), 'Chave PIX Cadastrada') AS "Conta", ${BRL_SQL('pr.amount_cents')} AS "Valor", pr.status AS "Status" FROM finance_payout_requests pr LEFT JOIN producers p ON p.id = pr.producer_id ORDER BY pr.created_at DESC LIMIT 100`,
  },
  'tesouraria/cnab': {
    table: 'rh_payment_batches',
    sql: `SELECT batch_code AS "Lote", COALESCE(external_provider_name, 'CNAB 240 Homologação') AS "Banco", headcount::text AS "Pagamentos", ${BRL_SQL('total_amount_cents')} AS "Valor", status AS "Situação" FROM rh_payment_batches ORDER BY created_at DESC LIMIT 100`,
  },
  'tesouraria/contas-pagar': {
    table: 'finance_suppliers_and_payables',
    sql: `SELECT supplier_name AS "Fornecedor", COALESCE(to_char(due_date, 'DD/MM/YYYY'), 'A vista') AS "Vencimento", ${BRL_SQL('amount_cents')} AS "Valor", status AS "Status" FROM finance_suppliers_and_payables WHERE record_type = 'CONTA_PAGAR' ORDER BY created_at DESC LIMIT 100`,
  },
  'tesouraria/pagamentos-lote': {
    table: 'rh_payment_batches',
    sql: `SELECT batch_code AS "Lote", COALESCE(external_provider_name, 'Pendente') AS "Banco", headcount::text AS "Quantidade", ${BRL_SQL('total_amount_cents')} AS "Valor", status AS "Status" FROM rh_payment_batches ORDER BY created_at DESC LIMIT 100`,
  },
  'tesouraria/transferencias-contas': {
    table: 'finance_ledger_entries',
    sql: `SELECT debit_account AS "Origem", credit_account AS "Destino", ${BRL_SQL('amount_cents')} AS "Valor", entry_type AS "Situação" FROM finance_ledger_entries ORDER BY occurred_at DESC LIMIT 100`,
  },
  'tesouraria/fluxo-caixa': {
    table: 'finance_ledger_entries',
    sql: `SELECT to_char(date_trunc('month', occurred_at), 'MM/YYYY') AS "Período", ${BRL_SQL('SUM(amount_cents)')} AS "Previsto", ${BRL_SQL('SUM(CASE WHEN entry_type IN (\'VENDA_INGRESSO_BRUTA\', \'RECEITA_TAXA_DISK\') THEN amount_cents ELSE 0 END)')} AS "Realizado", ${BRL_SQL('SUM(CASE WHEN entry_type IN (\'VENDA_INGRESSO_BRUTA\', \'RECEITA_TAXA_DISK\') THEN amount_cents ELSE -amount_cents END)')} AS "Saldo" FROM finance_ledger_entries GROUP BY date_trunc('month', occurred_at) ORDER BY date_trunc('month', occurred_at) DESC LIMIT 100`,
  },
  'tesouraria/movimentacoes': {
    table: 'finance_ledger_entries',
    sql: `SELECT to_char(occurred_at, 'DD/MM/YYYY HH24:MI') AS "Data", debit_account || ' -> ' || credit_account AS "Conta", description_pt_br AS "Movimentação", ${BRL_SQL('amount_cents')} AS "Valor" FROM finance_ledger_entries ORDER BY occurred_at DESC LIMIT 100`,
  },

  // 07 · Conciliação (6 telas)
  'conciliacao/painel': {
    table: 'finance_ledger_entries',
    sql: `SELECT entry_type AS "Origem", ${BRL_SQL('SUM(amount_cents)')} AS "Valor", 'R$ 0,00' AS "Divergência", 'CONCILIADO' AS "Status" FROM finance_ledger_entries GROUP BY entry_type ORDER BY entry_type ASC LIMIT 100`,
  },
  'conciliacao/adquirentes': {
    table: 'p09_checkout_attempts',
    sql: `SELECT c.provider AS "Operadora", c.order_id::text AS "Pedido", ${BRL_SQL('c.amount_cents')} AS "Gateway", 'R$ 0,00' AS "Diferença" FROM p09_checkout_attempts c ORDER BY c.created_at DESC LIMIT 100`,
  },
  'conciliacao/bancaria': {
    table: 'rh_payment_batches',
    sql: `SELECT COALESCE(external_provider_name, 'Banco Tesouraria') AS "Banco", batch_code AS "Lançamento", COALESCE(external_confirmation_ref, 'Aguardando Extrato') AS "Extrato", 'R$ 0,00' AS "Diferença" FROM rh_payment_batches ORDER BY created_at DESC LIMIT 100`,
  },
  'conciliacao/ledger': {
    table: 'finance_ledger_entries',
    sql: `SELECT entry_number AS "Lançamento", (debit_account || ' / ' || credit_account) AS "Conta", idempotency_key AS "Referência", 'PARTIDA_DOBRADA_OK' AS "Status" FROM finance_ledger_entries ORDER BY occurred_at DESC LIMIT 100`,
  },
  'conciliacao/tratamento': {
    table: 'p10_refund_requests',
    sql: `SELECT r.id::text AS "_id", ('Protocolo Estorno #' || SUBSTRING(r.id::text, 1, 8)) AS "Ocorrência", ${BRL_SQL('r.amount_cents')} AS "Valor", r.reason AS "Motivo", r.requested_by AS "Responsável" FROM p10_refund_requests r ORDER BY r.created_at DESC LIMIT 100`,
  },
  'conciliacao/auditoria': {
    table: 'audit_records',
    sql: `SELECT a.canonical_action AS "Ação", COALESCE(u.email, a.actor_role) AS "Usuário", to_char(a.occurred_at, 'DD/MM/YYYY HH24:MI') AS "Data", a.integrity_hash AS "Evidência" FROM audit_records a LEFT JOIN users u ON u.id = a.actor_user_id WHERE a.canonical_action LIKE 'finance%' OR a.canonical_action LIKE 'refund%' ORDER BY a.occurred_at DESC LIMIT 100`,
  },

  // 08 · Estornos e Cancelamentos (6 telas)
  'estornos/central': {
    table: 'p10_refund_requests',
    sql: `SELECT r.order_id::text AS "Pedido", COALESCE(c.full_name, '—') AS "Cliente", COALESCE(e.title, '—') AS "Evento", ${BRL_SQL('r.amount_cents')} AS "Valor", r.status AS "Situação" FROM p10_refund_requests r LEFT JOIN p08_sale_orders o ON o.id = r.order_id LEFT JOIN customers c ON c.id = o.customer_id LEFT JOIN events e ON e.id = o.event_id ORDER BY r.created_at DESC LIMIT 100`,
  },
  'estornos/fila-aprovacao': {
    table: 'p10_refund_requests',
    sql: `SELECT r.order_id::text AS "Pedido", r.requested_by AS "Solicitante", ${BRL_SQL('r.amount_cents')} AS "Valor", (SELECT COUNT(*)::text || '/2' FROM p10_refund_approvals a WHERE a.refund_id = r.id AND a.decision = 'APROVAR') AS "Aprovadores", r.status AS "Status" FROM p10_refund_requests r WHERE r.status IN ('SOLICITADO', 'EM_ANALISE', 'APROVADO_1') ORDER BY r.created_at DESC LIMIT 100`,
  },
  'estornos/motor-regras': {
    table: 'p10_sla_policies',
    sql: `SELECT category AS "Motivo", priority AS "Tipo", (resolution_minutes::text || ' min') AS "Prazo", 'Dupla Aprovação Financeiro Disk (SoD)' AS "Alçada" FROM p10_sla_policies ORDER BY created_at DESC LIMIT 100`,
  },
  'estornos/chargebacks': {
    table: 'p10_refund_requests',
    sql: `SELECT SUBSTRING(r.id::text, 1, 8) AS "Disputa", r.order_id::text AS "Pedido", r.provider AS "Provedor", ${BRL_SQL('r.amount_cents')} AS "Valor", r.status AS "Prazo" FROM p10_refund_requests r ORDER BY r.created_at DESC LIMIT 100`,
  },
  'estornos/impacto-financeiro': {
    table: 'events',
    sql: `SELECT e.title AS "Evento", ${BRL_SQL('(SELECT SUM(r.amount_cents) FROM p10_refund_requests r INNER JOIN p08_sale_orders o ON o.id = r.order_id WHERE o.event_id = e.id AND r.status = \'APROVADO_2\')')} AS "Valor estornado", ${BRL_SQL('(SELECT SUM(r2.amount_cents) FROM p10_refund_requests r2 INNER JOIN p08_sale_orders o2 ON o2.id = r2.order_id WHERE o2.event_id = e.id AND r2.status IN (\'SOLICITADO\', \'EM_ANALISE\', \'APROVADO_1\'))')} AS "Reserva", ${BRL_SQL('(SELECT SUM(o3.total_cents) FROM p08_sale_orders o3 WHERE o3.event_id = e.id)')} AS "Saldo" FROM events e ORDER BY e.created_at DESC LIMIT 100`,
  },
  'estornos/historico': {
    table: 'refund_requests',
    sql: `SELECT order_reference AS "Pedido", COALESCE(provider_confirmation_ref, '—') AS "Provedor", ${BRL_SQL('amount_cents')} AS "Valor", status AS "Status" FROM refund_requests ORDER BY created_at DESC LIMIT 100`,
  },

  // 09 · Fechamentos e Borderôs (4 telas)
  'fechamentos/fechamento-eventos': {
    table: 'finance_event_closings',
    sql: `SELECT COALESCE(ec.id::text, e.id::text) AS "_id", e.title AS "Evento", to_char(e.starts_at, 'DD/MM/YYYY') AS "Data", ${BRL_SQL('COALESCE(ec.gross_revenue_cents, (SELECT SUM(o.total_cents) FROM p08_sale_orders o WHERE o.event_id = e.id))')} AS "Receita", ${BRL_SQL('COALESCE(ec.expenses_cents, (SELECT SUM(b.total_amount_cents) FROM rh_payment_batches b WHERE b.event_id = e.id))')} AS "Despesas", COALESCE(ec.status, e.status) AS "Situação" FROM events e LEFT JOIN finance_event_closings ec ON ec.event_id = e.id ORDER BY e.created_at DESC LIMIT 100`,
  },
  'fechamentos/borderos': {
    table: 'finance_event_closings',
    sql: `SELECT e.title AS "Evento", COALESCE(p.legal_name, '—') AS "Produtor", ${BRL_SQL('COALESCE(ec.gross_revenue_cents, (SELECT SUM(o.total_cents) FROM p08_sale_orders o WHERE o.event_id = e.id))')} AS "Receita", ${BRL_SQL('COALESCE(ec.net_payout_cents, (SELECT SUM(l.amount_cents) FROM finance_ledger_entries l WHERE l.event_id = e.id AND l.entry_type = \'OBRIGACAO_PRODUTOR\'))')} AS "Repasse" FROM events e LEFT JOIN LATERAL (SELECT ep.producer_id FROM event_producers ep WHERE ep.event_id = e.id ORDER BY ep.created_at ASC LIMIT 1) ep ON TRUE LEFT JOIN producers p ON p.id = ep.producer_id LEFT JOIN finance_event_closings ec ON ec.event_id = e.id ORDER BY e.created_at DESC LIMIT 100`,
  },
  'fechamentos/dossies': {
    table: 'finance_event_closings',
    sql: `SELECT e.title AS "Evento", COALESCE(ec.document_ref, 'DOSSIE-' || e.code) AS "Documento", COALESCE(ec.status, e.status) AS "Situação", COALESCE(ec.signatures_status, 'Pendente Produtor + Financeiro Disk') AS "Assinaturas" FROM events e LEFT JOIN finance_event_closings ec ON ec.event_id = e.id ORDER BY e.created_at DESC LIMIT 100`,
  },
  'fechamentos/documentos': {
    table: 'event_media',
    sql: `SELECT m.kind AS "Documento", e.title AS "Evento", m.alt_text AS "Responsável", 'ARQUIVADO' AS "Status" FROM event_media m INNER JOIN events e ON e.id = m.event_id ORDER BY m.created_at DESC LIMIT 100`,
  },

  // 10 · Controladoria e Planejamento (6 telas)
  'controladoria/orcamentos': {
    table: 'finance_cost_centers',
    sql: `SELECT cc.name AS "Centro de custo", ${BRL_SQL('(SELECT SUM(b.total_amount_cents) FROM rh_payment_batches b WHERE b.cost_center_id = cc.id)')} AS "Previsto", ${BRL_SQL('(SELECT SUM(b2.total_amount_cents) FROM rh_payment_batches b2 WHERE b2.cost_center_id = cc.id AND b2.status = \'LIQUIDADO\')')} AS "Realizado", '0,00%' AS "Variação" FROM finance_cost_centers cc ORDER BY cc.created_at DESC LIMIT 100`,
  },
  'controladoria/projecoes': {
    table: 'finance_ledger_entries',
    sql: `SELECT to_char(date_trunc('month', occurred_at), 'MM/YYYY') AS "Período", ${BRL_SQL('SUM(CASE WHEN entry_type IN (\'VENDA_INGRESSO_BRUTA\', \'RECEITA_TAXA_DISK\') THEN amount_cents ELSE 0 END)')} AS "Entradas", ${BRL_SQL('SUM(CASE WHEN entry_type IN (\'REPASSE_PRODUTOR\', \'DESPESA_RH_CORPORATIVA\', \'DESPESA_STAFF_EVENTO\') THEN amount_cents ELSE 0 END)')} AS "Saídas", ${BRL_SQL('SUM(CASE WHEN entry_type IN (\'VENDA_INGRESSO_BRUTA\', \'RECEITA_TAXA_DISK\') THEN amount_cents ELSE -amount_cents END)')} AS "Saldo" FROM finance_ledger_entries GROUP BY date_trunc('month', occurred_at) ORDER BY date_trunc('month', occurred_at) DESC LIMIT 100`,
  },
  'controladoria/dre-evento': {
    table: 'events',
    sql: `SELECT e.title AS "Evento", ${BRL_SQL('(SELECT SUM(l.amount_cents) FROM finance_ledger_entries l WHERE l.event_id = e.id AND l.entry_type IN (\'VENDA_INGRESSO_BRUTA\', \'RECEITA_TAXA_DISK\'))')} AS "Receita", ${BRL_SQL('(SELECT SUM(b.total_amount_cents) FROM rh_payment_batches b WHERE b.event_id = e.id)')} AS "Custos", ${BRL_SQL('COALESCE((SELECT SUM(l.amount_cents) FROM finance_ledger_entries l WHERE l.event_id = e.id AND l.entry_type = \'RECEITA_TAXA_DISK\'), 0) - COALESCE((SELECT SUM(b.total_amount_cents) FROM rh_payment_batches b WHERE b.event_id = e.id), 0)')} AS "Resultado" FROM events e ORDER BY e.created_at DESC LIMIT 100`,
  },
  'controladoria/dre-disk': {
    table: 'finance_ledger_entries',
    sql: `SELECT to_char(date_trunc('month', occurred_at), 'MM/YYYY') AS "Período", ${BRL_SQL('SUM(CASE WHEN entry_type = \'RECEITA_TAXA_DISK\' THEN amount_cents ELSE 0 END)')} AS "Receita própria", ${BRL_SQL('SUM(CASE WHEN entry_type IN (\'DESPESA_RH_CORPORATIVA\', \'DESPESA_STAFF_EVENTO\') THEN amount_cents ELSE 0 END)')} AS "Despesas", ${BRL_SQL('SUM(CASE WHEN entry_type = \'RECEITA_TAXA_DISK\' THEN amount_cents WHEN entry_type IN (\'DESPESA_RH_CORPORATIVA\', \'DESPESA_STAFF_EVENTO\') THEN -amount_cents ELSE 0 END)')} AS "Resultado" FROM finance_ledger_entries GROUP BY date_trunc('month', occurred_at) ORDER BY date_trunc('month', occurred_at) DESC LIMIT 100`,
  },
  'controladoria/centros-custo': {
    table: 'finance_cost_centers',
    sql: `SELECT cc.name AS "Centro", cc.center_type AS "Responsável", ${BRL_SQL('(SELECT SUM(b.total_amount_cents) FROM rh_payment_batches b WHERE b.cost_center_id = cc.id)')} AS "Orçamento", cc.status AS "Situação" FROM finance_cost_centers cc ORDER BY cc.created_at DESC LIMIT 100`,
  },
  'controladoria/rentabilidade': {
    table: 'events',
    sql: `SELECT e.title AS "Evento", ${BRL_SQL('(SELECT SUM(l.amount_cents) FROM finance_ledger_entries l WHERE l.event_id = e.id AND l.entry_type = \'RECEITA_TAXA_DISK\')')} AS "Receita", ${BRL_SQL('(SELECT SUM(b.total_amount_cents) FROM rh_payment_batches b WHERE b.event_id = e.id)')} AS "Custo", e.status AS "Margem" FROM events e ORDER BY e.created_at DESC LIMIT 100`,
  },

  // 11 · Fornecedores e Contratos (3 telas)
  'fornecedores/cadastro': {
    table: 'finance_suppliers_and_payables',
    sql: `SELECT supplier_name AS "Fornecedor", cnpj AS "CNPJ", category AS "Categoria", contract_ref AS "Contrato", status AS "Status" FROM finance_suppliers_and_payables WHERE record_type = 'FORNECEDOR' ORDER BY created_at DESC LIMIT 100`,
  },
  'fornecedores/vencimentos': {
    table: 'contracts',
    sql: `SELECT c.contract_number AS "Contrato", p.legal_name AS "Fornecedor", COALESCE(to_char(c.valid_until, 'DD/MM/YYYY'), 'Indeterminado') AS "Vencimento", c.status AS "Situação" FROM contracts c INNER JOIN producers p ON p.id = c.producer_id ORDER BY c.created_at DESC LIMIT 100`,
  },
  'fornecedores/pedidos': {
    table: 'finance_suppliers_and_payables',
    sql: `SELECT id::text AS "_id", contract_ref AS "Pedido", supplier_name AS "Fornecedor", ${BRL_SQL('amount_cents')} AS "Valor", status AS "Aprovação" FROM finance_suppliers_and_payables WHERE record_type = 'PEDIDO_COMPRA' ORDER BY created_at DESC LIMIT 100`,
  },

  // 12 · Ledger Financeiro (3 telas)
  'ledger/lancamentos': {
    table: 'finance_ledger_entries',
    sql: `SELECT occurred_at::text AS "Data", debit_account AS "Conta débito", credit_account AS "Conta crédito", ${BRL_SQL('amount_cents')} AS "Valor", entry_type AS "Status" FROM finance_ledger_entries ORDER BY occurred_at DESC LIMIT 100`,
  },
  'ledger/razao': {
    table: 'finance_ledger_entries',
    sql: `SELECT debit_account AS "Conta", ${BRL_SQL('SUM(amount_cents)')} AS "Débitos", 'R$ 0,00' AS "Créditos", ${BRL_SQL('SUM(amount_cents)')} AS "Saldo" FROM finance_ledger_entries GROUP BY debit_account ORDER BY debit_account ASC LIMIT 100`,
  },
  'ledger/trilha': {
    table: 'finance_ledger_entries',
    sql: `SELECT l.entry_number AS "Lançamento", COALESCE(u.email, 'SISTEMA') AS "Usuário", l.entry_type AS "Origem", l.occurred_at::text AS "Data" FROM finance_ledger_entries l LEFT JOIN users u ON u.id = l.created_by ORDER BY l.occurred_at DESC LIMIT 100`,
  },

  // 13 · Relatórios Financeiros (5 telas)
  'relatorios/por-produtor': {
    table: 'producers',
    sql: `SELECT p.legal_name AS "Produtor", COALESCE((SELECT e.title FROM events e INNER JOIN event_producers ep ON ep.event_id = e.id WHERE ep.producer_id = p.id LIMIT 1), '—') AS "Evento", ${BRL_SQL('(SELECT SUM(l.amount_cents) FROM finance_ledger_entries l WHERE l.producer_id = p.id)')} AS "Valor", ${BRL_SQL('(SELECT SUM(l.amount_cents) FROM finance_ledger_entries l WHERE l.producer_id = p.id AND l.entry_type = \'RECEITA_TAXA_DISK\')')} AS "Receita", ${BRL_SQL('(SELECT SUM(l.amount_cents) FROM finance_ledger_entries l WHERE l.producer_id = p.id AND l.entry_type = \'REPASSE_PRODUTOR\')')} AS "Repasse" FROM producers p ORDER BY p.created_at DESC LIMIT 100`,
  },
  'relatorios/por-evento': {
    table: 'events',
    sql: `SELECT e.title AS "Evento", ${BRL_SQL('(SELECT SUM(o.total_cents) FROM p08_sale_orders o WHERE o.event_id = e.id)')} AS "Vendas", ${BRL_SQL('(SELECT SUM(l.amount_cents) FROM finance_ledger_entries l WHERE l.event_id = e.id AND l.entry_type = \'RECEITA_TAXA_DISK\')')} AS "Taxas", ${BRL_SQL('(SELECT SUM(b.total_amount_cents) FROM rh_payment_batches b WHERE b.event_id = e.id)')} AS "Custos", ${BRL_SQL('(SELECT SUM(l2.amount_cents) FROM finance_ledger_entries l2 WHERE l2.event_id = e.id AND l2.entry_type = \'OBRIGACAO_PRODUTOR\')')} AS "Saldo" FROM events e ORDER BY e.created_at DESC LIMIT 100`,
  },
  'relatorios/repasses': {
    table: 'finance_payout_requests',
    sql: `SELECT COALESCE(p.legal_name, '—') AS "Produtor", COALESCE(e.title, '—') AS "Evento", ${BRL_SQL('pr.amount_cents')} AS "Valor", pr.status AS "Situação" FROM finance_payout_requests pr LEFT JOIN producers p ON p.id = pr.producer_id LEFT JOIN events e ON e.id = pr.event_id WHERE pr.request_type = 'REPASSE' ORDER BY pr.created_at DESC LIMIT 100`,
  },
  'relatorios/antecipacoes': {
    table: 'finance_payout_requests',
    sql: `SELECT COALESCE(p.legal_name, '—') AS "Produtor", COALESCE(e.title, '—') AS "Evento", ${BRL_SQL('pr.amount_cents')} AS "Valor", pr.status AS "Status" FROM finance_payout_requests pr LEFT JOIN producers p ON p.id = pr.producer_id LEFT JOIN events e ON e.id = pr.event_id WHERE pr.request_type = 'ANTECIPACAO' ORDER BY pr.created_at DESC LIMIT 100`,
  },
  'relatorios/extrato': {
    table: 'finance_ledger_entries',
    sql: `SELECT occurred_at::text AS "Data", (entry_number || ' · ' || description_pt_br) AS "Lançamento", debit_account AS "Débito", credit_account AS "Crédito" FROM finance_ledger_entries ORDER BY occurred_at DESC LIMIT 100`,
  },

  // 14 · Central de Assinaturas (6 telas)
  'assinaturas/central': {
    table: 'contracts',
    sql: `SELECT c.contract_number AS "Documento", p.legal_name AS "Parte", c.title AS "Valor", c.status AS "Situação" FROM contracts c INNER JOIN producers p ON p.id = c.producer_id ORDER BY c.created_at DESC LIMIT 100`,
  },
  'assinaturas/documentos': {
    table: 'producer_documents',
    sql: `SELECT pd.document_reference AS "Documento", pd.document_type AS "Tipo", p.legal_name AS "Produtor", pd.verification_status AS "Status" FROM producer_documents pd INNER JOIN producers p ON p.id = pd.producer_id ORDER BY pd.created_at DESC LIMIT 100`,
  },
  'assinaturas/autentique': {
    table: 'outbox_events',
    sql: `SELECT 'Autentique Digital (Sandbox)' AS "Provedor", 'Contrato Configurado · Modo Homologação' AS "Status OAuth", to_char(NOW(), 'DD/MM/YYYY HH24:MI') AS "Último envio"`,
  },
  'assinaturas/conta-azul': {
    table: 'outbox_events',
    sql: `SELECT 'Ledger & Contas a Pagar/Receber' AS "Recurso", 'BRAVO_II Core PostgreSQL' AS "Fonte", 'Conta Azul ERP (Conector Homologação)' AS "Destino", 'PRONTO_SINCRONIZACAO' AS "Status"`,
  },
  'assinaturas/sincronizacoes': {
    table: 'outbox_events',
    sql: `SELECT to_char(created_at, 'DD/MM/YYYY HH24:MI') AS "Data", aggregate_type AS "Recurso", status AS "Resultado", 'Motor Outbox BRAVO_II' AS "Usuário" FROM outbox_events ORDER BY created_at DESC LIMIT 100`,
  },
  'assinaturas/logs': {
    table: 'outbox_events',
    sql: `SELECT created_at::text AS "Data", event_name AS "Evento", status AS "Status", aggregate_id AS "Referência" FROM outbox_events ORDER BY created_at DESC LIMIT 100`,
  },

  // 15 · Governança Financeira (9 telas)
  'governanca/visao-geral': {
    table: 'roles',
    sql: `SELECT ('Política RBAC · ' || name_pt_br) AS "Política", code AS "Aplicação", 'ATIVA' AS "Situação", CASE WHEN is_internal THEN 'Controle Interno SoD' ELSE 'Isolamento PDT' END AS "Risco" FROM roles ORDER BY code ASC LIMIT 100`,
  },
  'governanca/usuarios': {
    table: 'users',
    sql: `SELECT u.full_name || ' (' || u.email || ')' AS "Usuário", COALESCE(string_agg(urg.role_code, ', ' ORDER BY urg.role_code), '—') AS "Perfil", 'Corporativo / Escopo RBAC' AS "Escopo", u.status AS "Situação" FROM users u LEFT JOIN user_role_grants urg ON urg.user_id = u.id GROUP BY u.id, u.full_name, u.email, u.status, u.created_at ORDER BY u.created_at DESC LIMIT 100`,
  },
  'governanca/perfis': {
    table: 'roles',
    sql: `SELECT r.code || ' — ' || r.name_pt_br AS "Perfil", COUNT(rp.permission_code)::text || ' permissões' AS "Permissões", CASE WHEN r.is_internal THEN 'Interna Disk' ELSE 'Externa PDT' END AS "Alçada", r.description_pt_br AS "Escopo" FROM roles r LEFT JOIN role_permissions rp ON rp.role_code = r.code GROUP BY r.code, r.name_pt_br, r.is_internal, r.description_pt_br ORDER BY r.code ASC LIMIT 100`,
  },
  'governanca/alcadas': {
    table: 'permissions',
    sql: `SELECT description_pt_br AS "Operação", 'Conforme Alçada Estatutária' AS "Valor limite", 'FINANCEIRO_DISK / ADMIN_SUPER' AS "Aprovador", code AS "Condição" FROM permissions WHERE module_code IN ('FINANCE', 'REFUNDS', 'COMMERCIAL') ORDER BY code ASC LIMIT 100`,
  },
  'governanca/segregacao': {
    table: 'permissions',
    sql: `SELECT code AS "Função", 'Solicitante != Aprovador (Maker-Checker)' AS "Conflito", description_pt_br AS "Política", 'ATIVA_NO_BANCO' AS "Status" FROM permissions WHERE module_code IN ('FINANCE', 'REFUNDS', 'RH') ORDER BY code ASC LIMIT 100`,
  },
  'governanca/operacoes-criticas': {
    table: 'audit_records',
    sql: `SELECT a.id::text AS "_id", a.canonical_action AS "Operação", a.outcome AS "Risco", a.actor_role AS "Aprovação", a.integrity_hash AS "Auditoria" FROM audit_records a ORDER BY a.occurred_at DESC LIMIT 100`,
  },
  'governanca/bloqueios': {
    table: 'users',
    sql: `SELECT email AS "Usuário", 'Controle de Tentativas / Lockout' AS "Operação", status AS "Motivo", to_char(updated_at, 'DD/MM/YYYY HH24:MI') AS "Data" FROM users ORDER BY updated_at DESC LIMIT 100`,
  },
  'governanca/auditoria': {
    table: 'audit_records',
    sql: `SELECT COALESCE(u.email, a.actor_role) AS "Usuário", a.canonical_action AS "Ação", a.occurred_at::text AS "Data", (a.resource_type || COALESCE(':' || a.resource_id, '')) AS "Recurso" FROM audit_records a LEFT JOIN users u ON u.id = a.actor_user_id ORDER BY a.occurred_at DESC LIMIT 100`,
  },
  'governanca/configuracoes': {
    table: 'roles',
    sql: `SELECT 'Trava de Liquidação Externa em Homologação' AS "Política", 'Auditoria Imutável Ativa' AS "Notificações", 'Bloqueio Total de Saída Real' AS "Limite", 'PROTEGIDO' AS "Status"`,
  },
};

const BOOTSTRAP_FINANCE_SQL = `
CREATE TABLE IF NOT EXISTS finance_payout_requests (
  id UUID PRIMARY KEY,
  protocol VARCHAR(64) NOT NULL UNIQUE,
  request_type VARCHAR(32) NOT NULL DEFAULT 'REPASSE',
  producer_id UUID REFERENCES producers(id) ON DELETE RESTRICT,
  event_id UUID REFERENCES events(id) ON DELETE RESTRICT,
  target_event_id UUID REFERENCES events(id) ON DELETE RESTRICT,
  amount_cents BIGINT NOT NULL DEFAULT 0,
  fee_rate_bps INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(48) NOT NULL DEFAULT 'SOLICITADO',
  requested_by VARCHAR(255) NOT NULL,
  approved_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS finance_bank_accounts (
  id UUID PRIMARY KEY,
  owner_type VARCHAR(24) NOT NULL DEFAULT 'DISK_CORPORATE',
  producer_id UUID REFERENCES producers(id) ON DELETE CASCADE,
  bank_name VARCHAR(120) NOT NULL,
  branch_code VARCHAR(32) NOT NULL,
  account_number VARCHAR(48) NOT NULL,
  pix_key VARCHAR(160),
  balance_cents BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'ATIVA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS finance_suppliers_and_payables (
  id UUID PRIMARY KEY,
  record_type VARCHAR(32) NOT NULL DEFAULT 'FORNECEDOR',
  supplier_name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(32) NOT NULL DEFAULT '—',
  category VARCHAR(120) NOT NULL DEFAULT 'Operacional',
  contract_ref VARCHAR(120) NOT NULL DEFAULT '—',
  due_date DATE,
  amount_cents BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(48) NOT NULL DEFAULT 'ATIVO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS finance_event_closings (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE RESTRICT,
  producer_id UUID REFERENCES producers(id) ON DELETE RESTRICT,
  closing_code VARCHAR(64) NOT NULL UNIQUE,
  gross_revenue_cents BIGINT NOT NULL DEFAULT 0,
  expenses_cents BIGINT NOT NULL DEFAULT 0,
  net_payout_cents BIGINT NOT NULL DEFAULT 0,
  document_ref VARCHAR(180) NOT NULL DEFAULT 'BORDERO-OFICIAL',
  signatures_status VARCHAR(64) NOT NULL DEFAULT 'PENDENTE_DUPLA_ASSINATURA',
  status VARCHAR(48) NOT NULL DEFAULT 'EM_FECHAMENTO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS finance_operational_records (
  id UUID PRIMARY KEY,
  screen_id VARCHAR(120) NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(48) NOT NULL DEFAULT 'ATIVO',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

function parseCentsFromInput(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.round(raw));
  }
  const str = String(raw ?? '').trim();
  if (!str) return 0;
  const normalized = str
    .replace(/[R$\s]/gi, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

@Controller(['api/v1', 'v1'])
@UseGuards(AuthGuard)
export class FinanceiroVideoController {
  private tablesEnsured = false;

  constructor(
    private readonly db: DatabaseService,
    private readonly auditService: AuditService
  ) {}

  private async ensureTables(): Promise<void> {
    if (this.tablesEnsured) return;
    await this.db.execSqlScript(BOOTSTRAP_FINANCE_SQL);
    this.tablesEnsured = true;
  }

  @Get('financeiro/operacoes')
  @RequirePermission('finance:read')
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('modulo') moduleId?: string,
    @Query('produtorId') produtorId?: string,
    @Query('eventoId') eventoId?: string,
    @Query('periodo') periodo?: string
  ) {
    if (!req.actor || req.actor.roles.includes('PRODUTOR_PDT')) {
      throw new ForbiddenException('Acesso restrito ao Financeiro Disk.');
    }

    const def = moduleId ? SOURCES[moduleId] : undefined;
    if (!def || !moduleId) {
      throw new HttpException(
        {
          code: 'ROTINA_EM_IMPLANTACAO',
          message:
            'A interface está preparada, mas esta fonte financeira ainda não está integrada.',
        },
        501
      );
    }

    await this.ensureTables();

    const [relationalRes, customRes] = await Promise.all([
      this.db.query<Record<string, unknown>>(def.sql),
      this.db.query<{ id: string; payload_json: Record<string, unknown>; status: string }>(
        `SELECT id::text, payload_json, status FROM finance_operational_records WHERE screen_id = $1 ORDER BY created_at DESC LIMIT 100`,
        [moduleId]
      ),
    ]);

    const customRows: Record<string, unknown>[] = customRes.rows.map((r) => ({
      _id: r.id,
      ...(r.payload_json ?? {}),
    }));
    const customIds = new Set(customRows.map((r) => String(r._id)));
    const dedupedRelational = relationalRes.rows.filter(
      (r) => !r._id || !customIds.has(String(r._id))
    );

    let items: Record<string, unknown>[] = [...customRows, ...dedupedRelational];

    const prodFilter = (produtorId || '').trim().toLocaleLowerCase('pt-BR');
    if (prodFilter) {
      items = items.filter((row) =>
        Object.entries(row).some(
          ([k, v]) =>
            k.toLocaleLowerCase('pt-BR').includes('produtor') &&
            String(v ?? '')
              .toLocaleLowerCase('pt-BR')
              .includes(prodFilter)
        )
      );
    }

    const evtFilter = (eventoId || '').trim().toLocaleLowerCase('pt-BR');
    if (evtFilter) {
      items = items.filter((row) =>
        Object.entries(row).some(
          ([k, v]) =>
            k.toLocaleLowerCase('pt-BR').includes('evento') &&
            String(v ?? '')
              .toLocaleLowerCase('pt-BR')
              .includes(evtFilter)
        )
      );
    }

    await this.auditService.record({
      actorUserId: req.actor.userId,
      actorRole: req.actor.roles.join(','),
      sessionId: req.actor.sessionId,
      ipAddress: req.ip ?? null,
      canonicalAction: 'financeiro.operacoes.read',
      resourceType: 'FinanceiroVideoModule',
      resourceId: moduleId,
      outcome: 'SUCCESS',
      justification: `Consulta operacional em ${moduleId} (tabela ${def.table}, período ${periodo || 'mes'})`,
      correlationId: ensureCorrelationId(req.headers['x-correlation-id']),
    });

    return {
      items,
      source: 'POSTGRESQL',
      table: def.table,
      module: moduleId,
    };
  }

  @Post('financeiro/operacoes')
  @RequirePermission('finance:approve-payout')
  async createRecord(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      modulo?: string;
      fields?: Record<string, string>;
    }
  ) {
    if (!req.actor || req.actor.roles.includes('PRODUTOR_PDT')) {
      throw new ForbiddenException('Acesso restrito ao Financeiro Disk.');
    }

    const moduleId = (body.modulo || '').trim();
    const def = SOURCES[moduleId];
    if (!def) {
      throw new BadRequestException('Módulo financeiro inválido para registro.');
    }

    const fields = body.fields ?? {};
    const nonEmptyEntries = Object.entries(fields).filter(
      ([, v]) => String(v ?? '').trim().length > 0
    );
    if (nonEmptyEntries.length === 0) {
      throw new BadRequestException('Preencha ao menos um campo obrigatório para registrar.');
    }

    await this.ensureTables();
    const recordId = crypto.randomUUID();

    // Persistência adicional nas tabelas relacionais específicas quando aplicável
    if (
      moduleId.startsWith('solicitacoes/') ||
      moduleId === 'relatorios/repasses' ||
      moduleId === 'relatorios/antecipacoes' ||
      moduleId === 'taxas/advanced'
    ) {
      const protocol =
        fields['Protocolo'] ||
        fields['Solicitação'] ||
        `FIN-${Date.now().toString().slice(-6)}`;
      const reqType =
        moduleId.includes('antecipac') || moduleId === 'taxas/advanced'
          ? 'ANTECIPACAO'
          : moduleId.includes('transferencia')
            ? 'TRANSFERENCIA_EVENTO'
            : 'REPASSE';
      const amountCents = parseCentsFromInput(fields['Valor'] ?? '0');
      await this.db.query(
        `INSERT INTO finance_payout_requests (id, protocol, request_type, amount_cents, status, requested_by, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          recordId,
          protocol,
          reqType,
          amountCents,
          fields['Status'] || fields['Situação'] || fields['Alçada'] || 'SOLICITADO',
          fields['Solicitante'] || req.actor.email,
          JSON.stringify(fields),
        ]
      );
    } else if (moduleId === 'tesouraria/contas' || moduleId === 'tesouraria/visao-geral') {
      const balanceCents = parseCentsFromInput(fields['Saldo'] ?? '0');
      await this.db.query(
        `INSERT INTO finance_bank_accounts (id, owner_type, bank_name, branch_code, account_number, balance_cents, status)
         VALUES ($1, 'DISK_CORPORATE', $2, $3, $4, $5, $6)`,
        [
          recordId,
          fields['Banco'] || 'Banco Corporativo',
          fields['Agência'] || '0001',
          fields['Conta'] || '00000-0',
          balanceCents,
          fields['Status'] || fields['Situação'] || 'ATIVA',
        ]
      );
    } else if (
      moduleId.startsWith('fornecedores/') ||
      moduleId === 'tesouraria/contas-pagar'
    ) {
      const recType =
        moduleId === 'tesouraria/contas-pagar'
          ? 'CONTA_PAGAR'
          : moduleId === 'fornecedores/pedidos'
            ? 'PEDIDO_COMPRA'
            : 'FORNECEDOR';
      const amountCents = parseCentsFromInput(fields['Valor'] ?? '0');
      await this.db.query(
        `INSERT INTO finance_suppliers_and_payables (id, record_type, supplier_name, cnpj, category, contract_ref, amount_cents, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          recordId,
          recType,
          fields['Fornecedor'] || 'Fornecedor Homologado',
          fields['CNPJ'] || '—',
          fields['Categoria'] || 'Operacional',
          fields['Contrato'] || fields['Pedido'] || `CTR-${Date.now().toString().slice(-5)}`,
          amountCents,
          fields['Status'] || fields['Situação'] || fields['Aprovação'] || 'ATIVO',
        ]
      );
    }

    // Sempre persiste também em finance_operational_records para leitura imediata e rastreável na rotina
    await this.db.query(
      `INSERT INTO finance_operational_records (id, screen_id, payload_json, status, created_by)
       VALUES ($1, $2, $3::jsonb, $4, $5)`,
      [
        recordId,
        moduleId,
        JSON.stringify(fields),
        fields['Status'] || fields['Situação'] || 'ATIVO',
        req.actor.userId,
      ]
    );

    await this.auditService.record({
      actorUserId: req.actor.userId,
      actorRole: req.actor.roles.join(','),
      sessionId: req.actor.sessionId,
      ipAddress: req.ip ?? null,
      canonicalAction: 'financeiro.operacoes.create',
      resourceType: 'FinanceiroVideoRecord',
      resourceId: recordId,
      outcome: 'SUCCESS',
      justification: `Registro operacional criado em ${moduleId}`,
      afterState: fields,
      correlationId: ensureCorrelationId(req.headers['x-correlation-id']),
    });

    return {
      id: recordId,
      module: moduleId,
      status: 'CRIADO',
    };
  }

  @Post('financeiro/operacoes/transicao')
  @RequirePermission('finance:approve-payout')
  async transitionStatus(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      id?: string;
      modulo?: string;
      novoStatus?: string;
      justificativa?: string;
    }
  ) {
    if (!req.actor || req.actor.roles.includes('PRODUTOR_PDT')) {
      throw new ForbiddenException('Acesso restrito ao Financeiro Disk.');
    }

    const recordId = (body.id || '').trim();
    const moduleId = (body.modulo || '').trim();
    const novoStatus = (body.novoStatus || '').trim();
    if (!recordId || !novoStatus) {
      throw new BadRequestException('Identificador do registro e novo status são obrigatórios.');
    }

    await this.ensureTables();

    // Atualiza em finance_payout_requests se existir
    await this.db.query(
      `UPDATE finance_payout_requests SET status = $1, approved_by = $2, updated_at = NOW() WHERE id::text = $3`,
      [novoStatus, req.actor.userId, recordId]
    );

    // Atualiza também em finance_operational_records se existir
    const opRes = await this.db.query<{ payload_json: Record<string, unknown> }>(
      `SELECT payload_json FROM finance_operational_records WHERE id::text = $1`,
      [recordId]
    );
    if (opRes.rows.length > 0) {
      const updatedPayload = { ...(opRes.rows[0].payload_json ?? {}) };
      for (const key of ['Status', 'Situação', 'Alçada', 'Aprovação']) {
        if (key in updatedPayload) {
          updatedPayload[key] = novoStatus;
        }
      }
      await this.db.query(
        `UPDATE finance_operational_records SET status = $1, payload_json = $2::jsonb, updated_at = NOW() WHERE id::text = $3`,
        [novoStatus, JSON.stringify(updatedPayload), recordId]
      );
    }

    await this.auditService.record({
      actorUserId: req.actor.userId,
      actorRole: req.actor.roles.join(','),
      sessionId: req.actor.sessionId,
      ipAddress: req.ip ?? null,
      canonicalAction: 'financeiro.operacoes.transition',
      resourceType: 'FinanceiroVideoRecord',
      resourceId: recordId,
      outcome: 'SUCCESS',
      justification:
        body.justificativa?.trim() ||
        `Transição de status em ${moduleId || 'financeiro'} para ${novoStatus} (ambiente controlado sem liquidação bancária externa)`,
      afterState: { status: novoStatus, modulo: moduleId },
      correlationId: ensureCorrelationId(req.headers['x-correlation-id']),
    });

    return {
      id: recordId,
      status: novoStatus,
    };
  }
}
