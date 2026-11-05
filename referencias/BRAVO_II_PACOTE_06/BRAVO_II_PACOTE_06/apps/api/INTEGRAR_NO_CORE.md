# Adaptadores NestJS — módulo 06

Esses arquivos devem ser copiados/mesclados em `apps/api/src/modules/pacote06/` no **Core único** do BRAVO_II após a entrega e validação do Pacote 05.

- Dependências esperadas do Core: `@nestjs/common`, `@prisma/client`, `@bravo-ii/domain-p06`, PrismaService compartilhado, autenticação real instalada e identity guard que define `req.user` verificado.
- O guard do Pacote 06 **nega tudo** na ausência de `req.user`; **não** valida JWT diretamente e **não** é um substituto da autenticação real do Pacote 05. O módulo não deve ser montado publicamente antes de seu middleware de identidade.
- Antes de rodar migrations, conciliar modelos `Bravo*` com o `prisma/schema.prisma` ÚNICO. Remover `P06PrismaService` quando substituir pelo PrismaService real do Core.
- O `BravoPacote06Module` deve ser importado no `AppModule` principal.
- As rotas são todas internas. NÃO criar rota pública que exponha `BravoEventFee`, `BravoProducer` completo ou dados de documento.
- Não usar os endpoints de mudança de status para publicar no site sem o worker oficial. A função `confirmFromTrustedWorker` é interna e não está exposta via HTTP.
- Checklist de hardening obrigatório antes da homologação: validação de DTOs com pipes, controle de alçadas por recurso, idempotency-key de POSTs, política LGPD, storage autenticado, concorrência transacional de lotes e assentos, paginação, limites por campo, revisão de audit, restrições SQL e testes de integração real Postgres.

**Status**: fonte de integração entregue; **compilação Nest e execução com PostgreSQL NÃO verificadas neste pacote** enquanto o Pacote 05 não estiver disponível.
