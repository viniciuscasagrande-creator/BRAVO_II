import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { GovernanceModule } from '../governance/governance.module';
import { BravoPacote08Module } from '../pacote08/module';
import { BravoCheckoutController, BravoPdvController } from './controllers';
import { BravoCheckoutService } from './checkout.service';
import { BravoPdvService } from './pdv.service';

@Module({
  imports: [DatabaseModule, GovernanceModule, BravoPacote08Module],
  controllers: [BravoCheckoutController, BravoPdvController],
  providers: [BravoCheckoutService, BravoPdvService],
  exports: [BravoCheckoutService, BravoPdvService],
})
export class BravoPacote09Module {}
