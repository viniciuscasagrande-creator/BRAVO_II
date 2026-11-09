# CHANGELOG_DEV.md — Registro Oficial de Intervenções Técnicas no BRAVO_II

## [2026-11-09] — Estabilização P0/P1, Coerência Visual BankOS, BFF `/v1/*` e Governança Mestre (v1.0)

### A. Diagnóstico e Objetivo
- **Causa A (Visual):** `apps/backoffice/src/components/bravo-shell.tsx` e páginas operacionais utilizavam 39 classes CSS (`.bravo-nav-row`, `.bravo-nav-link`, `.bravo-nav-sublink`, `.bravo-main-column`, `.bravo-workspace`, `.bravo-session-card`, `.p06-card`, `.p06-badge`, `.p06-table`, `.bravo-tab-btn`, etc.) ausentes de `apps/backoffice/src/components/bravo-p06.css`.
- **Causa B (Roteamento e BFF na Vercel):** Projetos na Vercel apontando para a raiz precisavam exportar as páginas pré-renderizadas em `dist/`, reescrever `/v1/:path*` para `api/v1.js` e suportar as 6 rotas dinâmicas (`financeiro/[slug]`, `rh/[slug]`, `eventos/[id]`, `comercial/produtores/[id]`, `comercial/eventos/[id]/taxas`, `sac/chamados/[id]`).
- **Segurança:** Credenciais demonstrativas foram removidas do código e rotacionadas no banco Neon `bravo_ii_hml` (`force_password_change = TRUE`). Fallback silencioso para `PGlite` foi bloqueado fora de `NODE_ENV=test`.
- **Governança:** Criação dos 5 documentos mestres obrigatórios em `docs/governance/`.

### B. Arquivos Criados / Modificados
- `docs/governance/MASTER_SPEC.md` (Criado)
- `docs/governance/ARCHITECTURE.md` (Criado)
- `docs/governance/MODULE_MAP.md` (Criado)
- `docs/governance/IMPLEMENTATION_STATUS.md` (Criado)
- `docs/governance/CHANGELOG_DEV.md` (Criado)
- `apps/backoffice/src/components/bravo-p06.css` (Implementadas as 39 classes CSS faltantes do `BravoShell` e componentes P06)
- `apps/backoffice/src/components/bravo-shell.tsx` (Substituídos ícones de texto por ícones SVG vetoriais)
- `apps/backoffice/src/app/layout.tsx` (Importação global unificada de `bravo-p06.css` e `bravo-p10.css`)
- `apps/backoffice/next.config.mjs` (`Cache-Control: no-store` restrito às rotas dinâmicas/páginas e `immutable` para `/_next/static/*`)
- `apps/backoffice/src/app/v1/[...path]/route.ts` (Adicionados `X-Correlation-Id`, `X-Response-Time-Ms` e `diagnostics` estruturado em 503)
- `api/v1.js` e `vercel.json` (Roteamento BFF `/v1/*`, cabeçalhos de segurança e rewrites para as rotas dinâmicas `[id]`)
- `apps/backoffice/src/app/eventos/[id]/*`, `apps/backoffice/src/app/comercial/produtores/[id]/*`, `apps/backoffice/src/app/comercial/eventos/[id]/taxas/*`, `apps/backoffice/src/app/(erp)/sac/chamados/[id]/*` (`generateStaticParams` + suporte a parâmetros dinâmicos)
- `apps/backoffice/vercel.json`, `apps/api/vercel.json`, `README-VERCEL.md`, `docs/12-PASSO-A-PASSO-VERCEL-NEON.md` (Padronizados com `pnpm install --frozen-lockfile`)
- `tests/integrity.test.mjs` (Adicionados testes automatizados de coerência CSS/TSX, cabeçalhos de cache e remoção de credenciais demo)

### C. Testes e Validações Executadas
- `pnpm run build`: Compilação completa de 12 pacotes + API NestJS + Backoffice Next.js (`218/218` páginas geradas).
- `node scripts/vercel-preflight.mjs`: `Estrutura para Vercel: VALIDADA`, `Migrations versionadas: PRESENTES`.
- `node scripts/validate-prisma-schema.mjs`: `55` modelos e `55` tabelas validadas contra `bravo_ii_hml`.
- `node --test tests/*.test.mjs`: `49/49` testes aprovados (`0` falhas).

### D. Pendências Externas (Painel Vercel)
- No projeto `bravo_ii-g2ac` da Vercel (`https://bravoii-g2ac.vercel.app/`), marcar a caixa **Production** na variável `DATABASE_URL` (ou `BRAVO_API_URL`) em *Settings -> Environment Variables*, pois a branch `main` executa sob `vercelEnv: "production"`.
