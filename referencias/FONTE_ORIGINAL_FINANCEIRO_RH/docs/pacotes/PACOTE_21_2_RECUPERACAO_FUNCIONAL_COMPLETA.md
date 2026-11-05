# Pacote 21.2 — Recuperação Funcional Completa

## Objetivo
Restaurar a renderização das telas do Portal do Produtor e do Financeiro Disk após a regressão observada nos Pacotes 21/21.1, sem criar novos menus ou funcionalidades.

## Causa tratada
O protótipo reutilizava a mesma chave de `localStorage` de pacotes anteriores. Estados persistidos com estruturas antigas podiam não conter campos exigidos pelas views atuais; uma exceção durante o `render()` interrompia a montagem do conteúdo principal e deixava cabeçalho/menu visíveis com a área central vazia.

## Correções aplicadas
- Nova versão isolada do armazenamento da demonstração (`disk-financeiro-v1-p21-2`), impedindo que estado incompatível de versões antigas quebre a renderização.
- Proteção no renderizador central: uma falha de uma view não derruba toda a navegação e oferece restauração explícita dos dados de demonstração.
- Cache-busting do CSS e JavaScript no `index.html` (`v=21.2`) para evitar carregamento de assets antigos após deploy.
- Espaço inferior reservado para a barra de Modo Demonstração, evitando sobreposição de tabelas e ações.
- `dist/` regenerado a partir da fonte corrigida.

## Validação executada
- Renderização programática das 11 views do Produtor com banco fresco: todas retornaram HTML não vazio.
- Renderização programática de 26 áreas/variações do Financeiro Disk: todas retornaram HTML não vazio.
- `node --check` em `app.js`, `state.js` e build final.
- 6/6 testes de integridade financeira aprovados.

## Observação
O Pacote 21.2 é uma recuperação funcional. A camada transversal experimental do Pacote 21 continua fora do runtime até ser reintroduzida incrementalmente e validada fluxo a fluxo.
