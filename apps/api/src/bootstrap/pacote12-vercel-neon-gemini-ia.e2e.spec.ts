import 'reflect-metadata';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from '../common/errors/api-exception.filter';
import { DatabaseService } from '../common/database/database.service';
import { IdentityService } from '../modules/identity/identity.service';

interface SessionCookies {
  cookieHeader: string;
  csrfToken: string;
  userId: string;
}

describe('Pacote 12 — Homologação Vercel Preview + Neon PostgreSQL + Assistente Gemini (E2E)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let db: DatabaseService;
  const appOrigin = 'http://localhost:3000';
  const sessions: Record<string, SessionCookies> = {};
  const proxyKey = 'p12_bravo_proxy_secret_key_for_e2e_verification_64_chars_long_ok';

  async function loginAs(email: string, password: string): Promise<SessionCookies> {
    const res = await fetch(`${baseUrl}/v1/auth/login`, {
      method: 'POST',
      headers: {
        Origin: appOrigin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(res.status, 200, `Falha no login de ${email}: ${res.status}`);
    const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    const cookieHeader = setCookies.map((c) => c.split(';')[0]).join('; ');
    const body = (await res.json()) as { csrfToken: string; user: { id: string } };
    return {
      cookieHeader,
      csrfToken: body.csrfToken,
      userId: body.user.id,
    };
  }

  async function apiGet(who: SessionCookies, path: string) {
    const res = await fetch(`${baseUrl}/v1/${path}`, {
      headers: {
        Cookie: who.cookieHeader,
      },
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  async function apiPost(who: SessionCookies, path: string, body: unknown = {}) {
    const res = await fetch(`${baseUrl}/v1/${path}`, {
      method: 'POST',
      headers: {
        Origin: appOrigin,
        Cookie: who.cookieHeader,
        'X-CSRF-Token': who.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.BRAVO_ENV = 'HOMOLOGACAO';
    process.env.PGLITE_DATA_DIR = 'memory://';
    process.env.APP_ORIGIN = appOrigin;
    process.env.COOKIE_SECURE = 'false';
    process.env.ENABLE_REAL_PAYMENTS = 'false';
    process.env.ENABLE_REAL_REFUNDS = 'false';
    process.env.ENABLE_EXTERNAL_PUBLICATION = 'false';
    process.env.BRAVO_GEMINI_ENABLED = 'false';
    process.env.GEMINI_MODEL = 'gemini-3.8-flash';
    process.env.GEMINI_API_KEY = 'AIzaSyHomologacaoSimulatedKeyForTestingOnly123456789';
    process.env.BRAVO_PROXY_KEY = proxyKey;
    process.env.ENABLE_BRAVO_PROXY_GUARD = 'false';

    app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.listen(0, '127.0.0.1');

    const addr = app.getHttpServer().address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;

    db = app.get(DatabaseService);
    const identity = app.get(IdentityService);
    await identity.syncCanonicalRolesAndPermissions();

    const accounts = [
      {
        key: 'admin',
        id: '12000000-0000-4000-8000-000000000001',
        email: 'admin.p12@diskingressos.test',
        fullName: 'Admin Homologação P12',
        plainPassword: 'BravoP12#AdminPassword2026',
        role: 'ADMIN_BRAVO' as const,
      },
      {
        key: 'sac',
        id: '12000000-0000-4000-8000-000000000002',
        email: 'sac.p12@diskingressos.test',
        fullName: 'Agente SAC P12',
        plainPassword: 'BravoP12#SacPassword2026',
        role: 'SAC_ATENDIMENTO' as const,
      },
      {
        key: 'fin',
        id: '12000000-0000-4000-8000-000000000003',
        email: 'fin.p12@diskingressos.test',
        fullName: 'Analista Financeiro Disk P12',
        plainPassword: 'BravoP12#FinPassword2026',
        role: 'FINANCEIRO_DISK' as const,
      },
      {
        key: 'produtor',
        id: '12000000-0000-4000-8000-000000000004',
        email: 'produtor.p12@pdt.diskingressos.test',
        fullName: 'Produtor Externo PDT P12',
        plainPassword: 'BravoP12#ProdutorPassword2026',
        role: 'PRODUTOR_PDT' as const,
      },
    ];

    for (const acc of accounts) {
      await identity.ensureOperatorAccount(acc);
      sessions[acc.key] = await loginAs(acc.email, acc.plainPassword);
    }
  });

  after(async () => {
    process.env.ENABLE_BRAVO_PROXY_GUARD = 'false';
    process.env.BRAVO_GEMINI_ENABLED = 'false';
    if (app) {
      await app.close();
    }
  });

  it('1. Guardião de chave BFF (ENABLE_BRAVO_PROXY_GUARD=true) bloqueia acesso direto sem X-Bravo-Proxy-Key com HTTP 403', async () => {
    process.env.ENABLE_BRAVO_PROXY_GUARD = 'true';
    try {
      const noKeyRes = await fetch(`${baseUrl}/v1/saude`);
      assert.equal(noKeyRes.status, 403);
      assert.equal(noKeyRes.headers.get('cache-control'), 'no-store');

      const badKeyRes = await fetch(`${baseUrl}/v1/saude`, {
        headers: { 'X-Bravo-Proxy-Key': 'chave_curta_ou_invalida' },
      });
      assert.equal(badKeyRes.status, 403);

      const validKeyRes = await fetch(`${baseUrl}/v1/saude`, {
        headers: { 'X-Bravo-Proxy-Key': proxyKey },
      });
      assert.equal(validKeyRes.status, 200);
    } finally {
      process.env.ENABLE_BRAVO_PROXY_GUARD = 'false';
    }
  });

  it('2. IA inicia desabilitada por padrão (BRAVO_GEMINI_ENABLED=false) e recusa consultas com HTTP 503', async () => {
    process.env.BRAVO_GEMINI_ENABLED = 'false';

    const statusRes = await apiGet(sessions.admin, 'ia/status');
    assert.equal(statusRes.status, 200);
    const statusBody = statusRes.data as {
      habilitada: boolean;
      areas: string[];
      modo: string;
      dadosReais: boolean;
    };
    assert.equal(statusBody.habilitada, false);
    assert.equal(statusBody.modo, 'ASSISTENTE_SOMENTE_LEITURA');
    assert.equal(statusBody.dadosReais, false);
    assert.deepEqual(statusBody.areas, ['GERAL', 'COMERCIAL', 'EVENTOS', 'SAC', 'FINANCEIRO', 'RH']);

    const askRes = await apiPost(sessions.admin, 'ia/consultar', {
      area: 'GERAL',
      pergunta: 'Quais verificações devem ocorrer antes de publicar um evento?',
    });
    assert.equal(askRes.status, 503);
  });

  it('3. Controle de acesso por departamento: Produtor bloqueado e SAC impedido de consultar Financeiro ou RH', async () => {
    const prodStatusRes = await apiGet(sessions.produtor, 'ia/status');
    assert.equal(prodStatusRes.status, 200);
    const prodStatus = prodStatusRes.data as { areas: string[] };
    assert.deepEqual(prodStatus.areas, []);

    const prodAskRes = await apiPost(sessions.produtor, 'ia/consultar', {
      area: 'GERAL',
      pergunta: 'Como funciona o fluxo operacional de eventos?',
    });
    assert.equal(prodAskRes.status, 403);

    const sacStatusRes = await apiGet(sessions.sac, 'ia/status');
    assert.equal(sacStatusRes.status, 200);
    const sacStatus = sacStatusRes.data as { areas: string[] };
    assert.deepEqual(sacStatus.areas, ['GERAL', 'SAC']);

    const sacFinanceAskRes = await apiPost(sessions.sac, 'ia/consultar', {
      area: 'FINANCEIRO',
      pergunta: 'Quais etapas compõem a dupla aprovação financeira de estorno?',
    });
    assert.equal(sacFinanceAskRes.status, 403);
  });

  it('4. Quando habilitada, bloqueia perguntas com PII/LGPD (CPF, e-mail, PIX, senha) e aplica limite de 4 consultas/minuto no PostgreSQL com auditoria sem PII', async () => {
    process.env.BRAVO_GEMINI_ENABLED = 'true';
    const originalFetch = globalThis.fetch;

    // Intercepta apenas chamadas para generativelanguage.googleapis.com para simular resposta consultiva determinística
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.startsWith('https://generativelanguage.googleapis.com/')) {
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: 'Orientação técnica BRAVO_II: a solicitação de estorno requer parecer do SAC e dupla aprovação do Financeiro Disk.',
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return originalFetch(input, init);
    }) as typeof fetch;

    try {
      // 4.1 Rejeita CPF/dados sensíveis com HTTP 400 antes de consumir cota ou chamar API externa
      const piiRes = await apiPost(sessions.fin, 'ia/consultar', {
        area: 'FINANCEIRO',
        pergunta: 'O cliente de CPF 123.456.789-00 pode receber estorno imediato?',
      });
      assert.equal(piiRes.status, 400);

      // 4.2 Limpa janela de cota do usuário fin e executa 4 consultas válidas (limite por minuto = 4)
      await db.query(`DELETE FROM p12_ai_quota_windows WHERE actor_id = $1`, [sessions.fin.userId]);

      for (let i = 1; i <= 4; i++) {
        const okRes = await apiPost(sessions.fin, 'ia/consultar', {
          area: 'FINANCEIRO',
          pergunta: `Consulta genérica número ${i}: como funciona a alçada dupla de estornos?`,
        });
        assert.equal(okRes.status, 201);
        const body = okRes.data as { resposta: string; area: string; modelo: string; aviso: string };
        assert.equal(body.area, 'FINANCEIRO');
        assert.equal(body.modelo, 'gemini-3.8-flash');
        assert.match(body.resposta, /dupla aprovação/i);
        assert.match(body.aviso, /Não autoriza nem executa operações/i);
      }

      // 4.3 5ª consulta no mesmo minuto deve ser bloqueada com HTTP 429 Too Many Requests pelo PostgreSQL
      const fifthRes = await apiPost(sessions.fin, 'ia/consultar', {
        area: 'FINANCEIRO',
        pergunta: 'Quinta consulta no mesmo minuto deve exceder o limite por minuto.',
      });
      assert.equal(fifthRes.status, 429);

      // 4.4 Verifica persistência na tabela p12_ai_quota_windows e auditoria sem conteúdo da pergunta
      const quotaRows = await db.query<{ bucket: string; requests: number }>(
        `SELECT bucket, requests FROM p12_ai_quota_windows WHERE actor_id = $1 ORDER BY bucket ASC`,
        [sessions.fin.userId]
      );
      assert.equal(quotaRows.rowCount, 2);

      const auditRows = await db.query<{ canonical_action: string; after_state: Record<string, unknown> }>(
        `SELECT canonical_action, after_state FROM audit_records WHERE resource_type = 'IA' AND actor_user_id = $1 ORDER BY occurred_at DESC LIMIT 2`,
        [sessions.fin.userId]
      );
      assert.equal(auditRows.rowCount, 2);
      const actions = auditRows.rows.map((r) => r.canonical_action);
      assert.ok(actions.includes('IA_CONSULTA'));
      assert.ok(actions.includes('IA_RESPOSTA'));
      const serializedAudit = JSON.stringify(auditRows.rows);
      assert.doesNotMatch(serializedAudit, /Consulta genérica número/);
    } finally {
      globalThis.fetch = originalFetch;
      process.env.BRAVO_GEMINI_ENABLED = 'false';
    }
  });
});
