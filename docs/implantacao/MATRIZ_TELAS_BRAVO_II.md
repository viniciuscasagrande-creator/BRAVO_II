# Matriz de Telas Funcionais — BRAVO_II (53 Telas Obrigatórias)

> **Referência normativa:** `docs/arquitetura/BRAVO_II_PACOTE_CORRECAO_TELAS_FUNCIONAIS.md`  
> **Escopo:** Inventário real e rastreabilidade de implementação das 53 telas funcionais obrigatórias no `apps/backoffice` e `apps/api`.

---

## Resumo do Diagnóstico Inicial (Pré-Correção de Rotas Dedicadas)

- **Total da Matriz Obrigatória:** 53 telas funcionais distintas.
- **Modelos Prisma verificados no schema único (`prisma/schema.prisma`):** 55 modelos.
- **Tabelas base verificadas no PostgreSQL Neon (`bravo_ii_hml`):** 78 tabelas (77 de domínio + `schema_migrations`).
- **Situação prévia identificada:** Muitas capacidades estavam concentradas em páginas monolíticas (`/eventos`, `/pedidos-vendas`, `/comercial`, `/ingressos-portaria`, `/sac`, `/administracao`, `/financeiro/operacoes/[...slug]`) sem rotas dedicadas individuais ou com filtros/ações parciais nas listagens.

---

## A. COMERCIAL E PRODUTORES (7 Telas)

| ID | Tela / Rota Sugerida | Estado Inicial Auditado | Rota Real no Repositório | Arquivo de Página (`apps/backoffice/src/app`) | Serviço / API Conectada |
|---|---|---|---|---|---|
| `COM-01` | Produtores `/comercial/produtores` | `existente incompleta` → **CONCLUÍDA (Lote A)** | `/comercial/produtores` | `comercial/produtores/page.tsx` | `GET /v1/comercial/produtores` |
| `COM-02` | Novo/Editar Produtor `/comercial/produtores/novo` | `existente funcional` → **CONCLUÍDA (Lote A)** | `/comercial/produtores/novo` | `comercial/produtores/novo/page.tsx` | `POST /v1/comercial/produtores` |
| `COM-03` | Detalhe do Produtor `/comercial/produtores/:id` | `existente funcional` → **CONCLUÍDA (Lote A)** | `/comercial/produtores/[id]` | `comercial/produtores/[id]/page.tsx` | `GET /v1/comercial/produtores/:id`, `POST .../contratos`, `POST .../contatos` |
| `COM-04` | Aprovação de Produtores `/comercial/aprovacoes` | `inexistente` (rota dedicada) → **CONCLUÍDA (Lote A)** | `/comercial/aprovacoes` | `comercial/aprovacoes/page.tsx` | `GET /v1/comercial/produtores`, `POST /v1/comercial/produtores/:id/revisao-cadastral` |
| `COM-05` | Negociações e Planos `/comercial/negociacoes` | `existente incompleta` (`/comercial?aba=taxas`) → **CONCLUÍDA (Lote A)** | `/comercial/negociacoes` | `comercial/negociacoes/page.tsx` | `GET /v1/eventos`, `POST /v1/eventos/:id/taxa-disk` |
| `COM-06` | Contratos `/comercial/contratos` | `existente incompleta` (`/comercial?aba=contratos`) → **CONCLUÍDA (Lote A)** | `/comercial/contratos` | `comercial/contratos/page.tsx` | `GET /v1/comercial/produtores`, `POST /v1/comercial/produtores/:id/contratos` |
| `COM-07` | Contas e Beneficiários `/comercial/beneficiarios` | `inexistente` (rota dedicada) → **CONCLUÍDA (Lote A)** | `/comercial/beneficiarios` | `comercial/beneficiarios/page.tsx` | `GET /v1/comercial/produtores`, `GET /v1/financeiro-video/screen/produtores/contas-bancarias` |

---

## B. EVENTOS, SESSÕES, LOTES E INGRESSOS (10 Telas)

| ID | Tela / Rota Sugerida | Estado Inicial Auditado | Rota Real no Repositório | Arquivo de Página (`apps/backoffice/src/app`) | Serviço / API Conectada |
|---|---|---|---|---|---|
| `EVT-01` | Eventos `/eventos` | `existente funcional` → **CONCLUÍDA (Lote A)** | `/eventos` | `eventos/page.tsx` | `GET /v1/eventos`, `POST /v1/eventos` |
| `EVT-02` | Criar/Editar Evento `/eventos/novo` | `existente funcional` → **CONCLUÍDA (Lote A)** | `/eventos/novo` | `eventos/novo/page.tsx` | `POST /v1/eventos`, `GET /v1/comercial/produtores` |
| `EVT-03` | Detalhe do Evento `/eventos/:id` | `existente funcional` → **CONCLUÍDA (Lote A)** | `/eventos/[id]` | `eventos/[id]/page.tsx` | `GET /v1/eventos/:id`, `GET /v1/eventos/:id/disponibilidade` |
| `EVT-04` | Sessões `/eventos/:id/sessoes` | `inexistente` (rota dedicada) → **CONCLUÍDA (Lote B)** | `/eventos/[id]/sessoes` | `eventos/[id]/sessoes/page.tsx` | `GET /v1/eventos/:id`, `POST /v1/eventos/:id/sessoes` |
| `EVT-05` | Lotes `/eventos/:id/lotes` | `inexistente` (rota dedicada) → **CONCLUÍDA (Lote B)** | `/eventos/[id]/lotes` | `eventos/[id]/lotes/page.tsx` | `GET /v1/eventos/:id`, `POST /v1/eventos/:id/lotes`, `POST /v1/eventos/:id/lotes/processar-virada` |
| `EVT-06` | Categorias e Preços `/eventos/:id/ingressos` | `inexistente` (rota dedicada) → **CONCLUÍDA (Lote B)** | `/eventos/[id]/ingressos` | `eventos/[id]/ingressos/page.tsx` | `GET /v1/eventos/:id`, `POST /v1/eventos/:id/lotes` |
| `EVT-07` | Cupons `/eventos/:id/cupons` | `inexistente` (rota dedicada) → **CONCLUÍDA (Lote B)** | `/eventos/[id]/cupons` | `eventos/[id]/cupons/page.tsx` | `GET /v1/coupons`, `POST /v1/coupons`, `GET /v1/pedidos/cupons/validar` |
| `EVT-08` | Cortesias `/eventos/:id/cortesias` | `inexistente` (rota dedicada) → **CONCLUÍDA (Lote B)** | `/eventos/[id]/cortesias` | `eventos/[id]/cortesias/page.tsx` | `GET /v1/complimentary-quotas`, `POST /v1/complimentary-quotas/:id/issue` |
| `EVT-09` | Aprovações de Evento `/eventos/:id/aprovacoes` | `inexistente` (rota dedicada) → **CONCLUÍDA (Lote B)** | `/eventos/[id]/aprovacoes` | `eventos/[id]/aprovacoes/page.tsx` | `GET /v1/eventos/:id`, `POST /v1/eventos/:id/aprovacoes`, `POST /v1/eventos/:id/publicar` |
| `EVT-10` | Locais `/eventos/locais` | `inexistente` (rota dedicada) → **CONCLUÍDA (Lote B)** | `/eventos/locais` | `eventos/locais/page.tsx` | `GET /v1/venues`, `POST /v1/venues` |

---

## C. MAPAS, ASSENTOS E RESERVAS (4 Telas)

| ID | Tela / Rota Sugerida | Estado Inicial Auditado | Rota Real no Repositório | Arquivo de Página (`apps/backoffice/src/app`) | Serviço / API Conectada |
|---|---|---|---|---|---|
| `MAP-01` | Construtor de Mapas `/mapas` | `inexistente` (rota dedicada) → **CONCLUÍDA (Lote C)** | `/mapas` | `mapas/page.tsx` | `GET /v1/eventos`, `POST /v1/eventos/:id/areas`, `POST .../filas`, `POST .../duplicar`, `POST .../excluir` |
| `MAP-02` | Mapa do Evento `/eventos/:id/mapa` | `inexistente` (rota dedicada) → **CONCLUÍDA (Lote C)** | `/eventos/[id]/mapa` | `eventos/[id]/mapa/page.tsx` | `GET /v1/eventos/:id`, `GET /v1/pedidos/eventos/:eventId/setores/:sectorId/poltronas` |
| `MAP-03` | Reservas de Assentos `/eventos/:id/reservas` | `inexistente` (rota dedicada) → **CONCLUÍDA (Lote C)** | `/eventos/[id]/reservas` | `eventos/[id]/reservas/page.tsx` | `GET /v1/pedidos`, `POST /v1/pedidos/:id/cancelar-reserva`, `POST /v1/pedidos/reservas/expiradas/processar` |
| `MAP-04` | Diagnóstico de Assentos `/relatorios/assentos` | `inexistente` (rota dedicada) → **CONCLUÍDA (Lote C)** | `/relatorios/assentos` | `relatorios/assentos/page.tsx` | `GET /v1/eventos/:id/disponibilidade`, `GET /v1/pedidos/eventos/:eventId/setores/:sectorId/poltronas` |

---

## D. PEDIDOS, VENDAS, CHECKOUT E PAGAMENTOS (8 Telas)

| ID | Tela / Rota Sugerida | Estado Inicial Auditado | Rota Real no Repositório | Arquivo de Página (`apps/backoffice/src/app`) | Serviço / API Conectada |
|---|---|---|---|---|---|
| `PED-01` | Pedidos `/pedidos` | `existente incompleta` → **CONCLUÍDA (Lote A)** | `/pedidos` | `(erp)/pedidos/page.tsx` | `GET /v1/pedidos`, `POST /v1/pedidos/:id/cancelar-reserva` |
| `PED-02` | Detalhe do Pedido `/pedidos/:id` | `inexistente` → **CONCLUÍDA (Lote A)** | `/pedidos/[id]` | `(erp)/pedidos/[id]/page.tsx` | `GET /v1/pedidos/:id`, `POST /v1/pedidos/:id/cancelar-reserva`, `GET /v1/checkout/pedidos/:orderId/tentativas` |
| `PED-03` | Criar Pedido Administrativo `/pedidos/novo` | `inexistente` (rota dedicada) → **CONCLUÍDA (Lote A)** | `/pedidos/novo` | `(erp)/pedidos/novo/page.tsx` | `POST /v1/pedidos/reservas`, `GET /v1/pedidos/cupons/validar`, `GET /v1/pedidos/eventos/:eventId/setores/:sectorId/poltronas` |
| `PED-04` | Reservas e Desistências `/pedidos/reservas` | `inexistente` (rota dedicada) → **CONCLUÍDA (Lote A)** | `/pedidos/reservas` | `(erp)/pedidos/reservas/page.tsx` | `GET /v1/pedidos`, `POST /v1/pedidos/reservas/expiradas/processar`, `POST /v1/pedidos/:id/cancelar-reserva` |
| `PED-05` | Cupons e Descontos `/vendas/descontos` | `existente funcional` (`/cupons-cortesias`) → **CONCLUÍDA (Lote D)** | `/vendas/descontos` | `vendas/descontos/page.tsx` | `GET /v1/coupons`, `POST /v1/coupons`, `GET /v1/pedidos/cupons/validar` |
| `PED-06` | Pagamentos `/pagamentos` | `dependência externa` (`/checkout`) → **CONCLUÍDA (Lote D)** | `/pagamentos` | `pagamentos/page.tsx` | `GET /v1/checkout/pedidos/:orderId/tentativas`, `POST /v1/checkout/pedidos/:orderId/tentativas` |
| `PED-07` | Métodos e Tarifas `/pagamentos/configuracoes` | `existente incompleta` → **CONCLUÍDA (Lote D)** | `/pagamentos/configuracoes` | `pagamentos/configuracoes/page.tsx` | `GET /v1/financeiro-video/screen/gateways/mdr-taxas`, `GET /v1/eventos` |
| `PED-08` | Transferências de Titularidade `/pedidos/transferencias` | `existente funcional` (`/pos-venda/trocas`) → **CONCLUÍDA (Lote D)** | `/pedidos/transferencias` | `(erp)/pedidos/transferencias/page.tsx` | `GET /v1/pos-venda/alteracoes`, `POST /v1/pos-venda/alteracoes` |

---

## E. PDV, BILHETERIA E PORTARIA (8 Telas)

| ID | Tela / Rota Sugerida | Estado Inicial Auditado | Rota Real no Repositório | Arquivo de Página (`apps/backoffice/src/app`) | Serviço / API Conectada |
|---|---|---|---|---|---|
| `PDV-01` | Pontos de Venda `/pdv/pontos` | `existente funcional` (`/pdv`) → **CONCLUÍDA (Lote D)** | `/pdv/pontos` | `(erp)/pdv/pontos/page.tsx` | `GET /v1/pdv/terminais`, `POST /v1/pdv/terminais` |
| `PDV-02` | Operadores `/pdv/operadores` | `inexistente` (rota dedicada) → **CONCLUÍDA (Lote D)** | `/pdv/operadores` | `(erp)/pdv/operadores/page.tsx` | `GET /v1/pdv/terminais`, `GET /v1/pdv/turnos` |
| `PDV-03` | Caixa `/pdv/caixa` | `inexistente` (rota dedicada) → **CONCLUÍDA (Lote D)** | `/pdv/caixa` | `(erp)/pdv/caixa/page.tsx` | `GET /v1/pdv/turnos`, `GET /v1/pdv/terminais/:id/conciliacao`, `POST /v1/pdv/turnos/:id/fechar` |
| `PDV-04` | Vendas no PDV `/pdv/vendas` | `dependência externa` (equipamento PDV) → **CONCLUÍDA (Lote D)** | `/pdv/vendas` | `(erp)/pdv/vendas/page.tsx` | `GET /v1/pedidos`, `GET /v1/pdv/turnos` |
| `PRT-01` | Validações `/portaria/validacoes` | `existente funcional` (`/ingressos-portaria`) → **CONCLUÍDA (Lote D)** | `/portaria/validacoes` | `portaria/validacoes/page.tsx` | `GET /v1/ingressos?numero=...`, `POST /v1/checkin/validate` |
| `PRT-02` | Usuários Validadores `/portaria/validadores` | `inexistente` (rota dedicada) → **CONCLUÍDA (Lote D)** | `/portaria/validadores` | `portaria/validadores/page.tsx` | `GET /v1/audit/records`, `GET /v1/eventos` |
| `PRT-03` | Regras de Acesso `/portaria/regras` | `inexistente` (rota dedicada) → **CONCLUÍDA (Lote D)** | `/portaria/regras` | `portaria/regras/page.tsx` | `GET /v1/eventos`, `GET /v1/ingressos` |
| `PRT-04` | Reconhecimento Facial `/portaria/facial` | `dependência externa` (provedor biométrico) → **CONCLUÍDA (Lote D)** | `/portaria/facial` | `portaria/facial/page.tsx` | `GET /v1/eventos` (estado seguro `Integração não configurada`, sem biometria bruta) |

---

## F. FINANCEIRO, ATENDIMENTO, RELATÓRIOS E ADMINISTRAÇÃO (16 Telas)

| ID | Tela / Rota Sugerida | Estado Inicial Auditado | Rota Real no Repositório | Arquivo de Página (`apps/backoffice/src/app`) | Serviço / API Conectada |
|---|---|---|---|---|---|
| `FIN-01` | Visão Financeira `/financeiro` | `existente funcional` | `/financeiro` | `financeiro/page.tsx` | `GET /v1/finance/events/:id/summary`, `GET /v1/financeiro-video/catalog` |
| `FIN-02` | Ledger `/financeiro/ledger` | `existente incompleta` (`/financeiro/operacoes/ledger/lancamentos`) → **CONCLUÍDA (Lote E)** | `/financeiro/ledger` | `financeiro/ledger/page.tsx` | `GET /v1/financeiro-video/screen/ledger/lancamentos`, `GET /v1/finance/events/:id/ledger` |
| `FIN-03` | Repasses `/financeiro/repasses` | `existente incompleta` (`/financeiro/operacoes/solicitacoes/repasses`) → **CONCLUÍDA (Lote E)** | `/financeiro/repasses` | `financeiro/repasses/page.tsx` | `GET /v1/finance/payouts`, `POST /v1/finance/payouts` |
| `FIN-04` | Despesas e Fornecedores `/financeiro/despesas` | `existente incompleta` (`/financeiro/operacoes/fornecedores/cadastro`) → **CONCLUÍDA (Lote E)** | `/financeiro/despesas` | `financeiro/despesas/page.tsx` | `GET /v1/financeiro-video/screen/fornecedores/cadastro` |
| `FIN-05` | Borderôs `/financeiro/borderos` | `existente incompleta` (`/financeiro/operacoes/fechamentos/borderos`) → **CONCLUÍDA (Lote E)** | `/financeiro/borderos` | `financeiro/borderos/page.tsx` | `GET /v1/finance/events/:id/summary`, `GET /v1/financeiro-video/screen/fechamentos/borderos` |
| `FIN-06` | Conciliação `/financeiro/conciliacao` | `existente incompleta` (`/financeiro/operacoes/conciliacao/painel`) → **CONCLUÍDA (Lote E)** | `/financeiro/conciliacao` | `financeiro/conciliacao/page.tsx` | `GET /v1/financeiro-video/screen/conciliacao/painel`, `GET /v1/pedidos` |
| `SAC-01` | Clientes `/sac/clientes` | `existente funcional` (`/clientes`) → **CONCLUÍDA (Lote E)** | `/sac/clientes` | `(erp)/sac/clientes/page.tsx` | `GET /v1/clientes?busca=...`, `POST /v1/clientes` |
| `SAC-02` | Ocorrências `/sac/ocorrencias` | `existente funcional` (`/sac/chamados`) → **CONCLUÍDA (Lote E)** | `/sac/ocorrencias` | `(erp)/sac/ocorrencias/page.tsx` | `GET /v1/sac/chamados`, `POST /v1/sac/chamados` |
| `SAC-03` | Reenvio de Ingressos `/sac/reenvios` | `inexistente` (rota dedicada) → **CONCLUÍDA (Lote E)** | `/sac/reenvios` | `(erp)/sac/reenvios/page.tsx` | `GET /v1/ingressos?numero=...`, `POST /v1/tickets/:id/resend` |
| `REL-01` | Central de Relatórios `/relatorios` | `existente funcional` | `/relatorios` | `relatorios/page.tsx` | `GET /v1/reports/events/:id/export` |
| `REL-02` | Vendas e Ingressos `/relatorios/vendas` | `inexistente` (rota dedicada) → **CONCLUÍDA (Lote E)** | `/relatorios/vendas` | `relatorios/vendas/page.tsx` | `GET /v1/pedidos`, `GET /v1/eventos` |
| `REL-03` | Acessos `/relatorios/acessos` | `inexistente` (rota dedicada) → **CONCLUÍDA (Lote E)** | `/relatorios/acessos` | `relatorios/acessos/page.tsx` | `GET /v1/eventos`, `GET /v1/ingressos` |
| `ADM-01` | Usuários e Perfis `/administracao/usuarios` | `inexistente` (rota dedicada) → **CONCLUÍDA (Lote E)** | `/administracao/usuarios` | `administracao/usuarios/page.tsx` | `GET /v1/auth/me`, `GET /v1/audit/records` |
| `ADM-02` | Tarefas e Notificações `/administracao/tarefas` | `inexistente` (rota dedicada) → **CONCLUÍDA (Lote E)** | `/administracao/tarefas` | `administracao/tarefas/page.tsx` | `GET /v1/eventos`, `GET /v1/sac/chamados`, `GET /v1/estornos` |
| `AUD-01` | Auditoria `/auditoria/logs` | `existente funcional` (`/administracao`) → **CONCLUÍDA (Lote E)** | `/auditoria/logs` | `auditoria/logs/page.tsx` | `GET /v1/audit/records` |
| `AUD-02` | Integrações `/auditoria/integracoes` | `inexistente` (rota dedicada) → **CONCLUÍDA (Lote E)** | `/auditoria/integracoes` | `auditoria/integracoes/page.tsx` | `GET /v1/audit/outbox`, `GET /v1/health` |
