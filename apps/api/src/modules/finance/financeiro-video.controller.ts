/**
 * BRAVO_II — Ponte de leitura controlada do Financeiro Disk.
 * Apenas fontes existentes com mapeamento validado em PostgreSQL; demais telas respondem 501.
 * Nunca calcula saldo bancário por soma ingênua de lançamentos nem fabrica dados demonstrativos.
 */
import {
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
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

const SOURCES: Record<string, ReadDefinition> = {
  'produtores/produtores': {
    table: 'producers',
    sql: `SELECT legal_name AS "Produtor", cnpj AS "CNPJ", verification_status AS "Situação", NULL::text AS "Conta financeira" FROM producers ORDER BY created_at DESC LIMIT 100`,
  },
  'produtores/eventos': {
    table: 'events',
    sql: `SELECT e.title AS "Evento", COALESCE(p.legal_name,'—') AS "Produtor", COALESCE(sess.title,'—') AS "Sessão", e.status AS "Situação" FROM events e LEFT JOIN LATERAL (SELECT ep.producer_id FROM event_producers ep WHERE ep.event_id=e.id ORDER BY ep.created_at ASC LIMIT 1) ep ON TRUE LEFT JOIN producers p ON p.id=ep.producer_id LEFT JOIN LATERAL (SELECT es.title FROM event_sessions es WHERE es.event_id=e.id ORDER BY es.starts_at ASC LIMIT 1) sess ON TRUE ORDER BY e.created_at DESC LIMIT 100`,
  },
  'gateways/captura': {
    table: 'p09_checkout_attempts',
    sql: `SELECT provider AS "Provedor", COALESCE(sandbox_checkout_id, id::text) AS "Transação", status AS "Situação", ('R$ ' || replace(to_char(amount_cents::numeric / 100, 'FM999999999999990.00'), '.', ',')) AS "Valor" FROM p09_checkout_attempts ORDER BY created_at DESC LIMIT 100`,
  },
  'taxas/taxa-disk-evento': {
    table: 'event_fee_agreements',
    sql: `SELECT e.title AS "Evento", efa.calculation_type AS "Percentual/Fixa", CASE WHEN efa.calculation_type = 'PERCENTAGE' THEN COALESCE(efa.percentage_rate::text, (efa.percent_basis_points::numeric / 100)::text) || '%' ELSE 'R$ ' || replace(to_char(COALESCE(efa.fixed_amount_cents, 0)::numeric / 100, 'FM999999999999990.00'), '.', ',') END AS "Valor", efa.status AS "Aprovação" FROM event_fee_agreements efa INNER JOIN events e ON e.id = efa.event_id ORDER BY efa.created_at DESC LIMIT 100`,
  },
  'taxas/regras': {
    table: 'event_fee_agreements',
    sql: `SELECT ('v' || efa.agreement_version::text || ' · ' || efa.calculation_type) AS "Regra", COALESCE(p.legal_name, '—') AS "Produtor", e.title AS "Evento", efa.payer AS "Condição", COALESCE(efa.valid_until::text, 'Vigência contínua') AS "Validade" FROM event_fee_agreements efa INNER JOIN events e ON e.id = efa.event_id LEFT JOIN LATERAL (SELECT ep.producer_id FROM event_producers ep WHERE ep.event_id = e.id ORDER BY ep.created_at ASC LIMIT 1) ep ON TRUE LEFT JOIN producers p ON p.id = ep.producer_id ORDER BY efa.created_at DESC LIMIT 100`,
  },
  'tesouraria/pagamentos-lote': {
    table: 'rh_payment_batches',
    sql: `SELECT batch_code AS "Lote", COALESCE(external_provider_name, 'Pendente') AS "Banco", headcount::text AS "Quantidade", ('R$ ' || replace(to_char(total_amount_cents::numeric / 100, 'FM999999999999990.00'), '.', ',')) AS "Valor", status AS "Status" FROM rh_payment_batches ORDER BY created_at DESC LIMIT 100`,
  },
  'estornos/central': {
    table: 'p10_refund_requests',
    sql: `SELECT r.order_id::text AS "Pedido", COALESCE(c.full_name, '—') AS "Cliente", COALESCE(e.title, '—') AS "Evento", ('R$ ' || replace(to_char(r.amount_cents::numeric / 100, 'FM999999999999990.00'), '.', ',')) AS "Valor", r.status AS "Situação" FROM p10_refund_requests r LEFT JOIN p08_sale_orders o ON o.id = r.order_id LEFT JOIN customers c ON c.id = o.customer_id LEFT JOIN events e ON e.id = o.event_id ORDER BY r.created_at DESC LIMIT 100`,
  },
  'estornos/fila-aprovacao': {
    table: 'p10_refund_requests',
    sql: `SELECT r.order_id::text AS "Pedido", r.requested_by AS "Solicitante", ('R$ ' || replace(to_char(r.amount_cents::numeric / 100, 'FM999999999999990.00'), '.', ',')) AS "Valor", (SELECT COUNT(*)::text || '/2' FROM p10_refund_approvals a WHERE a.refund_id = r.id AND a.decision = 'APROVAR') AS "Aprovadores", r.status AS "Status" FROM p10_refund_requests r WHERE r.status IN ('SOLICITADO', 'EM_ANALISE', 'APROVADO_1') ORDER BY r.created_at DESC LIMIT 100`,
  },
  'estornos/historico': {
    table: 'refund_requests',
    sql: `SELECT order_reference AS "Pedido", COALESCE(provider_confirmation_ref, '—') AS "Provedor", ('R$ ' || replace(to_char(amount_cents::numeric / 100, 'FM999999999999990.00'), '.', ',')) AS "Valor", status AS "Status" FROM refund_requests ORDER BY created_at DESC LIMIT 100`,
  },
  'controladoria/centros-custo': {
    table: 'finance_cost_centers',
    sql: `SELECT name AS "Centro", center_type AS "Responsável", NULL::text AS "Orçamento", status AS "Situação" FROM finance_cost_centers ORDER BY created_at DESC LIMIT 100`,
  },
  'ledger/lancamentos': {
    table: 'finance_ledger_entries',
    sql: `SELECT occurred_at::text AS "Data", debit_account AS "Conta débito", credit_account AS "Conta crédito", ('R$ ' || replace(to_char(amount_cents::numeric / 100, 'FM999999999999990.00'), '.', ',')) AS "Valor", entry_type AS "Status" FROM finance_ledger_entries ORDER BY occurred_at DESC LIMIT 100`,
  },
  'ledger/trilha': {
    table: 'finance_ledger_entries',
    sql: `SELECT l.entry_number AS "Lançamento", COALESCE(u.email, 'SISTEMA') AS "Usuário", l.entry_type AS "Origem", l.occurred_at::text AS "Data" FROM finance_ledger_entries l LEFT JOIN users u ON u.id = l.created_by ORDER BY l.occurred_at DESC LIMIT 100`,
  },
  'relatorios/extrato': {
    table: 'finance_ledger_entries',
    sql: `SELECT occurred_at::text AS "Data", (entry_number || ' · ' || description_pt_br) AS "Lançamento", debit_account AS "Débito", credit_account AS "Crédito" FROM finance_ledger_entries ORDER BY occurred_at DESC LIMIT 100`,
  },
  'assinaturas/documentos': {
    table: 'producer_documents',
    sql: `SELECT pd.document_reference AS "Documento", pd.document_type AS "Tipo", p.legal_name AS "Produtor", pd.verification_status AS "Status" FROM producer_documents pd INNER JOIN producers p ON p.id = pd.producer_id ORDER BY pd.created_at DESC LIMIT 100`,
  },
  'assinaturas/logs': {
    table: 'outbox_events',
    sql: `SELECT created_at::text AS "Data", event_name AS "Evento", status AS "Status", aggregate_id AS "Referência" FROM outbox_events ORDER BY created_at DESC LIMIT 100`,
  },
  'governanca/usuarios': {
    table: 'users',
    sql: `SELECT u.full_name || ' (' || u.email || ')' AS "Usuário", COALESCE(string_agg(urg.role_code, ', ' ORDER BY urg.role_code), '—') AS "Perfil", 'Corporativo / Escopo RBAC' AS "Escopo", u.status AS "Situação" FROM users u LEFT JOIN user_role_grants urg ON urg.user_id = u.id GROUP BY u.id, u.full_name, u.email, u.status, u.created_at ORDER BY u.created_at DESC LIMIT 100`,
  },
  'governanca/perfis': {
    table: 'roles',
    sql: `SELECT r.code || ' — ' || r.name_pt_br AS "Perfil", COUNT(rp.permission_code)::text || ' permissões' AS "Permissões", CASE WHEN r.is_internal THEN 'Interna Disk' ELSE 'Externa PDT' END AS "Alçada", r.description_pt_br AS "Escopo" FROM roles r LEFT JOIN role_permissions rp ON rp.role_code = r.code GROUP BY r.code, r.name_pt_br, r.is_internal, r.description_pt_br ORDER BY r.code ASC LIMIT 100`,
  },
  'governanca/auditoria': {
    table: 'audit_records',
    sql: `SELECT COALESCE(u.email, a.actor_role) AS "Usuário", a.canonical_action AS "Ação", a.occurred_at::text AS "Data", (a.resource_type || COALESCE(':' || a.resource_id, '')) AS "Recurso" FROM audit_records a LEFT JOIN users u ON u.id = a.actor_user_id ORDER BY a.occurred_at DESC LIMIT 100`,
  },
};

@Controller(['api/v1', 'v1'])
@UseGuards(AuthGuard)
export class FinanceiroVideoController {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditService: AuditService
  ) {}

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
    if (!def) {
      throw new HttpException(
        {
          code: 'ROTINA_EM_IMPLANTACAO',
          message:
            'A interface está preparada, mas esta fonte financeira ainda não está integrada.',
        },
        501
      );
    }

    const result = await this.db.query<Record<string, unknown>>(def.sql);
    let items = result.rows;

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
}
