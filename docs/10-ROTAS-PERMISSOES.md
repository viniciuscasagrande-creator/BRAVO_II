# P10 — Matriz de rotas e permissões

Todas as rotas exigem login e, em POST, token CSRF e Origin permitido pelo Core.

| Endpoint | Método | Perfil | Resultado |
|---|---|---|---|
| `/v1/sac/indicadores` | GET | SAC, Operações, Admin, Auditor, Financeiro | Indicadores consultados no PostgreSQL |
| `/v1/sac/chamados` | GET/POST | Leitura SAC/Operações/Admin/Auditor/Financeiro; escrita SAC/Operações/Admin | Listagem/abertura |
| `/v1/sac/chamados/:id` | GET | leitura SAC | Ficha e histórico |
| `/v1/sac/chamados/:id/interacoes` | POST | SAC, Operações, Admin | Interação, primeira resposta |
| `/v1/sac/chamados/:id/status` | POST | SAC, Operações, Admin | Mudança de status válida |
| `/v1/sac/chamados/:id/atribuir` | POST | Operações, Admin | Atribuição e equipe |
| `/v1/sac/chamados/:id/incidente` | POST | SAC, Operações, Admin | ITIL, incidente |
| `/v1/sac/chamados/:id/csat` | POST | SAC, Operações, Admin | Pesquisa registrada internamente |
| `/v1/sac/politicas-sla` | GET/POST | Leitura SAC; escrita apenas Admin | Políticas versionadas |
| `/v1/sac/equipes`, `/v1/sac/filas` | GET/POST | Leitura SAC; escrita Operações/Admin | Equipes e filas |
| `/v1/sac/conhecimento` | GET/POST | Leitura SAC; escrita SAC/Operações/Admin | Conhecimento interno |
| `/v1/pos-venda/trocas` | GET/POST | SAC, Operações, Admin (Auditor: consulta) | Solicitar troca |
| `/v1/pos-venda/trocas/:id/analisar` | POST | Operações/Admin | Revisão independente |
| `/v1/pos-venda/trocas/:id/qualificar` | POST | Operações/Admin | Diferença de preço |
| `/v1/pos-venda/trocas/:id/executar` | POST | Operações, fail-closed | Operação sempre bloqueada sem portaria/inventário |
| `/v1/pos-venda/cancelamentos` | GET/POST | SAC/Operações/Admin; auditor consulta | Solicitação de cancelamento |
| `/v1/pos-venda/cancelamentos/:id/analisar` | POST | Operações/Admin | Revisão |
| `/v1/pos-venda/eventos/:eventId/lotes-estorno/:caseId/planejar` | POST | Financeiro Disk | Projeção, **sem executar** |
| `/v1/estornos` | GET/POST | Leitura Financeiro/Auditor/Admin; SAC só suas solicitações; escrita SAC/Operações/Financeiro | Solicitações |
| `/v1/estornos/:id/analisar`, `/aprovar`, `/reprovar` | POST | **Financeiro Disk somente** | Alçada financeira individual |
| `/v1/estornos/impacto` | GET | Financeiro/Auditor/Admin | Valores estimados |

**Proibido** adicionar controlador público de captura, conclusão financeira ou webhook de estorno sem conector assinado, idempotência, validação de evento, segregação e testes de conciliação.

- `/v1/sac/incidentes` e `/v1/sac/problemas`: consulta; atualização de status com alçada Operações/Admin.
