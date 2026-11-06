# P10 — revisão de migração obrigatória

1. Nunca aplicar o `schema.prisma` em produção sem revisão e backup.
2. Instalar dependências localmente; `npm run db:validate` e `npm run db:generate`.
3. Criar migração por `npx prisma migrate dev --schema prisma/schema.prisma --name p10_sac_posvenda` **exclusivamente** em `bravo_ii_hml` novo; guardar SQL versionado.
4. Revisar índices concorrentes, chaves estrangeiras, retenção LGPD, tamanho de tabelas e ausência de duplicidade.
5. Submeter concorrência das trocas/refunds a testes PostgreSQL reais em transações SERIALIZABLE.
6. Não efetuar `migrate reset`, não apagar registros, não adicionar seed fictício.
7. Atenção a renomeações: revisão da migração SQL antes de aplicar; PostgreSQL não está disponível nesta entrega.
