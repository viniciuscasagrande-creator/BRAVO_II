import { Module } from '@nestjs/common';
import { Pacote06Controller } from './pacote06.controller';
import { Pacote06Service } from './pacote06.service';
import { GovernanceModule } from '../governance/governance.module';

@Module({
  imports: [GovernanceModule],
  controllers: [Pacote06Controller],
  providers: [Pacote06Service],
  exports: [Pacote06Service],
})
export class Pacote06Module {}
