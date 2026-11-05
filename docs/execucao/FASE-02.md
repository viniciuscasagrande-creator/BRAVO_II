# FASE 02 — Produtores (PJ), Comercial, Contratos e Taxa Disk por Evento

**Data de execução:** 05/11/2026  
**Projeto:** BRAVO_II — Novo ERP modular da DiskIngressos (Construção 100% Greenfield)  
**Status:** Concluída e Verificada

---

## 1. Objetivo da Fase 02

Implementar o módulo de **Produtores (PJ) e Comercial (`CRM-B2B` / `ORG` / `FEE`)**, garantindo:
- Cadastro persistido de Produtor PJ (`producers`) com validação e formatação de CNPJ;
- Cadastro de representantes legais e contatos operacionais/financeiros (`producer_contacts`);
- Registro e verificação de documentação societária, fiscal e bancária (`producer_documents`);
- Cadastro de contratos comerciais B2B vinculados ao produtor (`contracts`);
- Homologação formal do produtor (`VERIFIED`) com emissão de evento de domínio `ProducerVerified` no `outbox_events` e auditoria `before_state`/`after_state`;
- Negociação, versionamento prospectivo e aprovação de **Taxa Disk por evento** (`event_fee_agreements`, tipos `PERCENTAGE` e `FIXED`, visibilidade `INTERNAL_DISK`);
- Geração e consulta de **Snapshots Contratuais Imutáveis da Taxa Disk** (`event_fee_snapshots`, protegidos por trigger PostgreSQL contra `UPDATE` e `DELETE`), comprovando que alterações futuras na taxa de um evento geram nova versão prospectiva sem recalcular transações passadas;
- Proteção absoluta contra exposição da Taxa Disk interna no Portal do Produtor (PDT) e no SAC.

---

## 2. Inventário Prévio e Arquivos Criados / Alterados

### Situação Prévia
- Fundação da Fase 01 ativa com tabelas base `producers`, `events`, `event_producers` e `event_fee_agreements`.

### Arquivos Criados e Alterados na Fase 02
- `database/migrations/0002_commercial_and_event_builder.up.sql` e `.down.sql` — Criação de `producer_contacts`, `producer_documents`, `contracts` e `event_fee_snapshots` (com trigger `trg_forbid_event_fee_snapshots_mutation`).
- `packages/contracts/src/index.ts` — Schemas Zod e DTOs (`CreateProducerRequestSchema`, `CreateProducerContactRequestSchema`, `CreateProducerDocumentRequestSchema`, `CreateContractRequestSchema`, `ProposeEventFeeAgreementRequestSchema`, `ApproveEventFeeAgreementRequestSchema`, `CreateFeeSnapshotRequestSchema`).
- `packages/sdk/src/index.ts` — Métodos tipados no `BravoApiClient` para produtores, contatos, documentos, contratos, acordos de taxa e snapshots.
- `apps/api/src/modules/producers/producers.service.ts`, `producers.controller.ts`, `producers.module.ts` — Domínio de Produtores PJ.
- `apps/api/src/modules/commercial/commercial.service.ts`, `commercial.controller.ts`, `commercial.module.ts` — Domínio Comercial, versionamento prospectivo da Taxa Disk por evento e snapshots imutáveis.
- `apps/backoffice/src/app/comercial/page.tsx` — Interface pt-BR guiada de Comercial, Produtores PJ e Taxa Disk por Evento.
- `apps/api/src/bootstrap/commercial-and-events.e2e.spec.ts` — Testes E2E cobrindo todas as regras de negócio da Fase 02.

---

## 3. Rotas de API e Telas Prontas

| Método / Rota | Permissão RBAC | Tabela(s) Persistida(s) |
|---|---|---|
| `GET /api/v1/producers` | `commercial:read` | `producers`, `producer_contacts`, `producer_documents`, `contracts` |
| `GET /api/v1/producers/:producerId` | `commercial:read` | `producers`, `producer_contacts`, `producer_documents`, `contracts` |
| `POST /api/v1/producers` | `commercial:write` | `producers`, `audit_records` |
| `POST /api/v1/producers/:producerId/contacts` | `commercial:write` | `producer_contacts`, `audit_records` |
| `POST /api/v1/producers/:producerId/documents` | `commercial:write` | `producer_documents`, `audit_records` |
| `POST /api/v1/producers/:producerId/verify` | `commercial:write` | `producers`, `outbox_events`, `audit_records` |
| `POST /api/v1/producers/:producerId/contracts` | `commercial:write` | `contracts`, `audit_records` |
| `POST /api/v1/events/:eventId/fee-agreements` | `event-fee:propose` | `event_fee_agreements`, `audit_records` |
| `POST /api/v1/events/:eventId/fee-agreements/:version/approve` | `event-fee:approve` | `event_fee_agreements`, `event_approvals`, `outbox_events`, `audit_records` |
| `POST /api/v1/events/:eventId/fee-snapshots` | `event-fee:read-internal` | `event_fee_snapshots`, `audit_records` |
| `GET /api/v1/events/:eventId/fee-snapshots` | `event-fee:read-internal` | `event_fee_snapshots` |
| Tela `/comercial` (Next.js) | `commercial:read` / `commercial:write` | Painel completo em pt-BR sem modais em cascata |

---

## 4. Testes Executados e Evidências

- **`pnpm test:e2e` (`commercial-and-events.e2e.spec.ts`)**:
  - Cadastro de Produtor PJ (`33.444.555/0001-66`), representante legal, documento societário (`CONTRATO_SOCIAL`), contrato (`CTR-DISK-2026-0001`) e verificação (`VERIFIED`) aprovados.
  - Dois eventos do mesmo produtor recebendo Taxas Disk distintas (`10% PERCENTAGE` vs `R$ 15,00 FIXED`) sem interferência.
  - Alteração prospectiva da Taxa Disk no Evento 1 (`v1 10%` → `v2 15%`): `v1` passa para `SUPERSEDED`, `v2` passa para `APPROVED`, e o snapshot contratual emitido na `v1` (`ORD-ITEM-V1-0001` = `1000` centavos) permanece inalterado; tentativa de `UPDATE` em `event_fee_snapshots` é rejeitada pelo trigger PostgreSQL.
  - Produtor (`PRODUTOR_PDT`) bloqueado com `403 FORBIDDEN` ao tentar acessar `/fee-snapshots` e sem receber `internalDiskFeeAgreement`, `internalFeeHistory` ou `internalFeeSnapshots`.

---

## 5. Confirmação de Segurança

- Nenhuma operação financeira, cobrança, estorno ou repasse real foi executada.
- Nenhuma taxa global automática por produtor foi permitida.
