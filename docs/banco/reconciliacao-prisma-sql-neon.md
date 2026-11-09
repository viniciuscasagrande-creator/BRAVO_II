# Reconciliação Técnica P0: Prisma Schema × Migrations SQL × Neon HML (Pacote 01)

- **Commit-base**: `405f41158b0b231ec2420ca62280a5fdb952edec`
- **Data da reconciliação**: `2026-11-09T17:27:12.297Z`

## 1. Resultado Executivo do Diagnóstico P0

1. **Migrations SQL (`database/migrations/*.up.sql`) × Neon HML (`bravo_ii_hml`)**:
   - **100% reconciliados e idênticos.**
   - Todas as **10 migrations** (`0001` a `0010`) estão aplicadas em `schema_migrations` no Neon HML.
   - Todas as **77 tabelas de domínio** definidas nas migrations SQL existem no banco Neon HML (`Diferença SQL × Neon = 0`).
   - Contagens reais verificadas em modo somente-leitura no Neon HML:
     - `users`: **10** operadores
     - `roles`: **13** perfis canônicos
     - `permissions`: **40** permissões canônicas
     - `catalog_149_functions`: **149** funções catalogadas (104 Financeiro + 45 RH)
     - `audit_records`: **26** registros imutáveis de auditoria

2. **Prisma Schema (`prisma/schema.prisma`) × Migrations SQL**:
   - O runtime da API (`apps/api`) executa queries parametrizadas diretamente via `DatabaseService` (`pg.Pool` no Neon HML) sobre as **77 tabelas SQL**.
   - O arquivo `prisma/schema.prisma` possui **55 modelos** usados para validação estática de contratos e arquitetura (`tests/integrity.test.mjs`).
   - Foram identificadas **10 divergências de nomenclatura `@@map`** no `prisma/schema.prisma` em relação às tabelas SQL reais:
     - `event_fee_configs` (Prisma) vs `event_fee_agreements` (SQL/Neon)
     - `event_channels` (Prisma) vs `event_sales_channels` (SQL/Neon)
     - `event_media_assets` (Prisma) vs `event_media` (SQL/Neon)
     - `p06_event_publications` (Prisma) vs `event_publications` (SQL/Neon)
     - `p06_event_change_cases` (Prisma) vs `event_change_cases` (SQL/Neon)
     - `commercial_contracts` (Prisma) vs `contracts` (SQL/Neon)
     - `p08_ticket_sequence` (Prisma) vs `p08_ticket_sequences` (SQL/Neon)
     - `p10_support_satisfaction` (Prisma) vs `p10_support_satisfactions` (SQL/Neon)
     - `commercial_proposals` e `p06_event_documents` (declarados apenas no Prisma, sem tabela SQL equivalente; documentos reais usam `producer_documents`).
   - Há **32 tabelas SQL fundacionais** (como `roles`, `permissions`, `role_permissions`, `user_role_grants`, `user_producer_scopes`, `user_event_scopes`, `refund_requests`, `producer_contacts`, `event_fee_snapshots`) presentes nas migrations `0001`–`0003` e no Neon HML que ainda não têm bloco `model` espelhado no `prisma/schema.prisma`.

## 2. Regra de Governança para os Pacotes 02 a 05

- **Fonte de verdade física do banco**: `database/migrations/0001..0010.up.sql` (77 tabelas ativas no Neon HML).
- **Proibição de duplicidade**: Nenhuma nova migration (`0011+`) poderá recriar tabelas equivalentes às 77 tabelas já existentes.
- **Preservação de testes**: Os nomes dos modelos atuais em `prisma/schema.prisma` são verificados por `tests/integrity.test.mjs` e devem ser mantidos compatíveis ao adicionar novos modelos nos Pacotes 02–05.
