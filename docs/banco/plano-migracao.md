# Plano de Migração Segura Forward-Only — BRAVO_II (Pacote 01)

- **Commit-base**: `405f41158b0b231ec2420ca62280a5fdb952edec`
- **Banco alvo de Homologação**: Neon PostgreSQL 16 (`bravo_ii_hml`)

## 1. Regras Mandatórias de Migração

1. **Proibido**: `prisma migrate reset`, `prisma db push --accept-data-loss`, `DROP TABLE` em tabelas operacionais ou truncamento de dados em HML.
2. **Padrão obrigatório**: Criar par versionado `database/migrations/00XX_<descricao>.up.sql` e `database/migrations/00XX_<descricao>.down.sql` utilizando cláusulas idempotentes (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
3. **Ordem de execução**:
   - Validar primeiro em banco em memória (`PGlite`) via suíte automatizada;
   - Revisar locks e compatibilidade retroativa (estratégia *expand → backfill → switch*);
   - Aplicar em homologação (`bravo_ii_hml`) registrando a versão em `schema_migrations`.

## 2. Próximas Migrations Planejadas (Aguardando Aprovação por Pacote)

- **Migration `0011_pacote02_eventos_aprovacoes_mapas_lotes.up.sql` (Pacote 02)**:
  - Expansão compatível de `event_approvals` para contemplar as etapas `CONTRATO`, `TECNICA` e `LOCAL` (EVT-001);
  - Versionamento de layout de mapas e regras de virada de lote / limite por canal (LOT-001, MAP-002, PED-003).
- **Migration `0012_pacote03_pdv_setores_caixa.up.sql` (Pacote 03)**:
  - Vínculo de setores autorizados por terminal PDV (`p09_pdv_terminals`) e fechamento auditável de turno (PDV-001).
- **Migration `0013_pacote04_portaria_validadores_titularidade.up.sql` (Pacote 04)**:
  - Atribuição de validadores por evento (ACC-001) e trilha de transferência de titularidade de ingressos (TRF-001).
- **Migration `0014_pacote05_financeiro_fornecedores_repasses_borderos.up.sql` (Pacote 05)**:
  - Tabelas dedicadas para fornecedores, beneficiários bancários, solicitações de repasse/antecipação com dupla assinatura e borderôs (FIN-001, FIN-002, PAG-001).
