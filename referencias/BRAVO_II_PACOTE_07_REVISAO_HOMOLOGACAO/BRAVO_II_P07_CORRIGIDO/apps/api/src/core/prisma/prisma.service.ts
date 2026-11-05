import {Global,Injectable,Module,OnModuleDestroy,OnModuleInit} from '@nestjs/common';
import {PrismaClient} from '@prisma/client';
@Injectable()
export class CorePrismaService extends PrismaClient implements OnModuleInit,OnModuleDestroy {
  async onModuleInit(){await this.$connect();}
  async onModuleDestroy(){await this.$disconnect();}
}
@Global()
@Module({providers:[CorePrismaService],exports:[CorePrismaService]})
export class CorePrismaModule {}
