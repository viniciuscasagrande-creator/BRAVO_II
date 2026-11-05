import 'reflect-metadata';
import { DatabaseService } from '../common/database/database.service';
import { AuditService } from '../modules/governance/audit.service';
import { IdentityService } from '../modules/identity/identity.service';
import { FinanceService } from '../modules/finance/finance.service';
import { loadEnvironmentConfig } from '@bravo-ii/config';

/**
 * Executa apenas o seed técnico (papéis RBAC, permissões canônicas e, em desenvolvimento local,
 * operadores técnicos sem nenhum dado fictício de negócio).
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

  // Contas técnicas locais para validação de sessão e RBAC em Preview local (sem criar eventos, pedidos ou saldos falsos)
  await identity.ensureOperatorAccount({
    id: '00000000-0000-4000-8000-000000000101',
    email: 'financeiro.local@diskingressos.com.br',
    fullName: 'Operador Financeiro Disk (Ambiente Local)',
    plainPassword: 'BravoLocal#Financeiro2026',
    role: 'FINANCEIRO_DISK',
  });

  await identity.ensureOperatorAccount({
    id: '00000000-0000-4000-8000-000000000102',
    email: 'sac.local@diskingressos.com.br',
    fullName: 'Operador SAC Disk (Ambiente Local)',
    plainPassword: 'BravoLocal#Sac2026',
    role: 'SAC_ATENDIMENTO',
  });

  await identity.ensureOperatorAccount({
    id: '00000000-0000-4000-8000-000000000103',
    email: 'produtor.local@pdt.diskingressos.com.br',
    fullName: 'Operador Produtor PDT (Ambiente Local)',
    plainPassword: 'BravoLocal#Produtor2026',
    role: 'PRODUTOR_PDT',
  });

  await identity.ensureOperatorAccount({
    id: '00000000-0000-4000-8000-000000000104',
    email: 'comercial.local@diskingressos.com.br',
    fullName: 'Operador Comercial Disk (Ambiente Local)',
    plainPassword: 'BravoLocal#Comercial2026',
    role: 'COMERCIAL_DISK',
  });

  await identity.ensureOperatorAccount({
    id: '00000000-0000-4000-8000-000000000105',
    email: 'operacao.local@diskingressos.com.br',
    fullName: 'Operador de Eventos Disk (Ambiente Local)',
    plainPassword: 'BravoLocal#Operacao2026',
    role: 'OPERACAO_EVENTOS',
  });

  await identity.ensureOperatorAccount({
    id: '00000000-0000-4000-8000-000000000106',
    email: 'pdv.local@diskingressos.com.br',
    fullName: 'Operador Caixa PDV Disk (Ambiente Local)',
    plainPassword: 'BravoLocal#Pdv2026',
    role: 'PDV_CAIXA',
  });

  await identity.ensureOperatorAccount({
    id: '00000000-0000-4000-8000-000000000107',
    email: 'portaria.local@diskingressos.com.br',
    fullName: 'Operador Portaria Check-in Disk (Ambiente Local)',
    plainPassword: 'BravoLocal#Portaria2026',
    role: 'PORTARIA_CHECKIN',
  });

  await identity.ensureOperatorAccount({
    id: '00000000-0000-4000-8000-000000000108',
    email: 'rh.local@diskingressos.com.br',
    fullName: 'Gestor RH & DP Disk (Ambiente Local)',
    plainPassword: 'BravoLocal#RhDisk2026',
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
        seededLocalOperators: [
          'comercial.local@diskingressos.com.br (COMERCIAL_DISK)',
          'operacao.local@diskingressos.com.br (OPERACAO_EVENTOS)',
          'financeiro.local@diskingressos.com.br (FINANCEIRO_DISK)',
          'rh.local@diskingressos.com.br (RH_DP_DISK)',
          'sac.local@diskingressos.com.br (SAC_ATENDIMENTO)',
          'produtor.local@pdt.diskingressos.com.br (PRODUTOR_PDT)',
          'pdv.local@diskingressos.com.br (PDV_CAIXA)',
          'portaria.local@diskingressos.com.br (PORTARIA_CHECKIN)',
        ],
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
