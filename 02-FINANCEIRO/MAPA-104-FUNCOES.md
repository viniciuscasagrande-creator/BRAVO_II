# FINANCEIRO DISK — 104 funções

**Fonte:** `js/menuConfig.js` da cópia preservada. **Nenhuma linha deve ser omitida.**

Total registrado: 104 opções. Encontradas no dispatcher de telas legado; renderização não comprova operação produtiva.

## VISÃO GERAL (4)

| Nº | Tela | ID original | Filtro/ação | Rota nova |
|---:|---|---|---|---|
| 1 | Dashboard Financeiro | `diskDashboard` | `dashboard` | `/financeiro/visao-geral-dashboard-financeiro-001` |
| 2 | Posição Geral | `diskPosicaoGeral` | `posicao` | `/financeiro/visao-geral-posicao-geral-002` |
| 3 | Indicadores | `diskIndicadores` | `indicadores` | `/financeiro/visao-geral-indicadores-003` |
| 4 | Inteligência Financeira | `diskInteligencia` | `inteligencia` | `/financeiro/visao-geral-inteligencia-financeira-004` |

**Aceite por função:** abrir com perfil autorizado, buscar dados reais com escopo, estado vazio, ação funcional, validação de backend, trilha de auditoria, teste negativo de segurança e teste de regressão.

## PRODUTORES E EVENTOS (5)

| Nº | Tela | ID original | Filtro/ação | Rota nova |
|---:|---|---|---|---|
| 5 | Produtores | `diskProdutores` | `all` | `/financeiro/produtores-e-eventos-produtores-005` |
| 6 | Eventos | `diskEventos` | `all` | `/financeiro/produtores-e-eventos-eventos-006` |
| 7 | Conta Financeira do Produtor | `diskContaFinanceira` | `conta` | `/financeiro/produtores-e-eventos-conta-financeira-do-produtor-007` |
| 8 | Saldos por Produtor | `diskSaldos` | `produtor` | `/financeiro/produtores-e-eventos-saldos-por-produtor-008` |
| 9 | Saldos por Evento | `diskSaldos` | `evento` | `/financeiro/produtores-e-eventos-saldos-por-evento-009` |

**Aceite por função:** abrir com perfil autorizado, buscar dados reais com escopo, estado vazio, ação funcional, validação de backend, trilha de auditoria, teste negativo de segurança e teste de regressão.

## SOLICITAÇÕES E OPERAÇÕES (8)

| Nº | Tela | ID original | Filtro/ação | Rota nova |
|---:|---|---|---|---|
| 10 | Central de Solicitações | `diskSolicitacoes` | `all` | `/financeiro/solicitacoes-e-operacoes-central-de-solicitacoes-010` |
| 11 | Central de Aprovações | `diskAprovacoes` | `pendentes` | `/financeiro/solicitacoes-e-operacoes-central-de-aprovacoes-011` |
| 12 | Repasses | `diskRepasses` | `all` | `/financeiro/solicitacoes-e-operacoes-repasses-012` |
| 13 | Política de Repasse | `diskPoliticaRepasse` | `politica` | `/financeiro/solicitacoes-e-operacoes-politica-de-repasse-013` |
| 14 | Antecipações | `diskAntecipacoes` | `all` | `/financeiro/solicitacoes-e-operacoes-antecipacoes-014` |
| 15 | Divisão de Receitas | `diskDivisaoReceitas` | `split` | `/financeiro/solicitacoes-e-operacoes-divisao-de-receitas-015` |
| 16 | Transferências entre Eventos | `diskTransferencias` | `openTransferModal` | `/financeiro/solicitacoes-e-operacoes-transferencias-entre-eventos-016` |
| 17 | Assinaturas Pendentes | `diskAssinaturas` | `pendentes` | `/financeiro/solicitacoes-e-operacoes-assinaturas-pendentes-017` |

**Aceite por função:** abrir com perfil autorizado, buscar dados reais com escopo, estado vazio, ação funcional, validação de backend, trilha de auditoria, teste negativo de segurança e teste de regressão.

## RECEBÍVEIS E LIQUIDAÇÕES (5)

| Nº | Tela | ID original | Filtro/ação | Rota nova |
|---:|---|---|---|---|
| 18 | Contas a Receber | `diskContasReceber` | `overview` | `/financeiro/recebiveis-e-liquidacoes-contas-a-receber-018` |
| 19 | Recebíveis | `diskRecebiveis` | `recebiveis` | `/financeiro/recebiveis-e-liquidacoes-recebiveis-019` |
| 20 | Agenda de Recebíveis | `diskRecebiveis` | `agenda` | `/financeiro/recebiveis-e-liquidacoes-agenda-de-recebiveis-020` |
| 21 | Liquidações | `diskRecebiveis` | `liquidados` | `/financeiro/recebiveis-e-liquidacoes-liquidacoes-021` |
| 22 | Agenda Financeira | `diskRecebiveis` | `agenda_financeira` | `/financeiro/recebiveis-e-liquidacoes-agenda-financeira-022` |

**Aceite por função:** abrir com perfil autorizado, buscar dados reais com escopo, estado vazio, ação funcional, validação de backend, trilha de auditoria, teste negativo de segurança e teste de regressão.

## GATEWAYS E ADQUIRENTES (8)

| Nº | Tela | ID original | Filtro/ação | Rota nova |
|---:|---|---|---|---|
| 23 | Gateways | `diskGateways` | `gateways` | `/financeiro/gateways-e-adquirentes-gateways-023` |
| 24 | Adquirentes | `diskGateways` | `adquirentes` | `/financeiro/gateways-e-adquirentes-adquirentes-024` |
| 25 | Bandeiras | `diskGateways` | `bandeiras` | `/financeiro/gateways-e-adquirentes-bandeiras-025` |
| 26 | MDR | `diskGateways` | `mdr` | `/financeiro/gateways-e-adquirentes-mdr-026` |
| 27 | Parcelamento | `diskGateways` | `parcelamento` | `/financeiro/gateways-e-adquirentes-parcelamento-027` |
| 28 | Métodos de Pagamento | `diskGateways` | `metodos` | `/financeiro/gateways-e-adquirentes-metodos-de-pagamento-028` |
| 29 | Regras Comerciais | `diskGateways` | `regra` | `/financeiro/gateways-e-adquirentes-regras-comerciais-029` |
| 30 | Pagamentos Customizados | `diskGateways` | `customizados` | `/financeiro/gateways-e-adquirentes-pagamentos-customizados-030` |

**Aceite por função:** abrir com perfil autorizado, buscar dados reais com escopo, estado vazio, ação funcional, validação de backend, trilha de auditoria, teste negativo de segurança e teste de regressão.

## TAXAS E REGRAS COMERCIAIS (6)

| Nº | Tela | ID original | Filtro/ação | Rota nova |
|---:|---|---|---|---|
| 31 | Taxas e Custos | `diskTaxas` | `disk` | `/financeiro/taxas-e-regras-comerciais-taxas-e-custos-031` |
| 32 | Spread & Adquirentes | `diskSpread` | `spread` | `/financeiro/taxas-e-regras-comerciais-spread-adquirentes-032` |
| 33 | Simulador Financeiro | `diskTaxas` | `simulador` | `/financeiro/taxas-e-regras-comerciais-simulador-financeiro-033` |
| 34 | Taxas do Produtor | `diskTaxas` | `produtor` | `/financeiro/taxas-e-regras-comerciais-taxas-do-produtor-034` |
| 35 | Taxas do Cliente | `diskTaxas` | `cliente` | `/financeiro/taxas-e-regras-comerciais-taxas-do-cliente-035` |
| 36 | Histórico de Regras | `diskTaxas` | `historico` | `/financeiro/taxas-e-regras-comerciais-historico-de-regras-036` |

**Aceite por função:** abrir com perfil autorizado, buscar dados reais com escopo, estado vazio, ação funcional, validação de backend, trilha de auditoria, teste negativo de segurança e teste de regressão.

## TESOURARIA (8)

| Nº | Tela | ID original | Filtro/ação | Rota nova |
|---:|---|---|---|---|
| 37 | Contas Bancárias | `diskTesouraria` | `contas` | `/financeiro/tesouraria-contas-bancarias-037` |
| 38 | PIX | `diskPix` | `pix` | `/financeiro/tesouraria-pix-038` |
| 39 | CNAB | `diskCnab` | `cnab` | `/financeiro/tesouraria-cnab-039` |
| 40 | Contas a Pagar | `diskContasPagar` | `overview` | `/financeiro/tesouraria-contas-a-pagar-040` |
| 41 | Pagamentos | `diskTesouraria` | `pagamentos` | `/financeiro/tesouraria-pagamentos-041` |
| 42 | Pagamentos em Lote | `diskPagamentosLote` | `lote` | `/financeiro/tesouraria-pagamentos-em-lote-042` |
| 43 | Transferências | `diskTransferencias` | `transferencias` | `/financeiro/tesouraria-transferencias-043` |
| 44 | Agenda de Pagamentos | `diskAgendaPagamentos` | `agenda` | `/financeiro/tesouraria-agenda-de-pagamentos-044` |

**Aceite por função:** abrir com perfil autorizado, buscar dados reais com escopo, estado vazio, ação funcional, validação de backend, trilha de auditoria, teste negativo de segurança e teste de regressão.

## CONCILIAÇÃO (6)

| Nº | Tela | ID original | Filtro/ação | Rota nova |
|---:|---|---|---|---|
| 45 | Bancária | `diskConciliacao` | `bancaria` | `/financeiro/conciliacao-bancaria-045` |
| 46 | Gateways | `diskConciliacao` | `gateways` | `/financeiro/conciliacao-gateways-046` |
| 47 | Adquirentes | `diskConciliacao` | `adquirentes` | `/financeiro/conciliacao-adquirentes-047` |
| 48 | Repasses | `diskConciliacao` | `repasses` | `/financeiro/conciliacao-repasses-048` |
| 49 | Recebíveis | `diskConciliacao` | `recebiveis` | `/financeiro/conciliacao-recebiveis-049` |
| 50 | Divergências | `diskConciliacao` | `divergencias` | `/financeiro/conciliacao-divergencias-050` |

**Aceite por função:** abrir com perfil autorizado, buscar dados reais com escopo, estado vazio, ação funcional, validação de backend, trilha de auditoria, teste negativo de segurança e teste de regressão.

## ESTORNOS E CHARGEBACKS (3)

| Nº | Tela | ID original | Filtro/ação | Rota nova |
|---:|---|---|---|---|
| 51 | Central de Estornos | `diskCentralEstornos` | `estornos` | `/financeiro/estornos-e-chargebacks-central-de-estornos-051` |
| 52 | Chargebacks e Contestações | `diskEstornos` | `chargebacks` | `/financeiro/estornos-e-chargebacks-chargebacks-e-contestacoes-052` |
| 53 | Impacto Financeiro | `diskEstornos` | `impacto` | `/financeiro/estornos-e-chargebacks-impacto-financeiro-053` |

**Aceite por função:** abrir com perfil autorizado, buscar dados reais com escopo, estado vazio, ação funcional, validação de backend, trilha de auditoria, teste negativo de segurança e teste de regressão.

## FECHAMENTOS E DOSSIÊS (5)

| Nº | Tela | ID original | Filtro/ação | Rota nova |
|---:|---|---|---|---|
| 54 | Fechamentos e Dossiês | `diskFechamentos` | `fechamentos` | `/financeiro/fechamentos-e-dossies-fechamentos-e-dossies-054` |
| 55 | Borderôs | `diskBordero` | `borderos` | `/financeiro/fechamentos-e-dossies-borderos-055` |
| 56 | Fechamento por Evento | `diskFechamentos` | `evento` | `/financeiro/fechamentos-e-dossies-fechamento-por-evento-056` |
| 57 | Dossiê Financeiro | `diskFechamentos` | `dossie` | `/financeiro/fechamentos-e-dossies-dossie-financeiro-057` |
| 58 | Histórico de Fechamentos | `diskBordero` | `historico` | `/financeiro/fechamentos-e-dossies-historico-de-fechamentos-058` |

**Aceite por função:** abrir com perfil autorizado, buscar dados reais com escopo, estado vazio, ação funcional, validação de backend, trilha de auditoria, teste negativo de segurança e teste de regressão.

## CONTROLADORIA FINANCEIRA (8)

| Nº | Tela | ID original | Filtro/ação | Rota nova |
|---:|---|---|---|---|
| 59 | Visão Geral | `diskControladoria` | `visao` | `/financeiro/controladoria-financeira-visao-geral-059` |
| 60 | Fluxo de Caixa | `diskFluxoCaixa` | `fluxo` | `/financeiro/controladoria-financeira-fluxo-de-caixa-060` |
| 61 | Projeção de Caixa | `diskProjecoes` | `projecoes` | `/financeiro/controladoria-financeira-projecao-de-caixa-061` |
| 62 | DRE Gerencial | `diskDre` | `dre` | `/financeiro/controladoria-financeira-dre-gerencial-062` |
| 63 | Financeiro Advanced | `diskAdvanced` | `advanced` | `/financeiro/controladoria-financeira-financeiro-advanced-063` |
| 64 | Rentabilidade | `diskRentabilidade` | `rentabilidade` | `/financeiro/controladoria-financeira-rentabilidade-064` |
| 65 | Centros de Custos | `diskCentrosCustos` | `centros` | `/financeiro/controladoria-financeira-centros-de-custos-065` |
| 66 | Orçamentos | `diskOrcamentos` | `orcamentos` | `/financeiro/controladoria-financeira-orcamentos-066` |

**Aceite por função:** abrir com perfil autorizado, buscar dados reais com escopo, estado vazio, ação funcional, validação de backend, trilha de auditoria, teste negativo de segurança e teste de regressão.

## FORNECEDORES (8)

| Nº | Tela | ID original | Filtro/ação | Rota nova |
|---:|---|---|---|---|
| 67 | Cadastro | `diskFornecedores` | `cadastro` | `/financeiro/fornecedores-cadastro-067` |
| 68 | Contratos | `diskFornecedores` | `contratos` | `/financeiro/fornecedores-contratos-068` |
| 69 | Documentos | `diskFornecedores` | `documentos` | `/financeiro/fornecedores-documentos-069` |
| 70 | Cotações | `diskFornecedores` | `cotacoes` | `/financeiro/fornecedores-cotacoes-070` |
| 71 | Pedidos | `diskFornecedores` | `pedidos` | `/financeiro/fornecedores-pedidos-071` |
| 72 | Recebimentos | `diskFornecedores` | `recebimentos` | `/financeiro/fornecedores-recebimentos-072` |
| 73 | Parcelas | `diskFornecedores` | `parcelas` | `/financeiro/fornecedores-parcelas-073` |
| 74 | Vencimentos | `diskFornecedores` | `vencimentos` | `/financeiro/fornecedores-vencimentos-074` |

**Aceite por função:** abrir com perfil autorizado, buscar dados reais com escopo, estado vazio, ação funcional, validação de backend, trilha de auditoria, teste negativo de segurança e teste de regressão.

## LEDGER FINANCEIRO (5)

| Nº | Tela | ID original | Filtro/ação | Rota nova |
|---:|---|---|---|---|
| 75 | Movimentações | `diskLedger` | `movimentacoes` | `/financeiro/ledger-financeiro-movimentacoes-075` |
| 76 | Lançamentos | `diskLedger` | `lancamentos` | `/financeiro/ledger-financeiro-lancamentos-076` |
| 77 | Ajustes | `diskLedger` | `ajustes` | `/financeiro/ledger-financeiro-ajustes-077` |
| 78 | Reservas | `diskLedger` | `reservas` | `/financeiro/ledger-financeiro-reservas-078` |
| 79 | Rastreabilidade | `diskLedger` | `rastreabilidade` | `/financeiro/ledger-financeiro-rastreabilidade-079` |

**Aceite por função:** abrir com perfil autorizado, buscar dados reais com escopo, estado vazio, ação funcional, validação de backend, trilha de auditoria, teste negativo de segurança e teste de regressão.

## RELATÓRIOS (9)

| Nº | Tela | ID original | Filtro/ação | Rota nova |
|---:|---|---|---|---|
| 80 | Extrato Financeiro | `diskRelatorios_extrato` | `—` | `/financeiro/relatorios-extrato-financeiro-080` |
| 81 | Relatórios por Evento | `diskRelatorios_evento` | `—` | `/financeiro/relatorios-relatorios-por-evento-081` |
| 82 | Relatórios por Produtor | `diskRelatorios_produtor` | `—` | `/financeiro/relatorios-relatorios-por-produtor-082` |
| 83 | Relatório Consolidado | `diskRelatorios_consolidado` | `—` | `/financeiro/relatorios-relatorio-consolidado-083` |
| 84 | Receitas | `diskRelatorios_receitas` | `—` | `/financeiro/relatorios-receitas-084` |
| 85 | Despesas | `diskRelatorios_despesas` | `—` | `/financeiro/relatorios-despesas-085` |
| 86 | Taxas | `diskRelatorios_taxas` | `—` | `/financeiro/relatorios-taxas-086` |
| 87 | Repasses | `diskRelatorios_repasses` | `—` | `/financeiro/relatorios-repasses-087` |
| 88 | Antecipações | `diskRelatorios_antecipacoes` | `—` | `/financeiro/relatorios-antecipacoes-088` |

**Aceite por função:** abrir com perfil autorizado, buscar dados reais com escopo, estado vazio, ação funcional, validação de backend, trilha de auditoria, teste negativo de segurança e teste de regressão.

## ASSINATURAS E INTEGRAÇÕES (6)

| Nº | Tela | ID original | Filtro/ação | Rota nova |
|---:|---|---|---|---|
| 89 | Central de Assinaturas | `diskIntegracao_assinaturas` | `assinaturas` | `/financeiro/assinaturas-e-integracoes-central-de-assinaturas-089` |
| 90 | Documentos | `diskIntegracao_documentos` | `documentos` | `/financeiro/assinaturas-e-integracoes-documentos-090` |
| 91 | Autentique | `diskIntegracao_autentique` | `autentique` | `/financeiro/assinaturas-e-integracoes-autentique-091` |
| 92 | Conta Azul | `diskIntegracao_contaazul` | `contaazul` | `/financeiro/assinaturas-e-integracoes-conta-azul-092` |
| 93 | Sincronizações | `diskIntegracao_sincronizacoes` | `sincronizacoes` | `/financeiro/assinaturas-e-integracoes-sincronizacoes-093` |
| 94 | Logs de Integração | `diskIntegracao_logs` | `logs` | `/financeiro/assinaturas-e-integracoes-logs-de-integracao-094` |

**Aceite por função:** abrir com perfil autorizado, buscar dados reais com escopo, estado vazio, ação funcional, validação de backend, trilha de auditoria, teste negativo de segurança e teste de regressão.

## GOVERNANÇA FINANCEIRA (10)

| Nº | Tela | ID original | Filtro/ação | Rota nova |
|---:|---|---|---|---|
| 95 | Visão Geral | `diskGovernanca_visao` | `visao` | `/financeiro/governanca-financeira-visao-geral-095` |
| 96 | Usuários Financeiros | `diskGovernanca_usuarios` | `usuarios` | `/financeiro/governanca-financeira-usuarios-financeiros-096` |
| 97 | Perfis e Permissões | `diskGovernanca_perfis` | `perfis` | `/financeiro/governanca-financeira-perfis-e-permissoes-097` |
| 98 | Alçadas de Aprovação | `diskGovernanca_alcadas` | `alcadas` | `/financeiro/governanca-financeira-alcadas-de-aprovacao-098` |
| 99 | Fluxos de Aprovação | `diskGovernanca_fluxos` | `fluxos` | `/financeiro/governanca-financeira-fluxos-de-aprovacao-099` |
| 100 | Segregação de Funções | `diskGovernanca_segregacao` | `segregacao` | `/financeiro/governanca-financeira-segregacao-de-funcoes-100` |
| 101 | Operações Sensíveis | `diskGovernanca_sensiveis` | `sensiveis` | `/financeiro/governanca-financeira-operacoes-sensiveis-101` |
| 102 | Bloqueios e Exceções | `diskGovernanca_bloqueios` | `bloqueios` | `/financeiro/governanca-financeira-bloqueios-e-excecoes-102` |
| 103 | Auditoria de Acessos | `diskGovernanca_acessos` | `acessos` | `/financeiro/governanca-financeira-auditoria-de-acessos-103` |
| 104 | Configurações | `diskGovernanca_configuracoes` | `configuracoes` | `/financeiro/governanca-financeira-configuracoes-104` |

**Aceite por função:** abrir com perfil autorizado, buscar dados reais com escopo, estado vazio, ação funcional, validação de backend, trilha de auditoria, teste negativo de segurança e teste de regressão.

