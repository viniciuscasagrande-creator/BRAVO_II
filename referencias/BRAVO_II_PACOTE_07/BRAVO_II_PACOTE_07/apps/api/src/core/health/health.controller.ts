import {Controller,Get,ServiceUnavailableException} from '@nestjs/common';
import {CorePrismaService} from '../prisma/prisma.service.js';
@Controller('v1/saude')
export class HealthController {
  constructor(private readonly db:CorePrismaService){}
  @Get() check(){return {api:'ATIVA',banco:'NAO_VERIFICADO',ambiente:'HOMOLOGACAO',publicacaoExterna:false,pagamentosReais:false};}
  @Get('banco') async database(){
    try{await this.db.$queryRaw`SELECT 1`;return {banco:'CONECTADO'};}
    catch {throw new ServiceUnavailableException({banco:'INDISPONIVEL'});}
  }
}
