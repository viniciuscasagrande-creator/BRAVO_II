import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { BravoPacote08Module } from '../pacote08/module';

/**
 * Domínio canônico de Clientes (CPF com HMAC-SHA256 Pepper e mascaramento LGPD).
 * Unifica o CustomersService com o BravoPacote08Module.
 */
@Module({
  imports: [BravoPacote08Module],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService, BravoPacote08Module],
})
export class CustomersModule {}
