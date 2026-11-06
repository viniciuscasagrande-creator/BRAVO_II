import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { GovernanceModule } from '../governance/governance.module';
import {
  BravoCustomersController,
  BravoOrdersController,
  BravoTicketsController,
} from './controllers';
import { BravoCustomersService } from './customer.service';
import { BravoOrdersService } from './order.service';

@Module({
  imports: [DatabaseModule, GovernanceModule],
  controllers: [BravoCustomersController, BravoOrdersController, BravoTicketsController],
  providers: [BravoCustomersService, BravoOrdersService],
  exports: [BravoCustomersService, BravoOrdersService],
})
export class BravoPacote08Module {}
