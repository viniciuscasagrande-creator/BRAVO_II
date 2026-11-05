import { Module } from '@nestjs/common';
import { GateControlController } from './gate-control.controller';
import { GateControlService } from './gate-control.service';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [TicketsModule],
  controllers: [GateControlController],
  providers: [GateControlService],
  exports: [GateControlService],
})
export class GateControlModule {}
