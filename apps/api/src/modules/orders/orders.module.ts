import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { InventoryModule } from '../inventory/inventory.module';
import { TicketsModule } from '../tickets/tickets.module';
import { BravoPacote08Module } from '../pacote08/module';

/**
 * Domínio canônico de Pedidos, Reservas Atômicas e Emissão de Ingressos.
 * Unifica o OrdersService com o BravoPacote08Module.
 */
@Module({
  imports: [InventoryModule, TicketsModule, BravoPacote08Module],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService, BravoPacote08Module],
})
export class OrdersModule {}
