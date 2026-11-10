import { Module } from '@nestjs/common';
import { ProducersService } from './producers.service';
import { ProducersController } from './producers.controller';
import { Pacote06Module } from '../pacote06/pacote06.module';

/**
 * Domínio canônico de Produtores PJ, Contratos Comerciais e Escopo PDT.
 * Unifica o ProducersService com o Pacote 06.
 */
@Module({
  imports: [Pacote06Module],
  controllers: [ProducersController],
  providers: [ProducersService],
  exports: [ProducersService, Pacote06Module],
})
export class ProducersModule {}
