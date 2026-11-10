import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { Pacote06Module } from '../pacote06/pacote06.module';

/**
 * Domínio canônico de Eventos, Sessões, Setores, Lotes e Mapa de Assentos.
 * Unifica o EventsService com as capacidades transacionais do Pacote 06.
 */
@Module({
  imports: [Pacote06Module],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService, Pacote06Module],
})
export class EventsModule {}
