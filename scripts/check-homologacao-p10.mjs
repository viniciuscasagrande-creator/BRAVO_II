/** Verificação somente leitura do PostgreSQL de homologação para o Pacote 10 (P06–P10). */
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
if (process.env.ENABLE_TICKET_REPLACEMENT === 'true' || process.env.ACCESS_GATE_INTEGRATED === 'true') {
  errors.push('ENABLE_TICKET_REPLACEMENT e ACCESS_GATE_INTEGRATED devem permanecer false');
}
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
    'p10_support_teams',
    'p10_support_team_members',
    'p10_support_queues',
    'p10_sla_policies',
    'p10_support_cases',
    'p10_support_interactions',
    'p10_support_incidents',
    'p10_support_problems',
    'p10_knowledge_articles',
    'p10_support_satisfactions',
    'p10_order_change_requests',
    'p10_ticket_replacements',
    'p10_cancellation_requests',
    'p10_refund_requests',
    'p10_refund_approvals',
    'p10_refund_attempts',
    'p10_event_refund_batches',
    'users',
    'audit_records',
    'outbox_events',
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
    'Atenção: Confirma migrações P01–P10 e travas de segurança ativas. Nenhuma execução financeira externa habilitada.'
  );
} catch (e) {
  console.error('REPROVADA:', e.message);
  process.exitCode = 1;
} finally {
  await db.onModuleDestroy();
}
