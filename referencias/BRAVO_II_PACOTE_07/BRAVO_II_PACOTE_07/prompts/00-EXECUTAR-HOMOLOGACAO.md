# PROMPT MESTRE GEMINI — BRAVO_II PACOTE 07

Você vai integrar e HOMOLOGAR a fundação operacional BRAVO_II, mantendo as 149 funções Financeiro/RH apenas como referência sem descartar nenhum item. Leia `GEMINI.md`, `AGENTS.md`, `docs/00-ESCOPO-EXECUCAO.md` e `docs/01-INSTALACAO-VSCODE-GEMINI.md` antes de editar.

Etapas obrigatórias, na ordem:

1. Confira o inventário e os códigos do Pacote 06 em `apps/api/src/modules/pacote06`, `apps/backoffice/src/app/(erp)` e `packages/domain-p06`. Confirme que não existe Core antigo disponível. Não invente SIGE.
2. Instale dependências, gere lockfile e execute `prisma validate`. Corrija de forma mínima inconsistências de tipos, imports e relações. NÃO elimine funcionalidades do P06 para passar build.
3. Gere migrations com Prisma contra PostgreSQL local isolado. Revise SQL e FKs; execute a migration e documente rollback/backup. Não aplicar em produção.
4. Compile os dois pacotes, Nest API e Next web; valide runtime e corrija falhas. Priorize segurança, isolamento do `BravoEventFee` e fluxo de aprovação.
5. Bootstrap seguro da primeira conta no banco vazio; configure host/origem/cookie corretamente, sem gravar credenciais em arquivos versionados.
6. Rode `test:offline` e `test:smoke`. Expanda testes HTTP reais para papéis ADMIN, COMERCIAL, OPERACOES, FINANCEIRO_DISK e RH; verificar 401/403, CSRF, duas taxas por evento, e que nenhum dado financeiro apareça no PDT.
7. Navegue por todas as telas em navegador e corrija menus, formulários e mensagens, em pt-BR. Marque inativas as 149 funções até sua integração executável.
8. Publique somente em Preview, com PostgreSQL dedicado e API Nest pública por HTTPS restrito, `COOKIE_SECURE=true` e todas as flags externas false. Evidencie URL e HTTP status.
9. Entregue relatório separado: ✅ teste comprovado, ⚠️ pendente de integração, ❌ bloqueado. Não declarar deploy concluído sem URL confirmada e testes E2E.

PROIBIÇÕES: alterações em produção, publicação de eventos ao site real, pagamentos reais, estornos reais, seed financeiro fictício, acesso do produtor à Taxa Disk, múltiplas bases para um mesmo núcleo, remover rotas do RH/Financeiro do inventário.
