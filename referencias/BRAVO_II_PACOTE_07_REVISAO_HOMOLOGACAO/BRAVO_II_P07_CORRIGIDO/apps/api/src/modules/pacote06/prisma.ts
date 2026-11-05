// O Pacote 06 usa o Prisma ÚNICO do Core: não abre segundo pool de conexões.
export {CorePrismaService as P06PrismaService} from '../../core/prisma/prisma.service.js';
