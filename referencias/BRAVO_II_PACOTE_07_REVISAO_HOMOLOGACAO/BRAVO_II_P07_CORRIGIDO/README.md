# BRAVO_II — Pacote 07 | Homologação da Integração

Integra Core + PostgreSQL/Prisma + autenticação central por sessão + navegação por perfil + Comercial/Produtores/Eventos P06 no **mesmo monorepo**.

**Estado real:** fontes preparadas, testes offline aprovados; **banco, instalação de Nest/Next/Prisma, runtime Preview e deploy ainda não homologados**. Este pacote não envolve o SIGE nem publica eventos reais.

## Começar

- `GEMINI.md` / `AGENTS.md`: instruções para Gemini e regras de segurança.
- `docs/01-INSTALACAO-VSCODE-GEMINI.md`: instalação com Docker PostgreSQL, Node e VS Code.
- `docs/02-MATRIZ-HOMOLOGACAO.md`: evidências de aceite e pendências.
- `scripts/test-offline.sh`: testes puros, sem banco.
- `scripts/smoke.mjs`: testes HTTP contra API/Preview **após** iniciar serviços.
- `reference/`: inventário das 149 funções anteriores (104 Financeiro + 45 RH), **não migradas operacionalmente**.

O Pacote 06 está incorporado em `packages/domain-p06`, `apps/api/src/modules/pacote06` e páginas React. O núcleo está em `apps/api/src/core/`. As aplicações exigem instalação e builds integrados no VS Code com acesso ao registro npm.

### Proteções

- `APP_ORIGIN` exigida em todas as mutações; cookie de sessão HttpOnly; CSRF vinculada à sessão.
- `ENABLE_EXTERNAL_PUBLICATION=false`, `ENABLE_REAL_PAYMENTS=false` e `ENABLE_REAL_REFUNDS=false` são condições de inicialização.
- Sem usuário padrão, sem seed, sem operação de conta bancária ou gateway.
- Os 149 itens Financeiro/RH seguem como escopo obrigatório de fases posteriores, não como telas falsas.

## Revisão operacional 07.1

Antes do banco/Preview leia `docs/03-EXECUCAO_HOMOLOGACAO_REVISAO.md`, configure `.env` e rode `npm run build:packages && npm run doctor`. O banco isolado agora se chama `bravo_ii_hml`. A revisão acrescenta invariantes de ambiente e correção de bloqueio temporário no login.
