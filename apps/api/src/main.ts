import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './bootstrap/app.module';
import { ApiExceptionFilter } from './common/errors/api-exception.filter';
import { loadEnvironmentConfig } from '@bravo-ii/config';
import { validateHomologationEnv } from '@bravo-ii/core-policy';
import { StructuredLogger } from '@bravo-ii/telemetry';
import { IdentityService } from './modules/identity/identity.service';

async function bootstrap() {
  if (process.env.BRAVO_ENV === 'HOMOLOGACAO') {
    const homologationErrors = validateHomologationEnv(process.env);
    if (homologationErrors.length > 0) {
      throw new Error(`Homologação bloqueada por configuração insegura: ${homologationErrors.join('; ')}`);
    }
  }
  const config = loadEnvironmentConfig();
  const logger = new StructuredLogger('bravo-ii-api');

  const app = await NestFactory.create(AppModule, { logger: false });
  app.enableCors({
    origin: process.env.APP_ORIGIN || true,
    credentials: true,
  });
  app.useGlobalFilters(new ApiExceptionFilter());

  const identityService = app.get(IdentityService);
  await identityService.syncCanonicalRolesAndPermissions();

  await app.listen(config.port);
  logger.info(`API BRAVO_II ativa na porta ${config.port}`, 'bootstrap-init', {
    environment: config.nodeEnv,
    port: config.port,
  });
}

if (require.main === module) {
  bootstrap().catch((err) => {
    console.error('Erro fatal ao inicializar API BRAVO_II:', err);
    process.exit(1);
  });
}
