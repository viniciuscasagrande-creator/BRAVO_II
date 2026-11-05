import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { GovernanceController } from './governance.controller';

@Global()
@Module({
  controllers: [GovernanceController],
  providers: [AuditService],
  exports: [AuditService],
})
export class GovernanceModule {}
