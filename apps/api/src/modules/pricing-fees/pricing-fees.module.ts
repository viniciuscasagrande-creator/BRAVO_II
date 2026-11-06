import { Module } from '@nestjs/common';
import { CommercialModule } from '../commercial/commercial.module';
import { Pacote06Module } from '../pacote06/pacote06.module';

/**
 * Domínio canônico de Precificação e Taxa Disk por Evento (nunca global por produtor).
 * Reexporta e unifica os serviços do CommercialModule (Fases 02-03) e Pacote06Module.
 */
@Module({
  imports: [CommercialModule, Pacote06Module],
  exports: [CommercialModule, Pacote06Module],
})
export class PricingFeesModule {}
