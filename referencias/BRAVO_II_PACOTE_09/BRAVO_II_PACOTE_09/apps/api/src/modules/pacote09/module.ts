import {Module} from '@nestjs/common';
import {BravoPacote08Module} from '../pacote08/module.js';
import {BravoCheckoutController,BravoPdvController} from './controllers.js';
import {BravoCheckoutService} from './checkout.service.js';
import {BravoPdvService} from './pdv.service.js';
@Module({imports:[BravoPacote08Module],controllers:[BravoCheckoutController,BravoPdvController],providers:[BravoCheckoutService,BravoPdvService]})
export class BravoPacote09Module{}
