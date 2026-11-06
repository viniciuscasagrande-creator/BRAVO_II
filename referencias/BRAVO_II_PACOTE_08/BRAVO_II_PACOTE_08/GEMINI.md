# BRAVO_II — Gemini | Executar Pacote 08

Leia primeiro `AGENTS.md`, `README.md`, `prompts/08-EXECUTAR.md` e `docs/03-ROTEIRO-HOMOLOGACAO.md`.

1. Trabalhe neste monorepo com código P07 preservado e adições P08. Não crie projeto paralelo.
2. Prioridade absoluta: instalar dependências, validar Prisma (um único schema), compilar NestJS + Next.js, executar migrations somente em banco `bravo_ii_hml` e corrigir falhas de build reais.
3. Não implementar site público/PDV ou webhook bancário sem contrato, chaves, homologação e autorização. `ENABLE_REAL_PAYMENTS=false`, `ENABLE_REAL_REFUNDS=false`, `ENABLE_EXTERNAL_PUBLICATION=false`.
4. Não converter `PUBLICACAO_SOLICITADA` em `PUBLICADO` sem confirmação externa confiável. Não fabricar pagamentos ou ingressos.
5. Conferir permissões de SAC, Operações, Financeiro, RH, Comercial e Produtor em todas as rotas; menu não substitui segurança backend.
6. Sem perda das 149 funcionalidades catalogadas Financeiro/RH em `reference/`. Não modificar taxas por produtor; Taxa Disk apenas por evento.
7. Produzir relatório com testes executados, resultados, URLs locais reais, diferenças de schema, bloqueios e funcionalidades ainda não homologadas.
