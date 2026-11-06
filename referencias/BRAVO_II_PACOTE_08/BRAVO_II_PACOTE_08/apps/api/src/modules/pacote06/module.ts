import {Module} from '@nestjs/common';
import {ProducersService} from './producers.service.js';
import {CommercialService} from './commercial.service.js';
import {EventsService} from './events.service.js';
import {ProducersController,FeesController,EventsController} from './controllers.js';
@Module({
  controllers:[ProducersController,FeesController,EventsController],
  providers:[ProducersService,CommercialService,EventsService],
  exports:[ProducersService,CommercialService,EventsService]
})
export class BravoPacote06Module {}
