import 'reflect-metadata';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './bootstrap/app.module';
import { ApiExceptionFilter } from './common/errors/api-exception.filter';
import { loadEnvironmentConfig } from '@bravo-ii/config';
import { validateHomologationEnv } from '@bravo-ii/core-policy';
import { validateAiEnvironment } from '@bravo-ii/domain-ia';
import { StructuredLogger } from '@bravo-ii/telemetry';
import { IdentityService } from './modules/identity/identity.service';
import { FinanceService } from './modules/finance/finance.service';
import {
  isValidProxyKey,
  proxyGuardRequired,
  validatePreviewDeploymentEnv,
} from './core/security/proxy-guard';

function ensureLocalEnvFileLoaded(): void {
  if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'test') return;
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(__dirname, '../../../.env'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && typeof process.loadEnvFile === 'function') {
      try {
        process.loadEnvFile(candidate);
      } catch {}
      break;
    }
  }
}

async function bootstrap() {
  ensureLocalEnvFileLoaded();
  if (process.env.BRAVO_ENV === 'HOMOLOGACAO') {
    const origin = process.env.APP_ORIGIN;
    const requireHttps = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
    const originPattern = requireHttps ? /^https:\/\/[^/\s?#]+$/ : /^https?:\/\/[^/\s?#]+$/;
    if (!origin || !originPattern.test(origin)) {
      throw new Error('APP_ORIGIN HTTPS exata é obrigatória em homologação');
    }
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

  const financeService = app.get(FinanceService);
  await financeService.ensureCatalogSeeded();

  await app.init();
  return app;
}

let cachedHandlerPromise: Promise<(req: Request, res: Response) => unknown> | null = null;

function cleanVercelEnvUrl(raw: string | undefined): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .trim()
    .replace(/^psql\s+/i, '')
    .replace(/^['"]+|['"]+$/g, '')
    .trim();
}

const INITIAL_EXPLICIT_HTTPS_ORIGIN = (() => {
  const cleaned = cleanVercelEnvUrl(process.env.APP_ORIGIN).replace(/\/+$/, '');
  return /^https:\/\/[^/\s?#]+$/.test(cleaned) ? cleaned : '';
})();

function normalizeVercelRuntimeEnv(req: Request): void {
  if (process.env.VERCEL !== '1') return;

  const dbCandidate =
    cleanVercelEnvUrl(process.env.DATABASE_URL) ||
    cleanVercelEnvUrl(process.env.POSTGRES_URL) ||
    cleanVercelEnvUrl(process.env.NEON_DATABASE_URL) ||
    cleanVercelEnvUrl(process.env.DIRECT_URL) ||
    cleanVercelEnvUrl(process.env.POSTGRES_URL_NON_POOLING);
  if (dbCandidate) {
    process.env.DATABASE_URL = dbCandidate;
  }

  if (process.env.BRAVO_PROXY_KEY) {
    process.env.BRAVO_PROXY_KEY = process.env.BRAVO_PROXY_KEY.trim().replace(/^['"]+|['"]+$/g, '');
  }

  if (!process.env.BRAVO_ENV) {
    process.env.BRAVO_ENV = 'HOMOLOGACAO';
  }

  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost')
    .split(',')[0]
    .trim();
  const reqOrigin = cleanVercelEnvUrl(
    typeof req.headers.origin === 'string' ? req.headers.origin : undefined
  ).replace(/\/+$/, '');
  const trustedProxyOrigin =
    reqOrigin &&
    /^https:\/\/[^/\s?#]+$/.test(reqOrigin) &&
    isValidProxyKey(req.headers['x-bravo-proxy-key'], process.env.BRAVO_PROXY_KEY)
      ? reqOrigin
      : '';

  process.env.APP_ORIGIN = INITIAL_EXPLICIT_HTTPS_ORIGIN || trustedProxyOrigin || `https://${host}`;

  process.env.ENABLE_EXTERNAL_PUBLICATION = 'false';
  process.env.ENABLE_REAL_PAYMENTS = 'false';
  process.env.ENABLE_REAL_REFUNDS = 'false';
  process.env.ALLOW_REAL_PAYMENT_GATEWAY = 'false';
  process.env.ALLOW_REAL_REFUND_EXECUTION = 'false';
  process.env.ALLOW_REAL_PAYOUT_EXECUTION = 'false';

  if (!process.env.CPF_HASH_PEPPER || process.env.CPF_HASH_PEPPER.length < 32) {
    process.env.CPF_HASH_PEPPER = 'bravo_ii_hml_internal_pepper_key_32chars_2026';
  }
  if (!process.env.COOKIE_SECURE) {
    process.env.COOKIE_SECURE = 'true';
  }
}

export default async function vercelHandler(req: Request, res: Response) {
  normalizeVercelRuntimeEnv(req);
  if (!cachedHandlerPromise) {
    cachedHandlerPromise = bootstrap()
      .then((app) => {
        const instance = app.getHttpAdapter().getInstance();
        return instance as (req: Request, res: Response) => unknown;
      })
      .catch((err) => {
        cachedHandlerPromise = null;
        throw err;
      });
  }
  try {
    const handler = await cachedHandlerPromise;
    return handler(req, res);
  } catch (err) {
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.status(503).json({
      statusCode: 503,
      code: 'API_BOOTSTRAP_UNAVAILABLE',
      message: err instanceof Error ? err.message : 'Falha ao inicializar API BRAVO_II na Vercel',
      diagnostics: {
        service: 'bravo-ii-api',
        vercelEnv: process.env.VERCEL_ENV || null,
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
        hasBravoProxyKey: Boolean(process.env.BRAVO_PROXY_KEY && process.env.BRAVO_PROXY_KEY.length >= 32),
      },
    });
    return;
  }
}

if (require.main === module && process.env.VERCEL !== '1') {
  bootstrap()
    .then(async (app) => {
      const config = loadEnvironmentConfig();
      const logger = new StructuredLogger('bravo-ii-api');
      await app.listen(config.port, '0.0.0.0');
      logger.info(`API BRAVO_II ativa na porta ${config.port}`, 'bootstrap-init', {
        environment: config.nodeEnv,
        port: config.port,
      });
    })
    .catch((err) => {
      console.error('Erro fatal ao inicializar API BRAVO_II:', err);
      process.exit(1);
    });
}
