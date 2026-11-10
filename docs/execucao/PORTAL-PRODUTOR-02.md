# BRAVO_II — Portal do Produtor, incremento 02 (Financeiro, Repasses, Assinaturas e Marketing Conectados)
Data: 10/11/2026.

## 1. Objetivo da entrega
Integrar o pacote `BRAVO_II_PORTAL_PRODUTOR_INCREMENTO_01.zip` ao repositório oficial do `BRAVO_II` e concluir a próxima etapa definida: **conectar o financeiro do produtor, o fluxo de repasses/assinaturas, as transferências entre eventos, o painel de vendas/público, o marketing e a operação/atendimento/equipe diretamente ao núcleo existente do BRAVO_II e ao banco Neon (`floral-sunset-85900211`)**.

## 2. Arquivos criados e alterados
- `apps/backoffice/src/components/producer-portal/marketing.mjs` e `marketing.d.ts`: geração e validação de link HTTPS rastreável com UTM (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`), bloqueando protocolos inseguros e credenciais embutidas.
- `apps/backoffice/src/components/producer-portal/portal.css`: folha de estilo dedicada e responsiva do Portal do Produtor.
- `apps/backoffice/src/components/producer-portal/portal.tsx`: interface completa em português do Brasil com 8 áreas integradas (`Visão geral`, `Evento`, `Financeiro`, `Repasses e antecipações`, `Transferências`, `Vendas e público`, `Marketing`, `Operação, Atendimento e Equipe`).
- `apps/backoffice/src/app/produtores-pdt/page.tsx`: renderiza `<ProducerPortal />`.
- `apps/backoffice/src/components/bravo-shell.tsx`: adiciona bypass `if (pathname === '/produtores-pdt') return <>{children}</>;` preservando o shell corporativo das demais rotas.
- `apps/api/src/modules/events/events.controller.ts` e `apps/api/src/modules/events/events.service.ts`:
  - `GET /v1/events/:eventId/portal`: projeção exclusiva do produtor com verificação estrita de escopo (`CROSS_EVENT_SCOPE_FORBIDDEN` auditado em `audit_log_entries`) e **zero exposição da Taxa Disk interna (`event_fee_agreements` / `3.1.01`)**.
  - `POST /v1/events/:eventId/portal/repasses`: solicitação persistida em `finance_payout_requests` (`SOLICITADO`), validada contra o `saldoDisponivelParaRepasseCents` do evento e auditada.
  - `POST /v1/events/:eventId/portal/repasses/:payoutId/assinar`: assinatura eletrônica pelo produtor (`ASSINADO_PRODUTOR`) após aprovação pelo Financeiro Disk (`APROVADO_FINANCEIRO`).
  - `POST /v1/events/:eventId/portal/transferencias`: solicitação de transferência de saldo entre eventos pertencentes ao mesmo produtor (`EM_ANALISE_FINANCEIRO`).
  - `POST /v1/events/:eventId/portal/registros`: persistência de campanhas UTM, materiais de divulgação, solicitações de alteração de evento, demandas operacionais/portaria, chamados e convites de equipe.
- `tests/producer-portal.test.mjs`: 4 testes automatizados cobrindo validação de UTM, proteção de escopo, ocultação de Taxa Disk e integração de repasses/assinaturas.

## 3. Regras de negócio e segurança comprovadas
- **Distinção contábil e financeira clara:**
  1. `vendasRealizadasBrutoCents` (vendas brutas nominais confirmadas)
  2. `valoresCreditadosProdutorCents` (montante líquido creditado à obrigação do evento `2.1.01`)
  3. `retencoesPreEventoCents` (reserva de segurança pré-evento conforme `advance_release_limit_bps`)
  4. `repassesSolicitadosOuPagosCents` (repasses já pagos ou em fluxo de aprovação/assinatura)
  5. `saldoDisponivelParaRepasseCents` (valor efetivamente disponível para solicitação imediata)
- **Sigilo absoluto da Taxa Disk:** nenhuma rota `/v1/events` (para `PRODUTOR_PDT`) ou `/v1/events/:eventId/portal` retorna `internalDiskFeeAgreement`, `percentageRate`, `fixedAmountCents` ou lançamentos da conta `3.1.01`.
- **Isolamento entre produtores (ABAC):** `produtor.local@pdt.diskingressos.com.br` acessa apenas os eventos vinculados à `Produtora Cultural Sul Brasil` (`Festival Sinfônico de Curitiba 2026` e `Noite de Gala Ópera de Arame 2026`); qualquer tentativa de acessar `22222222-3333-4444-8555-666666666699` (`Produtora Independente Outra Regiao`) retorna `403 CROSS_EVENT_SCOPE_FORBIDDEN` e grava auditoria imutável.
- **Confirmação de segurança:** nenhuma transferência bancária ou liquidação externa real é executada em homologação/Preview.
