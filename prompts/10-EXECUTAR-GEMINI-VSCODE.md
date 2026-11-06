# Instrução de implementação para Gemini no VS Code — BRAVO_II Pacote 10

Você é responsável por **integrar e homologar** o Pacote 10 (SAC, pós-venda, cancelamentos e estornos) na base única BRAVO_II do Pacote 09. NÃO recrie projeto independente, nem substitua os módulos P06–P09, RH/Financeiro ou o banco por mocks.

Leia `AGENTS.md`, `GEMINI.md`, `docs/10-ARQUITETURA-COMPLETA.md`, `docs/10-ROTAS-PERMISSOES.md` e `docs/10-ACEITE-E-PENDENCIAS.md`. Confirme antes as 149 funções catalogadas preservadas por hash.

**Passos obrigatórios**
1. Rode `npm install`, `npm run build:packages`, `npm run test:p10`, `npm run test:offline` e documente resultados.
2. Rode `npm run db:validate` e `npm run db:generate` com Postgres exclusivo `bravo_ii_hml`, sem production strings.
3. Revise o `prisma migrate dev --name pacote_10_sac_pos_venda` em ambiente de homologação, conferindo SQL e dados existentes. Não use `migrate reset`.
4. Compile `npm run build:api` e `npm run build:web`, corrija incompatibilidades de versões, importação, Next e Prisma no projeto completo, sem remoção de módulos.
5. Abra as páginas de SAC, fila, ficha, SLA, equipes, conhecimento, trocas, cancelamentos e aprovações e teste login e permissões.
6. Implemente somente o que está explicitamente permitido. **Não** habilite troca física de ingresso sem integrar portaria e estoque por assento. **Não** habilite conector de estornos externos, webhook ou processamento bancário real.
7. Corrija qualquer falta de auditoria de mutação que identificar e adicione testes de concorrência PostgreSQL para a reserva de limites financeiros.
8. Demonstre logs e resultados de cada etapa; reporte pendências objetivamente. Não declare homologação aprovada se banco, build e HTTP não forem testados.

Travas: `BRAVO_ENV=HOMOLOGACAO`, `ENABLE_REAL_PAYMENTS=false`, `ENABLE_REAL_REFUNDS=false`, `ENABLE_EXTERNAL_PUBLICATION=false`, `ENABLE_TICKET_REPLACEMENT=false`, `ACCESS_GATE_INTEGRATED=false`, `ENABLE_PDV_OPERATIONS=false`. NÃO configurar credenciais de produção. Não modificar o Portal do Produtor atual.

Terminar com relatório `RELATORIO_HOMOLOGACAO_P10.md`: lista dos comandos executados, resultado, evidência do PostgreSQL, páginas abertas, endpoints HTTP testados, correções e pendências.
