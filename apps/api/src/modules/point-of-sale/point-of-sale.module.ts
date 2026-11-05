import { Module } from '@nestjs/common';
import { PointOfSaleController } from './point-of-sale.controller';
import { PointOfSaleService } from './point-of-sale.service';

@Module({
  controllers: [PointOfSaleController],
  providers: [PointOfSaleService],
  exports: [PointOfSaleService],
})
export class PointOfSaleModule {}
