import { Module } from '@nestjs/common';
import { PointOfSaleController } from './point-of-sale.controller';
import { PointOfSaleService } from './point-of-sale.service';
import { BravoPacote09Module } from '../pacote09/module';

/**
 * Domínio canônico de Ponto de Venda (PDV), Terminais e Sessões de Caixa.
 * Unifica o PointOfSaleService com o BravoPacote09Module.
 */
@Module({
  imports: [BravoPacote09Module],
  controllers: [PointOfSaleController],
  providers: [PointOfSaleService],
  exports: [PointOfSaleService, BravoPacote09Module],
})
export class PointOfSaleModule {}
