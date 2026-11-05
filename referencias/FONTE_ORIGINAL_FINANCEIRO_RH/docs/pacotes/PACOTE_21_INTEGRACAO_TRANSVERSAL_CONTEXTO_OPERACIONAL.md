# Pacote 21 — Integração Transversal, Contexto Operacional e Comunicação entre Módulos

## Objetivo
Eliminar navegação em ilhas. Uma operação financeira passa a manter protocolo, produtor, evento e identidade ao atravessar Solicitações, Aprovações, Assinaturas, Tesouraria, Ledger e Conciliação.

## Implementado
- contexto operacional global no store;
- seleção automática do Produtor/Evento da operação;
- bloqueio de contexto de outro produtor no ambiente Produtor;
- cabeçalho operacional persistente entre módulos;
- navegação transversal por Solicitação → Aprovação → Assinaturas → Tesouraria → Ledger → Conciliação;
- fechamento explícito do contexto;
- Central de Aprovações abre a operação mantendo o contexto;
- nenhuma nova entrada de menu lateral;
- correções de integridade do Pacote 20 preservadas.

## Regra
As telas não são a fonte da operação. O protocolo/operação é a fonte e cada módulo representa uma etapa ou perspectiva da mesma operação.
