import {Module} from '@nestjs/common';
import {BravoCustomersController,BravoOrdersController,BravoTicketsController} from './controllers.js';
import {BravoCustomersService} from './customer.service.js';
import {BravoOrdersService} from './order.service.js';
@Module({controllers:[BravoCustomersController,BravoOrdersController,BravoTicketsController],providers:[BravoCustomersService,BravoOrdersService],exports:[BravoCustomersService,BravoOrdersService]})
export class BravoPacote08Module {}
