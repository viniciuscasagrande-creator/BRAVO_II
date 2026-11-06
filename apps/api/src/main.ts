import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './bootstrap/app.module';
import { ApiExceptionFilter } from './common/errors/api-exception.filter';
import { loadEnvironmentConfig } from '@bravo-ii/config';
import { validateHomologationEnv } from '@bravo-ii/core-policy';
import { validateAiEnvironment } from '@bravo-ii/domain-ia';
import { StructuredLogger } from '@bravo-ii/telemetry';
import { IdentityService } from './modules/identity/identity.service';
import {
  isValidProxyKey,
  proxyGuardRequired,
  validatePreviewDeploymentEnv,
} from './core/security/proxy-guard';

async function bootstrap() {
  if (process.env.BRAVO_ENV === 'HOMOLOGACAO') {
    const homologationErrors = [
      ...validateHomologationEnv(process.env),
      ...validatePreviewDeploymentEnv(process.env),
      ...validateAiEnvironment({
        ...process.env,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
      }),
    ];
    if (homologationErrors.length > 0) {
      throw new Error(`Homologação bloqueada por configuração insegura: ${homologationErrors.join('; ')}`);
    }
  }
  const config = loadEnvironmentConfig();
  const logger = new StructuredLogger('bravo-ii-api');

  const app = await NestFactory.create(AppModule, { logger: false });
  app.use((req: Request & { __bravoProxyChecked?: boolean }, res: Response, next: NextFunction) => {
    if (
      proxyGuardRequired(process.env) &&
      !isValidProxyKey(req.header('x-bravo-proxy-key'), process.env.BRAVO_PROXY_KEY)
    ) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(403).json({ statusCode: 403, message: 'Acesso ao backend restrito' });
      return;
    }
    req.__bravoProxyChecked = true;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.enableCors({
    origin: process.env.APP_ORIGIN ? process.env.APP_ORIGIN : false,
    credentials: true,
  });
  app.useGlobalFilters(new ApiExceptionFilter());

  if (process.env.VERCEL !== '1') {
    app.enableShutdownHooks();
  }

  const identityService = app.get(IdentityService);
  await identityService.syncCanonicalRolesAndPermissions();

  await app.listen(config.port, '0.0.0.0');
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
