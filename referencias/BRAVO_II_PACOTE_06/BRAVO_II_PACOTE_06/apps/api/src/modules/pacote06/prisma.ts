import {Injectable,OnModuleDestroy,OnModuleInit} from '@nestjs/common';
import {PrismaClient} from '@prisma/client';
/** Substituir pelo PrismaService ÚNICO do Core assim que o Pacote 05 estiver instalado.
    Não usar outro banco ou outra conexão para Financeiro, RH, Produtores e Eventos. */
@Injectable()
export class P06PrismaService extends PrismaClient implements OnModuleInit,OnModuleDestroy {
  async onModuleInit(){await this.$connect();}
  async onModuleDestroy(){await this.$disconnect();}
}
