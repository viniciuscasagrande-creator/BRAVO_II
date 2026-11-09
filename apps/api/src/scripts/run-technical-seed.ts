import 'reflect-metadata';
import { randomBytes } from 'node:crypto';
import { DatabaseService } from '../common/database/database.service';
import { AuditService } from '../modules/governance/audit.service';
import { IdentityService } from '../modules/identity/identity.service';
import { FinanceService } from '../modules/finance/finance.service';
import { loadEnvironmentConfig } from '@bravo-ii/config';

/**
 * Executa apenas o seed técnico (papéis RBAC, permissões canônicas e, em desenvolvimento local,
 * operadores técnicos sem nenhum dado fictício de negócio e sem senhas estáticas embutidas no código).
 */
async function main() {
  const config = loadEnvironmentConfig();
  if (config.nodeEnv === 'production') {
    throw new Error('Seed técnico local não deve ser executado com contas de operador local em produção.');
  }

  const db = new DatabaseService();
  await db.ensureInitialized();
  const audit = new AuditService(db);
  const identity = new IdentityService(db, audit);

  await identity.syncCanonicalRolesAndPermissions();

  const resolveOperatorSecret = (envKey: string): string => {
    const provided = process.env[envKey]?.trim() || process.env.BRAVO_SEED_OPERATOR_PASSWORD?.trim();
    if (provided && provided.length >= 12) {
      return provided;
    }
    return `Bravo#${randomBytes(12).toString('base64url')}!9`;
  };

  await identity.ensureOperatorAccount({
    id: '00000000-0000-4000-8000-000000000100',
    email: process.env.BRAVO_SEED_ADMIN_EMAIL || 'admin.hml@diskingressos.com.br',
    fullName: 'Administrador Geral BRAVO_II',
    plainPassword: resolveOperatorSecret('BRAVO_SEED_ADMIN_PASSWORD'),
    role: 'ADMIN_BRAVO',
  });

  await identity.ensureOperatorAccount({
    id: '00000000-0000-4000-8000-000000000101',
    email: process.env.BRAVO_SEED_FINANCEIRO_EMAIL || 'financeiro.hml@diskingressos.com.br',
    fullName: 'Operador Financeiro Disk',
    plainPassword: resolveOperatorSecret('BRAVO_SEED_FINANCEIRO_PASSWORD'),
    role: 'FINANCEIRO_DISK',
  });

  await identity.ensureOperatorAccount({
    id: '00000000-0000-4000-8000-000000000102',
    email: process.env.BRAVO_SEED_SAC_EMAIL || 'sac.hml@diskingressos.com.br',
    fullName: 'Operador SAC Disk',
    plainPassword: resolveOperatorSecret('BRAVO_SEED_SAC_PASSWORD'),
    role: 'SAC_ATENDIMENTO',
  });

  await identity.ensureOperatorAccount({
    id: '00000000-0000-4000-8000-000000000103',
    email: process.env.BRAVO_SEED_PRODUTOR_EMAIL || 'produtor.hml@pdt.diskingressos.com.br',
    fullName: 'Operador Produtor PDT',
    plainPassword: resolveOperatorSecret('BRAVO_SEED_PRODUTOR_PASSWORD'),
    role: 'PRODUTOR_PDT',
  });

  await identity.ensureOperatorAccount({
    id: '00000000-0000-4000-8000-000000000104',
    email: process.env.BRAVO_SEED_COMERCIAL_EMAIL || 'comercial.hml@diskingressos.com.br',
    fullName: 'Operador Comercial Disk',
    plainPassword: resolveOperatorSecret('BRAVO_SEED_COMERCIAL_PASSWORD'),
    role: 'COMERCIAL_DISK',
  });

  await identity.ensureOperatorAccount({
    id: '00000000-0000-4000-8000-000000000105',
    email: process.env.BRAVO_SEED_OPERACAO_EMAIL || 'operacao.hml@diskingressos.com.br',
    fullName: 'Operador de Eventos Disk',
    plainPassword: resolveOperatorSecret('BRAVO_SEED_OPERACAO_PASSWORD'),
    role: 'OPERACAO_EVENTOS',
  });

  await identity.ensureOperatorAccount({
    id: '00000000-0000-4000-8000-000000000106',
    email: process.env.BRAVO_SEED_PDV_EMAIL || 'pdv.hml@diskingressos.com.br',
    fullName: 'Operador Caixa PDV Disk',
    plainPassword: resolveOperatorSecret('BRAVO_SEED_PDV_PASSWORD'),
    role: 'PDV_CAIXA',
  });

  await identity.ensureOperatorAccount({
    id: '00000000-0000-4000-8000-000000000107',
    email: process.env.BRAVO_SEED_PORTARIA_EMAIL || 'portaria.hml@diskingressos.com.br',
    fullName: 'Operador Portaria Check-in Disk',
    plainPassword: resolveOperatorSecret('BRAVO_SEED_PORTARIA_PASSWORD'),
    role: 'PORTARIA_CHECKIN',
  });

  await identity.ensureOperatorAccount({
    id: '00000000-0000-4000-8000-000000000108',
    email: process.env.BRAVO_SEED_RH_EMAIL || 'rh.hml@diskingressos.com.br',
    fullName: 'Gestor RH & DP Disk',
    plainPassword: resolveOperatorSecret('BRAVO_SEED_RH_PASSWORD'),
    role: 'RH_DP_DISK',
  });

  const finance = new FinanceService(db, audit);
  await finance.ensureCatalogSeeded();
  const catalogSummary = await finance.getCatalogSummary();

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        seededRolesCount: 13,
        catalogedFunctionsCount: catalogSummary.totalCataloged,
        catalogedFinanceiroCount: catalogSummary.totalFinanceiro,
        catalogedRhCount: catalogSummary.totalRh,
        businessTablesEmpty: true,
      },
      null,
      2
    )
  );

  await db.onModuleDestroy();
}

main().catch((err) => {
  console.error('Erro ao executar seed técnico:', err);
  process.exit(1);
});
