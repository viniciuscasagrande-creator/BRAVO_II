import { Module } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { RefundsController } from './refunds.controller';
import { BravoPacote10Module } from '../pacote10/module';

/**
 * Domínio canônico de Estornos e Dupla Aprovação Financeira (SoD).
 * Unifica o RefundsService com o BravoPacote10Module.
 */
@Module({
  imports: [BravoPacote10Module],
  controllers: [RefundsController],
  providers: [RefundsService],
  exports: [RefundsService, BravoPacote10Module],
})
export class RefundsModule {}
