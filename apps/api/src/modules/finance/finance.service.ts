import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  CreateCostCenterRequestSchema,
  CreateFinanceLedgerEntryRequestSchema,
  ReconcileRhPaymentBatchRequestSchema,
  type AuthenticatedActorDto,
  type CatalogFunctionItemDto,
  type CatalogMigrationStatus,
  type CatalogSummaryDto,
  type CostCenterDto,
  type CreateCostCenterRequestDto,
  type CreateFinanceLedgerEntryRequestDto,
  type FinanceLedgerEntryDto,
  type ReconcileRhPaymentBatchRequestDto,
  type RhPaymentBatchDto,
} from '@bravo-ii/contracts';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../governance/audit.service';

interface RawCatalogJsonOption {
  numero: number;
  area: 'FINANCEIRO' | 'RH';
  grupo: string;
  grupoRH: string | null;
  etiqueta: string;
  idOrigem: string;
  filterArg: string | null;
  rota: string;
  fonteMenu?: string;
  temCaseExplicito?: boolean;
  statusOrigem?: string;
  estadoMigracao?: string;
  preservar?: boolean;
}

interface RawCatalogJsonFile {
  grupos: Array<{ id: string; etiqueta: string; area: string }>;
  opcoes: RawCatalogJsonOption[];
}

const HOMOLOGATED_FUNCTION_NUMBERS = new Set<number>([
  1, 2, 5, 6, 10, 11, 31, 40, 41, 42, 45, 51, 65, 75, 76, 79, 95, 96, 97, 98, 100, 103,
  105, 106, 108, 114, 119, 120, 126, 127, 128, 136, 137, 139, 140, 141, 147, 149,
]);

const BRIDGE_INTEGRATION_NUMBERS = new Set<number>([
  10, 11, 40, 41, 42, 45, 60, 62, 65, 66, 75, 76, 79, 85, 98, 99, 100,
  106, 119, 120, 121, 122, 123, 136, 137, 138, 139, 140, 141, 147,
]);

@Injectable()
export class FinanceService implements OnModuleInit {
  private catalogSeeded = false;

  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureCatalogSeeded();
  }

  private resolveCatalogFilePath(): string {
    const candidates = [
      path.resolve(process.cwd(), '00-INVENTARIO/catalogo-completo-financeiro-rh.json'),
      path.resolve(process.cwd(), '../../00-INVENTARIO/catalogo-completo-financeiro-rh.json'),
      path.resolve(__dirname, '../../../../../00-INVENTARIO/catalogo-completo-financeiro-rh.json'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    throw new Error('Arquivo 00-INVENTARIO/catalogo-completo-financeiro-rh.json não encontrado.');
  }

  async ensureCatalogSeeded(): Promise<void> {
    if (this.catalogSeeded) {
      const countRes = await this.db.query<{ total: string }>(
        `SELECT COUNT(*)::text AS total FROM catalog_149_functions`
      );
      if (Number(countRes.rows[0]?.total ?? '0') === 149) {
        return;
      }
    }

    const filePath = this.resolveCatalogFilePath();
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as RawCatalogJsonFile;

    for (const opt of raw.opcoes) {
      const estadoMigracao: CatalogMigrationStatus = HOMOLOGATED_FUNCTION_NUMBERS.has(opt.numero)
        ? 'TESTADO_HOMOLOGACAO'
        : 'PENDENTE';
      const targetModuleCode = opt.area === 'FINANCEIRO' ? 'FINANCE' : 'RH_DP';
      const requiredPermission = opt.area === 'FINANCEIRO' ? 'finance:read' : 'rh:read';

      await this.db.query(
        `INSERT INTO catalog_149_functions (
           numero, area, grupo, grupo_rh, etiqueta, id_origem, filter_arg,
           rota, fonte_menu, tem_case_explicito, status_origem, estado_migracao,
           target_module_code, required_permission, preservar, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
         ON CONFLICT (numero) DO UPDATE SET
           area = EXCLUDED.area,
           grupo = EXCLUDED.grupo,
           grupo_rh = EXCLUDED.grupo_rh,
           etiqueta = EXCLUDED.etiqueta,
           id_origem = EXCLUDED.id_origem,
           filter_arg = EXCLUDED.filter_arg,
           rota = EXCLUDED.rota,
           estado_migracao = EXCLUDED.estado_migracao,
           target_module_code = EXCLUDED.target_module_code,
           required_permission = EXCLUDED.required_permission,
           updated_at = NOW()`,
        [
          opt.numero,
          opt.area,
          opt.grupo,
          opt.grupoRH ?? null,
          opt.etiqueta,
          opt.idOrigem,
          opt.filterArg ?? null,
          opt.rota,
          opt.fonteMenu ?? 'js/menuConfig.js',
          opt.temCaseExplicito ?? true,
          opt.statusOrigem ?? 'ROTA_NO_DISPATCHER_LEGADO',
          estadoMigracao,
          targetModuleCode,
          requiredPermission,
          opt.preservar ?? true,
        ]
      );
    }

    this.catalogSeeded = true;
  }

  private mapCatalogRow(row: Record<string, unknown>): CatalogFunctionItemDto {
    const numero = Number(row.numero);
    const rota = String(row.rota);
    const slug = rota.replace(/^\/(financeiro|rh)\//, '');
    const grupoRh = row.grupo_rh ? String(row.grupo_rh) : null;
    const subgrupoId = grupoRh
      ? grupoRh
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
      : null;

    return {
      numero,
      dominio: row.area as 'FINANCEIRO' | 'RH',
      grupoId: String(row.id_origem),
      grupoTitulo: String(row.grupo),
      subgrupoId,
      subgrupoTitulo: grupoRh,
      itemTitulo: String(row.etiqueta),
      slug,
      rota,
      modulo: String(row.id_origem),
      criticidade: BRIDGE_INTEGRATION_NUMBERS.has(numero) ? 'ALTA_CRITICA' : 'OPERACIONAL',
      rbacMinimo: String(row.area) === 'FINANCEIRO' ? 'FINANCEIRO_DISK' : 'RH_DP_DISK',
      integracaoFinanceiroRh: BRIDGE_INTEGRATION_NUMBERS.has(numero),
      statusMigracao: row.estado_migracao as CatalogMigrationStatus,
      updatedAt:
        row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    };
  }

  async getCatalogSummary(dominio?: 'FINANCEIRO' | 'RH'): Promise<CatalogSummaryDto> {
    await this.ensureCatalogSeeded();

    const allRes = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM catalog_149_functions ORDER BY numero ASC`
    );
    const allItems = allRes.rows.map((r) => this.mapCatalogRow(r));
    const filteredItems = dominio ? allItems.filter((i) => i.dominio === dominio) : allItems;

    const byStatus: Record<CatalogMigrationStatus, number> = {
      PENDENTE: 0,
      IMPLEMENTADO_NAO_TESTADO: 0,
      TESTADO_HOMOLOGACAO: 0,
      APROVADO_PRODUCAO: 0,
    };
    for (const item of filteredItems) {
      byStatus[item.statusMigracao] = (byStatus[item.statusMigracao] ?? 0) + 1;
    }

    const distinctGroups = new Set(allItems.map((i) => `${i.dominio}:${i.grupoTitulo}`));

    return {
      totalCataloged: allItems.length,
      totalFinanceiro: allItems.filter((i) => i.dominio === 'FINANCEIRO').length,
      totalRh: allItems.filter((i) => i.dominio === 'RH').length,
      totalMainGroups: distinctGroups.size,
      byStatus,
      items: filteredItems,
    };
  }

  async getCatalogFunction(numeroOrSlug: string): Promise<CatalogFunctionItemDto> {
    await this.ensureCatalogSeeded();

    const trimmed = numeroOrSlug.trim();
    const isNumeric = /^\d+$/.test(trimmed);
    const res = isNumeric
      ? await this.db.query<Record<string, unknown>>(
          `SELECT * FROM catalog_149_functions WHERE numero = $1 LIMIT 1`,
          [Number(trimmed)]
        )
      : await this.db.query<Record<string, unknown>>(
          `SELECT * FROM catalog_149_functions
           WHERE rota = $1 OR rota = $2 OR rota = $3
           LIMIT 1`,
          [trimmed, `/financeiro/${trimmed}`, `/rh/${trimmed}`]
        );

    if (res.rows.length === 0) {
      throw new NotFoundException({
        code: 'CATALOG_FUNCTION_NOT_FOUND',
        message: `Função catalogada '${numeroOrSlug}' não encontrada na matriz de 149 funções.`,
      });
    }

    return this.mapCatalogRow(res.rows[0]);
  }

  private mapCostCenterRow(row: Record<string, unknown>): CostCenterDto {
    const rawType = String(row.center_type);
    const centerType: CostCenterDto['centerType'] =
      rawType === 'OPERACIONAL_DISK'
        ? 'OPERACIONAL_GERAL'
        : (rawType as CostCenterDto['centerType']);
    return {
      id: String(row.id),
      code: String(row.code),
      name: String(row.name),
      centerType,
      eventId: row.event_id ? String(row.event_id) : null,
      status: String(row.status),
      createdAt:
        row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    };
  }

  async listCostCenters(): Promise<CostCenterDto[]> {
    const res = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM finance_cost_centers ORDER BY code ASC`
    );
    return res.rows.map((r) => this.mapCostCenterRow(r));
  }

  async createCostCenter(
    actor: AuthenticatedActorDto,
    rawPayload: CreateCostCenterRequestDto,
    correlationId: string
  ): Promise<CostCenterDto> {
    const parsed = CreateCostCenterRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_COST_CENTER_PAYLOAD',
        message: parsed.error.issues[0]?.message ?? 'Dados de centro de custo inválidos.',
        details: parsed.error.issues,
      });
    }

    const data = parsed.data;
    const dbCenterType =
      data.centerType === 'OPERACIONAL_GERAL' ? 'OPERACIONAL_DISK' : data.centerType;

    const existing = await this.db.query(`SELECT id FROM finance_cost_centers WHERE code = $1`, [
      data.code.toUpperCase(),
    ]);
    if (existing.rows.length > 0) {
      throw new ConflictException({
        code: 'COST_CENTER_CODE_ALREADY_EXISTS',
        message: `Já existe um centro de custo cadastrado com o código ${data.code.toUpperCase()}.`,
      });
    }

    const id = randomUUID();
    const res = await this.db.query<Record<string, unknown>>(
      `INSERT INTO finance_cost_centers (id, code, name, center_type, event_id, status)
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
       RETURNING *`,
      [id, data.code.toUpperCase(), data.name, dbCenterType, data.eventId ?? null]
    );

    await this.audit.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      canonicalAction: 'finance.cost_center.created',
      resourceType: 'finance_cost_center',
      resourceId: id,
      eventId: data.eventId ?? null,
      outcome: 'SUCCESS',
      justification: `Centro de custo ${data.code.toUpperCase()} (${data.centerType}) criado.`,
      correlationId,
    });

    return this.mapCostCenterRow(res.rows[0]);
  }

  private mapLedgerRow(row: Record<string, unknown>): FinanceLedgerEntryDto {
    return {
      id: String(row.id),
      entryGroupId: String(row.idempotency_key),
      eventId: row.event_id ? String(row.event_id) : null,
      producerId: row.producer_id ? String(row.producer_id) : null,
      costCenterId: null,
      rhPaymentBatchId: row.rh_batch_id ? String(row.rh_batch_id) : null,
      debitAccount: String(row.debit_account),
      creditAccount: String(row.credit_account),
      amountCents: Number(row.amount_cents),
      descriptionPtBr: String(row.description_pt_br),
      createdByUserId: row.created_by ? String(row.created_by) : '',
      occurredAt:
        row.occurred_at instanceof Date ? row.occurred_at.toISOString() : String(row.occurred_at),
    };
  }

  async listFinanceLedger(): Promise<FinanceLedgerEntryDto[]> {
    const res = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM finance_ledger_entries ORDER BY occurred_at DESC`
    );
    return res.rows.map((r) => this.mapLedgerRow(r));
  }

  async createFinanceLedgerEntry(
    actor: AuthenticatedActorDto,
    rawPayload: CreateFinanceLedgerEntryRequestDto,
    correlationId: string
  ): Promise<FinanceLedgerEntryDto> {
    const parsed = CreateFinanceLedgerEntryRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_LEDGER_ENTRY_PAYLOAD',
        message: parsed.error.issues[0]?.message ?? 'Dados de lançamento contábil inválidos.',
        details: parsed.error.issues,
      });
    }

    const data = parsed.data;
    const id = randomUUID();
    const entryNumber = `LGR-${Date.now()}-${id.slice(0, 6).toUpperCase()}`;
    const entryType = data.rhPaymentBatchId
      ? data.eventId
        ? 'DESPESA_STAFF_EVENTO'
        : 'DESPESA_RH_CORPORATIVA'
      : 'AJUSTE_COMPENSATORIO';

    const res = await this.db.query<Record<string, unknown>>(
      `INSERT INTO finance_ledger_entries (
         id, entry_number, event_id, producer_id, rh_batch_id, entry_type,
         debit_account, credit_account, amount_cents, description_pt_br,
         idempotency_key, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        id,
        entryNumber,
        data.eventId ?? null,
        data.producerId ?? null,
        data.rhPaymentBatchId ?? null,
        entryType,
        data.debitAccount,
        data.creditAccount,
        data.amountCents,
        data.descriptionPtBr,
        data.entryGroupId,
        actor.userId,
      ]
    );

    await this.audit.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      canonicalAction: 'finance.ledger_entry.created',
      resourceType: 'finance_ledger_entry',
      resourceId: id,
      eventId: data.eventId ?? null,
      producerId: data.producerId ?? null,
      outcome: 'SUCCESS',
      justification: `Partida dobrada D:${data.debitAccount} / C:${data.creditAccount} (${data.amountCents} centavos).`,
      correlationId,
    });

    return {
      ...this.mapLedgerRow(res.rows[0]),
      costCenterId: data.costCenterId ?? null,
    };
  }

  public mapRhPaymentBatchRow(row: Record<string, unknown>): RhPaymentBatchDto {
    const totalAmountCents = Number(row.total_amount_cents);
    return {
      id: String(row.id),
      batchCode: String(row.batch_code),
      originType: row.batch_type as RhPaymentBatchDto['originType'],
      competencia: String(row.competencia),
      costCenterId: String(row.cost_center_id),
      costCenterCode: row.cost_center_code ? String(row.cost_center_code) : undefined,
      eventId: row.event_id ? String(row.event_id) : null,
      headcount: Number(row.headcount),
      grossAmountCents: totalAmountCents,
      deductionsAmountCents: 0,
      encargosAmountCents: 0,
      netAmountCents: totalAmountCents,
      status: row.status as RhPaymentBatchDto['status'],
      requestedByUserId: String(row.requested_by_user_id),
      approvedByFinanceUserId: row.approved_by_finance_user_id
        ? String(row.approved_by_finance_user_id)
        : null,
      treasuryPreparedByUserId: row.prepared_by_treasury_user_id
        ? String(row.prepared_by_treasury_user_id)
        : null,
      externalConfirmationRef: row.external_confirmation_ref
        ? String(row.external_confirmation_ref)
        : null,
      notesPtBr: row.external_provider_name ? String(row.external_provider_name) : null,
      createdAt:
        row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      approvedAt: row.approved_by_finance_user_id
        ? row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : String(row.updated_at)
        : null,
      settledAt:
        String(row.status) === 'LIQUIDADO'
          ? row.updated_at instanceof Date
            ? row.updated_at.toISOString()
            : String(row.updated_at)
          : null,
    };
  }

  async listRhPaymentBatchesForFinance(): Promise<RhPaymentBatchDto[]> {
    const res = await this.db.query<Record<string, unknown>>(
      `SELECT b.*, cc.code AS cost_center_code
       FROM rh_payment_batches b
       LEFT JOIN finance_cost_centers cc ON cc.id = b.cost_center_id
       ORDER BY b.created_at DESC`
    );
    return res.rows.map((r) => this.mapRhPaymentBatchRow(r));
  }

  async approveRhPaymentBatch(
    actor: AuthenticatedActorDto,
    batchId: string,
    correlationId: string
  ): Promise<RhPaymentBatchDto> {
    const batchRes = await this.db.query<Record<string, unknown>>(
      `SELECT b.*, cc.code AS cost_center_code
       FROM rh_payment_batches b
       LEFT JOIN finance_cost_centers cc ON cc.id = b.cost_center_id
       WHERE b.id = $1`,
      [batchId]
    );
    if (batchRes.rows.length === 0) {
      throw new NotFoundException({
        code: 'RH_PAYMENT_BATCH_NOT_FOUND',
        message: 'Lote de pagamento RH não encontrado.',
      });
    }

    const batch = batchRes.rows[0];
    if (String(batch.requested_by_user_id) === actor.userId) {
      await this.audit.record({
        actorUserId: actor.userId,
        actorRole: actor.roles.join(','),
        canonicalAction: 'finance.rh_payment_batch.approve_denied_sod',
        resourceType: 'rh_payment_batch',
        resourceId: batchId,
        eventId: batch.event_id ? String(batch.event_id) : null,
        outcome: 'DENIED',
        justification:
          'Bloqueio de Segregação de Funções (SoD): o próprio solicitante do lote RH tentou aprovar no Financeiro.',
        correlationId,
      });

      throw new ForbiddenException({
        code: 'SOD_VIOLATION_REQUESTER_CANNOT_APPROVE',
        message:
          'Violação de Segregação de Funções (SoD): o usuário que originou a solicitação no RH não pode aprovar a liquidação financeira.',
      });
    }

    if (String(batch.status) !== 'AGUARDANDO_FINANCEIRO') {
      throw new ConflictException({
        code: 'INVALID_BATCH_STATUS_FOR_APPROVAL',
        message: `Lote no status '${String(batch.status)}' não pode ser aprovado pelo Financeiro.`,
      });
    }

    const updatedRes = await this.db.query<Record<string, unknown>>(
      `UPDATE rh_payment_batches
       SET status = 'APROVADO_FINANCEIRO',
           approved_by_finance_user_id = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [actor.userId, batchId]
    );

    await this.audit.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      canonicalAction: 'finance.rh_payment_batch.approved',
      resourceType: 'rh_payment_batch',
      resourceId: batchId,
      eventId: batch.event_id ? String(batch.event_id) : null,
      outcome: 'SUCCESS',
      justification: `Lote RH ${String(batch.batch_code)} aprovado pelo Financeiro Disk com SoD validada.`,
      correlationId,
    });

    return this.mapRhPaymentBatchRow({
      ...updatedRes.rows[0],
      cost_center_code: batch.cost_center_code,
    });
  }

  async prepareRhPaymentTreasury(
    actor: AuthenticatedActorDto,
    batchId: string,
    correlationId: string
  ): Promise<RhPaymentBatchDto> {
    const batchRes = await this.db.query<Record<string, unknown>>(
      `SELECT b.*, cc.code AS cost_center_code
       FROM rh_payment_batches b
       LEFT JOIN finance_cost_centers cc ON cc.id = b.cost_center_id
       WHERE b.id = $1`,
      [batchId]
    );
    if (batchRes.rows.length === 0) {
      throw new NotFoundException({
        code: 'RH_PAYMENT_BATCH_NOT_FOUND',
        message: 'Lote de pagamento RH não encontrado.',
      });
    }

    const batch = batchRes.rows[0];
    if (String(batch.status) !== 'APROVADO_FINANCEIRO') {
      throw new ConflictException({
        code: 'BATCH_NOT_APPROVED_BY_FINANCE',
        message:
          'Somente lotes com status APROVADO_FINANCEIRO podem gerar instrução de Tesouraria.',
      });
    }

    if (process.env.ALLOW_REAL_PAYOUT_EXECUTION === 'true') {
      throw new ForbiddenException({
        code: 'REAL_PAYOUT_BLOCKED_BY_POLICY',
        message: 'Execução bancária real está bloqueada neste ambiente.',
      });
    }

    const updatedRes = await this.db.query<Record<string, unknown>>(
      `UPDATE rh_payment_batches
       SET status = 'PENDENTE_INTEGRACAO_BANCARIA',
           prepared_by_treasury_user_id = $1,
           external_provider_name = 'SANDBOX_TESOURARIA_DISK',
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [actor.userId, batchId]
    );

    await this.audit.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      canonicalAction: 'finance.rh_payment_batch.treasury_prepared',
      resourceType: 'rh_payment_batch',
      resourceId: batchId,
      eventId: batch.event_id ? String(batch.event_id) : null,
      outcome: 'SUCCESS',
      justification: `Instrução de tesouraria gerada em modo sandbox (PENDENTE_INTEGRACAO_BANCARIA) para o lote ${String(batch.batch_code)}.`,
      correlationId,
    });

    return this.mapRhPaymentBatchRow({
      ...updatedRes.rows[0],
      cost_center_code: batch.cost_center_code,
    });
  }

  async confirmRhPaymentSettlement(
    actor: AuthenticatedActorDto,
    batchId: string,
    rawPayload: ReconcileRhPaymentBatchRequestDto,
    correlationId: string
  ): Promise<{ batch: RhPaymentBatchDto; ledgerEntry: FinanceLedgerEntryDto }> {
    const parsed = ReconcileRhPaymentBatchRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'EXTERNAL_CONFIRMATION_REQUIRED',
        message:
          parsed.error.issues[0]?.message ??
          'A baixa para LIQUIDADO exige comprovante/referência de retorno bancário externo.',
        details: parsed.error.issues,
      });
    }

    const batchRes = await this.db.query<Record<string, unknown>>(
      `SELECT b.*, cc.code AS cost_center_code
       FROM rh_payment_batches b
       LEFT JOIN finance_cost_centers cc ON cc.id = b.cost_center_id
       WHERE b.id = $1`,
      [batchId]
    );
    if (batchRes.rows.length === 0) {
      throw new NotFoundException({
        code: 'RH_PAYMENT_BATCH_NOT_FOUND',
        message: 'Lote de pagamento RH não encontrado.',
      });
    }

    const batch = batchRes.rows[0];
    if (String(batch.status) !== 'PENDENTE_INTEGRACAO_BANCARIA') {
      throw new ConflictException({
        code: 'BATCH_NOT_READY_FOR_SETTLEMENT',
        message:
          'O lote precisa estar em PENDENTE_INTEGRACAO_BANCARIA antes da confirmação de liquidação.',
      });
    }

    const updatedRes = await this.db.query<Record<string, unknown>>(
      `UPDATE rh_payment_batches
       SET status = 'LIQUIDADO',
           reconciled_by_finance_user_id = $1,
           external_confirmation_ref = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [actor.userId, parsed.data.externalConfirmationRef, batchId]
    );

    const debitAccount =
      String(batch.batch_type) === 'EQUIPE_EVENTO'
        ? '3.1.02.01-CUSTO_EQUIPE_EVENTO_RH'
        : '4.1.01.01-DESPESA_FOLHA_CORPORATIVA_RH';
    const creditAccount = '1.1.01.02-TESOURARIA_BANCOS_SANDBOX';

    const ledgerEntry = await this.createFinanceLedgerEntry(
      actor,
      {
        entryGroupId: randomUUID(),
        eventId: batch.event_id ? String(batch.event_id) : null,
        producerId: null,
        costCenterId: String(batch.cost_center_id),
        rhPaymentBatchId: batchId,
        debitAccount,
        creditAccount,
        amountCents: Number(batch.total_amount_cents),
        descriptionPtBr: `Liquidação Lote RH ${String(batch.batch_code)} (${String(batch.batch_type)} - Comp. ${String(batch.competencia)}) — Ref. Externa: ${parsed.data.externalConfirmationRef}`,
      },
      correlationId
    );

    await this.audit.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      canonicalAction: 'finance.rh_payment_batch.settled',
      resourceType: 'rh_payment_batch',
      resourceId: batchId,
      eventId: batch.event_id ? String(batch.event_id) : null,
      outcome: 'SUCCESS',
      justification: `Lote ${String(batch.batch_code)} baixado para LIQUIDADO mediante comprovante ${parsed.data.externalConfirmationRef} e contabilizado no Ledger (#${ledgerEntry.id}).`,
      correlationId,
    });

    return {
      batch: this.mapRhPaymentBatchRow({
        ...updatedRes.rows[0],
        cost_center_code: batch.cost_center_code,
      }),
      ledgerEntry,
    };
  }
}
