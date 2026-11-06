import { Controller, Get, Req, ServiceUnavailableException } from '@nestjs/common';
import type { Request } from 'express';
import { DatabaseService } from '../database/database.service';
import { loadEnvironmentConfig } from '@bravo-ii/config';
import { ensureCorrelationId } from '@bravo-ii/telemetry';

@Controller()
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get(['health', 'api/v1/health'])
  async checkHealth(@Req() req: Request) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    const config = loadEnvironmentConfig();
    const migrations = await this.db.getAppliedMigrations();

    return {
      status: 'ok',
      service: 'bravo-ii-api',
      environment: config.nodeEnv,
      database: 'connected',
      migrationsApplied: migrations.length,
      migrations,
      realFinancialGatewaysBlocked:
        !config.allowRealPaymentGateway && !config.allowRealRefundExecution && !config.allowRealPayoutExecution,
      directDatabaseUrlConfigured: Boolean(config.directUrl),
      googleApiConfigured: config.googleApiKeyConfigured,
      correlationId,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(['v1/saude', 'api/v1/saude'])
  checkSaudeP07() {
    const config = loadEnvironmentConfig();
    const blocked =
      !config.allowRealPaymentGateway && !config.allowRealRefundExecution && !config.allowRealPayoutExecution;
    return {
      api: 'ATIVA',
      banco: 'NAO_VERIFICADO',
      ambiente: 'HOMOLOGACAO',
      publicacaoExterna: false,
      pagamentosReais: !blocked,
      googleApiConfigurada: config.googleApiKeyConfigured,
    };
  }

  @Get(['v1/saude/banco', 'api/v1/saude/banco'])
  async checkBancoP07() {
    try {
      await this.db.query('SELECT 1');
      return { banco: 'CONECTADO' };
    } catch {
      throw new ServiceUnavailableException({ banco: 'INDISPONIVEL' });
    }
  }
}
