# MODULE_MAP.md — Mapa Canônico de Módulos, Rotas e Responsabilidades (v1.0)

## 1. Módulos do Core Backend (`apps/api/src/modules/*`)

| Módulo | Diretório | Prefixo HTTP | Tabelas Principais | Responsabilidade |
| :--- | :--- | :--- | :--- | :--- |
| **Health & Diagnóstico** | `common/health` | `/v1/health`, `/v1/saude` | `schema_migrations` | Verificação de saúde da API, conexão PostgreSQL e travas financeiras |
| **Identidade & RBAC** | `modules/identity` | `/v1/auth/*`, `/v1/identity/*` | `identity_users`, `identity_sessions`, `identity_roles` | Autenticação, sessões HttpOnly, CSRF, bloqueio por tentativas e RBAC |
| **Governança & Auditoria** | `modules/governance` | `/v1/governance/*` | `audit_logs`, `outbox_events` | Trilha imutável de auditoria, eventos outbox e inspeção de conformidade |
| **Comercial & Taxas** | `modules/commercial`, `modules/pacote06` | `/v1/commercial/*`, `/v1/comercial/*` | `commercial_event_fee_rules`, `bravo_event_fees` | Proposta, versionamento e aprovação de Taxa Disk por evento (dupla alçada) |
| **Produtores** | `modules/producers`, `modules/pacote06` | `/v1/producers/*`, `/v1/comercial/produtores/*` | `producers`, `bravo_producers`, `bravo_producer_documents` | Cadastro PJ, responsáveis legais, documentos SHA-256 e vínculo a eventos |
| **Eventos & Inventário** | `modules/events`, `modules/inventory` | `/v1/events/*`, `/v1/eventos/*`, `/v1/inventory/*` | `events`, `event_sessions`, `ticket_lots`, `bravo_events` | Event Builder em 6 etapas, sessões, setores, lotes, aprovações e publicação |
| **Clientes** | `modules/customers` | `/v1/customers/*`, `/v1/clientes/*` | `customers`, `p08_customers` | Cadastro de compradores com CPF hash + pepper de 32+ bytes |
| **Pedidos & Checkout** | `modules/orders`, `modules/pacote08`, `modules/pacote09` | `/v1/orders/*`, `/v1/pedidos/*`, `/v1/checkout/*` | `orders`, `order_items`, `p08_orders`, `p09_payment_intents` | Reserva atômica de inventário, criação de pedido e intenção PagBank Sandbox |
| **Ingressos & Portaria** | `modules/tickets`, `modules/gate-control` | `/v1/tickets/*`, `/v1/ingressos/*`, `/v1/gate-control/*` | `tickets`, `p08_tickets`, `gate_checkins` | Emissão de ingresso 8 dígitos numéricos + assinatura QR e check-in de portaria |
| **PDV & Bilheteria** | `modules/point-of-sale`, `modules/pacote09` | `/v1/pos/*`, `/v1/pdv/*` | `pos_terminals`, `pos_shifts`, `p09_pos_shifts` | Configuração de terminais, abertura/fechamento de turno autenticado |
| **Cupons & Marketing** | `modules/coupons` | `/v1/coupons/*` | `discount_coupons` | Criação e controle de limites de uso de cupons promocionais e cortesias |
| **SAC, Pós-Venda & Estornos** | `modules/refunds`, `modules/pacote10` | `/v1/refunds/*`, `/v1/sac/*`, `/v1/pos-venda/*`, `/v1/estornos/*` | `refund_requests`, `p10_sac_cases`, `p10_refund_requests` | Chamados SAC, SLA, incidentes ITIL, trocas, cancelamentos e alçada de estornos |
| **Financeiro Disk (104)** | `modules/finance` | `/v1/finance/*` | `fin_cost_centers`, `fin_ledger_entries`, `fin_event_settlements` | Livro razão em partida dobrada, centros de custo, borderôs e matriz de 104 funções |
| **RH & DP (45)** | `modules/rh` | `/v1/rh/*` | `rh_employees`, `rh_time_entries`, `rh_payroll_runs`, `rh_payment_batches` | Colaboradores, ponto eletrônico, prévia de folha, lotes para Financeiro e 45 funções |
| **Assistente IA Gemini** | `modules/ai` | `/v1/ia/*` | `p12_ai_quota_windows`, `p12_ai_audit_logs` | Consultas operacionais somente-leitura com filtro anti-PII e cotas por operador |

---

## 2. Rotas do Backoffice (`apps/backoffice/src/app/*`)

| Grupo | Rota | Arquivo Principal | Perfis Permitidos |
| :--- | :--- | :--- | :--- |
| **Visão Geral** | `/` | `src/app/page.tsx` | Todos os operadores autenticados (`overview:read`) |
| **Autenticação** | `/login` | `src/app/login/page.tsx` | Público (formulário sem credenciais demo) |
| **Comercial** | `/comercial`, `/comercial/produtores`, `/comercial/produtores/novo`, `/comercial/produtores/[id]`, `/comercial/eventos/[id]/taxas` | `src/app/comercial/**` | `ADMIN_BRAVO`, `COMERCIAL_DISK`, `FINANCEIRO_DISK`, `AUDITOR_INTERNO` |
| **Eventos** | `/eventos`, `/eventos/novo`, `/eventos/[id]` | `src/app/eventos/**` | `ADMIN_BRAVO`, `COMERCIAL_DISK`, `OPERACAO_EVENTOS`, `FINANCEIRO_DISK`, `PRODUTOR_PDT` |
| **Vendas & PDV** | `/pedidos-vendas`, `/pedidos`, `/clientes`, `/checkout`, `/pdv` | `src/app/pedidos-vendas/page.tsx`, `src/app/(erp)/**` | `ADMIN_BRAVO`, `OPERACAO_EVENTOS`, `PDV_CAIXA`, `SAC_ATENDIMENTO`, `FINANCEIRO_DISK` |
| **Ingressos & Portaria** | `/ingressos-portaria`, `/ingressos` | `src/app/ingressos-portaria/page.tsx`, `src/app/(erp)/ingressos/page.tsx` | `ADMIN_BRAVO`, `OPERACAO_EVENTOS`, `PORTARIA_ACESSO`, `SAC_ATENDIMENTO` |
| **SAC & Estornos** | `/sac-estornos`, `/sac`, `/sac/chamados`, `/sac/chamados/[id]`, `/sac/gestao`, `/sac/itil`, `/sac/conhecimento`, `/pos-venda/trocas`, `/pos-venda/cancelamentos`, `/estornos`, `/financeiro/estornos` | `src/app/sac-estornos/page.tsx`, `src/app/(erp)/sac/**` | `ADMIN_BRAVO`, `SAC_ATENDIMENTO`, `FINANCEIRO_DISK`, `AUDITOR_INTERNO` |
| **Marketing & Cupons** | `/cupons-cortesias`, `/marketing`, `/remarketing` | `src/app/cupons-cortesias/page.tsx`, `src/app/marketing/page.tsx`, `src/app/remarketing/page.tsx` | `ADMIN_BRAVO`, `COMERCIAL_DISK`, `OPERACAO_EVENTOS` |
| **Financeiro Disk** | `/financeiro`, `/financeiro/[slug]` (`f01-f28`, `f29-f50`, `f51-f70`, `f71-f88`, `f89-f104` + 104 slugs) | `src/app/financeiro/page.tsx`, `src/app/financeiro/[slug]/**` | `ADMIN_BRAVO`, `FINANCEIRO_DISK`, `AUDITOR_INTERNO` |
| **RH & DP** | `/rh`, `/rh/[slug]` (`r01-r09`, `r10-r20`, `r21-r32`, `r33-r45` + 45 slugs) | `src/app/rh/page.tsx`, `src/app/rh/[slug]/**` | `ADMIN_BRAVO`, `RH_DP_DISK`, `FINANCEIRO_DISK`, `AUDITOR_INTERNO` |
| **Portal Produtor** | `/produtores-pdt` | `src/app/produtores-pdt/page.tsx` | `ADMIN_BRAVO`, `PRODUTOR_PDT`, `FINANCEIRO_DISK` (sem Taxa Disk interna) |
| **Relatórios & Gov.** | `/relatorios`, `/cadastros`, `/administracao`, `/ia` | `src/app/relatorios/page.tsx`, `src/app/administracao/page.tsx`, `src/app/(erp)/ia/page.tsx` | `ADMIN_BRAVO`, `FINANCEIRO_DISK`, `AUDITOR_INTERNO` |
