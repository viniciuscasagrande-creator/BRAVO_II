# Análise de Lacunas (Gap Analysis) por Módulo — BRAVO_II (Pacote 00)

- **Commit-base**: `405f41158b0b231ec2420ca62280a5fdb952edec`
- **Data**: `2026-11-09T17:27:12.297Z`

## 1. Resumo da Arquitetura e Stack Real Verificada

| Camada | Tecnologia Real no Repositório | Evidência |
|---|---|---|
| Monorepo | `pnpm` workspaces (`apps/*`, `packages/*`) | `package.json`, `pnpm-workspace.yaml` |
| Frontend Backoffice | Next.js 15.5.29 + React 19 + TypeScript | `apps/backoffice/package.json` |
| Backend Core API | NestJS 10 + Express + TypeScript | `apps/api/package.json`, `apps/api/src/main.ts` |
| Banco de Dados HML | PostgreSQL 16 (Neon `bravo_ii_hml` + contingência embarcada PGlite) | `apps/api/src/common/database/database.service.ts` |
| Migrations | 10 migrations SQL versionadas (`0001` a `0010`) com pares `.up.sql` / `.down.sql` | `database/migrations/` |
| Schema Declarativo | Prisma Schema (`55 models`) | `prisma/schema.prisma` |
| Pacotes de Domínio | `@bravo-ii/contracts`, `@bravo-ii/core-policy`, `@bravo-ii/domain-p06`, `@bravo-ii/domain-p08`, `@bravo-ii/domain-p09`, `@bravo-ii/domain-p10`, `@bravo-ii/domain-ia`, `@bravo-ii/telemetry` | `packages/*` |

## 2. Estado Real vs Escopo de Expansão por Módulo

| Módulo | Já Existente e Testado | Parcial / Interface Pronta | Ausente (A Construir nos Pacotes 02–05) | Prioridade |
|---|---|---|---|---|
| **Comercial** | Cadastro PJ com CNPJ alfanumérico, maker-checker, documentos `secure://`, Taxa Disk por evento (basis points/centavos) com dupla alçada | Contratos e propostas no schema | Múltiplos beneficiários bancários e validação de terceiro para repasse | P1 (Pacote 02/05) |
| **Eventos** | Criação de evento, sessões, setores, assentos, categorias, lotes, mídia, 4 etapas de aprovação (`CADASTRAL`, `COMERCIAL`, `OPERACIONAL`, `PUBLICACAO`), ocorrências | — | Segregação explícita das etapas `CONTRATO`, `TECNICA` e `LOCAL` (EVT-001) | P1 (Pacote 02) |
| **Mapas e Assentos** | Setores (`event_sectors`), assentos (`event_seats`) com constraint única `(area_id, row_label, seat_number)` | — | Construtor visual versionado de mapas e duplicação segura de filas/setores (MAP-002) | P1 (Pacote 02) |
| **Pedidos e Vendas** | Reserva atômica, expiração idempotente, emissão de ingresso de 8 dígitos numéricos com assinatura HMAC | — | Parametrização de limite de ingressos por pedido/canal (PED-003) e virada automática de lote (LOT-001) | P1 (Pacote 02/03) |
| **Checkout e PDV** | Tentativa de checkout sandbox PagBank idempotente, terminais PDV e turnos de operadores | — | Vínculo de setores autorizados por terminal PDV e conciliação de caixa físico (PDV-001) | P2 (Pacote 03) |
| **Portaria e Acesso** | Estrutura de credenciais QR e tabela `ticket_checkins` | — | Atribuição formal de validadores por evento (ACC-001) e política LGPD de biometria (BIO-001) | P2 (Pacote 04) |
| **SAC e Pós-Venda** | Chamados omnicanal, SLA versionado, ITIL, base de conhecimento, CSAT, troca de sessão com substituição de ingresso, cancelamentos e estornos com dupla aprovação | — | Transferência de titularidade autônoma com bloqueio de cortesia (TRF-001) | P2 (Pacote 04) |
| **Financeiro Disk** | Ledger imutável (`finance_ledger_entries`), centros de custo, lotes RH, 104 funções catalogadas + 96 telas de `/financeiro/operacoes` (18 conectadas ao PostgreSQL) | 78 telas em `/financeiro/operacoes` com estado explícito `501 ROTINA_EM_IMPLANTACAO` | Tabelas e serviços de fornecedores, beneficiários, solicitações de repasse/antecipação, borderôs e matriz MDR (FIN-001, FIN-002, PAG-001) | P2 (Pacote 05) |
