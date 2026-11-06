import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { GovernanceModule } from '../governance/governance.module';
import { IdentityModule } from '../identity/identity.module';
import {
  BravoAfterSalesController,
  BravoRefundController,
  BravoSacController,
} from './controllers';
import { BravoSacService } from './sac.service';
import { BravoAfterSalesService } from './aftersales.service';
import { BravoRefundService } from './refund.service';

@Module({
  imports: [DatabaseModule, GovernanceModule, IdentityModule],
  controllers: [BravoSacController, BravoAfterSalesController, BravoRefundController],
  providers: [BravoSacService, BravoAfterSalesService, BravoRefundService],
  exports: [BravoSacService, BravoAfterSalesService, BravoRefundService],
})
export class BravoPacote10Module {}
