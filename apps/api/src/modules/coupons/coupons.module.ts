import { Module } from '@nestjs/common';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';
import { InventoryModule } from '../inventory/inventory.module';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [InventoryModule, TicketsModule],
  controllers: [CouponsController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
