# Inventário e classificação de prontidão — Backup Financeiro/RH

**Arquivo:** `Modulo_Financeiro_V1_BACKUP_GERAL_OFICIAL_20261105.zip` (05/11/2026). **256 arquivos regulares** preservados, organizados em 359 entradas do ZIP (incluindo diretórios). Após descompactação, código, documentos, módulos isolados, testes, mobile e assets foram mantidos íntegros na pasta `referencias/FONTE_ORIGINAL_FINANCEIRO_RH/`.

## Escopo verificável

| Item | Quantidade | Evidência |
|---|---:|---|
| Grupos principais | 17 | `js/menuConfig.js` (`menuFinanceiroCompleto`) |
| Grupos Financeiro | 16 | todos exceto `diskRH` |
| Opções finais Financeiro | 104 | árvore de menu de folhas |
| Grupo RH | 1 | `diskRH` |
| Subgrupos internos RH | 8 | grupos hierárquicos do RH, além das opções de abertura |
| Opções finais RH | 45 | árvore de menu de folhas |
| Opções finais totais | **149** | todas possuem `case` no dispatcher `js/app.js` |
| Modelos Prisma de Financeiro+RH | 23 | `prisma/schema.prisma` e cópia `database/schema.prisma` |
| Modelos Prisma RH Disk V1 | 22 | `RH_DISK_V1/prisma/schema.prisma` |

**Aviso de contagem:** `case` no dispatcher não garante tela com persistência nem serviço produtivo. Algumas opções compartilham mesma view base e diferem por `filterArg`; isso foi preservado na matriz.

## O que está efetivamente na fonte

- Frontend demonstrativo principal de JS/HTML/CSS com menus por perfil e muitas views especializadas.
- Frontend React/Vite/TypeScript adicional (`frontend/`), serviços e layouts.
- Backend Express/TypeScript com workflow, repasses, aprovações, taxas, gateway, RH e outros controladores.
- `RH_DISK_V1`: apps web, API, mobile, shared, schema, 10 fases de RH e testes.
- `mobile/disk-ponto`: versão adicional de aplicativo móvel de ponto com telas e serviços.
- Dois módulos isolados de conta financeira do produtor e repasses de homologação.
- Histórico de pacotes e documentação do Financeiro/RH.

## Nível de confiança por natureza da função

| Evidência | Comprova | Não comprova |
|---|---|---|
| Opção no menu | funcionalidade solicitada e rota visível | persistência, autorização, negócio |
| Case no dispatcher | view correspondente e fluxo de renderização | backend completo ou ausência de falhas |
| Teste Node que passa | regras específicas implementadas e testadas no cenário | segurança de produção, integração externa, estabilidade sob carga |
| Prisma schema | intenção de modelo de dados | migrations executadas ou banco real conectado |
| Mock, Map, localStorage | protótipo/fluxo demonstrativo | armazenamento canônico transacional |
| Docs de integração | escopo e interface pretendidos | integração com banco, adquirente, eSocial ou CNAB ativa |

## Achados críticos P0 / P1

### P0: controle de acesso a RH

No `backend/src/app.ts` a rota `app.use('/api/rh', rhRouter)` não é protegida por `authMiddleware`. No RH legado `RH_DISK_V1/apps/api/src/index.ts`, a condição da rota `/api/auth/login` concede autenticação a usuários conhecidos sem comparação da senha recebida. O `backend/src/rh/rh.controller.ts` possui fallbacks de perfil administradores quando `req.user` não foi fornecido. **Não publicar esses endpoints.**

### P0: dados reais e financeiros

`js/state.js` e `js/views/rh/rhViews.js` usam `localStorage`; `backend/src/app.ts` usa `Map`; o RH usa Maps/arrays e seed de demonstração. Sem bancos confiáveis, operações e comprovantes não podem ser contabilizados como reais.

### P0: informações sensíveis

A amostra contém dados demonstrativos de CPF, salários, contas, geolocalização e atestados. Migrar os modelos, não os registros. Revisar mascaramento, autorização por finalidade e retenção conforme LGPD.

### P1: regra comercial por evento

`prisma/schema.prisma` inclui `Produtor.taxaDiskPercent @default(10.0)`. O BRAVO_II deve recusar essa herança como fonte oficial: taxa da Disk é negociada por EVENTO, percentual ou fixa, com versão e vigência.

### P1: dupla modelagem

RH e Financeiro possuem modelos separados para colaboradores, usuários, eventos, tesouraria e custos. Consolidar entidades e criar fronteiras de domínio antes de aplicar migrations.

### P1: obrigações trabalhistas e integrações

Cálculos de INSS/IRRF, ponto conforme Portaria 671 e XML de eSocial do backup são candidatos a revisão, não prova de certificação nem de compatibilidade com o leiaute vigente. Nenhum processamento externo está comprovado.

## Testes locais de verificação

- Fonte financeira principal: **121 verificações** aprovadas (`14 + 59 + 11 + 18 + 19`), via `npm test`.
- RH Disk V1: **30 verificações** aprovadas via `npm test` em `RH_DISK_V1/`.
- Build estático original: `npm run build` executado com saída zero.
- Importações JS no original: `node tests/check-imports.mjs` executado com sucesso.
- Novo catálogo Preview: 4 testes Node aprovados.
- Novo contrato referencial RH↔Financeiro: 7 testes Node aprovados.

**Total de verificações de referência observadas:** 151 testes originais, além de 11 novos de estrutura/contrato. Isso NÃO é aceite para produção.
