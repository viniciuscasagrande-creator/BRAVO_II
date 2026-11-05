import 'reflect-metadata';
import { DatabaseService } from '../common/database/database.service';

async function main() {
  const db = new DatabaseService();
  await db.ensureInitialized();
  const applied = await db.getAppliedMigrations();
  console.log(JSON.stringify({ status: 'ok', appliedMigrations: applied }, null, 2));
  await db.onModuleDestroy();
}

main().catch((err) => {
  console.error('Erro ao executar migrations:', err);
  process.exit(1);
});
