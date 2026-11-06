import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { GovernanceModule } from '../governance/governance.module';
import { IdentityModule } from '../identity/identity.module';
import { BravoIaController } from './ia.controller';
import { BravoIaService } from './ia.service';

@Module({
  imports: [DatabaseModule, GovernanceModule, IdentityModule],
  controllers: [BravoIaController],
  providers: [BravoIaService],
  exports: [BravoIaService],
})
export class BravoIaModule {}
