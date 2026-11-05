# Módulo Financeiro V1 — Pacote 11
## Varredura Funcional, Botões e Comunicação entre Telas

### Objetivo
Consolidar os Pacotes 1–10 como um sistema navegável. Botões operacionais deixam de ser elementos isolados e passam a encaminhar ações para o módulo responsável, preservando o contexto Financeiro Disk / Produtor e o protocolo da operação.

### Regra estrutural preservada
- Ambiente Produtor e Ambiente Financeiro Disk permanecem separados.
- O Financeiro Disk pode filtrar Produtor e Evento sem assumir o perfil do Produtor.
- Operações compartilhadas usam o mesmo Core Financeiro, workflow, Ledger e auditoria.

### Barramento funcional de ações
Foi criado um registro central de ações (`integratedAction`) no controlador principal. Ele padroniza: ação → feedback → módulo de destino → atualização da tela.

Ações cobertas nesta rodada incluem cadastro/gestão de adquirentes, CNAB, conta bancária padrão, relatórios e atalhos para Aprovações, Assinaturas, Tesouraria, Conciliação, Ledger, Autentique e Conta Azul.

### Comunicação transversal esperada
Produtor → Solicitação → Financeiro Disk → Aprovação → Autentique → Tesouraria → Banco/PIX/CNAB → Conciliação → Ledger → Conta Azul → Auditoria.

### Regra para produção
A navegação e o workflow estão preparados no frontend demonstrativo. Persistência, transmissão bancária, Autentique e Conta Azul só devem ser marcados como concluídos após confirmação das APIs reais. Falha de integração nunca deve ser convertida silenciosamente em sucesso.

### Critério dos próximos ajustes
Todo botão operacional deve se enquadrar em pelo menos um comportamento: navegar, abrir detalhe/modal, alterar workflow, executar operação, consultar integração ou exportar informação. Botão sem ação deve ser removido ou explicitamente marcado como indisponível.
