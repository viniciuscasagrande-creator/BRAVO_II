/** Verificação somente leitura do PostgreSQL de homologação. Não substitui E2E de checkout. */
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { validateHomologationEnv } = require('../packages/core-policy/dist/index.js');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(path.join(root, '.env'));
  }
} catch {}

const errors = validateHomologationEnv(process.env);
if (errors.length) {
  console.error('Ambiente de homologação inválido:', errors.join(' | '));
  process.exit(1);
}

const { DatabaseService } = require('../apps/api/dist/common/database/database.service.js');

const db = new DatabaseService();
try {
  await db.onModuleInit();
  const versionRes = await db.query(
    `SELECT current_database() AS database, current_user AS username, version() AS version`
  );
  const version = versionRes.rows[0] || {};
  const configuredDb = new URL(process.env.DATABASE_URL || '').pathname.replace(/^\//, '');
  const dbName =
    ['postgres', 'template1'].includes(String(version.database || '')) && configuredDb
      ? `${configuredDb} (${version.database})`
      : String(version.database || configuredDb);
  if (!/(hml|homolog|preview)/i.test(dbName)) {
    throw Error('Banco incorreto. Não é homologação.');
  }

  const tablesRes = await db.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`
  );
  const names = new Set(tablesRes.rows.map((t) => t.table_name));
  const required = [
    'producers',
    'events',
    'customers',
    'p08_sale_orders',
    'p08_issued_tickets',
    'p08_payment_confirmations',
    'p09_checkout_attempts',
    'p09_pdv_terminals',
    'p09_pdv_shifts',
    'users',
  ];
  const missing = required.filter((t) => !names.has(t));
  if (missing.length) {
    throw Error('Migrations pendentes: ' + missing.join(', '));
  }
  const pg =
    String(version.version || '').match(/PostgreSQL\s+([\d.]+)/i)?.[1] || 'versão não identificada';
  console.log(
    JSON.stringify(
      {
        status: 'APROVADA_SOMENTE_LEITURA',
        database: dbName,
        postgres: pg,
        requiredTables: required.length,
        verifiedTables: required,
        missingTables: [],
      },
      null,
      2
    )
  );
  console.log(
    'Atenção: NÃO comprova login E2E, concorrência, webhook, captura, PDV ou execução de pagamentos.'
  );
} catch (e) {
  console.error('REPROVADA:', e.message);
  process.exitCode = 1;
} finally {
  await db.onModuleDestroy();
}
