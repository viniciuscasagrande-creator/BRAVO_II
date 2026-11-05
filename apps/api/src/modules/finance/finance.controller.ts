import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type {
  CreateCostCenterRequestDto,
  CreateFinanceLedgerEntryRequestDto,
  ReconcileRhPaymentBatchRequestDto,
} from '@bravo-ii/contracts';
import {
  AuthGuard,
  RequirePermission,
  type AuthenticatedRequest,
} from '../../common/auth/auth.guard';
import { ensureCorrelationId } from '@bravo-ii/telemetry';
import { FinanceService } from './finance.service';

@Controller('api/v1')
@UseGuards(AuthGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  private assertInternalCatalogAccess(req: AuthenticatedRequest): void {
    const actor = req.actor!;
    const hasInternalAccess =
      actor.permissions.includes('finance:read') ||
      actor.permissions.includes('rh:read') ||
      actor.permissions.includes('rh:self-read') ||
      actor.permissions.includes('audit:read');

    if (!hasInternalAccess || actor.roles.includes('PRODUTOR_PDT')) {
      throw new ForbiddenException({
        code: 'INTERNAL_CATALOG_FORBIDDEN_FOR_EXTERNAL_ROLE',
        message:
          'Acesso negado: o catálogo interno Financeiro Disk (104 opções) + RH & DP (45 opções) é restrito a perfis internos autorizados.',
      });
    }
  }

  @Get('catalog/functions')
  @RequirePermission('overview:read')
  async getCatalogSummary(
    @Req() req: AuthenticatedRequest,
    @Query('dominio') dominio?: 'FINANCEIRO' | 'RH'
  ) {
    this.assertInternalCatalogAccess(req);
    const validDomain =
      dominio === 'FINANCEIRO' || dominio === 'RH' ? dominio : undefined;
    return this.financeService.getCatalogSummary(validDomain);
  }

  @Get('catalog/functions/:numeroOrSlug')
  @RequirePermission('overview:read')
  async getCatalogFunction(
    @Req() req: AuthenticatedRequest,
    @Param('numeroOrSlug') numeroOrSlug: string
  ) {
    this.assertInternalCatalogAccess(req);
    return this.financeService.getCatalogFunction(numeroOrSlug);
  }

  @Get('finance/cost-centers')
  @RequirePermission('overview:read')
  async listCostCenters(@Req() req: AuthenticatedRequest) {
    const actor = req.actor!;
    if (
      !actor.permissions.includes('finance:read') &&
      !actor.permissions.includes('rh:read') &&
      !actor.permissions.includes('rh:request-payment')
    ) {
      throw new ForbiddenException({
        code: 'COST_CENTER_READ_FORBIDDEN',
        message: 'Sem permissão para consultar centros de custo.',
      });
    }
    const items = await this.financeService.listCostCenters();
    return { items };
  }

  @Post('finance/cost-centers')
  @RequirePermission('finance:approve-payout')
  async createCostCenter(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateCostCenterRequestDto
  ) {
    return this.financeService.createCostCenter(
      req.actor!,
      body,
      ensureCorrelationId(req.headers['x-correlation-id'])
    );
  }

  @Get('finance/ledger')
  @RequirePermission('finance:read')
  async listFinanceLedger() {
    const items = await this.financeService.listFinanceLedger();
    return { items };
  }

  @Post('finance/ledger')
  @RequirePermission('finance:approve-payout')
  async createFinanceLedgerEntry(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateFinanceLedgerEntryRequestDto
  ) {
    return this.financeService.createFinanceLedgerEntry(
      req.actor!,
      body,
      ensureCorrelationId(req.headers['x-correlation-id'])
    );
  }

  @Get('finance/rh-payment-batches')
  @RequirePermission('finance:read')
  async listRhPaymentBatchesForFinance() {
    const items = await this.financeService.listRhPaymentBatchesForFinance();
    return { items };
  }

  @Post('finance/rh-payment-batches/:batchId/approve')
  @RequirePermission('finance:approve-rh-payment')
  async approveRhPaymentBatch(
    @Req() req: AuthenticatedRequest,
    @Param('batchId') batchId: string
  ) {
    return this.financeService.approveRhPaymentBatch(
      req.actor!,
      batchId,
      ensureCorrelationId(req.headers['x-correlation-id'])
    );
  }

  @Post('finance/rh-payment-batches/:batchId/prepare-treasury')
  @RequirePermission('finance:prepare-treasury')
  async prepareRhPaymentTreasury(
    @Req() req: AuthenticatedRequest,
    @Param('batchId') batchId: string
  ) {
    return this.financeService.prepareRhPaymentTreasury(
      req.actor!,
      batchId,
      ensureCorrelationId(req.headers['x-correlation-id'])
    );
  }

  @Post('finance/rh-payment-batches/:batchId/confirm-settlement')
  @RequirePermission('finance:reconcile-rh-payment')
  async confirmRhPaymentSettlement(
    @Req() req: AuthenticatedRequest,
    @Param('batchId') batchId: string,
    @Body() body: ReconcileRhPaymentBatchRequestDto
  ) {
    return this.financeService.confirmRhPaymentSettlement(
      req.actor!,
      batchId,
      body,
      ensureCorrelationId(req.headers['x-correlation-id'])
    );
  }
}
