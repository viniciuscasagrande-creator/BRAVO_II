import { Controller, Get, Injectable, Module, Req, UseGuards } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { DatabaseService } from '../../common/database/database.service';
import { AuthGuard, type AuthenticatedRequest } from '../../common/auth/auth.guard';
import { IdentityModule } from '../identity/identity.module';
import { requireInternal } from '../pacote10/common';

@Injectable()
export class MarketingService {
  constructor(private readonly db: DatabaseService) {}

  async consentMetrics() {
    const res = await this.db.query<{ total_customers: number; opt_in_count: number }>(
      `SELECT
         COUNT(*)::int AS total_customers,
         COUNT(*) FILTER (WHERE marketing_opt_in = TRUE)::int AS opt_in_count
       FROM customers`
    );
    const row = res.rows[0] ?? { total_customers: 0, opt_in_count: 0 };
    return {
      totalCustomers: Number(row.total_customers ?? 0),
      marketingOptInCount: Number(row.opt_in_count ?? 0),
      externalCampaignDispatchEnabled: false,
    };
  }
}

@Controller('v1/marketing')
@UseGuards(AuthGuard)
export class MarketingController {
  constructor(private readonly svc: MarketingService) {}

  @Get('indicadores')
  async indicadores(@Req() req: AuthenticatedRequest) {
    requireInternal(req.actor, 'ADMIN', 'COMERCIAL', 'OPERACOES', 'AUDITOR');
    return this.svc.consentMetrics();
  }
}

@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [MarketingController],
  providers: [MarketingService],
  exports: [MarketingService],
})
export class MarketingModule {}
