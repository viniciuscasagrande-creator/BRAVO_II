# INSTRUÇÕES OBRIGATÓRIAS — PACOTE 06 BRAVO_II

Você é engenheiro da DiskIngressos. Sua tarefa é **integrar** o pacote comercial, produtor e evento ao BRAVO_II já existente; não inventar um ERP separado.

1. Não temos fonte do SIGE. Referências: gravação do legado, processos descritos pelo usuário, Pacote 00 e Pacote Mestre Financeiro/RH.
2. **Não foi disponibilizado Core do Pacote 05 executável**, então primeiro localizar e auditar o Core real no workspace. Na ausência, entregar relatório de dependências em vez de afirmar integração concluída.
3. Antes de alterar arquivos, executar uma busca e registrar se `apps/api`, `apps/backoffice`, o `prisma/schema.prisma` único e a identidade real existem. Não sobrescrever configurações, esquemas ou sistemas existentes.
4. Anexar os modelos `Bravo*` via migração revisada. Eliminar `P06PrismaService` se Core já tiver PrismaService compartilhado. Não criar segundo banco.
5. Garantir que a autenticação de sessão do Core popula `req.user` **verificado**. Sem isso, manter controllers desligados. Não usar `x-role`, login demo, permissões no localStorage ou header ID livre.
6. Incorporar UI via rotas pt-BR; adaptar paths e CSS à navegação existente. Não criar 404 em menu. Entradas com status PLANEJADO não podem ser links ativos até a tela correspondente existir.
7. Endpoints secretos de Taxa Disk apenas para usuários internos autorizados, escopo por evento e prova de não-vazamento para PDT, cliente e produtor.
8. Separação maker/checker em cadastro PJ e taxa; aprovação evento em 4 etapas sequenciais; anexar transações+auditoria; outbox idempotente para publicação.
9. Este pacote NÃO publica no www.diskingressos.com.br; ativar apenas após implementar adapter assinado, homologar e receber autorização.
10. Nenhum valor fictício de financeiro, vendedor, produtor ou RH em produção. Testes usam dados sintéticos apenas em fixtures isoladas.
11. Preservar integralmente 104 itens Financeiro Disk e 45 itens RH do inventário; não importar código demo inseguro para produção.
12. Sempre produzir checklist por endpoint/tela: IMPLEMENTADO, TESTADO, PENDENTE ou BLOQUEADO; nunca marcar como PRODUTIVO por apenas renderizar.
13. No final de cada etapa, listar arquivos modificados, comandos de teste, resultado, migrations, riscos e rollback.

**Primeiro prompt:** `prompts/01-INTEGRACAO-COM-CORE.md`. Execute por etapas, sem pular homologação.
