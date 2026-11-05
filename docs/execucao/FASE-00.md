# FASE 00 — Diagnóstico Greenfield, Contratos e Requisitos Reconstruídos (Sem Código-Fonte do SIGE)

**Data de execução:** 05/11/2026  
**Projeto:** BRAVO_II — Novo ERP modular da DiskIngressos (Construção 100% Greenfield)  
**Status:** Concluída

---

## 1. Premissa Oficial de Arquitetura (`docs/11-CONSTRUCAO-SEM-FONTE-SIGE.md`)

1. **Independência total do legado SIGE**: A DiskIngressos confirmou que **não possui o código-fonte do SIGE** e que o acesso a banco/exportações antigas não é pré-requisito para o projeto.
2. **Construção do zero (Greenfield)**: O BRAVO_II nasce com repositório próprio, banco de dados PostgreSQL próprio, modelos de domínio próprios, APIs REST/OpenAPI próprias, RBAC+ABAC próprios e trilha de auditoria imutável desde a fundação.
3. **Papel do vídeo do SIGE (`Gravando 2026-11-05 141403.mp4`) e das 12 etapas operacionais**: Servem exclusivamente como referência funcional e comportamental do negócio da DiskIngressos, além de evidenciar problemas de UX a evitar (modais aninhados, janelas cinzas sobrepostas, lentidão sem feedback e mistura visual entre taxas e preços).
4. **Rastreabilidade de origem (`source_system` / `source_record_id`)**: Todas as entidades principais do BRAVO_II nascem com `source_system = 'BRAVO_II'`. Caso futuramente existam exportações autorizadas (CSV/planilhas/relatórios), serão tratadas por um importador isolado sem bloquear nenhuma fase de construção do ERP.

---

## 2. Diagnóstico do Ambiente e Decisões Técnicas (ADRs)

| ID | Decisão | Regra / Implicação |
|---|---|---|
| **ADR-01** | Monólito Modular em NestJS + Next.js | Backend (`apps/api`) com 20 módulos de domínio isolados sobre PostgreSQL; Frontend administrativo (`apps/backoffice`) em Next.js/React pt-BR; adaptadores tipados (`apps/pdt-adapter`, `apps/pdv`, `apps/workers`) e pacotes compartilhados (`packages/contracts`, `packages/config`, `packages/telemetry`, `packages/sdk`, `packages/ui`, `packages/testing`). |
| **ADR-02** | Persistência PostgreSQL Nativa | Suporte direto a `DATABASE_URL` (`pg.Pool`) e motor PostgreSQL real via WASM (`@electric-sql/pglite`) para execução local e suítes E2E sem dependência de Docker no host Windows. |
| **ADR-03** | Taxa Disk por Evento (Nunca Global do Produtor) | A Taxa Disk é negociada e versionada **exclusivamente por evento** (`PERCENTAGE` ou `FIXED`), com escopo `INTERNAL_DISK`. Jamais vaza em APIs, DTOs ou telas do Portal do Produtor (PDT) nem para o SAC. |
| **ADR-04** | Código Público de 8 Dígitos + QR Independente | Cada ingresso terá número público `^[0-9]{8}$` separado de seu UUID interno e de sua credencial criptográfica QR de validação na portaria. |
| **ADR-05** | Segregação Contábil e Financeira | Bruto vendido, recebível, valor liquidado, receita própria da Disk, obrigação com produtor e saldo liberado para repasse são contas distintas no razão auxiliar. |
| **ADR-06** | Segregação SAC x Financeiro no Estorno | O SAC solicita o estorno, o Financeiro Disk aprova (`APROVADO`) e a conclusão (`CONCLUIDO`) depende obrigatoriamente de confirmação comprovada do provedor de pagamento. |
| **ADR-07** | Isolamento Estrito do Produtor (PDT) | O perfil `PRODUTOR_PDT` só acessa eventos presentes em seu escopo (`user_producer_scopes` / `user_event_scopes`). Tentativas de acesso cruzado (IDOR) a eventos de outro produtor retornam `403 FORBIDDEN` e gravam `AuditRecord` imutável com `outcome = 'DENIED'`. |
| **ADR-08** | Zero Dados Fictícios fora de Testes | O banco de operação/Preview não recebe CPFs, eventos, vendas ou saldos falsos. Listas vazias exibem estados vazios honestos em pt-BR. |

---

## 3. Matriz de Paridade Funcional por Comportamento (Vídeo + 12 Etapas → BRAVO_II)

| Trecho / Etapa | Comportamento Reconstruído | Módulo BRAVO_II | Rota no Backoffice | Ordem de Construção |
|---|---|---|---|---|
| `03:56–05:20` / `06:40–06:48` | Autenticação única, menu modular por permissão, busca de eventos e trilha de auditoria imutável | `identity`, `governance`, `events` | `/`, `/login`, `/eventos`, `/administracao` | **Fase 01 (Implementada)** |
| `05:56–06:24` / Etapas 1 e 6 | Cadastro de Produtor PJ, representantes, contratos e negociação da **Taxa Disk por evento** | `producers`, `commercial`, `pricing-fees` | `/comercial` | **Fase 02 (Próxima)** |
| `05:20–05:56` / `06:24–06:40` / Etapa 2 | Event Builder em etapas, sessões, setores/mapas, modalidades/lotes, aprovação e publicação | `events`, `inventory` | `/eventos` | **Fase 03** |
| `00:00–02:16` / `03:20–03:56` / Etapa 3 | Clientes PF, pedidos, pagamento sandbox, reserva de estoque compartilhado e ticket de 8 dígitos + QR | `customers`, `orders`, `payments`, `tickets` | `/cadastros`, `/pedidos-vendas`, `/ingressos-portaria` | **Fase 04** |
| `02:16–03:20` / Etapa 9 | PDV/Caixa, check-in de portaria, campanhas de cupons de desconto e quotas de cortesias | `point-of-sale`, `gate-control`, `coupons` | `/pedidos-vendas`, `/ingressos-portaria`, `/cupons-cortesias` | **Fase 05** |
| Etapas 4, 5, 7, 8, 10, 11 e 12 | SAC com SLA, estornos segregados, Ledger Financeiro Disk, repasses, marketing/remarketing e Portal PDT | `service-desk`, `refunds`, `finance`, `marketing`, `messaging` | `/sac`, `/estornos`, `/financeiro`, `/marketing`, `/remarketing`, `/produtores-pdt`, `/relatorios` | **Fases 06 a 10** |

---

## 4. Pontos Marcados como Pendentes de Validação de Negócio (Sem Dependência do SIGE)

1. **Política de Série de 8 Dígitos (`^[0-9]{8}$`) para Novos Eventos**:
   - Reservado o formato canônico de 8 dígitos numéricos com zeros à esquerda preservados e unicidade global no BRAVO_II; na fase de emissão (Pacote 04), será parametrizada a faixa inicial para evitar qualquer ambiguidade operacional com séries antigas em circulação.
2. **Regras Comerciais/Contábeis de *Spread*, *Rebate* e *Advanced***:
   - Mantidos como parâmetros protegidos e desabilitados para execução financeira até definição formal de fórmula, titularidade e tratamento em cancelamentos pela diretoria financeira da DiskIngressos.
3. **Credenciais de Sandbox de Gateways, E-mail e Contratos de API do Site/PDT**:
   - Encapsulados por interfaces/adaptadores (`apps/pdt-adapter`, `apps/workers`, travas `ALLOW_REAL_* = false`) para desenvolvimento e testes seguros sem qualquer risco de cobrança, estorno, repasse ou publicação indevida.
