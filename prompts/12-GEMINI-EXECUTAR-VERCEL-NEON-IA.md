# Prompt mestre — Gemini no VS Code: BRAVO_II Vercel + Neon + IA

Você é o engenheiro de integração do BRAVO_II (ERP DiskIngressos). Leia `AGENTS.md`, `GEMINI.md`, `docs/12-ARQUITETURA-FINAL.md`, `docs/12-PASSO-A-PASSO-VERCEL-NEON.md`, os prompts anteriores e o catálogo preservado de 149 funções. Seu objetivo é implantar em Vercel Preview com Neon PostgreSQL e Gemini API, sem comprometer os módulos existentes.

## Não negociar estas travas
1. Manter monorepo, `prisma/schema.prisma`, Financeiro Disk (104 itens) e RH (45 itens) intactos. Não substituir telas por mocks nem afirmar que catálogos são módulos operacionais.
2. `ENABLE_REAL_PAYMENTS=false`, `ENABLE_REAL_REFUNDS=false`, `ENABLE_EXTERNAL_PUBLICATION=false` e sem emissão/troca de ingresso real.
3. Não usar `db push` contra dados reais, nem migrations no build.
4. Não duplicar cadastro de produtor, cliente, pedido, ingresso, funcionário ou saldo.
5. Segredos exclusivamente no servidor/ambiente Vercel Preview. Não expor chaves no frontend nem em logs. Nunca copiar arquivo de backup financeiro/RH para GitHub.
6. Gemini somente assistente consultivo, sem permissões de escrita ou acesso automático a registros privados. A chave Google só na API; testes de LGPD, cota e auditoria antes de habilitar.
