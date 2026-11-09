/**
 * Serverless BFF & API Handler na raiz para implantação Vercel (Preset Vite / Output: dist).
 * 1) Se BRAVO_API_URL apontar para projeto NestJS separado na Vercel, atua como BFF proxy autenticado.
 * 2) Caso contrário, executa o núcleo NestJS (@bravo-ii/api) in-process.
 */
const crypto = require('node:crypto');

const RUNTIME_BFF_KEY =
  process.env.BRAVO_PROXY_KEY && process.env.BRAVO_PROXY_KEY.length >= 32
    ? process.env.BRAVO_PROXY_KEY
    : crypto.randomBytes(32).toString('hex');

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && Buffer.isBuffer(req.body)) {
      resolve(req.body);
      return;
    }
    if (req.body && typeof req.body === 'string') {
      resolve(Buffer.from(req.body, 'utf8'));
      return;
    }
    if (req.body && typeof req.body === 'object') {
      resolve(Buffer.from(JSON.stringify(req.body), 'utf8'));
      return;
    }
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > 1024 * 1024) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function cleanEnvUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .trim()
    .replace(/^psql\s+/i, '')
    .replace(/^['"]+|['"]+$/g, '')
    .trim();
}

module.exports = async function bravoRootVercelApiHandler(req, res) {
  try {
    const rawUrl = req.url || '/';
    const parsed = new URL(rawUrl, 'http://localhost');
    const rewrittenPath = parsed.searchParams.get('__bravo_v1_path');
    parsed.searchParams.delete('__bravo_v1_path');
    const qs = parsed.searchParams.toString();

    if (!parsed.pathname.startsWith('/v1/') && rewrittenPath) {
      const cleanSubpath = rewrittenPath.replace(/^\/+/, '');
      req.url = `/v1/${cleanSubpath}${qs ? `?${qs}` : ''}`;
      req.originalUrl = req.url;
    } else if (parsed.pathname.startsWith('/v1/')) {
      req.url = `${parsed.pathname}${qs ? `?${qs}` : ''}`;
      req.originalUrl = req.url;
    }

    const method = (req.method || 'GET').toUpperCase();
    const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(method);
    const host = (req.headers['x-forwarded-host'] || req.headers.host || 'localhost')
      .split(',')[0]
      .trim();
    const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    const ownOrigin = `${proto}://${host}`;
    const browserOrigin = req.headers.origin;

    if (mutating && browserOrigin && browserOrigin !== ownOrigin) {
      sendJson(res, 403, { statusCode: 403, message: 'Origem não autorizada' });
      return;
    }

    const candidateDbUrl =
      cleanEnvUrl(process.env.DATABASE_URL) ||
      cleanEnvUrl(process.env.POSTGRES_URL) ||
      cleanEnvUrl(process.env.NEON_DATABASE_URL) ||
      cleanEnvUrl(process.env.DIRECT_URL) ||
      cleanEnvUrl(process.env.POSTGRES_URL_NON_POOLING);

    // Modo 1: Proxy BFF para projeto de API separado quando BRAVO_API_URL aponta para outro host
    const configuredUpstream = cleanEnvUrl(process.env.BRAVO_API_URL)
      .replace(/\/v1\/?$/i, '')
      .replace(/\/+$/, '');
    const cleanProxyKey = cleanEnvUrl(process.env.BRAVO_PROXY_KEY);
    if (configuredUpstream) {
      let upstreamUrl;
      try {
        upstreamUrl = new URL(configuredUpstream);
      } catch {
        upstreamUrl = null;
      }

      if (
        upstreamUrl &&
        upstreamUrl.hostname.toLowerCase() !== host.toLowerCase() &&
        !['localhost', '127.0.0.1'].includes(upstreamUrl.hostname.toLowerCase())
      ) {
        const target = new URL(req.url, upstreamUrl);
        const headers = {
          Accept: 'application/json',
          'X-Bravo-Proxy-Key': cleanProxyKey || RUNTIME_BFF_KEY,
        };
        if (process.env.BRAVO_API_VERCEL_BYPASS_TOKEN) {
          headers['x-vercel-protection-bypass'] = process.env.BRAVO_API_VERCEL_BYPASS_TOKEN.trim();
        }
        if (req.headers.cookie) headers.Cookie = req.headers.cookie;
        if (req.headers.authorization) headers.Authorization = req.headers.authorization;
        if (req.headers['x-csrf-token']) headers['X-CSRF-Token'] = req.headers['x-csrf-token'];
        if (browserOrigin) headers.Origin = cleanEnvUrl(process.env.APP_ORIGIN) || browserOrigin;
        if (mutating && req.headers['content-type']) {
          headers['Content-Type'] = req.headers['content-type'];
        }

        const bodyBuffer = mutating ? await readRawBody(req) : undefined;
        const upstreamRes = await fetch(target, {
          method,
          headers,
          body: bodyBuffer && bodyBuffer.length > 0 ? bodyBuffer : undefined,
          cache: 'no-store',
          redirect: 'manual',
          signal: AbortSignal.timeout(25000),
        });

        const ct = upstreamRes.headers.get('content-type') || '';
        const isHtmlChallenge = ct.includes('text/html');
        const upstreamFailed = [404, 502, 503, 504].includes(upstreamRes.status) || isHtmlChallenge;

        if (!upstreamFailed || !candidateDbUrl) {
          if (isHtmlChallenge) {
            sendJson(res, 502, {
              statusCode: 502,
              message: `Upstream API (${upstreamUrl.origin}) retornou HTML (status ${upstreamRes.status} — possível Deployment Protection na Vercel ou rota inexistente). Configure BRAVO_API_VERCEL_BYPASS_TOKEN ou DATABASE_URL no projeto.`,
            });
            return;
          }

          res.statusCode = upstreamRes.status;
          res.setHeader('Cache-Control', 'private, no-store, max-age=0');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          if (ct) res.setHeader('Content-Type', ct);
          const cookies = upstreamRes.headers.getSetCookie ? upstreamRes.headers.getSetCookie() : [];
          if (cookies.length > 0) {
            res.setHeader('Set-Cookie', cookies);
          } else {
            const singleCookie = upstreamRes.headers.get('set-cookie');
            if (singleCookie) res.setHeader('Set-Cookie', singleCookie);
          }
          const retryAfter = upstreamRes.headers.get('retry-after');
          if (retryAfter) res.setHeader('Retry-After', retryAfter);

          if (method === 'HEAD') {
            res.end();
            return;
          }
          const respBytes = Buffer.from(await upstreamRes.arrayBuffer());
          res.end(respBytes);
          return;
        }
      }
    }

    // Modo 2: Execução in-process do núcleo NestJS (@bravo-ii/api)
    process.env.BRAVO_PROXY_KEY = RUNTIME_BFF_KEY;
    process.env.ENABLE_EXTERNAL_PUBLICATION = 'false';
    process.env.ENABLE_REAL_PAYMENTS = 'false';
    process.env.ENABLE_REAL_REFUNDS = 'false';
    process.env.ALLOW_REAL_PAYMENT_GATEWAY = 'false';
    process.env.ALLOW_REAL_REFUND_EXECUTION = 'false';
    process.env.ALLOW_REAL_PAYOUT_EXECUTION = 'false';

    if (!process.env.BRAVO_ENV) {
      process.env.BRAVO_ENV = 'HOMOLOGACAO';
    }
    const cleanedOrigin = cleanEnvUrl(process.env.APP_ORIGIN);
    process.env.APP_ORIGIN = cleanedOrigin && /^https:\/\/[^/\s?#]+$/.test(cleanedOrigin) ? cleanedOrigin : ownOrigin;

    if (!process.env.CPF_HASH_PEPPER || process.env.CPF_HASH_PEPPER.length < 32) {
      process.env.CPF_HASH_PEPPER = 'bravo_ii_hml_internal_pepper_key_32chars_2026';
    }
    if (!process.env.COOKIE_SECURE) {
      process.env.COOKIE_SECURE = 'true';
    }

    if (candidateDbUrl) {
      process.env.DATABASE_URL = candidateDbUrl;
    } else {
      if (req.url === '/v1/saude' || req.url.startsWith('/v1/saude?')) {
        sendJson(res, 200, {
          api: 'ATIVA',
          banco: 'NAO_VERIFICADO',
          ambiente: 'HOMOLOGACAO',
          publicacaoExterna: false,
          pagamentosReais: false,
          googleApiConfigurada: Boolean(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY),
          vercelEnv: process.env.VERCEL_ENV || null,
          hasDatabaseUrl: false,
          hasBravoApiUrl: Boolean(configuredUpstream),
          hasBravoProxyKey: Boolean(process.env.BRAVO_PROXY_KEY && process.env.BRAVO_PROXY_KEY.length >= 32),
        });
        return;
      }
      sendJson(res, 503, {
        statusCode: 503,
        code: 'MISSING_BACKEND_CONNECTION_ENV',
        message:
          'Rota /v1 ativa na Vercel, porém DATABASE_URL (PostgreSQL Neon _hml) ou BRAVO_API_URL (origem HTTPS da API separada) não está configurada nas variáveis de ambiente deste projeto Vercel.',
        diagnostics: {
          vercelEnv: process.env.VERCEL_ENV || null,
          hasDatabaseUrl: false,
          hasBravoApiUrl: Boolean(configuredUpstream),
          hasBravoProxyKey: Boolean(process.env.BRAVO_PROXY_KEY && process.env.BRAVO_PROXY_KEY.length >= 32),
        },
      });
      return;
    }

    req.headers['x-bravo-proxy-key'] = RUNTIME_BFF_KEY;

    const apiMain = require('../apps/api/dist/main.js');
    const handler = apiMain.default || apiMain;
    return await handler(req, res);
  } catch (err) {
    sendJson(res, 503, {
      statusCode: 503,
      message:
        err instanceof Error
          ? `Serviço transacional indisponível: ${err.message}`
          : 'Serviço transacional indisponível.',
    });
  }
};
