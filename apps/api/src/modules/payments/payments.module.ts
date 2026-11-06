import { Module } from '@nestjs/common';
import { BravoPacote09Module } from '../pacote09/module';

/**
 * Domínio canônico de Checkout e Pagamentos (Homologação fail-closed e Sandbox PagBank somente-leitura).
 * Reexporta o módulo transacional do Pacote 09.
 */
@Module({
  imports: [BravoPacote09Module],
  exports: [BravoPacote09Module],
})
export class PaymentsModule {}
