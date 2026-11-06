# Homologação técnica BRAVO_II — Pacotes 08 + 09

## Matriz de estados

| Componente | Entregue em código | Testado offline | Exige PostgreSQL/Preview | Liberação operacional |
|---|---|---|---|---|
| Clientes P08 | Sim | Parcial | Sim | Não |
| Reservas/estoque P08 | Sim | Regras puras | Concorrência real obrigatória | Não |
| Ingressos 8 dígitos | Modelo e regras | Sim | Emissão condicionada a liquidação | Não |
| Checkout/PagBank sandbox | Adaptador, sem webhook | Contrato e política | Token e chamada sandbox | Somente sandbox opcional |
| Checkout Rede | Cadastro/abstração | Regras básicas | Adaptador e credenciais de homologação | Não |
| PDV terminais | Cadastro e tela | Sim | Testes de API autenticada | Cadastro apenas |
| PDV turnos/vendas | Serviço bloqueado | Regras negativas | Certificação de dispositivo e integração | Não |
| Financeiro Disk (104) | Inventário preservado | Integridade | Migrar e validar funções específicas | Não |
| RH/DP (45) | Inventário preservado | Integridade | Migrar e validar funções específicas | Não |

## Critérios de aceite: P08 real

- [ ] PostgreSQL exclusivo, acessível, migrations aplicadas e Prisma gerado.
- [ ] Login/logout e MFA/controles adicionais avaliados; sessão e CSRF/Origin confirmados no navegador.
- [ ] Conta com perfil comercial não acessa Financeiro ou RH; produtor não consegue navegar no backoffice.
- [ ] Cadastro de cliente sem CPF em claro no PostgreSQL.
- [ ] Reservas concorrentes na última unidade de lote não fazem sobrevenda (teste de 20+ chamadas paralelas, cenários idempotentes).
- [ ] Reserva vencida libera estoque UMA vez e nunca afeta pedido liquidado.
- [ ] Número de ingresso 8 dígitos não é gerado quando pagamento não foi comprovado.
- [ ] Event Builder não libera venda sem publicação confirmada.

## Critérios de aceite: P09

- [ ] `prisma validate` e build API/Web sem erros.
- [ ] Nova tentativa exige pedido reservado, válido e com total positivo.
- [ ] Idempotência está assegurada por chave UUID + unicidade da tentativa por pedido em PostgreSQL.
- [ ] Somente perfil interno autorizado prepara tentativa; somente administrador inicia sandbox.
- [ ] Headers com Origin falso e requisições anônimas falham sem expor dados.
- [ ] Terminal é criado como `BLOQUEADO_HOMOLOGACAO` e a ação registra auditoria.
- [ ] Abrir turno ou vender no PDV falha com `ENABLE_PDV_OPERATIONS=false`.
- [ ] Falha de rede na integração sandbox produz `RESULTADO_INDETERMINADO`, sem retry automático ou mudança do pedido para `PAGO`.
- [ ] Consulta de status externo não altera pedido nem emite ingresso.
- [ ] Verificar diferenças de status `AUTHORIZED`, `PAID`, `DECLINED`, `IN_ANALYSIS` por produto PagBank antes de qualquer implementação de webhook.
- [ ] Se Sandbox PagBank estiver ativo, somente credenciais sandbox e endereço fixo `https://sandbox.api.pagseguro.com`.
- [ ] Nenhuma taxa interna Disk é retornada em endpoints de checkout ou produtor.

## Precisam ser resolvidos antes da futura produção

1. Reconciliar condição de pagamento vencido com estoque e eventual captura tardia; impedir perda de receita/ingresso e dupla emissão.
2. Definir provedor e método de **pagamento capturado** e assinatura autêntica por produto (PagBank Checkout/Orders usam modelos e versões distintos); validar corpo bruto, timestamp, replay e idempotência do evento.
3. Implementar worker de outbox/reconciliação e contabilização no Ledger/Financeiro Disk somente depois de captura comprovada, com auditoria; não confundir receita da Disk com obrigação do produtor.
4. Integrar terminais físicos, adquirentes, bandeiras, MDR/parcelas/spread/rebate/advanced aprovados e permissões por usuário/evento.
5. Validar proteções LGPD, registros de auditoria, política de dados, observabilidade, gestão de segredos, recuperação e revisão de segurança.
6. Definir painel e ferramentas de estorno/SAC em projeto próprio com autorização do Financeiro, sem liberação automática.

## Situação da execução feita no ambiente de geração (06/11/2026)

- `tsc` global disponível; compilação dos pacotes TypeScript puros e testes `node --test` executados. Consulte `docs/09-RELATORIO-DE-VALIDACAO.md`.
- `docker`, `psql`, servidor PostgreSQL e dependências Nest/Next/Prisma **não disponíveis** no ambiente de geração. Acesso externo npm falhou por DNS `EAI_AGAIN`.
- Não houve conexão a banco, aplicação de migration, build completo das aplicações nem consulta a credenciais PagBank.
- O script `scripts/check-homologacao-p09.mjs` comprova **apenas** conexão real e presença de tabelas; não confundir sua aprovação futura com homologação E2E.

## Estratégia de rollback

- Manter backup e snapshot do PostgreSQL homologado antes da migration; gerar `prisma migrate diff` e revisar SQL/downtime.
- Não tentar desfazer migration de produção com `db push` ou `migrate reset`.
- Em Preview, desabilitar todas as flags de operação externa, reverter commit do backend/frontend em conjunto e conservar logs da auditoria.
- Nunca importar dados do SIGE por dedução. Exigir exportação autorizada e reconciliação de cadastros se a migração histórica vier a ser possível.
