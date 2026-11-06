import { Controller, Get, Injectable, Module, Req, UseGuards } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { DatabaseService } from '../../common/database/database.service';
import { AuthGuard, type AuthenticatedRequest } from '../../common/auth/auth.guard';
import { IdentityModule } from '../identity/identity.module';
import { requireInternal } from '../pacote10/common';

@Injectable()
export class ReportingService {
  constructor(private readonly db: DatabaseService) {}

  async operationalOverview() {
    const [eventsRes, ordersRes, ticketsRes, sacRes] = await Promise.all([
      this.db.query<{ status: string; total: number }>(
        `SELECT status, COUNT(*)::int AS total FROM events GROUP BY status ORDER BY status`
      ),
      this.db.query<{ status: string; total: number }>(
        `SELECT status, COUNT(*)::int AS total FROM p08_sale_orders GROUP BY status ORDER BY status`
      ),
      this.db.query<{ status: string; total: number }>(
        `SELECT status, COUNT(*)::int AS total FROM p08_issued_tickets GROUP BY status ORDER BY status`
      ),
      this.db.query<{ status: string; total: number }>(
        `SELECT status, COUNT(*)::int AS total FROM p10_support_cases GROUP BY status ORDER BY status`
      ),
    ]);
    return {
      eventsByStatus: eventsRes.rows,
      ordersByStatus: ordersRes.rows,
      ticketsByStatus: ticketsRes.rows,
      supportCasesByStatus: sacRes.rows,
    };
  }
}

@Controller('v1/relatorios')
@UseGuards(AuthGuard)
export class ReportingController {
  constructor(private readonly svc: ReportingService) {}

  @Get('operacional')
  async operacional(@Req() req: AuthenticatedRequest) {
    requireInternal(req.actor, 'ADMIN', 'OPERACOES', 'FINANCEIRO_DISK', 'AUDITOR');
    return this.svc.operationalOverview();
  }
}

@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [ReportingController],
  providers: [ReportingService],
  exports: [ReportingService],
})
export class ReportingModule {}
