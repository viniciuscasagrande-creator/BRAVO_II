# Registro de Decisões Arquiteturais (ADRs) — BRAVO_II

- **Commit-base**: `405f41158b0b231ec2420ca62280a5fdb952edec`
- **Data**: `2026-11-09T17:27:12.297Z`

## ADR-001 — Fronteiras entre BRAVO_II Backoffice, Site Público, PDV e Validador
- **Decisão**: O BRAVO_II é o Core ERP e orquestrador central de regras, disponibilidade, ledger e governança. O site público, o terminal PDV e o aplicativo validador consomem contratos autenticados sem acessar diretamente o banco de dados.

## ADR-002 — Política de Reservas, Expiração e Virada de Lotes (LOT-001 / PED-003)
- **Decisão**: A quantidade comprometida de um lote é a soma de reservas ativas não expiradas (`RESERVADO`) e pedidos confirmados (`PAGO`). A expiração de reserva devolve atomicamente a quantidade ao lote. A virada automática para o próximo lote ocorre somente quando `comprometido >= max_quantity` dentro da mesma transação no servidor. O limite de ingressos por pedido será configurável por evento/canal (padrão de 10 ingressos no canal online).

## ADR-003 — Motor de Assentos e Proteção contra Venda Duplicada (MAP-001 / MAP-002 / PED-002)
- **Decisão**: Cada poltrona numerada possui constraint única `(area_id, row_label, seat_number)` e alocação protegida por transação no PostgreSQL. Setores ou assentos vinculados a pedidos ou ingressos emitidos não podem ser excluídos (`ON DELETE RESTRICT`).

## ADR-004 — Integração de Pagamentos, Estornos e Ledger Imutável (PAG-001 / FIN-001 / FIN-002)
- **Decisão**: Todo lançamento em `finance_ledger_entries` é imutável (protegido pelo trigger `trg_forbid_finance_ledger_mutation`), separando contabilmente recebimento bruto, obrigação com o produtor, reserva de estorno e receita de Taxa Disk por evento. Em ambiente de Homologação/Preview, conectores bancários e de adquirentes operam exclusivamente em modo bloqueado/sandbox (`ENABLE_REAL_PAYMENTS=false`, `ENABLE_REAL_REFUNDS=false`).

## ADR-005 — Governança e LGPD para Reconhecimento Facial (BIO-001)
- **Decisão**: Nenhuma foto ou template biométrico bruto será armazenado no banco central do ERP nem exibido em telas administrativas. Qualquer futura integração de reconhecimento facial dependerá de provedor especializado segregado, base legal LGPD documentada, consentimento explícito e fallback de validação por QR Code.

## ADR-006 — Política de Aprovação Multi-Departamento e Publicação de Eventos (EVT-001 / EVT-002)
- **Decisão**: Nenhum evento pode ser publicado sem aprovação registrada por etapa em `event_approvals` com segregação de funções (maker-checker). Eventos com status `ADIADO`, `SUSPENSO` ou `CANCELADO` têm vendas bloqueadas imediatamente.
