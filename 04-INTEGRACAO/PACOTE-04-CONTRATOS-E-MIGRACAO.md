# Pacote 04 — Integração Financeiro ↔ RH, Contratos e Conciliação

Este pacote completa o planejamento de integração dos módulos sem afirmar que há pagamento ou transmissão real. Contém um exemplo executável e testado em `contracts/bridge-rh-financeiro.mjs` que **não conversa com banco nem persiste dados**, exclusivamente para estabelecer e testar invariantes.

## Eventos de domínio versionados

`rh.pagamento_aprovado.v1` (RH→Financeiro):
```json
{
  "eventType":"rh.pagamento_aprovado.v1",
  "aggregateId":"<rh_batch_id>",
  "empresaId":"<empresa_id>",
  "competencia":"2026-11",
  "tipo":"FOLHA|EQUIPE_EVENTO|REEMBOLSO_RH",
  "eventoId":"<opcional somente equipe>",
  "centroCustoId":"<centro_id>",
  "totalCentavos":12345,
  "idempotencyKey":"rh.pagamento:<empresa_id>:<rh_batch_id>",
  "aprovadoPor":"<id_usuario_RH>",
  "occurredAt":"<ISO_8601>"
}
```

Campos individuais como CPF, CID, conta pessoal, descrição de atestado, salário e endereço **não são permitidos no evento**.

**Ciclo:** RH apura → RH aprova → evento na outbox → Financeiro aprova → Tesouraria instrui → gateway/banco confirma → conciliação → RH consulta resumo de status. A aprovação RH precisa estar gravada na origem e correlacionada por `loteRHId` antes da emissão do evento; o exemplo executável começa após essa validação.

## DDL PostgreSQL

Em produção, use migrations no banco real e tabelas próprias: `rh_colaboradores`, `rh_folha_lotes`, `rh_folha_itens`, `rh_staff_custos`, `finance_treasury_requests`, `finance_approvals`, `audit_events`, `outbox_events`, `event_fee_agreements`, `ledger_entries` etc. Referências eventuais sempre por IDs estáveis; retenção e cifragem de dados pessoais devem ser aprovadas antes do primeiro cadastro.

## Requisitos de implementação

- Transação atômica na gravação de lote aprovado + evento de outbox.
- Consumidor de outbox com deduplicação por `(empresaId,loteRHId,tipo)`.
- Versão do contrato de dados e tratamento de eventos fora de ordem.
- Alçada financeira e SoD (aprovador diferente de solicitante; para pagamentos de maior risco, dupla alçada adicional).
- Montante em **centavos inteiros/Decimal**, nunca float para contabilização.
- Estado `LIQUIDADO` exclusivamente por retorno bancário confirmado e conciliado; reversão por lançamento compensatório.
- Centro de custo corporativo para folha e centro de custo/evento para staff; proibir atribuição automática do salário da empresa à receita do ingresso.
- Regras de acesso minimizadas: financeiro enxerga lote e total, RH controla detalhes de folha e dados médicos.

## Validação do contrato de referência

```bash
node --test 04-INTEGRACAO/tests/bridge-rh-financeiro.test.mjs
```

Os testes não autorizam uso produtivo. Devem ser portados para a API transacional NestJS/PostgreSQL, com testes de concorrência, falha de rede, retentativa e confirmação real em ambiente sandbox.
