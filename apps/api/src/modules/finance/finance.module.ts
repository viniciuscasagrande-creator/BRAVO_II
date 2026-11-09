import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { GovernanceModule } from '../governance/governance.module';
import { FinanceController } from './finance.controller';
import { FinanceiroVideoController } from './financeiro-video.controller';
import { FinanceService } from './finance.service';

@Module({
  imports: [IdentityModule, GovernanceModule],
  controllers: [FinanceController, FinanceiroVideoController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
