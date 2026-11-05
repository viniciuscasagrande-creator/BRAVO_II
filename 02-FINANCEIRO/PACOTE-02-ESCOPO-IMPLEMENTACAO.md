# Pacote 02 — Incorporação integral do Financeiro Disk (104 funções)

Este pacote não aceita substituição das 104 funções por dashboards genéricos. Usar `MAPA-104-FUNCOES.md` e registrar implementação/validação em cada uma das 104 linhas.

## Arquivos de referência prioritários

- Menu e rotas: `js/menuConfig.js`, `js/app.js`.
- Telas financeiras: `js/views/disk/*`, `js/views/estornos.js`, `js/views/repasses.js`, `js/views/antecipacoes.js`, `js/views/bordero.js`.
- Frontend tipado: `frontend/src/financeiro/`, `frontend/src/services/`, `frontend/src/auth/`.
- Backend demonstrativo: `backend/src/`, `backend/src/workflow/workflow.engine.ts`.
- Schemas finance: `database/schema.prisma`, `prisma/schema.prisma`; testes `tests/`.
- Históricos de requisitos: `docs/V0.6.1_TAXAS_MDR_SPREAD_REGRAS_COMERCIAIS.md`, `docs/pacotes/PACOTE_13_FUNCOES_FINANCEIRAS_AVANCADAS.md`, `docs/pacotes/PACOTE_19_CONSOLIDACAO_TAXAS_TESOURARIA_CONCILIACAO.md`, `docs/REGRAS_DE_REPASSE.md`.

## Módulos de migração

| Domínio BRAVO_II | Conteúdo obrigatório | Contrato de entrada/saída | Invariantes |
|---|---|---|---|
| `finance.overview` | Dashboards, posição geral, indicadores, inteligência | read model da contabilidade/ledger | Sem calcular saldos em browser |
| `finance.organizations` | Produtores, eventos, conta financeira, saldos | IDs canônicos Comercial/Eventos | Sem editar contrato comercial a partir de tela de saldo |
| `finance.workflow` | Solicitações, aprovações, repasses, política, antecipações, divisão, transferências, assinaturas | máquina de estados com transações | SoD, alçadas, assinatura Produtor → Disk |
| `finance.receivables` | Contas a receber, agendas e liquidações | transações de pagamento e recebível | Não confundir venda com valor recebido |
| `finance.acquiring` | Gateways, adquirentes, bandeiras, MDR, parcelamento, meios de pagamento, regras | versionamento por vigência e evento | Taxa Disk por evento; segredo de gateway em cofre |
| `finance.pricing` | Custos, spread, rebate, advanced, simulações e regras comerciais | contrato do evento + MDR + rateios | Rebate condicional e auditado; valor previsto separado do realizado |
| `finance.treasury` | Contas, PIX, CNAB, contas pagar, pagamentos em lote e agenda | instrução → aprovação → transmissão → retorno | Sem integração bancária real até homologação formal |
| `finance.reconciliation` | Banco, gateways, adquirentes, repasses, recebíveis e divergências | 4 vias: pedido × gateway × ledger × banco | Reconciliação idempotente, diferença nunca ignorada |
| `finance.refunds` | Central de Estornos, chargebacks, impacto financeiro | SAC/eventos → análise → dupla aprovação → gateway | Só `CONCLUIDO` com confirmação externa |
| `finance.closing` | Fechamentos, borderôs, dossiês | snapshots assináveis e versionados | Reabertura rastreada, sem edição silenciosa |
| `finance.controllership` | Fluxo de caixa, projeções, DRE, rentabilidade, custos, orçamentos | ledger + centros de custo | Separar contabilmente Disk × obrigações produtor |
| `finance.suppliers` | Cadastro, contrato, documento, cotação, pedido, recebimento, parcelas, vencimentos | compras/fornecedores | Alçada e documentos de suporte |
| `finance.ledger` | Movimentações, lançamentos, ajustes, reservas, rastreabilidade | partidas consistentes e trilha | Lançamento nunca apaga: estorna por contrapartida |
| `finance.reports` | 9 perspectivas de relatórios | leitura autorizada e exportação | Sigilo de Taxa Disk e dados bancários |
| `finance.integrations` | Assinaturas, documentos, Autentique, Conta Azul, sincronizações e logs | adaptadores externos isolados | Verificar disponibilidade real e webhooks assinados |
| `finance.governance` | Usuários, perfis, alçadas, SoD, bloqueios, acessos, configuração | IAM + logs append-only | Nenhum admin dispensa dupla autorização em sua própria operação |

## Normas funcionais adicionais

- **Taxa Disk**: modelo `EventFeeAgreement`, tipo `PERCENTUAL` ou `VALOR_FIXO`, valor, vigência, aprovador, produtorId e eventoId; histórico imutável. Proibir campo `Produtor.taxaDiskPercent` como única fonte.
- **Taxas de cartão**: diferenciar MDR cobrado pela adquirente, taxa cobrada ao consumidor, taxa assumida pela Disk/produtor, juros de parcelamento e spread/rebate. Eventos e canais podem possuir condições próprias.
- **Repasses**: aplicar política por evento e elegibilidade, reservas/obrigações e aprovações; preservação de política e histórico, não apenas números visuais.
- **Chargeback/estorno**: ordem de compra, ingresso, sessão, recebível, lançamento contábil e reserva são correlacionados por IDs e eventos de domínio.
- **Tesouraria RH**: receber apenas lotes homologados do RH, não documentos médicos ou CPFs no dashboard financeiro.
- **Financeiro Advanced**: projeções e risco devem exibir fonte de cada indicador, data de atualização, hipótese e versão do cálculo.
- **Financeiro do produtor**: vem do mesmo Core, mas com escopo restrito. O Portal PDT atual não deve ser substituído por esse módulo automaticamente.

## Lacunas técnicas encontradas no backup

1. `backend/src/auth/auth.middleware.ts`: tokens demonstrativos fixos; inadmissível em produção.
2. `backend/src/app.ts`: solicitações persistidas em `Map`; reinício perde os dados.
3. `js/state.js`: dados do fluxo de demonstração guardados em `localStorage`.
4. `js/mockData.js`: sementes e posições financeiras simuladas; não migrar como transações reais.
5. `prisma/schema.prisma`: campo `Produtor.taxaDiskPercent @default(10.0)` conflita com a regra oficial de taxa por evento.
6. Três schemas (`prisma`, `database`, `RH_DISK_V1/prisma`): fragmentação de identidades e entidades.
7. Não foi possível comprovar conexões produtivas com bancos, adquirentes ou eSocial apenas pelo backup.

## Validação obrigatória

- Tabela 104/104 com estado individual, responsável e teste. Comparar ID de menu com tela e regra.
- Build + testes de API + testes ponta-a-ponta por perfil, inclusive tentativas indevidas 401/403.
- Testes de cálculo por evento, reserva para estorno, retenção, antecipação, parcelamento, remessa e conciliação.
- Nenhum movimento bancário em homologação. Para ativar transmissão real, criar controle explícito de ativação, credenciais seguras e testes de retorno.
