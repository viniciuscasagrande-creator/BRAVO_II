import { Controller, Get, Injectable, Module, Req, UseGuards } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { DatabaseService } from '../../common/database/database.service';
import { AuthGuard, type AuthenticatedRequest } from '../../common/auth/auth.guard';
import { IdentityModule } from '../identity/identity.module';
import { requireInternal } from '../pacote10/common';

@Injectable()
export class MessagingService {
  constructor(private readonly db: DatabaseService) {}

  async summary() {
    const [outboxRes, emailRes] = await Promise.all([
      this.db.query<{ status: string; total: number }>(
        `SELECT status, COUNT(*)::int AS total FROM outbox_events GROUP BY status ORDER BY status`
      ),
      this.db.query<{ status: string; total: number }>(
        `SELECT delivery_status AS status, COUNT(*)::int AS total FROM ticket_email_dispatches GROUP BY delivery_status ORDER BY delivery_status`
      ),
    ]);
    return {
      outboxByStatus: outboxRes.rows,
      ticketEmailDispatchesByStatus: emailRes.rows,
      externalSmtpEnabled: false,
    };
  }
}

@Controller('v1/mensageria')
@UseGuards(AuthGuard)
export class MessagingController {
  constructor(private readonly svc: MessagingService) {}

  @Get('resumo')
  async resumo(@Req() req: AuthenticatedRequest) {
    requireInternal(req.actor, 'ADMIN', 'OPERACOES', 'SAC', 'AUDITOR');
    return this.svc.summary();
  }
}

@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [MessagingController],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
