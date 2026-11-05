# Controle de qualidade e gate de liberação

## Gate 0 — Integridade da referência
- [ ] Hash SHA-256 do ZIP de referência confere com `00-INVENTARIO/integridade-backup.json`.
- [ ] Exatamente 256 arquivos de origem preservados e 149 opções (104 Financeiro / 45 RH) rastreadas.
- [ ] Testes originais passam em ambiente isolado sem ligação a dados reais.

## Gate 1 — Fundação BRAVO_II
- [ ] Banco PostgreSQL canônico, migrations e rollback.
- [ ] Identidade real, perfis e 401/403 por endpoint; todas as rotas RH protegidas.
- [ ] Menu e breadcrumbs acessíveis com 149 rotas, sem reautenticação ao navegar.
- [ ] Nenhum dado de negócio pré-carregado, saldo fictício ou token demo no runtime.
- [ ] Logs auditáveis, horários em timezone correto, IDs canônicos.

## Gate 2 — Financeiro (104/104)
- [ ] Cada ID possui API, autorização, persistência, ação, teste positivo/negativo.
- [ ] Taxa Disk percentual ou fixa em **evento**, histórico de negociação e sigilo.
- [ ] Ledger reversível por lançamento compensatório; saldos não calculados no frontend.
- [ ] Recebíveis, MDR, spread, rebate, advanced, transferências, repasses, antecipações, estornos, tesouraria e conciliação testados.
- [ ] Aprovação e assinatura em sequência, sem operações bancárias simuladas como pagas.

## Gate 3 — RH/DP (45/45)
- [ ] Colaborador canônico, RBAC/ABAC, restrições de dados pessoais e médicos.
- [ ] Folha, benefícios, ponto e eSocial com regras vigentes e homologação adequada.
- [ ] Uma implementação Disk Ponto, sincronização offline/idempotente, teste de geofence.
- [ ] Custo staff de eventos separado das despesas empresariais.
- [ ] Auditoria do RH permite rastrear modificações sem expor dados além do necessário.

## Gate 4 — Integração e homologação
- [ ] Outbox/idempotência RH→Financeiro com consistência transacional.
- [ ] SoD: requisitante ≠ aprovador, financeiro ≠ gateway.
- [ ] Conciliação de retorno de pagamento, chargeback e eventos fora de ordem.
- [ ] Testes completos de regressão, segurança, concorrência e carga.
- [ ] Preview avaliado por usuários autorizados; produção exige decisão formal.

## Bloqueios P0
- Endpoints RH desprotegidos no backup original.
- Login demonstração sem senha em parte da API RH.
- Persistência volátil/local usada como se fosse contabilidade/DP real.
- Divulgação de dados RH ou taxa interna a perfis indevidos.
- Execução de estorno, repasse ou folha sem confirmação externa e autorização.
