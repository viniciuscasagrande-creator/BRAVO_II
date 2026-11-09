# IMPLEMENTATION_STATUS.md — Matriz de Maturidade Técnica e Mapa de Divergências (v1.0)

## 1. Taxonomia Oficial de Maturidade (4 Níveis Baseados em Evidências)

Conforme estabelecido no Protocolo Mestre de Desenvolvimento, nenhuma funcionalidade pode ser classificada como operacional apenas por constar no menu ou catálogo. Os quatro estados oficiais são:

1. **Planejado:** Especificado na matriz canônica (`reference/matriz-149-original.csv`) e roteado na interface, sem serviço de domínio dedicado para execução transacional própria.
2. **Em Desenvolvimento:** Possui rota de interface e estrutura de dados/repositório compartilhada, dependendo de integração externa ou regra complementar para operação completa.
3. **Implementado e em Homologação:** Possui tela funcional, endpoint HTTP no NestJS, serviço de domínio, persistência PostgreSQL/Prisma, controle RBAC e testes automatizados aprovados; aguarda homologação final integrada na Vercel/Neon.
4. **Homologado e Operacional:** Fluxo completo validado ponta a ponta no ambiente de homologação (Vercel + API + Neon) com aprovação formal do responsável.

---

## 2. Matriz de Maturidade por Módulo (Evidências Técnicas Reais)

| Módulo / Área | Tela | Endpoint API | Domínio | Persistência PG | RBAC | Testes | Estado Atual |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Shell, Navegação e Design System BankOS** | Sim | `/v1/auth/me` | Sim | Sim | Sim | Sim (`integrity.test.mjs`) | **Implementado e em Homologação** |
| **Autenticação, Sessão HttpOnly e CSRF** | Sim | `/v1/auth/*` | Sim | `identity_users`, `identity_sessions` | Sim | Sim | **Implementado e em Homologação** |
| **Comercial — Cadastro e Validação de Produtores** | Sim | `/v1/comercial/produtores/*` | Sim (`domain-p06`) | `bravo_producers`, `bravo_producer_documents` | Sim | Sim | **Implementado e em Homologação** |
| **Comercial — Taxa Disk por Evento (Dupla Alçada)** | Sim | `/v1/comercial/eventos/:id/taxas` | Sim (`domain-p06`) | `bravo_event_fees`, `commercial_event_fee_rules` | Sim | Sim | **Implementado e em Homologação** |
| **Eventos — Event Builder (6 Etapas + Aprovações)** | Sim | `/v1/eventos/*`, `/v1/events/*` | Sim (`domain-p06`) | `bravo_events`, `events`, `ticket_lots` | Sim | Sim | **Implementado e em Homologação** |
| **Publicação Externa no Site DiskIngressos** | Sim | `/v1/eventos/:id/publicacoes/*` | Sim | `bravo_publications` | Sim | Sim | **Em Desenvolvimento** (Trava `ENABLE_EXTERNAL_PUBLICATION=false`) |
| **Clientes, Inventário Atômico e Pedidos** | Sim | `/v1/clientes/*`, `/v1/pedidos/*` | Sim (`domain-p08`) | `p08_customers`, `p08_orders`, `p08_inventory_balances` | Sim | Sim (`p08-integration`) | **Implementado e em Homologação** |
| **Ingressos (8 Dígitos + QR Independente) e Portaria** | Sim | `/v1/ingressos/*`, `/v1/tickets/*`, `/v1/gate-control/*` | Sim (`domain-p08`) | `p08_tickets`, `tickets`, `gate_checkins` | Sim | Sim | **Implementado e em Homologação** |
| **Checkout PagBank Sandbox** | Sim | `/v1/checkout/*` | Sim (`domain-p09`) | `p09_payment_intents` | Sim | Sim (`p09-structure`) | **Implementado e em Homologação** (`ENABLE_REAL_PAYMENTS=false`) |
| **PDV — Configuração e Turnos de Bilheteria** | Sim | `/v1/pdv/*`, `/v1/pos/*` | Sim (`domain-p09`) | `p09_pos_shifts`, `pos_terminals` | Sim | Sim | **Em Desenvolvimento** (`ENABLE_PDV_OPERATIONS=false`) |
| **SAC, SLA, ITIL, Pós-Venda e Fila de Estornos** | Sim | `/v1/sac/*`, `/v1/pos-venda/*`, `/v1/estornos/*` | Sim (`domain-p10`) | `p10_sac_cases`, `p10_refund_requests`, `refund_requests` | Sim | Sim (`p10-structure`) | **Implementado e em Homologação** (`ENABLE_REAL_REFUNDS=false`) |
| **Financeiro — Livro Razão, Centros de Custo e Borderôs** | Sim | `/v1/finance/*` | Sim | `fin_cost_centers`, `fin_ledger_entries`, `fin_event_settlements` | Sim | Sim | **Implementado e em Homologação** |
| **Financeiro — Catálogo Completo (104 Funções F01–F104)** | Sim (`120` rotas) | `/v1/finance/catalog` | Parcial (Núcleo Razão/Borderô) | `fin_ledger_entries`, `fin_cost_centers` | Sim | Sim | **Em Desenvolvimento / Planejado** (28 em homologação no núcleo contábil; 76 catalogadas para expansão incremental) |
| **RH & DP — Colaboradores, Ponto, Prévia de Folha e Lotes** | Sim | `/v1/rh/*` | Sim | `rh_employees`, `rh_time_entries`, `rh_payroll_runs`, `rh_payment_batches` | Sim | Sim | **Implementado e em Homologação** |
| **RH & DP — Catálogo Completo (45 Funções R01–R45)** | Sim (`59` rotas) | `/v1/rh/catalog` | Parcial (Pessoal/Ponto/Folha) | `rh_employees`, `rh_time_entries`, `rh_payroll_runs` | Sim | Sim | **Em Desenvolvimento / Planejado** (18 em homologação no núcleo RH; 27 catalogadas para expansão incremental) |
| **Portal do Produtor (PDT — Escopo Isolado sem Taxa Disk)** | Sim | `/v1/producers/:id/portal-summary` | Sim | Leitura filtrada de eventos/borderôs | Sim | Sim | **Implementado e em Homologação** |
| **Assistente Operacional Gemini IA** | Sim | `/v1/ia/*` | Sim (`domain-ia`) | `p12_ai_quota_windows`, `p12_ai_audit_logs` | Sim | Sim (`neon-gemini`) | **Implementado e em Homologação** (`BRAVO_GEMINI_ENABLED=false` até ativação da chave) |

---

## 3. Mapa de Divergências (Planejado × Existente × Corrigido)

| Item Auditado | Situação Encontrada na Auditoria | Correção Aplicada / Situação Atual |
| :--- | :--- | :--- |
| **1. Classes CSS do `BravoShell` (Causa A)** | 39 classes usadas em `bravo-shell.tsx` e páginas (`bravo-nav-row`, `bravo-nav-link`, `bravo-main-column`, `bravo-workspace`, `p06-card`, `p06-badge`, `p06-table`, `bravo-tab-btn`, etc.) não existiam em `bravo-p06.css`. | **Resolvido:** Todas as 39 classes foram implementadas em `apps/backoffice/src/components/bravo-p06.css` e protegidas por teste automatizado em `tests/integrity.test.mjs`. |
| **2. Ícones de Texto Improvisados no Menu** | `MODULE_ICONS` usava abreviações textuais (`'Brief'`, `'Evt'`, `'PDV'`). | **Resolvido:** Substituídos por ícones SVG vetoriais dedicados em `renderModuleIcon()` (`bravo-shell.tsx`). |
| **3. Folhas de Estilo Divididas (`bravo-p06.css` e `bravo-p10.css`)** | `layout.tsx` importava apenas `bravo-p06.css`; `bravo-p10.css` só carregava em páginas que importavam `bravo-p10.tsx`. | **Resolvido:** `layout.tsx` agora importa globalmente tanto `bravo-p06.css` quanto `bravo-p10.css`. |
| **4. Rotas Dinâmicas e `/v1/*` na Vercel (`bravoii-g2ac`)** | Retornavam `HTTP 404` quando o projeto Vercel apontava para a raiz. | **Resolvido:** `vercel.json` raiz + `api/v1.js` + `generateStaticParams()` em todas as 6 rotas dinâmicas (`financeiro/[slug]`, `rh/[slug]`, `eventos/[id]`, `comercial/produtores/[id]`, `comercial/eventos/[id]/taxas`, `sac/chamados/[id]`). |
| **5. Diagnóstico Oculto em 503 do BFF (`/v1/*`)** | `route.ts` retornava apenas mensagem genérica sem correlação ou identificação do serviço. | **Resolvido:** `route.ts` e `api/v1.js` incluem `X-Correlation-Id`, `X-Response-Time-Ms` e objeto `diagnostics` seguro (sem expor segredos). |
| **6. `Cache-Control: no-store` em `/_next/static`** | `next.config.mjs` aplicava `no-store` a `/:path*`, impedindo cache dos bundles estáticos CSS/JS. | **Resolvido:** `no-store` restrito a `/((?!_next/static|_next/image|favicon.ico).*)` e `public, max-age=31536000, immutable` aplicado a `/_next/static/:path*`. |
| **7. Documentação de Deploy com `npm` e `--no-frozen-lockfile`** | `README-VERCEL.md` e `docs/12-PASSO-A-PASSO-VERCEL-NEON.md` instruíam `npm install` / `npm run`. | **Resolvido:** Documentação e `apps/*/vercel.json` padronizados com `pnpm install --frozen-lockfile` e `pnpm run`. |
| **8. Variável `DATABASE_URL` no Ambiente `Production` de `bravoii-g2ac`** | `/v1/health` em `https://bravoii-g2ac.vercel.app/v1/health` comprova `"vercelEnv": "production", "hasDatabaseUrl": false, "hasBravoProxyKey": true`. | **Pendente no Painel Vercel:** Habilitar a caixa **Production** (além de *Preview*) na variável `DATABASE_URL` (ou `BRAVO_API_URL`) nas configurações do projeto `bravo_ii-g2ac` na Vercel. |
