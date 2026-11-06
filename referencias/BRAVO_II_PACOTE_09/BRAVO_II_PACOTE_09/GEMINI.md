# GEMINI — BRAVO_II Pacote 09

Escopo: integrar Pacote 09 ao Core do Pacote 08 e executar homologação com PostgreSQL exclusivo. SEM tocar no SIGE original, no site público, no Financeiro Disk ou RH operacionais.

**Leia nesta ordem:** `AGENTS.md` → `README.md` → `prompts/09-EXECUTAR-E-HOMOLOGAR.md` → `docs/09-HOMOLOGACAO-E-CRITERIOS-DE-ACEITE.md`.

**Não presuma build pronto.** Primeiro, instalar dependências, gerar Prisma, criar migrations REVISADAS em base vazia/isolada; corrigir o build das aplicações. Executar testes offline, negativos, HTTP autenticados e PostgreSQL real. Não registrar como "feito" o que não passou.

**NUNCA habilitar:** publicação no site, transações reais, emissão a partir de status externo, estorno, webhook de confirmação não autenticado, importações de dados de produção, PDV operacional sem identidade de hardware. Deixe `ENABLE_REAL_PAYMENTS`, `ENABLE_REAL_REFUNDS`, `ENABLE_EXTERNAL_PUBLICATION`, `ENABLE_PDV_OPERATIONS` como `false`.

Mantenha uma matriz com 149 entradas de RH/Financeiro e uma matriz separada das novas rotas. Não declare aquelas 149 funções prontas: hoje são escopo preservado no repositório de referência. O projeto usa somente **um** `prisma/schema.prisma`.

**Entrega esperada do Gemini:** commit/arquivos alterados, SQL de migration revisado, resultado de build, migrations aplicadas, status de conectividade real, API e login, screenshots de navegação, resultado do smoke, achados de segurança, pendências e decisão objetiva de homologação (aprovada/reprovada).
