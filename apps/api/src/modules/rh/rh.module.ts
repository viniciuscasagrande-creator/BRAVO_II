import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { GovernanceModule } from '../governance/governance.module';
import { FinanceModule } from '../finance/finance.module';
import { RhController } from './rh.controller';
import { RhService } from './rh.service';

@Module({
  imports: [IdentityModule, GovernanceModule, FinanceModule],
  controllers: [RhController],
  providers: [RhService],
  exports: [RhService],
})
export class RhModule {}
