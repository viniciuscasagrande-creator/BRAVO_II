import 'reflect-metadata';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from '../common/errors/api-exception.filter';
import { DatabaseService } from '../common/database/database.service';
import { IdentityService } from '../modules/identity/identity.service';

describe('BRAVO_II — Pacote 07 E2E: Homologação PostgreSQL, Autenticação Central (Cookie HttpOnly + CSRF + Origin), Lockout de Força Bruta e Navegação por Perfil', () => {
  let app: INestApplication;
  let baseUrl: string;
  const appOrigin = 'http://localhost:3000';

  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PGLITE_DATA_DIR = 'memory://';
    process.env.APP_ORIGIN = appOrigin;
    process.env.COOKIE_SECURE = 'false';
    process.env.ALLOW_REAL_PAYMENT_GATEWAY = 'false';
    process.env.ALLOW_REAL_REFUND_EXECUTION = 'false';
    process.env.ALLOW_REAL_PAYOUT_EXECUTION = 'false';

    app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.listen(0);

    const server = app.getHttpServer();
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;

    const identity = app.get(IdentityService);
    await identity.syncCanonicalRolesAndPermissions();

    const accounts = [
      {
        id: '77000000-0000-4000-8000-000000000001',
        email: 'admin.p07@diskingressos.test',
        fullName: 'Admin Homologação P07',
        plainPassword: 'BravoP07#AdminPassword2026',
        role: 'ADMIN_BRAVO' as const,
      },
      {
        id: '77000000-0000-4000-8000-000000000002',
        email: 'comercial.p07@diskingressos.test',
        fullName: 'Comercial Homologação P07',
        plainPassword: 'BravoP07#ComercialPassword2026',
        role: 'COMERCIAL_DISK' as const,
      },
      {
        id: '77000000-0000-4000-8000-000000000003',
        email: 'operacoes.p07@diskingressos.test',
        fullName: 'Operações Homologação P07',
        plainPassword: 'BravoP07#OperacoesPassword2026',
        role: 'OPERACAO_EVENTOS' as const,
      },
      {
        id: '77000000-0000-4000-8000-000000000004',
        email: 'financeiro.p07@diskingressos.test',
        fullName: 'Financeiro Homologação P07',
        plainPassword: 'BravoP07#FinanceiroPassword2026',
        role: 'FINANCEIRO_DISK' as const,
      },
      {
        id: '77000000-0000-4000-8000-000000000005',
        email: 'rh.p07@diskingressos.test',
        fullName: 'RH Homologação P07',
        plainPassword: 'BravoP07#RhPassword2026',
        role: 'RH_DP_DISK' as const,
      },
      {
        id: '77000000-0000-4000-8000-000000000006',
        email: 'produtor.p07@pdt.diskingressos.test',
        fullName: 'Produtor PDT Homologação P07',
        plainPassword: 'BravoP07#ProdutorPassword2026',
        role: 'PRODUTOR_PDT' as const,
      },
      {
        id: '77000000-0000-4000-8000-000000000007',
        email: 'lockout.p07@diskingressos.test',
        fullName: 'Usuário Teste Lockout P07',
        plainPassword: 'BravoP07#LockoutPassword2026',
        role: 'COMERCIAL_DISK' as const,
      },
    ];

    for (const acc of accounts) {
      await identity.ensureOperatorAccount(acc);
    }
  });

  after(async () => {
    delete process.env.APP_ORIGIN;
    if (app) {
      await app.close();
    }
  });

  it('1. Verifica /v1/saude, /v1/saude/banco, bloqueio 401 sem sessão e bloqueio 403 de Origin inválido no login', async () => {
    const health = await fetch(`${baseUrl}/v1/saude`);
    assert.equal(health.status, 200);
    const hBody = (await health.json()) as {
      api: string;
      publicacaoExterna: boolean;
      pagamentosReais: boolean;
    };
    assert.equal(hBody.api, 'ATIVA');
    assert.equal(hBody.publicacaoExterna, false);
    assert.equal(hBody.pagamentosReais, false);

    const dbHealth = await fetch(`${baseUrl}/v1/saude/banco`);
    assert.equal(dbHealth.status, 200);
    const dbBody = (await dbHealth.json()) as { banco: string };
    assert.equal(dbBody.banco, 'CONECTADO');

    const unauthMenu = await fetch(`${baseUrl}/v1/navegacao/menu`);
    assert.equal(unauthMenu.status, 401);

    const unauthEvents = await fetch(`${baseUrl}/v1/eventos`);
    assert.equal(unauthEvents.status, 401);

    const spoofOrigin = await fetch(`${baseUrl}/v1/auth/login`, {
      method: 'POST',
      headers: {
        Origin: 'https://exemplo-invalido.local',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin.p07@diskingressos.test',
        password: 'BravoP07#AdminPassword2026',
      }),
    });
    assert.equal(spoofOrigin.status, 403);
  });

  it('2. Realiza login com Cookie HttpOnly (bravo_session), exige X-CSRF-Token em mutações e revoga sessão no logout', async () => {
    const loginRes = await fetch(`${baseUrl}/v1/auth/login`, {
      method: 'POST',
      headers: {
        Origin: appOrigin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'comercial.p07@diskingressos.test',
        password: 'BravoP07#ComercialPassword2026',
      }),
    });
    assert.equal(loginRes.status, 200);

    const setCookieHeader = loginRes.headers.get('set-cookie') ?? '';
    assert.equal(setCookieHeader.includes('bravo_session='), true);
    assert.equal(setCookieHeader.includes('HttpOnly'), true);
    assert.equal(setCookieHeader.includes('SameSite=Lax'), true);

    const cookiePair = setCookieHeader.split(';')[0];
    const loginData = (await loginRes.json()) as {
      csrfToken: string;
      user: { id: string; email: string; roles: string[] };
    };
    assert.equal(Boolean(loginData.csrfToken), true);
    assert.equal(loginData.user.email, 'comercial.p07@diskingressos.test');

    // Consulta /v1/auth/me usando apenas Cookie HttpOnly
    const meRes = await fetch(`${baseUrl}/v1/auth/me`, {
      headers: { Cookie: cookiePair },
    });
    assert.equal(meRes.status, 200);
    const meData = (await meRes.json()) as { csrfToken: string };
    assert.equal(meData.csrfToken, loginData.csrfToken);

    // Mutação POST com Cookie sem X-CSRF-Token deve ser bloqueada com 403
    const noCsrfRes = await fetch(`${baseUrl}/v1/comercial/produtores`, {
      method: 'POST',
      headers: {
        Cookie: cookiePair,
        Origin: appOrigin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    assert.equal(noCsrfRes.status, 403);

    // Mutação POST com Cookie + Origin + X-CSRF-Token válido funciona
    const withCsrfRes = await fetch(`${baseUrl}/v1/comercial/produtores`, {
      method: 'POST',
      headers: {
        Cookie: cookiePair,
        Origin: appOrigin,
        'X-CSRF-Token': loginData.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        legalName: 'Produtora Homologação Pacote 07 Ltda',
        tradeName: 'Homologação P07',
        cnpj: '00.000.000/E08G-12',
        email: 'contato@p07.com.br',
        phone: '41999990007',
        address: {
          street: 'Rua Marechal Deodoro',
          number: '500',
          district: 'Centro',
          city: 'Curitiba',
          state: 'PR',
          postalCode: '80010010',
        },
        legalRepresentative: {
          name: 'Roberto Campos',
          email: 'roberto@p07.com.br',
          role: 'Diretor',
        },
      }),
    });
    assert.equal(withCsrfRes.status, 201);

    // Logout revoga a sessão no PostgreSQL
    const logoutRes = await fetch(`${baseUrl}/v1/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: cookiePair,
        Origin: appOrigin,
        'X-CSRF-Token': loginData.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    assert.equal(logoutRes.status, 200);

    // Reutilizar o cookie após logout retorna 401
    const afterLogoutRes = await fetch(`${baseUrl}/v1/navegacao/menu`, {
      headers: { Cookie: cookiePair },
    });
    assert.equal(afterLogoutRes.status, 401);
  });

  it('3. Valida menu por perfil em /v1/navegacao/menu (ADMIN, COMERCIAL, OPERACOES, FINANCEIRO_DISK, RH e PRODUTOR)', async () => {
    const getMenuIdsFor = async (email: string, password: string): Promise<string[]> => {
      const loginRes = await fetch(`${baseUrl}/v1/auth/login`, {
        method: 'POST',
        headers: { Origin: appOrigin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      assert.equal(loginRes.status, 200);
      const cookiePair = (loginRes.headers.get('set-cookie') ?? '').split(';')[0];
      const menuRes = await fetch(`${baseUrl}/v1/navegacao/menu`, {
        headers: { Cookie: cookiePair },
      });
      assert.equal(menuRes.status, 200);
      const body = (await menuRes.json()) as { items: Array<{ id: string; status: string }> };
      return body.items.map((i) => i.id);
    };

    const adminMenu = await getMenuIdsFor('admin.p07@diskingressos.test', 'BravoP07#AdminPassword2026');
    assert.deepEqual(adminMenu, ['home', 'produtores', 'eventos', 'taxas', 'financeiro', 'rh']);

    const comercialMenu = await getMenuIdsFor('comercial.p07@diskingressos.test', 'BravoP07#ComercialPassword2026');
    assert.deepEqual(comercialMenu, ['home', 'produtores', 'eventos', 'taxas']);

    const operacoesMenu = await getMenuIdsFor('operacoes.p07@diskingressos.test', 'BravoP07#OperacoesPassword2026');
    assert.deepEqual(operacoesMenu, ['home', 'produtores', 'eventos']);

    const financeiroMenu = await getMenuIdsFor('financeiro.p07@diskingressos.test', 'BravoP07#FinanceiroPassword2026');
    assert.deepEqual(financeiroMenu, ['home', 'produtores', 'eventos', 'taxas', 'financeiro']);

    const rhMenu = await getMenuIdsFor('rh.p07@diskingressos.test', 'BravoP07#RhPassword2026');
    assert.deepEqual(rhMenu, ['home', 'rh']);

    const produtorMenu = await getMenuIdsFor('produtor.p07@pdt.diskingressos.test', 'BravoP07#ProdutorPassword2026');
    assert.deepEqual(produtorMenu, []);
  });

  it('4. Bloqueia conta após 5 tentativas de senha incorreta (proteção contra força bruta)', async () => {
    for (let i = 1; i <= 5; i++) {
      const failRes = await fetch(`${baseUrl}/v1/auth/login`, {
        method: 'POST',
        headers: { Origin: appOrigin, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'lockout.p07@diskingressos.test',
          password: `SenhaIncorretaTentativa${i}`,
        }),
      });
      assert.equal(failRes.status, 401);
    }

    // 6ª tentativa, mesmo com a senha correta, retorna 403 ACCOUNT_LOCKED
    const lockedRes = await fetch(`${baseUrl}/v1/auth/login`, {
      method: 'POST',
      headers: { Origin: appOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'lockout.p07@diskingressos.test',
        password: 'BravoP07#LockoutPassword2026',
      }),
    });
    assert.equal(lockedRes.status, 403);

    // Simula expiração da janela de 30 minutos de bloqueio temporário
    const db = app.get(DatabaseService);
    await db.query(
      `UPDATE users SET locked_until = NOW() - INTERVAL '1 minute' WHERE email = 'lockout.p07@diskingressos.test'`
    );

    // Após expirar o bloqueio temporário, o login com a senha correta é permitido e zera failed_logins
    const unlockedRes = await fetch(`${baseUrl}/v1/auth/login`, {
      method: 'POST',
      headers: { Origin: appOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'lockout.p07@diskingressos.test',
        password: 'BravoP07#LockoutPassword2026',
      }),
    });
    assert.equal(unlockedRes.status, 200);

    const checkUser = await db.query<{ failed_logins: number; locked_until: string | null }>(
      `SELECT failed_logins, locked_until FROM users WHERE email = 'lockout.p07@diskingressos.test'`
    );
    assert.equal(Number(checkUser.rows[0]?.failed_logins), 0);
    assert.equal(checkUser.rows[0]?.locked_until, null);
  });
});
