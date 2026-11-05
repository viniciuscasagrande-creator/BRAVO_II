# Pacote 22 — Ligação Incremental entre Módulos

Base oficial: `Modulo_Financeiro_V1_BACKUP_TOTAL_20260930_1752.zip`.

## Escopo aplicado

Este pacote não cria menus e não substitui views existentes. A ligação transversal foi reintroduzida de forma incremental no circuito de operações financeiras.

### Implementado

- `focusOperation(requestId, targetView)` preserva protocolo, produtor e evento ao atravessar módulos.
- `setOperationalContext(...)` atualiza Produtor + Evento + View em uma única notificação do store, evitando renders intermediários.
- Central de Solicitações passa a abrir a Central de Aprovações mantendo o contexto da operação.
- Ficha de Aprovação ganhou atalhos contextuais para Aprovação, Assinaturas, Tesouraria, Ledger e Conciliação.
- Central de Assinaturas deixou de usar linhas fixas de demonstração na esteira principal e passou a derivar os registros de `approvalQueue`.
- Operação em foco pode ser limpa explicitamente sem alterar a operação financeira.
- Nenhuma regra financeira do backup-base foi removida.

## Validação executada

- 14/14 testes de integridade financeira aprovados.
- 39/39 testes de renderização de views aprovados.
- `npm run build` executado com sucesso.
- Verificação de sintaxe nos arquivos alterados aprovada.

## Limite deliberado desta entrega

Não foi reintroduzida a antiga camada transversal ampla dos Pacotes 21/21.1/21.2. O avanço foi propositalmente incremental para preservar a estabilidade do backup oficial.
