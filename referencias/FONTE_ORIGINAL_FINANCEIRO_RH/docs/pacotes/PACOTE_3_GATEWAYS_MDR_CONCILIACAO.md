# Módulo Financeiro V1 — Pacote 3

## Gateways, Adquirentes, Bandeiras, MDR, Parcelamento, Regras Comerciais e Conciliação

Este pacote amplia exclusivamente o ambiente **Financeiro Disk**. O ambiente Produtor permanece separado e não recebe acesso aos custos internos de adquirência/MDR da Disk.

### Cadeia funcional
Adquirente → Bandeira → Parcelamento → MDR Disk → Regra Comercial → Produtor/Cliente → Spread/Margem → Recebível → Liquidação → Banco → Conciliação → Ledger.

### Implementado na interface
- Central ampliada de Gateways e Adquirentes.
- Visão de volume e situação operacional.
- Matriz de bandeiras e MDR por modalidade/parcelamento.
- Separação explícita entre custo MDR e regra comercial.
- Modelos de absorção de taxa: Produtor, Cliente, Compartilhada e Customizada.
- Fluxo de liquidação e atalhos para Recebíveis, Conciliação e Ledger.
- Controles de governança do Pacote 3.

### Regras obrigatórias para produção
- MDR contratado é informação interna do Financeiro Disk.
- Taxa comercial nunca sobrescreve o custo MDR original.
- Toda alteração de taxa deve possuir vigência, usuário e auditoria.
- Liquidação precisa ser conciliada com recebível, movimento bancário e Ledger.
- Estorno e chargeback preservam a transação original.
- Dados demonstrativos devem ser substituídos por persistência/API antes do go-live.
