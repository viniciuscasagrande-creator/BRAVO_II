# RELATÓRIO DE HOMOLOGAÇÃO INTEGRADA — BRAVO_II PACOTE 10 (SAC, PÓS-VENDA, CANCELAMENTOS E ESTORNOS)

**Data da execução:** 2026-11-06  
**Repositório:** `E:\BRAVO_II` (Base única consolidada dos Pacotes 01 a 10)  
**Ambiente:** `BRAVO_ENV=HOMOLOGACAO`  
**Banco PostgreSQL de Homologação:** `bravo_ii_hml` (PostgreSQL 16.4 / PGlite WASM em `.data/postgres`)  

---

## 1. Preservação do Catálogo de 149 Funções (Financeiro Disk 104 + RH/DP 45) e Módulos P01–P09

Antes e após a integração do Pacote 10, os artefatos originais do catálogo de 149 funções foram conferidos por hash criptográfico SHA-256:

| Arquivo | SHA-256 Esperado e Verificado | Status |
| :--- | :--- | :--- |
| `reference/matriz-149-original.csv` | `5f17423ad54b33ee368c0cf42a16e3522ad006433eef0f70d71d33dca985cd7c` | **INTACTO (BYTE A BYTE)** |
| `reference/catalogo-149-original.json` | `ef759c31447956ea0aa672a87b97549b6aff0aa4cb09d1a984eef244d574c2e7` | **INTACTO (BYTE A BYTE)** |

- **104 funções do Financeiro Disk** preservadas em `finance_rh_catalog_entries` e nas rotas `/v1/finance/*` e `/financeiro/[slug]`.
- **45 funções de RH e Departamento Pessoal** preservadas em `finance_rh_catalog_entries` e nas rotas `/v1/rh/*` e `/rh/[slug]`.
- Os itens de navegação `financeiro` (`status: 'EM_IMPLANTACAO'`) e `rh` (`status: 'EM_IMPLANTACAO'`) permanecem preservados em `packages/core-policy/src/index.ts`.
- Todos os módulos anteriores (Pacote 01 a Pacote 09: Identidade, Governança, Auditoria, Outbox, Comercial Disk, Produtores PJ, Taxa Disk por Evento, Event Builder 10 etapas, Clientes PF com CPF HMAC-SHA256, Pedidos/Reservas Atômicas, Ingressos de 8 Dígitos, Checkout PagBank Sandbox e Terminais/Turnos PDV) permanecem operacionais no mesmo `AppModule` e no mesmo schema PostgreSQL.

---

## 2. Validação de Ambiente, Travas Fail-Closed e Banco PostgreSQL (`bravo_ii_hml`)

### 2.1. Travas de Segurança Verificadas (`doctor:ready` e `validateHomologationEnv`)
- `BRAVO_ENV=HOMOLOGACAO`
- `ENABLE_EXTERNAL_PUBLICATION=false`
- `ENABLE_REAL_PAYMENTS=false`
- `ENABLE_REAL_REFUNDS=false`
- `ALLOW_REAL_PAYMENT_GATEWAY=false`
- `ALLOW_REAL_REFUND_EXECUTION=false`
- `ALLOW_REAL_PAYOUT_EXECUTION=false`
- `ENABLE_PDV_OPERATIONS=false`
- `ENABLE_TICKET_REPLACEMENT=false`
- `ACCESS_GATE_INTEGRATED=false`

### 2.2. Validação do Schema Único (`prisma/schema.prisma`) e Migrações SQL (`0009_pacote10_sac_pos_venda_estornos.up.sql`)
- `pnpm run db:validate` e `pnpm run db:generate`: **OK** (`datasources: 1`, `modelsValidated: 34`, `p10ModelsValidated: 17`, `databaseTarget: bravo_ii_hml`).
- `pnpm run db:migrate`: Aplicou de forma incremental (sem `migrate reset` e sem perda de dados) a migration `0009_pacote10_sac_pos_venda_estornos.up.sql` sobre as migrations `0001` a `0008`.
- `pnpm run test:homologacao:p10` (`node scripts/check-homologacao-p10.mjs`):
  - Status: `APROVADA_SOMENTE_LEITURA`
  - Engine: `PostgreSQL 16.4` (`bravo_ii_hml`)
  - 29 tabelas críticas verificadas (`producers`, `events`, `customers`, `p08_sale_orders`, `p08_issued_tickets`, `p08_payment_confirmations`, `p09_checkout_attempts`, `p09_pdv_terminals`, `p09_pdv_shifts`, `p10_support_teams`, `p10_support_team_members`, `p10_support_queues`, `p10_sla_policies`, `p10_support_cases`, `p10_support_interactions`, `p10_support_incidents`, `p10_support_problems`, `p10_knowledge_articles`, `p10_support_satisfactions`, `p10_order_change_requests`, `p10_ticket_replacements`, `p10_cancellation_requests`, `p10_refund_requests`, `p10_refund_approvals`, `p10_refund_attempts`, `p10_event_refund_batches`, `users`, `audit_records`, `outbox_events`).

---

## 3. Resultados de Compilação e Testes Automatizados

| Etapa / Comando | Escopo | Resultado |
| :--- | :--- | :--- |
| `pnpm run build:packages` | Compilação TypeScript de todos os pacotes do monorepo (`contracts`, `core-policy`, `config`, `domain-p06`, `domain-p08`, `domain-p09`, `domain-p10`, `telemetry`, `testing`, `sdk`, `ui`) | **PASS (0 erros)** |
| `pnpm run test:p10` | 23 testes de regras de domínio `@bravo-ii/domain-p10` + 12 testes estruturais `tests/p10-structure.test.mjs` | **PASS (35/35)** |
| `pnpm run test:offline` | Testes unitários de `core-policy` (11), `domain-p06` (15), `domain-p08` (12), `domain-p09` (25), `domain-p10` (23) e estruturais P06–P10 (35) | **PASS (121/121)** |
| `pnpm run build:api` | Compilação completa do backend NestJS (`@bravo-ii/api`) com P01–P10 integrados | **PASS (0 erros)** |
| `pnpm run build:web` | Build de produção Next.js 15 (`@bravo-ii/backoffice`) gerando 35 rotas (incluindo as 10 novas telas do Pacote 10) | **PASS (35/35 páginas)** |
| `pnpm run test` | Suíte completa de testes unitários de pacotes e da API NestJS (incluindo os 149 itens Financeiro/RH) | **PASS (100%)** |
| `pnpm run test:e2e` | Suítes E2E HTTP completas sobre PostgreSQL (P01, P02, P03, P04, P06, P07, P08, P09 e P10) | **PASS (100%)** |
| `pnpm run doctor:ready` | Pré-verificação de ambiente, builds, migrations e travas de segurança | **APROVADA** |

---

## 4. Cobertura Funcional e de Segurança Homologada no Pacote 10

### 4.1. Subpacote 10.1 — Atendimento SAC, SLA, Equipes/Filas, ITIL, Base de Conhecimento e CSAT
- **Rotas Backend (`/v1/sac/*`):** `GET /indicadores`, `GET/POST /chamados`, `GET /chamados/:id`, `POST /chamados/:id/interacoes`, `POST /chamados/:id/status`, `POST /chamados/:id/atribuir`, `POST /chamados/:id/incidente`, `POST /chamados/:id/csat`, `GET/POST /politicas-sla`, `GET/POST /equipes`, `POST /filas`, `POST /equipes/:id/agentes`, `GET /incidentes`, `POST /incidentes/:id/status`, `GET/POST /problemas`, `POST /problemas/:id/status`, `GET/POST /conhecimento`, `POST /conhecimento/:id/publicar`.
- **Telas Next.js:** `/sac`, `/sac/chamados`, `/sac/chamados/[id]`, `/sac/gestao`, `/sac/itil`, `/sac/conhecimento`.
- **Regras validadas:**
  - Políticas de SLA versionadas exclusivamente por `ADMIN`, com cálculo em minutos corridos (`calculateSlaDueDates`).
  - Preenchimento automático de `firstResponseAt` na primeira interação `RESPOSTA_CLIENTE`.
  - Máquina de estados `SAC_FLOW` impedindo fechamento direto (`ABERTO -> FECHADO` bloqueado com HTTP 409; exige `RESOLVIDO` prévio).
  - Registro de CSAT permitido exclusivamente para chamados em estado `FECHADO` e uma única vez por chamado.
  - Rascunho de artigo de conhecimento por `SAC/OPERACOES/ADMIN` e publicação restrita a `OPERACOES/ADMIN`.

### 4.2. Subpacote 10.2 — Pós-Venda: Solicitação, Análise, Qualificação de Preço e Concorrência em Troca de Sessão
- **Rotas Backend (`/v1/pos-venda/*`):** `GET/POST /trocas`, `POST /trocas/:id/analisar`, `POST /trocas/:id/qualificar`, `POST /trocas/:id/executar`.
- **Tela Next.js:** `/pos-venda/trocas`.
- **Regras e Concorrência validadas:**
  - Bloqueio transacional (`SELECT ... FROM p08_issued_tickets WHERE id = $1 FOR UPDATE` em isolamento `SERIALIZABLE`) impedindo duas solicitações de troca simultâneas para o mesmo ingresso: em teste de concorrência (`Promise.all`), exatamente 1 solicitação retorna `201 Created` e a concorrente retorna `409 Conflict` (`Já existe troca ativa para este ingresso`).
  - Segregação maker-checker: o usuário que abriu a solicitação de troca é bloqueado (`403 Forbidden`) ao tentar revisá-la.
  - Qualificação de preço compara `nominal_price_cents` do lote original e do lote destino (`PRONTA_EXECUCAO` quando diferença = 0; `AGUARDANDO_PAGAMENTO` quando há diferença).
  - Execução física da troca (`POST /v1/pos-venda/trocas/:id/executar`) permanece **fail-closed (`503 ServiceUnavailableException`)** enquanto `ENABLE_TICKET_REPLACEMENT=false` e `ACCESS_GATE_INTEGRATED=false`. O ingresso original permanece `EMITIDO` e nenhuma substituição física é gravada sem integração com a portaria.

### 4.3. Subpacote 10.3 — Cancelamentos (Ingresso, Pedido, Evento) e Planejamento de Lote Financeiro
- **Rotas Backend (`/v1/pos-venda/*`):** `GET/POST /cancelamentos`, `POST /cancelamentos/:id/analisar`, `POST /eventos/:eventId/lotes-estorno/:caseId/planejar`.
- **Tela Next.js:** `/pos-venda/cancelamentos`.
- **Regras validadas:**
  - Cancelamento operacional não executa baixa financeira nem estorno automático.
  - Revisão operacional exige outro usuário (`OPERACOES` ou `ADMIN`).
  - Planejamento de lote de devolução de evento (`p10_event_refund_batches`) exige perfil `FINANCEIRO_DISK` e ocorrência de cancelamento de evento formalmente aprovada (`status = 'APROVADO'` e `finance_review_status = 'APROVADO'`).

### 4.4. Subpacote 10.4 — Estornos: Reserva Concorrente de Teto Financeiro e Dupla Aprovação Individual pelo Financeiro Disk
- **Rotas Backend (`/v1/estornos/*`):** `GET /impacto`, `GET /`, `POST /`, `GET /:id`, `POST /:id/analisar`, `POST /:id/aprovar`, `POST /:id/reprovar`.
- **Telas Next.js:** `/estornos` e `/financeiro/estornos`.
- **Regras e Concorrência validadas:**
  - Somente pedidos `PAGO` com registro em `p08_payment_confirmations` aceitam solicitação de estorno.
  - **Concorrência PostgreSQL no teto do pedido:** `SELECT id, status, total_cents, quantity, event_id FROM p08_sale_orders WHERE id = $1 FOR UPDATE` em transação `SERIALIZABLE` garante que duas solicitações concorrentes de `7000` centavos em um pedido de `10000` centavos não ultrapassem o valor pago (1 retorna `201`, a outra retorna `409 Conflict`, mantendo soma comprometida `7000 <= 10000`).
  - **Alçada exclusiva do Financeiro Disk (`financeWrite`):** `SAC`, `OPERACOES`, `AUDITOR` e `ADMIN` (sem papel `FINANCEIRO_DISK`) recebem `403 Forbidden` ao tentar analisar, aprovar ou reprovar estornos.
  - **Dupla aprovação por três pessoas distintas:**
    1. O solicitante não pode analisar nem aprovar a própria solicitação (`403 Forbidden`).
    2. O Analista `FINANCEIRO_DISK #1` inicia a análise (`EM_ANALISE`) e aprova a Etapa 1 (`APROVADO_1`).
    3. O Analista `FINANCEIRO_DISK #1` é bloqueado (`403 Forbidden`) se tentar aprovar a Etapa 2.
    4. O Analista `FINANCEIRO_DISK #2` aprova a Etapa 2 (`APROVADO_2`, `externalExecution: false`).
  - **Retenção segura em Outbox:** Na 2ª aprovação, é gravado o evento `BRAVO_REFUND_APPROVED_HOLD` em `outbox_events` com `externalExecutionAllowed: false` e `action: 'AGUARDAR_CONECTOR_HOMOLOGADO'`.
  - **Ausência de execução bancária externa:** Não existe endpoint HTTP de execução, liquidação ou webhook de estorno (`404 Not Found`), e `dispatchApprovedRefund` lança `ServiceUnavailableException`.

---

## 5. Pendências Conhecidas e Próximos Passos Seguros

1. **Integração com Portaria / Controle de Acesso (`ACCESS_GATE_INTEGRATED`):** Necessária antes de habilitar a substituição física de ingressos (`ENABLE_TICKET_REPLACEMENT`), garantindo que ingressos já validados na catraca nunca sejam trocados.
2. **Conector Homologado de Estorno em Adquirente (`ENABLE_REAL_REFUNDS`):** Os estornos duplamente aprovados permanecem em `APROVADO_2` com evento `BRAVO_REFUND_APPROVED_HOLD` (`externalExecutionAllowed: false`) até a homologação dedicada do worker de adquirente com confirmação assinada.
3. **Calendário Comercial de SLA:** O cálculo atual de SLA opera em minutos corridos (`24x7`), conforme documentado no domínio e na interface.

**Confirmação explícita:** Nenhuma publicação externa, captura de pagamento, estorno bancário real, repasse ou antecipação foi executada em produção ou homologação.
