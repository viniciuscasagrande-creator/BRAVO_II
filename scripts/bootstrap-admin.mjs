import fs from 'node:fs';
import process from 'node:process';
import { createRequire } from 'node:module';
import { randomBytes, randomUUID, scrypt as _scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const require = createRequire(import.meta.url);
const { validateHomologationEnv } = require('../packages/core-policy/dist/index.js');

if (fs.existsSync('.env') && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile('.env');
}

const errors = validateHomologationEnv(process.env);
if (errors.length) {
  throw new Error('Bootstrap recusado fora da homologação: ' + errors.join('; '));
}

if (process.env.BRAVO_BOOTSTRAP_ADMIN !== 'true') {
  throw new Error('Para bootstrap explícito, use BRAVO_BOOTSTRAP_ADMIN=true');
}

const email = (process.env.BRAVO_ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.BRAVO_ADMIN_PASSWORD || '';
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 256) {
  throw new Error('Informe BRAVO_ADMIN_EMAIL e senha forte (12 a 256 caracteres)');
}

const scrypt = promisify(_scrypt);
const salt = randomBytes(16).toString('hex');
const hash = (await scrypt(password, salt, 64)).toString('hex');
const passwordHash = `scrypt:${salt}:${hash}`;

const { Pool } = require('../apps/api/node_modules/pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const countRes = await pool.query('SELECT COUNT(*)::int AS cnt FROM users');
  if (Number(countRes.rows[0]?.cnt ?? 0) !== 0) {
    throw new Error('Bootstrap recusado: já existe usuário. Use o processo de administração para novos acessos.');
  }
  const userId = randomUUID();
  const auditId = randomUUID();
  await pool.query('BEGIN');
  await pool.query(
    `INSERT INTO users (id, email, full_name, password_hash, status, failed_logins, locked_until, force_password_change)
     VALUES ($1, $2, 'Administrador Inicial BRAVO_II', $3, 'ACTIVE', 0, NULL, TRUE)`,
    [userId, email, passwordHash]
  );
  await pool.query(
    `INSERT INTO user_role_grants (user_id, role_code) VALUES ($1, 'ADMIN_BRAVO') ON CONFLICT DO NOTHING`,
    [userId]
  );
  await pool.query(
    `INSERT INTO audit_records (id, actor_user_id, actor_role, canonical_action, resource_type, resource_id, outcome, justification, correlation_id)
     VALUES ($1, $2, 'ADMIN_BRAVO', 'auth.bootstrap.admin', 'User', $2, 'SUCCESS', 'Bootstrap administrativo inicial em homologação', $3)`,
    [auditId, userId, `bootstrap-${userId}`]
  );
  await pool.query('COMMIT');
  console.log('Administrador inicial criado. Desative BRAVO_BOOTSTRAP_ADMIN e apague a senha do ambiente.');
} catch (err) {
  await pool.query('ROLLBACK').catch(() => {});
  throw err;
} finally {
  await pool.end();
}
