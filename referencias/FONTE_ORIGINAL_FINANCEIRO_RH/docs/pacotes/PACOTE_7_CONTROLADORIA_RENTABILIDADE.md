# Módulo Financeiro V1 — Pacote 7
## Controladoria, Centros de Custos, Orçamentos, DRE Gerencial, Rentabilidade e Projeções

Este pacote amplia exclusivamente o ambiente **Financeiro Disk**. O ambiente do Produtor permanece separado.

### Incluído
- Central de Controladoria Financeira.
- Centros de Custos com orçado × realizado e desvios.
- Orçamentos com previsto, realizado e comprometido.
- DRE Gerencial, explicitamente separada da contabilidade oficial.
- Rentabilidade por Evento e Produtor.
- Composição de margem com receita, MDR/gateway, custos e resultado.
- Projeções de caixa em 7, 15, 30 e 60 dias.
- Navegação dedicada no menu Financeiro Disk.
- Contexto administrativo preservado: Disk → Produtor → Evento.

### Regras
1. Cenários e projeções não alteram Ledger nem saldo real.
2. Revisões de orçamento devem preservar versões e auditoria.
3. DRE Gerencial é instrumento de gestão e não escrituração contábil/fiscal.
4. Custos devem manter origem e, quando aplicável, vínculo com Produtor e Evento.
5. O Produtor não recebe acesso à estrutura administrativa completa da Controladoria Disk.

### Próxima integração real
Persistir centros de custos, versões de orçamento, alocações, metas de margem e cenários no backend/Prisma, substituindo os dados demonstrativos da camada visual.
