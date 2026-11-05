# PROMPT 01 — Auditar e integrar o Pacote 06 ao Core BRAVO_II

Você está no VS Code com o repositório BRAVO_II. Leia `GEMINI.md`, `README.md`, `docs/00-ESCOPO-E-STATUS.md`, `docs/05-PLANO-DE-IMPLANTACAO.md` e o catálogo Financeiro/RH.

**MISSÃO:** integrar o Pacote 06 Comercial/Produtores/Eventos ao Core existente, sem sobrescrever módulos Financeiro Disk, RH, DP, PDT nem inventar código do SIGE.

1. Liste o conteúdo da pasta do workspace, versões exatas de Next/Nest/Prisma, arquivos de auth, guards, schema, migrations, route layout, design system e testes do pacote 05.
2. Se o Core ainda não existir, NÃO monte endpoints inseguros nem declare integração completa. Prepare apenas estrutura e relatório de dependências.
3. Crie branch de feature, guarde diff inicial, cheque integridade do catálogo 149 e mapeie o cruzamento de Producer/Event com as entidades já existentes.
4. Merge controlado do schema (nunca sobrescrever schema existente), migração em DB de homologação, constraints, índices e chaves.
5. Una `@bravo-ii/domain-p06` ao workspace. Rode seus testes antes/depois e documente comando e saída.
6. Substitua `P06PrismaService` pelo PrismaService único se existir. Monte `BravoPacote06Module` apenas sob guard do Core **real e verificado**. Negar todos os acessos por padrão.
7. Implemente pipes e schemas runtime para todos os DTOs (incluindo limite e validação de strings, IDs e CNPJ), tratamento de erros, logs seguros e idempotência dos POSTs de criação.
8. Crie testes de integração com DB real isolado para produtor, documentos, evento, preço, taxa e aprovação, confirmando isolamento transacional.
9. Entregue relatório de código alterado, resultados dos testes, migrations aplicadas/rollback, riscos restantes e status por rota.

**FIM DA EXECUÇÃO:** não ativar publicação no site, PDVs, estorno, repasses nem folha. Não avançar ao próximo prompt sem resultado verificável.
