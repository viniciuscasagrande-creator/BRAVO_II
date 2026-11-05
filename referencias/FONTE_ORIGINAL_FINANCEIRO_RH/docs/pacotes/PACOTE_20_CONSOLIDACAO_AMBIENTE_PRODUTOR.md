# Pacote 20 — Consolidação Operacional do Ambiente Produtor

## Objetivo
Elevar o **Ambiente do Produtor** ao mesmo nível de maturidade operacional e fidelidade contábil alcançado no Financeiro Disk, fechando o circuito financeiro de ponta a ponta sem criar novos menus laterais e respeitando rigorosamente a segregação de informações (o Produtor nunca visualiza MDR interno, custos de adquirentes ou dados de outros produtores).

---

## 1. Eliminação de CTAs Redundantes
- Mantido um único CTA principal no cabeçalho: `Solicitar Repasse de Saldo`.
- Botões dentro do conteúdo tornaram-se estritamente contextuais (ex: `Solicitar repasse deste evento`, vinculando automaticamente o ID do evento selecionado).

---

## 2. Transferência Segregada entre Eventos (Regra Endurecida)
Movimentação de caixa entre produções do mesmo produtor com trava estrita de valor transferível:

```text
Saldo financeiro (bruto)      R$ 200.000,00
(-) Retido                     R$  30.000,00
(-) Reservado para repasses    R$  50.000,00
(-) Bloqueios cautelares       R$  10.000,00
────────────────────────────────────────────
Saldo Elegível Transferível    R$ 110.000,00
```

- Tentativas de transferir valor superior ao transferível são bloqueadas pela regra de negócio.
- A transferência gera duas partidas dobradas vinculadas no Ledger com protocolo único (`TRF-2026-XXXX`):
  - **Evento Origem:** Débito de R$ 50.000,00
  - **Evento Destino:** Crédito de R$ 50.000,00
- Preserva a conciliação individual de cada borderô e o saldo consolidado da produtora.

---

## 3. Composição do Saldo ("De onde veio meu saldo?")
Substituição da linguagem técnica de "Conciliação" por **Composição do Saldo**, respondendo à pergunta essencial do produtor. Fórmula canônica apurada:

```text
Vendas brutas                 R$ 1.000.000,00
(-) Estornos                     R$   20.000,00
(-) Chargebacks                  R$    5.000,00
(-) Taxas contratuais Disk       R$   60.000,00
──────────────────────────────────────────────
Receita líquida               R$   915.000,00

(-) Repasses já realizados       R$  400.000,00
(-) Reservas de repasse          R$   80.000,00
(-) Retenções ativas             R$   35.000,00
──────────────────────────────────────────────
Saldo disponível para repasse    R$  400.000,00
```

- Cada linha da tabela é interativa e permite detalhamento instantâneo (drill-down).

---

## 4. Retenções Detalhadas (Drill-Down Transparente)
Substituição de números opacos por abertura detalhada das garantias e bloqueios:

| Categoria | Origem / Ref | Motivo | Data | Previsão / Condição de Liberação | Valor | Situação |
|---|---|---|---|---|---|---|
| **Reserva operacional** | `Vendas Cartão Lote 2` | Garantia pós-evento para despesas e contingências | 15/09/2026 | D+30 após encerramento do evento (15/12/2026) | R$ 20.000,00 | Ativa |
| **Chargeback** | `Disputa #CB-9941` | Contestação em análise pela adquirente Cielo | 22/09/2026 | Após deferimento da disputa pela adquirente | R$ 10.000,00 | Sob Análise |
| **Estornos pendentes** | `Protocolo #EST-0089` | Cancelamentos em fase de processamento bancário | 25/09/2026 | Após débito e liquidação no extrato do gateway | R$ 5.000,00 | Processando |
| **Regra contratual** | `Contrato Cláusula 8.2` | Retenção cautelar de 5% sobre faturamento bruto | 01/09/2026 | Assinatura do Termo de Encerramento e Borderô | R$ 10.000,00 | Ativa |
| **Total Retido** | — | — | — | — | **R$ 45.000,00** | — |

---

## 5. Timeline Completa do Repasse (8 Etapas Estritas)
Rastreamento sequencial em tempo real para eliminar dúvidas sobre o andamento do repasse:

```text
REP-2026-00128
✓ 1. Solicitado pelo Produtor (30/09 09:32)
✓ 2. Recebido pelo Financeiro Disk (30/09 09:32)
● 3. Em análise (Responsável: Karine - Adm Financeiro)
○ 4. Aprovação de Alçada
○ 5. Assinatura Digital do Produtor
○ 6. Assinatura Final Financeiro Disk (Último)
○ 7. Programação de Tesouraria (Lote CNAB)
○ 8. Pagamento & Conciliação
```

---

## 6. Dados Bancários & PIX com Versionamento e Compliance
- Alterações de conta bancária geram nova versão (`v2`, `v3`...), com status **Pendente de validação**.
- A conta anterior **permanece ativa** para recebimento de repasses enquanto o Financeiro Disk não homologa o comprovante anexado.
- Exclusão de contas com histórico contábil é bloqueada; contas antigas são preservadas para comprovação de depósitos passados.
