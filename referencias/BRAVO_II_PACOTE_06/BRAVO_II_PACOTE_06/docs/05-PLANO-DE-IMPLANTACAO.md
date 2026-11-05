# Implantação sequencial no VS Code via Gemini

## P06.1 — Auditar Core e preservar Master
Abrir o repositório BRAVO_II existente e localizar arquivos do Pacote 05. Confirmar `AppModule`, `PrismaService`, IdentityGuard, JWT/session auth, menu lateral e critérios de aprovação. Salvar snapshot Git/branch `feature/bravo-p06-comercial-eventos`. Não fazer deploy.

## P06.2 — Compilar domínio + testes
`cd packages/domain && npm install && npm test`. Os testes puros devem passar sem acesso à internet (uma vez instalado o TypeScript) e sem banco. Verificar também `node tests/validate-package.mjs` na raiz. Regra: sem regressão nas 149 funções Fin/RH.

## P06.3 — Unificar banco
Mesclar `database/schema.p06.prisma` aos modelos canônicos do Core; mapear/renomear entidades já existentes, sem duplicar Producer/Event. Revisar constraints, adicionar migration idempotente, rodar em PostgreSQL isolado e conferir integridade/conflitos. Não rodar em produção.

## P06.4 — Adicionar backend NestJS
Integrar `BravoPacote06Module`, substituir `P06PrismaService` pelo serviço único e colocar `IdentityGuard` do Core ANTES de `P06PrincipalGuard`. Propagar `actorId` confiável. Adicionar pipes de DTO e testes integração (PostgreSQL real de homologação). Confirmar roles+escopos+CSRF+alçadas.

## P06.5 — Conectar telas Next.js
Copiar páginas `.tsx` e os componentes sem sobrescrever estrutura do layout. Conectar proxy same-origin `/v1/*` para API; importar CSS no layout protegido e links reais para telas funcionais. Nenhum fetch deve carregar mock data ou montar header `x-user-id`.

## P06.6 — Conectar processos
Criar produtor, anexar documento privado, validar por outro usuário, cadastrar dois eventos com taxas diferentes, criar sessões/lotes/canais e executar 4 aprovações. Garantir que eventos completos ficam em `PUBLICACAO_SOLICITADA` sem chamada ao site.

## P06.7 — Publicação homologada (etapa separada)
Com documentação e credencial sandbox oficiais da DiskIngressos, desenvolver worker outbox e recibo verificado; aprovação explícita antes de qualquer publicação pública. Não ativar endpoint de produção por variável manual sem auditoria.

## P06.8 — Homologação e Preview
Executar build do Core, testes unitários/integração/e2e, segurança, logs, transações simultâneas e mobile. Gerar relatório por tela/API com status. Preview só depois de testes de sessão e migração. Produção só depois de assinatura de homologação.

## Rollback
- Frontend: desabilitar feature flag `BRAVO_P06_ENABLED` (a criar no Core) sem afetar Financeiro/RH/PDT.
- Backend: desligar módulo/routes no gateway sem apagar dados.
- Database: migrations preferencialmente aditivas; não executar rollback destrutivo de tabelas com dados sem plano de exportação/restauração validado.
- Outbox: parar o worker, preservar mensagens e chaves idempotentes, jamais repetir efeitos externos sem reconciliação.
