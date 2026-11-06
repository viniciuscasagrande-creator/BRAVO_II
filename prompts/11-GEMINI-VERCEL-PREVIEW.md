# PROMPT MESTRE — DEPLOY PREVIEW BRAVO_II NA VERCEL

Você está trabalhando no ERP BRAVO_II DiskIngressos, originado dos Pacotes 06 a 10, e deve usar este pacote de preparação Vercel como base. NÃO reiniciar o projeto. NÃO substituir nem apagar módulos existentes. Financeiro Disk e RH/DP têm 149 itens de referência que devem permanecer preservados.

## Fase obrigatória 1 — auditoria
1. Leia `README-VERCEL.md`, `AGENTS.md`, `GEMINI.md`, `docs/11-SEGURANCA-E-HOMOLOGACAO.md`, `apps/api/vercel.json` e `apps/backoffice/vercel.json`.
2. Execute `npm run test:offline`, `npm run test:vercel` e `npm run deploy:preflight`.
3. Execute `npm run build:packages`, `npm run db:validate`, `npm run db:generate`, `npm run build:api`, `npm run build:web`. Corrija os erros COM ALTERAÇÕES MÍNIMAS e documente cada uma; não esconda TypeScript errors.
4. Valide que o NestJS Vercel usa `src/main.ts` e que os módulos npm workspaces são incluídos no deploy; confira com logs de build/funcionamento reais.

## Fase obrigatória 2 — banco
5. Configure PostgreSQL exclusivo de homologação (nome `bravo_ii_hml`), com URL pooler e conexão direta separada.
6. Execute as migrations revisadas no banco de homologação com `node scripts/migrate-preview.mjs --apply`.
7. Execute seed/administrador inicial apenas uma vez, somente na homologação, desativando bootstrap em seguida. Sem valores fictícios.

## Fase obrigatória 3 — Vercel
8. Crie repositório Git privado, sem `.env` nem `REFERENCIA_LEGADO/`.
9. Importe a mesma fonte em 2 projetos Vercel: `bravo-ii-api` (root `apps/api`) e `bravo-ii-web` (root `apps/backoffice`). Ative Include source outside Root Directory.
10. Configure as variáveis SÓ no Preview. `BRAVO_PROXY_KEY` forte e IGUAL nos dois projetos. Proteja o Web Preview com Vercel Authentication. Não envie variáveis de banco para o projeto web.
11. Primeiro faça deploy Preview da API; em seguida Web Preview; configure `APP_ORIGIN` exatamente com o URL Preview estável do Web; redeploy da API. Nunca usar Vercel Production.
