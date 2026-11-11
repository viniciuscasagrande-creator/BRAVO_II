# BRAVO_II — Fase 13: Adaptação Responsiva (Mobile First — Smartphones, Tablets e Desktop) e Auditoria de Alinhamento

Data: 11/11/2026. Base: `E:\BRAVO_II` (`0.12.0-neon-gemini-hml`).

## 1. Objetivo e Inventário
Adaptar a interface do Backoffice (`apps/backoffice`), da biblioteca compartilhada (`packages/ui`) e do Portal do Produtor (`apps/producer-portal`) para o padrão **Mobile First** (smartphones `320px–480px`, tablets `768px–1024px` e desktops), seguida de uma **varredura detalhada de desalinhamentos responsivos** em todos os componentes, folhas de estilo e telas operacionais, **preservando integralmente** a API (`apps/api`), o banco PostgreSQL (`Neon`), as 77 tabelas e todas as travas de segurança RBAC/ABAC e ocultação da Taxa Disk no PDT.

## 2. Varredura Detalhada de Desalinhamentos Encontrados e Corrigidos
1. **Conflito de Topbar Mobile (`bravo-p06.css` vs `bravo-responsive.css`)**:
   - *Problema*: `bravo-p06.css` definia `.bravo-topbar { height: 58px }` fixa enquanto `bravo-responsive.css` forçava `flex-wrap: wrap` e `.bravo-topbar-right { flex: 1 1 100% }` em `<= 600px`, empurrando o sino de alertas e o usuário para uma segunda linha que vazava para fora dos `58px` sobre o conteúdo da página.
   - *Correção*: unificado `.bravo-topbar` em linha única (`min-height: 58px; height: auto; flex-wrap: nowrap;`) com truncamento inteligente dos breadcrumbs (`.bravo-breadcrumbs` exibe o item ativo `.is-current` com reticências em `<= 560px`).
2. **Backdrop Duplo, Botão Hambúrguer Conflitante e Drawer Colapsado (`bravo-shell.tsx`, `bravo-p06.css`, `bravo-responsive.css`)**:
   - *Problema*: `bravo-shell.tsx` renderizava dois elementos de backdrop simultâneos (`<button className="bravo-mobile-backdrop">` e `<div className="bravo-drawer-backdrop">`); além disso, se o usuário colapsasse a sidebar no desktop (`isCollapsed = true`), abrir o drawer no mobile ocultava os rótulos/submenus; e a regra global `button { min-height: 42px }` deformava botões compactos (`.bravo-nav-expand`, `.bravo-topbar-logout`, `.bravo-notif-close` e o próprio backdrop).
   - *Correção*: unificado em um único backdrop (`bravo-mobile-backdrop bravo-drawer-backdrop`), criado `showFullSidebar = !isCollapsed || isMobileDrawerOpen` em `bravo-shell.tsx`, adicionado bloqueio de rolagem do `document.body` quando o drawer está aberto e restringido `min-height: 42px` apenas a botões de ação/formulário.
3. **Popover de Notificações Cortado Fora da Tela (`bravo-p06.css`)**:
   - *Problema*: `.bravo-notif-popover` usava `position: absolute; right: 0; width: min(360px, calc(100vw - 24px))` ancorado ao botão do sino (que fica à esquerda do pill de usuário), fazendo o popover estourar pela borda esquerda do celular.
   - *Correção*: em `<= 768px`, `.bravo-notif-popover` passa a usar `position: fixed; top: 62px; left: 12px; right: 12px; width: auto; max-height: calc(100dvh - 140px); z-index: 120;`.
4. **Grades Inline (`style={{ gridTemplateColumns: ... }}`) Não Colapsadas em `320px–768px`**:
   - *Problema*: dezenas de telas (`comercial/page.tsx`, `eventos/page.tsx`, `cadastros/page.tsx`, `cupons-cortesias/page.tsx`, `financeiro/page.tsx`, `financeiro/[slug]/financeiro-subarea-client.tsx`, `marketing/page.tsx`, `pedidos-vendas/page.tsx`, `rh/page.tsx`, `rh/[slug]/rh-subarea-client.tsx`) usavam grades inline como `'1fr 1fr'`, `'1fr 1fr 1fr'`, `'2fr 1fr'`, `'140px 1fr'`, `'120px 1fr'` ou `minmax(360px, 1fr)` que não eram capturadas pelo seletor anterior (restrito a `repeat(...)` em `<= 600px`).
   - *Correção*: expandida a regra em `bravo-responsive.css` para `@media (max-width: 768px)` cobrindo `.bravo-workspace :is(div, form, section)[style*="grid-template-columns"] { grid-template-columns: minmax(0, 1fr) !important; }` e normalizando `input[style*="min-width"]` para `min-width: 0 !important; width: 100% !important;`.
5. **Tabelas Convertidas em Cards Sem `data-label` e com Margem Vazando (`.bf-table`, `.p06-table`, `.b6 table`, `.producer-portal table`)**:
   - *Problema*:
     - `.bf-table tbody tr` tinha `margin: 10px 12px` dentro de uma tabela `width: 100%`, causando vazamento horizontal de `24px`.
     - As 7 tabelas de `FinanceiroVideoExtras.tsx` (Balancete, Livro Razão, Saldos por Evento, Fila de Repasses, Conciliação Gateway, Matriz de Riscos 5x5, Chamados/SLA e Plano 5W2H) e as tabelas do Portal do Produtor (`finance.tsx` e `portal.tsx`) ocultavam o `<thead>` no mobile, mas não tinham `data-label` nos `<td>`, deixando valores soltos sem identificação; células vazias `<td colSpan={...}>` ficavam tortas por `display: flex; justify-content: space-between`.
     - Tabelas `.p06-table` e `.b6 table` nas 53 telas operacionais sem `data-label` perdiam o cabeçalho no mobile.
   - *Correção*:
     - Corrigida margem de `.bf-table tbody tr` para `margin: 0 0 10px 0; box-sizing: border-box;` e adicionada regra `.bf-table td[colspan] { display: block; text-align: center; }`.
     - Adicionados atributos `data-label` em todas as células `<td>` das 7 tabelas de `FinanceiroVideoExtras.tsx` e de todas as tabelas de `portal.tsx` e `finance.tsx` (`apps/producer-portal` e `apps/backoffice`).
     - Em `bravo-p06.css`, a conversão de `.p06-table` e `.b6 table` para cards sem `<thead>` agora só ocorre quando a tabela possui `td[data-label]` (`:has(td[data-label])`); tabelas tradicionais sem `data-label` preservam `<thead>` visível com rolagem horizontal suave (`overflow-x: auto`).
6. **Inputs com Largura Fixa Inline e Cabeçalhos/Filtros Sem Quebra de Linha (`packages/ui`, `FinanceiroVideoExtras.tsx`, `rh/page.tsx`, `page.tsx`)**:
   - *Problema*: `FinanceiroVideoExtras.tsx` tinha inputs com `style={{ width: 120 }}`, `95` e `90` que ficavam em escada no mobile; `packages/ui/src/index.tsx` (`PageHeader`, `KpiCard`, `ActionPanel`) e `apps/backoffice/src/app/page.tsx` tinham cabeçalhos flex sem `flexWrap: 'wrap'` ou `minWidth: 0`.
   - *Correção*: `.bf-input-compact { width: 100% !important; }` no mobile; `flexWrap: 'wrap'` e `minWidth: 0` aplicados em `packages/ui/src/index.tsx`, `apps/backoffice/src/app/page.tsx` e `apps/backoffice/src/app/rh/page.tsx`.
7. **Portal do Produtor — `gridColumn: 'span 2'` Forçando 2 Colunas no Mobile (`portal.css`)**:
   - *Problema*: elementos com `style={{ gridColumn: 'span 2' }}` dentro de `.metrics` e `.form-grid` forçavam a criação de uma 2ª coluna implícita no CSS Grid mesmo com `grid-template-columns: 1fr`.
   - *Correção*: adicionado `.producer-portal .metrics > *, .producer-portal .form-grid > * { grid-column: 1 / -1 !important; min-width: 0; }` em `@media (max-width: 768px)` nos dois `portal.css`.

## 3. Arquivos Criados e Alterados
- `packages/ui/src/index.tsx`
- `apps/backoffice/src/components/bravo-shell.tsx`
- `apps/backoffice/src/components/bravo-p06.css`
- `apps/backoffice/src/components/bravo-responsive.css`
- `apps/backoffice/src/app/layout.tsx`
- `apps/backoffice/src/app/page.tsx`
- `apps/backoffice/src/app/rh/page.tsx`
- `apps/backoffice/src/modules/financeiro-disk-video/FinanceiroVideoWorkspace.tsx`
- `apps/backoffice/src/modules/financeiro-disk-video/FinanceiroVideoExtras.tsx`
- `apps/backoffice/src/modules/financeiro-disk-video/financeiro-video.css`
- `apps/backoffice/src/components/producer-portal/portal.css`
- `apps/backoffice/src/components/producer-portal/portal.tsx`
- `apps/backoffice/src/components/producer-portal/finance.tsx`
- `apps/producer-portal/src/app/layout.tsx`
- `apps/producer-portal/src/components/producer-portal/portal.css`
- `apps/producer-portal/src/components/producer-portal/portal.tsx`
- `apps/producer-portal/src/components/producer-portal/finance.tsx`

## 4. Testes e Evidências Executadas
- `pnpm run typecheck`: concluído com código `0` nos 19 projetos do monorepo.
- `pnpm run build`: concluído com código `0` (todos os pacotes, `apps/api`, `apps/producer-portal` e `apps/backoffice`).
- `node --test tests/vercel-preview.test.mjs tests/producer-portal.test.mjs tests/producer-finance.integration.test.mjs tests/integrity.test.mjs tests/matriz-53-telas-funcionais.test.mjs tests/financeiro-video.test.mjs`: **37/37 testes aprovados (`fail 0`)**.
- `pnpm run deploy:preflight`: `Estrutura para Vercel: VALIDADA` / `Migrations versionadas: PRESENTES`.

## 5. Segurança e Governança
- Nenhuma migration ou alteração destrutiva de banco foi executada.
- Nenhum segredo foi exposto no cliente.
- **Confirmação explícita**: nenhuma operação financeira real (pagamento, estorno, repasse ou antecipação bancária) foi executada em produção ou homologação.
