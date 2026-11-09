# Evidências de Execução — Pacote 00 e Diagnóstico do Pacote 01

- **Commit-base**: `405f41158b0b231ec2420ca62280a5fdb952edec`
- **Data da execução**: `2026-11-09T17:27:12.297Z`
- **Branch criada**: `feat/bravo-ii-expansao-operacional`

## 1. Comandos Executados e Resultados Reais

1. **Auditoria Prisma × Migrations SQL × Neon HML**:
   - Modelos Prisma: **55**
   - Migrations SQL aplicadas no Neon HML (`bravo_ii_hml`): **10/10** (`0001` a `0010`)
   - Tabelas base no Neon HML: **78** (77 tabelas de domínio + `schema_migrations`)
   - Divergência entre Migrations SQL e Neon HML: **0 tabelas ausentes** (`[]`)
2. **Testes Estruturais e de Segurança (`node --test tests/*.test.mjs`)**:
   - **53/53 testes aprovados** (`pass 53, fail 0`).
3. **Verificação do Módulo Financeiro Vídeo (`node scripts/test-financeiro-video.mjs`)**:
   - `OK: 96 telas, 15 grupos; rotas, permissão e preservação das travas verificadas.`
4. **Build Completo do Monorepo (`pnpm run build`)**:
   - Todos os 9 pacotes e 5 aplicações compilados com código de saída `0`.
5. **Confirmação de Segurança Financeira**:
   - Nenhuma operação bancária, captura real, estorno externo ou repasse real foi executado (`ENABLE_REAL_PAYMENTS=false`, `ENABLE_REAL_REFUNDS=false`, `ENABLE_EXTERNAL_PUBLICATION=false`).

## 2. Evidências do Pacote 02 — Núcleo Operacional (Comercial, Produtores, Eventos, Lotes e Mapas)

- **Regras implementadas e testadas**:
  - **Comercial / Produtores (`FIN-001`)**: Persistência real e listagem de Contratos Comerciais (`contracts`) e Contatos Corporativos/Financeiros (`producer_contacts`) na ficha do produtor (`/v1/comercial/produtores/:id/contratos` e `/v1/comercial/produtores/:id/contatos`).
  - **Aprovações Multi-Área (`EVT-001` / `ADR-006`)**: Suporte a `CADASTRAL`, `COMERCIAL`, `CONTRATO`, `OPERACIONAL`, `TECNICA`, `LOCAL` e `PUBLICACAO` com segregação maker-checker e trilha auditável.
  - **Visibilidade Pública de Eventos Adiados/Suspensos (`EVT-002` / `ADR-006`)**: Ocorrências de `ADIAMENTO`, `SUSPENSAO` e `CANCELAMENTO` atualizam o status do evento e marcam `publiclyVisible: false` em `/v1/eventos/:id/projecao-publica`.
  - **Disponibilidade Consolidada e Virada Automática de Lotes (`LOT-001` / `ADR-002`)**: Cálculo determinístico `availableCount = capacity - reservedCount - issuedCount`, rota `/v1/eventos/:id/disponibilidade` e motor de progressão `/v1/eventos/:id/lotes/processar-virada`.
  - **Construtor de Mapas, Filas e Poltronas (`MAP-001` / `MAP-002` / `ADR-003`)**: Geração de filas numeradas em lote (`/v1/eventos/:id/areas/:areaId/filas`), duplicação de setor/mapa (`/v1/eventos/:id/areas/:areaId/duplicar`) e exclusão protegida contra setores com vendas ou reservas (`/v1/eventos/:id/areas/:areaId/excluir`).
- **Suíte de Testes**:
  - **58/58 testes aprovados** (`node --test tests/*.test.mjs`).

## 3. Evidências do Pacote 03 — Pedidos, Bilheteria e Canais

- **Regras implementadas e testadas**:
  - **Reservas de Poltronas Numeradas sem Duplicidade e Liberação de Reserva Expirada/Cancelada (`PED-001` & `PED-002` / `ADR-004`)**:
    - `mayReserve` (`@bravo-ii/domain-p08`) valida `seatIds` distintos em quantidade idêntica a `quantity` quando o setor é numerado (`area_type === 'SEATED'`).
    - `BravoOrdersService.reserve` executa bloqueio transacional atômico em `seats` (`UPDATE seats SET status = 'HELD', active_hold_id = $1 WHERE id = ANY($2::uuid[]) AND sector_id = $3 AND status = 'AVAILABLE'`), rejeitando concorrência com `409 Conflict` (`POLTRONA_INDISPONIVEL`).
    - `BravoOrdersService.expireReserved` (`/v1/pedidos/reservas/expiradas/processar`) e `BravoOrdersService.cancelUnpaid` (`/v1/pedidos/:id/cancelar-reserva`) liberam o estoque do lote e as poltronas bloqueadas (`UPDATE seats SET status = 'AVAILABLE', active_hold_id = NULL WHERE active_hold_id = $1`).
    - Listagem de poltronas por setor em `/v1/pedidos/eventos/:eventId/setores/:sectorId/poltronas`.
  - **Limite por Pedido/Canal e Cupom Promocional no Servidor (`PED-003`)**:
    - `assertChannelOrderLimit` e `calculateCouponDiscountCents` implementados em `@bravo-ii/domain-p08`.
    - Validação de cupom promocional exposta em `GET /v1/pedidos/cupons/validar` consultando `coupon_campaigns`.
  - **Bilheteria e PDV — Setores Autorizados, Turnos e Conciliação de Caixa (`PDV-001` / `ADR-005`)**:
    - `assertPdvSectorAllowed` e `summarizePdvShiftReconciliation` implementados em `@bravo-ii/domain-p09`.
    - Endpoints `GET /v1/pdv/turnos` e `GET /v1/pdv/terminais/:id/conciliacao` expostos em `BravoPdvController` / `BravoPdvService`, preservando o bloqueio fail-closed de operações físicas não homologadas (`ENABLE_PDV_OPERATIONS !== 'true'`).
- **Suíte de Testes**:
  - **61/61 testes aprovados** (`node --test tests/*.test.mjs`).

