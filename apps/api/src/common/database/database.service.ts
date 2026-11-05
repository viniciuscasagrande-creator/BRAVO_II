import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { loadEnvironmentConfig } from '@bravo-ii/config';

export interface QueryResultRow {
  [column: string]: unknown;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pgPool: Pool | null = null;
  private pglite: PGlite | null = null;
  private initialized = false;

  async onModuleInit(): Promise<void> {
    await this.ensureInitialized();
  }

  async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const config = loadEnvironmentConfig();
    if (config.databaseUrl) {
      this.pgPool = new Pool({
        connectionString: config.databaseUrl,
      });
    } else {
      if (config.nodeEnv === 'test' || config.pgliteDataDir === 'memory://') {
        this.pglite = new PGlite();
      } else {
        const resolvedDir = path.resolve(process.cwd(), config.pgliteDataDir);
        fs.mkdirSync(resolvedDir, { recursive: true });
        this.pglite = new PGlite(resolvedDir);
      }
    }

    this.initialized = true;
    await this.runMigrations();
  }

  async query<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = []
  ): Promise<{ rows: T[]; rowCount: number }> {
    await this.ensureInitialized();

    if (this.pgPool) {
      const res = await this.pgPool.query(sql, params);
      return {
        rows: res.rows as T[],
        rowCount: res.rowCount ?? res.rows.length,
      };
    }

    if (!this.pglite) {
      throw new Error('Motor de banco de dados PostgreSQL não inicializado.');
    }

    const res = await this.pglite.query<T>(sql, params);
    return {
      rows: res.rows,
      rowCount: res.rows.length > 0 ? res.rows.length : (res.affectedRows ?? 0),
    };
  }

  async execSqlScript(sqlScript: string): Promise<void> {
    await this.ensureInitialized();

    if (this.pgPool) {
      await this.pgPool.query(sqlScript);
      return;
    }

    if (!this.pglite) {
      throw new Error('Motor de banco de dados PostgreSQL não inicializado.');
    }

    await this.pglite.exec(sqlScript);
  }

  private resolveMigrationsDir(): string {
    const candidates = [
      path.resolve(process.cwd(), 'database/migrations'),
      path.resolve(process.cwd(), '../../database/migrations'),
      path.resolve(__dirname, '../../../../../database/migrations'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    throw new Error('Diretório database/migrations não encontrado.');
  }

  async runMigrations(): Promise<string[]> {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(128) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    await this.execSqlScript(createTableSql);

    const migrationsDir = this.resolveMigrationsDir();
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.up.sql'))
      .sort();

    const appliedRows = await this.query<{ version: string }>('SELECT version FROM schema_migrations ORDER BY version ASC');
    const appliedSet = new Set(appliedRows.rows.map((r) => r.version));
    const newlyApplied: string[] = [];

    for (const file of files) {
      if (appliedSet.has(file)) {
        continue;
      }
      const fullPath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(fullPath, 'utf-8');
      await this.execSqlScript(sqlContent);
      await this.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
      newlyApplied.push(file);
    }

    return newlyApplied;
  }

  async getAppliedMigrations(): Promise<string[]> {
    const res = await this.query<{ version: string }>('SELECT version FROM schema_migrations ORDER BY version ASC');
    return res.rows.map((r) => r.version);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.end();
      this.pgPool = null;
    }
    if (this.pglite) {
      await this.pglite.close();
      this.pglite = null;
    }
    this.initialized = false;
  }
}
