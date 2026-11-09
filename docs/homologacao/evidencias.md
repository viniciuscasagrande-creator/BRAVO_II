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
