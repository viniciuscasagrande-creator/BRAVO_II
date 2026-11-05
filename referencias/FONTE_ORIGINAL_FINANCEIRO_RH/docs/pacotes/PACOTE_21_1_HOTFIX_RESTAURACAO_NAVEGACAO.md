# Pacote 21.1 — Hotfix de restauração da navegação

Correção de regressão introduzida no Pacote 21.

## Decisão
A camada de contexto operacional transversal adicionada no Pacote 21 foi retirada do runtime e a base funcional do Pacote 20 foi restaurada integralmente nos arquivos críticos (`app.js`, `state.js`, `aprovacoes.js` e `limitless.css`).

Nenhuma regra de integridade financeira do Pacote 20 foi removida.

## Critério
O contexto transversal será reintroduzido somente de forma incremental, após teste de abertura/navegação de cada grupo de menus. Este hotfix prioriza restaurar a aplicação antes de adicionar infraestrutura nova.
