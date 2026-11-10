import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { IdentityModule } from '../identity/identity.module';
import { GovernanceModule } from '../governance/governance.module';
import { FinanceController } from './finance.controller';
import { FinanceiroVideoController } from './financeiro-video.controller';
import { FinanceService } from './finance.service';
import { ProducerFinanceController } from '../producer-finance/producer-finance.controller';
import { ProducerFinanceService } from '../producer-finance/producer-finance.service';

@Module({
  imports: [IdentityModule, GovernanceModule, EventsModule],
  controllers: [FinanceController, FinanceiroVideoController, ProducerFinanceController],
  providers: [FinanceService, ProducerFinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
