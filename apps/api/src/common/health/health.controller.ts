import { Controller, Get, Req } from '@nestjs/common';
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
      correlationId,
      timestamp: new Date().toISOString(),
    };
  }
}
