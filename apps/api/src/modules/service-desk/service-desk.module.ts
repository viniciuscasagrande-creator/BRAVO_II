import { Module } from '@nestjs/common';
import { BravoPacote10Module } from '../pacote10/module';

/**
 * Domínio canônico de Atendimento SAC, Pós-Venda, Cancelamentos e Solicitações de Estorno.
 * Reexporta o módulo transacional do Pacote 10.
 */
@Module({
  imports: [BravoPacote10Module],
  exports: [BravoPacote10Module],
})
export class ServiceDeskModule {}
