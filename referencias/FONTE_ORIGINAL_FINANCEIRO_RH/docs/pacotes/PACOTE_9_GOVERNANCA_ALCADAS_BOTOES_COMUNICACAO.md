# Pacote 9 — Governança, Alçadas e Comunicação entre Telas

## Objetivo
Adicionar ao ambiente Financeiro Disk a camada de governança financeira e iniciar a padronização de ações navegáveis entre módulos.

## Entregas
- Menu Governança Financeira com 9 subáreas.
- Matriz de alçadas por operação/faixa.
- Segregação de funções: Criador → Analisador → Aprovador → Assinante → Executor → Conciliador.
- Operações sensíveis e exceções.
- Auditoria de acessos.
- Botões da Governança conectados a Central de Aprovações, Auditoria e Logs de Integração.
- Ações de regra centralizadas em `financeAction`, preparando comunicação entre telas.

## Regra de arquitetura para botões
Nenhum botão operacional deve existir apenas como elemento visual. Cada botão deve executar uma destas ações: navegar, abrir detalhe/modal, persistir alteração, disparar workflow ou consultar integração. A ação deve atualizar o estado e refletir a mudança nos módulos relacionados.

## Próxima consolidação
Aplicar o mesmo contrato de ação aos botões legados dos Pacotes 1–8, substituindo botões demonstrativos/sem handler por ações reais do Core/API à medida que os endpoints forem homologados.
