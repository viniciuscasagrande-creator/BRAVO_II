# BRAVO_II — Arquitetura de Incorporação e Implantação Funcional

> **Documento técnico de implementação — versão 1.0 | 09/11/2026**  
> **Ambiente de execução:** VS Code com apoio do Gemini  
> **Destino:** repositório **existente** do BRAVO_II — **não** iniciar outro sistema.  
> **Estado deste documento:** arquitetura proposta, **não** evidência de código implementado, banco validado ou deploy efetuado.

## 0. Diretrizes inegociáveis

1. Preservar o BRAVO_II, seus módulos, rotas, fluxos, dados, autenticação e identidade visual. **Auditar antes de alterar.**
2. Usar o documento histórico `Texto colado(4).txt` como **fonte de requisitos operacionais**, não como código-fonte, diagrama de dados ou prova de implantação.
3. Trabalhar no repositório existente, no **VS Code + Gemini**; entregar alterações reais em arquivos, migration revisável, testes e evidências. Não considerar menu vazio como entrega funcional.
4. Não duplicar entidades de produtor, evento, pedido, ingresso, local, lote ou transação já presentes. Reutilizar módulos e contratos existentes após levantamento.
5. Interface 100% em **português do Brasil**; nomes internos de código podem ser em inglês.
6. Segregar usuários, produtores, eventos e operações por **permissões no servidor e no banco**, não apenas ocultação de botões.
7. Preservar **Neon/PostgreSQL** sem `db push` destrutivo, reset ou limpeza indiscriminada. Migrações devem ser versionadas, revisadas e testadas em HML.
8. Não movimentar valores, executar estornos, emitir pagamentos ou disparar ações irreversíveis em provedores reais sem autorização expressa e plano próprio de liberação.
9. Reconhecimento facial envolve dado biométrico sensível. Não importar fotos/templates legados por padrão; exigir avaliação de LGPD, base legal aplicável, finalidade, retenção, segurança e fornecedor.
10. Cada funcionalidade deve ter menu/rota, tela, API ou caso de uso, persistência, permissão, auditoria quando cabível, testes e critério de aceite verificável.

## 1. Objetivo e fronteiras

Incorporar ao BRAVO_II, de forma controlada, as capacidades descritas no histórico operacional DiskIngressos (registros de 2025 a janeiro de 2026). O BRAVO_II será o **backoffice/orquestrador de negócio**. Checkout público, aplicativo de validação, PDV e serviços externos podem permanecer como aplicações separadas, interligadas por APIs, eventos e conectores.

**Não fazer:** reescrever o site público, o PDV ou o aplicativo validador automaticamente; substituir fluxos existentes sem equivalência; assumir que requisitos concluídos no sistema legado já estejam implementados no BRAVO_II.

### 1.1 Base factual e hipóteses a confirmar

| Tema | Situação | Ação de diagnóstico |
|---|---|---|
| Projeto desenvolvido via VS Code com Gemini | Diretriz estabelecida | Manter workflow |
| Código-fonte do ERP SIGE legado | Indisponível | Desenvolver independente; não condicionar à importação |
| Stack React/Next.js + Node, NestJS + Prisma + PostgreSQL/Neon | Referência arquitetural em conversas do projeto; **não verificada no repositório deste pedido** | Conferir `package.json`, estrutura, dependências e deploy antes de impor mudanças |
| Contagem de modelos Prisma (48/55 em registros anteriores) | **Divergente e não confirmada** | Contar modelos reais e reconciliar schema, SQL e banco |
| Migrações e PostgreSQL de HML | Necessitam conferência | Inspecionar `prisma/migrations`, `_prisma_migrations` e catálogo do PostgreSQL |
| Arquivo histórico de solicitações | Recebido e lido | Catalogar cada item com rastreabilidade |
| Código de produção e ambiente HML | **Não fornecidos nesta tarefa** | Nenhuma afirmação de implementação/homologação |

## 2. Princípios arquiteturais

**Arquitetura-alvo preferencial:** monólito modular no backend existente, com módulos de domínio bem delimitados, serviços internos, interfaces explícitas, eventos de domínio/outbox para integrações e uma única fonte de verdade por entidade. **Adaptar ao que o repositório de fato usa**: não instalar NestJS, Next.js nem reorganizar toda a árvore sem justificativa técnica.

```text
                       BRAVO_II / BACKOFFICE
  ┌─────────────────────────────────────────────────────────┐
  │ Frontend atual: shell, autenticação, menus por permissão │
  │ Painéis: Comercial | Eventos | Operações | Financeiro    │
  │ SAC | Administração | Auditoria | Relatórios             │
  └────────────────────────┬────────────────────────────────┘
                           │ HTTPS / sessão / RBAC + ABAC
  ┌────────────────────────▼────────────────────────────────┐
  │ API existente / camada de aplicação                     │
  │                                                        │
  │ Produtores  Eventos  Lotes  Mapas  Pedidos  Financeiro   │
  │ Contratos   PDV     Portaria  SAC  Relatórios  Auditoria │
  │                                                        │
  │ Domínio + transações + idempotência + regras de acesso  │
  └───────────┬──────────────────┬──────────────────────────┘
              │                  │
  ┌───────────▼────────┐   ┌─────▼───────────────────────────┐
  │ PostgreSQL / Neon  │   │ Camada de integração           │
  │ Prisma (se atual)  │   │ Checkout, PSPs, PDV, Validador │
  │ Migrations, ledger │   │ E-mail/WhatsApp, biometria     │
  │ Auditoria, outbox  │   │ Webhooks, filas e retries      │
  └────────────────────┘   └─────────────────────────────────┘
```

### 2.1 Limites de responsabilidade

- **BRAVO_II**: cadastros mestres, regras, aprovações, disponibilidade, gestão operacional, conciliação, relatórios e auditoria.
- **Checkout/site**: experiência de compra, que consome APIs autorizadas e confirma pedidos pelo fluxo transacional.
- **PDV/bilheteria**: operações de caixa e vendas presenciais, integradas ao mesmo motor de disponibilidade/pedidos.
- **Validador/portaria**: verificação de ingresso, antipassback, sincronização e evidências de acesso.
- **Adquirentes/gateways**: provedor de autorização/liquidação; BRAVO_II registra estados recebidos e concilia, sem tratar retorno de frontend como confirmação financeira.
- **Biometria**: serviço especializado segregado; BRAVO_II administra políticas e referências, sem expor material biométrico em telas administrativas comuns.

## 3. Catálogo de módulos e menus propostos

> **Status “proposto”**: conferir menu real e permissão existente. Reutilizar antes de criar. Rotas de exemplo não constituem decisão de migração.

| Módulo | Menus/submenus a confirmar/criar | Núcleo funcional |
|---|---|---|
| Comercial | Produtores; Cadastros pendentes; Negociações; Planos; Contratos; Tarefas | PF/PJ, beneficiário, documentação, aprovação, relacionamento |
| Eventos | Lista de Eventos; Novo Evento; Sessões; Aprovações; Locais | Ciclo de vida, status comercial/contratual/técnico/local, publicação |
| Ingressos | Categorias; Lotes; Cupons; Cortesias; Meia-entrada | Regras de disponibilidade, limite, modalidade e titularidade |
| Mapas e Assentos | Construtor; Setores; Filas; Poltronas; Reservas; Ocupação | Layout versionado e integridade de capacidade/assentos |
| Pedidos e Vendas | Pedidos; Reservas; Carrinhos; Descontos; Transferências | Checkout integrado, alterações, desistência, titularidade |
| Bilheteria e PDV | Pontos de Venda; Operadores; Caixas; Fechamentos | Abertura/fechamento, setor por PDV, impressão, controle de dinheiro |
| Portaria | Validação; Validadores; Acessos; QR Dinâmico; Biometria | Check-in, permissões, regras de acesso, antifraude |
| Financeiro | Saldos; Ledger; Repasses; Despesas; Fornecedores; Borderôs; Conciliação | Movimento e obrigação financeira, múltiplos beneficiários e aprovações |
| Atendimento (SAC) | Clientes; Ingressos; Reenvios; Transferências; Ocorrências | Autosserviço controlado e atendimento auditável |
| Relatórios | Vendas; Lotes; Assentos; Cortesias; Acessos; Financeiros | Filtros por produtor/evento, exportações autorizadas |
| Administração | Usuários; Perfis; Permissões; Configurações; Tarefas | Administração corporativa, sem bypass oculto de políticas |
| Auditoria e Governança | Logs; Trilha de Aprovações; Integrações; Segurança | Registro de ações e alterações críticas, rastreabilidade |

### 3.1 Novas regras de negócio prioritárias extraídas do histórico

| ID | Regra / situação histórica | Destino | Aceite mínimo |
|---|---|---|---|
| EVT-001 | Aprovações comercial, contrato, técnica e local distintas | Eventos | Estados independentes, responsáveis, transições e trilha de auditoria |
| EVT-002 | Evento adiado não deve permanecer publicamente visível | Eventos/Publicação | API pública omite eventos ocultos/adiados conforme política definida |
| LOT-001 | Lotes “vendido”/“reservado”: soma de vendidos e reservados afeta progressão | Lotes | **Regra está em discussão no histórico**: fechar decisão e testar antes de codificar |
| MAP-001 | Poltrona individual tem capacidade de venda unitária | Mapas | Constraint e validação no servidor; testes concorrentes |
| MAP-002 | Duplicação/exclusão de mapas, filas e seções preserva integridade | Mapas | Versões coerentes e bloqueios para itens já comprometidos |
| PED-001 | Carrinho abandonado libera reservas | Pedidos | Expiração transacional, reprocessável e idempotente |
| PED-002 | Não permitir venda duplicada de poltrona | Pedidos/Mapas | 2 concorrentes no mesmo assento: no máximo 1 confirmação |
| PED-003 | Limite de até 10 ingressos por pedido no site citado no histórico | Pedidos | **Revalidar escopo/configuração** por canal/evento antes de fixar regra global |
| PAG-001 | Tarifas e parcelamento devem refletir bandeira/método corretos | Pagamentos | Testes de cálculo, arredondamento e meio de pagamento |
| PDV-001 | Abertura de caixa e restrição de setores por PDV | Bilheteria | Operador e caixa ativos, setor autorizado, fechamento auditável |
| ACC-001 | Validador vinculado aos eventos autorizados | Portaria | Acesso negado a evento não atribuído |
| BIO-001 | Captura e uso facial conforme parametrização do evento | Portaria | Política, consentimentos quando cabíveis, controles LGPD e fallback operacional |
| TRF-001 | Transferência de titularidade com prazo, limite e exceções | SAC/Pedidos | Aplicação por evento, trilha de alterações e bloqueio de cortesias intransferíveis |
| FIN-001 | Cadastro de fornecedores, beneficiários e terceiros | Financeiro | Validação de titular/terceiro, histórico e aprovação |
| FIN-002 | Solicitação de repasse com descrição e observações | Financeiro | Fluxo de solicitação/aprovação/assinaturas, sem executar banco em HML |
| SEC-001 | Tabela de cálculo de taxas visível só ao financeiro autorizado | Segurança/Financeiro | Respostas API também filtradas; teste de acesso negado |
| AUD-001 | Ações administrativas e financeiras rastreáveis | Governança | Log append-only lógico, autor, escopo, data, ação e correlação |

**Atenção a contradições históricas:** o arquivo tem itens repetidos, cancelados, concluídos em sistemas anteriores e uma divergência explícita sobre progressão dos lotes. Não codificar automaticamente um comportamento contraditório. Formalizar uma decisão no catálogo de regras.

## 4. Matriz de incorporação e decisão por item

Criar `docs/rastreabilidade/requisitos-historicos.csv` ou `.md` com **uma linha por apontamento original**, inclusive duplicados relacionados. Campos mínimos:

```text
id_origem | data_origem | transcricao_resumida | modulo_alvo |
classificacao (regra, bug legado, melhoria, UX, integração) |
status_no_historico (concluído, pendente, cancelado, sem informação) |
status_no_BRAVO_II (não localizado, existente, parcial, em desenvolvimento, homologado) |
decisao (reutilizar, ampliar, integrar, criar, não incorporar, pendente) |
rota | tela | API | entidade | permissao | testes | evidencias | observacoes
```

**Fluxo de triagem obrigatório:** apontamento original → requisito normalizado → comportamento esperado → módulo dono → inventário atual → análise de lacuna → tarefa → código/teste → evidência → aceite. Não usar “concluído” histórico como sinônimo de “homologado no BRAVO_II”.

## 5. Estrutura de pastas de referência (adaptativa)

> **Não mover código por estética.** Criar a estrutura abaixo somente onde o repositório já permitir, respeitando convenções atuais.

```text
bravo-ii/                            # raiz EXISTENTE
├── apps/                             # se monorepo já existir
│   ├── web/                          # shell e telas do backoffice
│   └── api/                          # API, se separada
├── packages/                         # opcional, somente se já aplicável
│   ├── contracts/                    # DTOs, schemas/eventos compartilhados
│   └── ui/                           # componentes reutilizáveis
├── prisma/                           # se Prisma for tecnologia confirmada
│   ├── schema.prisma
│   └── migrations/
├── docs/
│   ├── arquitetura/
│   │   └── BRAVO_II_ARQUITETURA_IMPLANTACAO.md
│   ├── rastreabilidade/
│   │   ├── requisitos-historicos.md
│   │   ├── gap-analysis.md
│   │   └── decisoes.md
│   ├── banco/
│   │   ├── inventario-modelos.md
│   │   ├── reconciliacao-prisma-sql-neon.md
│   │   └── plano-migracao.md
│   ├── seguranca/
│   │   └── matriz-permissoes.md
│   └── homologacao/
│       ├── plano-testes.md
│       └── evidencias.md
└── tests/
    ├── integration/
    ├── e2e/
    └── security/
```

Se o projeto for um único app, usar as pastas equivalentes dentro da estrutura já existente; a nomenclatura acima é **referencial**, não prescrição para refatorar a fundação.

### 5.1 Convenção interna por módulo (exemplo)

```text
modules/orders/
  application/         # casos de uso: reservar, confirmar, cancelar
  domain/              # invariantes, políticas, estados
  infrastructure/      # Prisma/repos, integrações, outbox
  presentation/        # controllers, DTOs e validação
  tests/
```

Manter separação entre **estado da reserva**, **estado do pedido**, **estado da autorização de pagamento** e **estado do ingresso**. Não colapsar todos em um único `status`.

## 6. Dados, entidades e integridade

### 6.1 Entidades conceituais (não criar em duplicidade)

| Contexto | Entidades candidatas | Dependência crítica |
|---|---|---|
| Identidade | User, Role, Permission, Membership, AuditEvent | Isolamento por produtor e perfil |
| Comercial | Producer, LegalRepresentative, BankBeneficiary, Contract, Approval | Cadastro e documentação |
| Eventos | Event, EventSession, Venue, EventApproval, PublicationRule | Status e aprovação por etapa |
| Ingressos | TicketCategory, Batch/Lot, Ticket, Coupon, ComplimentaryRule | Precificação e restrição |
| Mapas | VenueMap, MapVersion, Sector, Row, Seat, SeatAllocation | Capacidade e bloqueio atômico |
| Vendas | Cart, Hold/Reservation, Order, OrderItem, RefundRequest | Reserva, finalização e idempotência |
| Pagamentos | PaymentAttempt, PaymentEvent, AcquirerTransaction, Settlement | Webhook verificado e reconciliação |
| Bilheteria | PointOfSale, CashSession, CashMovement, OperatorAssignment | Caixa/PDV e operadores |
| Portaria | AccessCredential, ValidationAttempt, CheckIn, ValidatorAssignment | Proteção contra reentrada |
| Financeiro | LedgerEntry, Payable, Receivable, TransferRequest, Beneficiary, Bordero | Ledger e obrigação com produtor |
| SAC | SupportCase, OwnershipTransfer, Notification | Transferência controlada |
| Integração | OutboxEvent, InboxMessage, WebhookDelivery, IntegrationAttempt | Deduplicação e retries |

**Nomes ilustrativos**: primeiro mapear os nomes reais do schema e suas relações. Não impor entidades por semelhança terminológica.

### 6.2 Invariantes transacionais

1. **Assentos**: impedir duas alocações ativas para o mesmo `evento/sessão/assento` por constraint/locking transacional; definir semântica de bloqueios e expiração.
2. **Reserva**: TTL explícito e reavaliação no servidor; expiração não pode desconfirmar venda paga. Expiração deve ser idempotente.
3. **Lotes**: quantidade disponível = regra acordada entre capacidades, reservas válidas, vendas confirmadas e cancelamentos. Regras de virada configuráveis e testadas.
4. **Pagamento**: confirmação por callback/webhook validado, transições monotônicas e deduplicadas; interface do comprador não é fonte de verdade.
5. **Financeiro**: entradas imutáveis e movimentos compensatórios; separação **venda bruta, recebimento, obrigação com produtor, receitas/taxas próprias e repasse**.
6. **Cancelamento/estorno**: pedido, ingresso, gateway, conciliação e ledger precisam reconciliar estados sem baixa financeira presumida.
7. **Data e moeda**: armazenar timestamps com fuso explícito; dinheiro em centavos inteiros ou decimal de precisão definida; sem float para cálculo financeiro.
8. **Escopo de dados**: IDs de evento e produtor são verificados com autorização do usuário em todos os endpoints relevantes.
9. **Auditoria**: registrar quem/quando/o quê/antes-depois quando legalmente apropriado; evitar armazenar senha, cartão ou biometria em logs.

## 7. APIs e contratos (propostas, não endpoints existentes)

Preservar convenção de rotas e versão do backend. Os exemplos abaixo definem **capacidades** a localizar ou implementar.

| Capacidade | Exemplo de operação HTTP | Requisitos |
|---|---|---|
| Produtores | `GET /api/producers`, `POST /api/producers` | RBAC + escopo de produtor |
| Aprovação produtor | `POST /api/producers/:id/approval-decisions` | Justificativa + log |
| Eventos | `GET /api/events`, `POST /api/events` | Ciclo de vida e ownership |
| Aprovação evento | `POST /api/events/:id/approval-decisions` | Separar Comercial/Técnica/Contrato/Local |
| Lotes | `POST /api/events/:id/batches` | Capacidade + controle concorrente |
| Disponibilidade | `GET /api/sessions/:id/availability` | Resposta consistente e versionada |
| Reserva | `POST /api/reservations` | Chave de idempotência, TTL, transação |
| Pedido | `POST /api/orders` | Validação de preços/cuponagem no servidor |
| Pagamento | `POST /api/payments/webhooks/:provider` | Assinatura/autenticidade, replay protection |
| PDV/caixa | `POST /api/pos/cash-sessions` | Autorização de operador, trilha de caixa |
| Validação ingresso | `POST /api/access/check-ins` | Token seguro, evento, reentrada |
| Transferência | `POST /api/tickets/:id/transfers` | Regras por evento, verificação de elegibilidade |
| Repasse | `POST /api/finance/transfers/requests` | Aprovações, dupla assinatura, sem execução em HML |
| Auditoria | `GET /api/audit/events` | Somente perfil autorizado, filtro por escopo |

**Contrato transversal:** validação de payload, identificador de correlação, códigos de erro padronizados em pt-BR no frontend, paginação, rate limiting, idempotência para writes críticos e trilhas operacionais. Documentar com OpenAPI, se o projeto já utilizar.

### 7.1 Eventos de domínio e integrações

Eventos candidatos: `ProducerSubmitted`, `EventApproved`, `BatchActivated`, `ReservationCreated`, `ReservationExpired`, `OrderConfirmed`, `PaymentSettled`, `TicketValidated`, `TransferApproved`, `PayoutApproved`.

Publicar somente após commit (outbox transacional); consumidores devem ser idempotentes e registrar processamento (inbox/dedup). Separar **evento de domínio** de **notificação do provedor**. Tratar divergências com filas de erro/reconciliação e reprocessamento manual auditado.

## 8. Segurança, LGPD e governança

### 8.1 Matriz de acesso mínima (refinar com a organização)

| Ação | Produtor | Comercial | Operações | Financeiro Disk | SAC | Admin/Auditoria |
|---|---|---|---|---|---|---|
| Ver eventos próprios | Sim | Conforme carteira | Conforme atribuição | Conforme função | Conforme caso | Conforme permissão |
| Aprovar cadastro de produtor | Não | Sim | Não | Não | Não | Por permissão |
| Publicar evento | Solicita | Conforme etapa | Conforme etapa | Não automaticamente | Não | Por permissão |
| Ver taxa interna Disk/MDR | Não | Não por padrão | Não | Sim | Não | Somente autorizado |
| Criar solicitação de repasse | Conforme escopo | Não | Não | Sim | Não | Por permissão |
| Aprovar pagamento/repasses | Não | Não | Não | Sim com segregação | Não | Somente papel autorizado |
| Visualizar dados biométricos brutos | Não | Não | Não | Não | Não | Não por padrão |
| Consultar auditoria | Apenas atos próprios permitidos | Limitado | Limitado | Financeira autorizada | Limitado | Perfil específico |

- Implementar RBAC (papéis) + ABAC (produtor, evento, equipe, estado e alçada), aplicado **no backend**.
- Exigir segregação de funções em fluxos sensíveis e impedir autoaprovação onde não autorizada.
- Token, senha, segredo e identificadores sensíveis nunca em logs ou repositório; usar variáveis secretas do ambiente.
- CSRF/Origin/CORS devem seguir estratégia de sessão e ambiente; testar, não aplicar soluções genéricas sem conhecer a arquitetura existente.
- Para biometria: tratamento de dado pessoal sensível, avaliação jurídica, minimização, retenção, controles de acesso, fornecedor e procedimento alternativo de validação.
- Trilhas de auditoria precisam de integridade, retenção definida, monitoramento de acesso e capacidade de exportação controlada.

## 9. Integração com Financeiro/LEDGER do BRAVO_II

**Dependência estrutural:** estabilizar modelos, migrations e ledger antes de ligar emissão/repasse reais. A operação financeira deve respeitar o modelo da DiskIngressos: **valor integral da venda recebido pela Disk; obrigação distinta com o produtor; taxa/receita própria da Disk segregada**.

Fluxo lógico:

```text
Pedido confirmado
   └─> obrigação do cliente / recebível do provedor
         └─> liquidação identificada pela conciliação
               ├─> caixa/conta da Disk
               ├─> obrigação com produtor/evento
               └─> receita própria / taxas conforme contrato do evento
                         └─> solicitação de repasse
                               └─> análise / aprovação
                                     └─> assinaturas exigidas
                                           └─> execução externa autorizada
                                                 └─> conciliação final
```

Repasses, antecipações e borderôs seguem processos de autorização e assinatura aplicáveis. **Em HML, apenas simular/registrar os fluxos, nunca executar pagamento externo real.**

## 10. Implantação em pacotes e gates de liberação

### Pacote 00 — Snapshot e inventário (bloqueante)

**Objetivo:** conhecer o estado real do BRAVO_II antes de qualquer implementação.

- Criar branch de integração: `feat/bravo-ii-expansao-operacional` (se livre no repo).
- Registrar commit-base e inventário de rotas, menus, telas, APIs, entidades, migrations, testes e variáveis de ambiente (sem expor segredos).
- Identificar monorepo/stack real, auth, deploy, jobs, integrações e convenções.
- Produzir `gap-analysis.md` por módulo e mapear os itens históricos.
- Fazer backup/snapshot verificável do banco HML conforme política de infraestrutura.

**Gate 00:** nenhum requisito classificado como “já existe” sem evidência em código/endpoint/teste.

### Pacote 01 — Reconciliação técnica P0 (bloqueante para mudanças estruturais)

- Comparar **schema Prisma → migrations SQL → catálogo real do Neon HML**.
- Inventariar modelos e constraints; registrar divergências reais, sem confiar em contagem histórica.
- Verificar fallback indevido de banco em HML, validação Prisma, variáveis de conexão, deploy e observabilidade.
- Validar build, testes existentes, autenticação, autorização, CORS/Origin/CSRF e persistência.
- Corrigir somente com migrations forward-only revisadas; documentar plano de rollback/compensação e backup.

**Gate 01:** migrations consistentes, builds passando e HML persistindo em banco correto, com testes de segregação.

### Pacote 02 — Núcleo operacional

- Reaproveitar/expandir cadastro de produtores, representantes, documentos e aprovações.
- Eventos, sessões, locais, status e liberações por área.
- Lotes, ingressos, meia-entrada, cupons e cortesia; resolver a regra de virada de lote.
- Mapa e assentos com versões, constraints e testes de concorrência.

**Gate 02:** criar evento com dados persistidos, obter aprovações, configurar lote/mapa e consultar disponibilidade sem inconsistência.

### Pacote 03 — Pedidos, bilheteria e canais

- Pedidos, reserva, expiração, carrinho, transferência e histórico.
- Conectores de checkout com sandbox, webhooks verificados e idempotência.
- PDV, vínculo de setores e caixa; sincronizar reserva e venda com núcleo único.

**Gate 03:** compra teste, cancelamento/expiração e PDV sandbox sem duplicidade de assento nem divergência de total.

### Pacote 04 — Portaria, SAC e integrações especializadas

- Validação QR, atribuição de validadores, check-in e prevenção de reentrada.
- Reenvio e transferência de titularidade, workflow SAC e logs.
- Biometria somente depois de análise de privacidade, segurança e requisitos contratuais/legais.

**Gate 04:** ingresso validado uma vez conforme política, operadores com escopo, auditoria e reconciliação de sincronizações.

### Pacote 05 — Financeiro e governança

- Integrar eventos de pedido/pagamento/liquidação ao ledger estabilizado.
- Beneficiários, fornecedores, borderôs, conciliação e fluxos de repasse.
- Relatórios por evento/produtor e painel de auditoria.

**Gate 05:** fechamento teste reproduzível e reconciliável; nenhum repasse bancário real habilitado por padrão.

### Pacote 06 — Homologação e rollout controlado

- Testes E2E por perfil e por canal; carga/concorrência para reservas; performance de mapas; segurança e auditoria.
- Regressão sobre funcionalidades preexistentes; teste de migrations; análise de falhas e reconciliação.
- Preview/HML primeiro. Produção somente com aceite formal, observabilidade, backup testado e plano de reversão.

**Gate 06:** checklist integral aprovado com evidências e responsáveis definidos.

## 11. Estratégia de banco e migrações seguras

1. Capturar versão e esquema atual; documentar objetos e dependências.
2. Propor diff de dados e restrições para cada módulo; preferir extensão compatível.
3. Usar estratégia **expand → backfill validado → switch → contract** para alterações incompatíveis.
4. Cada migration deve explicar efeitos, estimativa de locks, validações, plano de retorno e impacto sobre versões simultâneas.
5. Executar primeiro em banco isolado de testes/HML, com dados artificiais ou anonimizados quando necessário.
6. **Proibido como atalho:** `prisma migrate reset`, exclusão genérica de tabelas, `db push --accept-data-loss`, limpar esquema Neon ou conectar HML ao banco de produção por fallback.
7. Verificar constraints reais, índices, unicidade, transações e permissões de usuário de banco.

## 12. Estratégia de testes e evidência operacional

| Classe | Cenário mínimo | Evidência |
|---|---|---|
| Unitários | Regras de lote, desconto, taxa, alçada e estado | Testes passando |
| Integração | API + banco + permissão + auditoria | Respostas e transações persistidas |
| Concorrência | Dois compradores tentam reservar a mesma poltrona | Exatamente um vencedor |
| Idempotência | Webhook repetido e reserva repetida | Sem duplicidade financeira ou operacional |
| Autorização | Produtor A tenta acessar evento do produtor B | 403/404 e nenhum vazamento |
| Segurança financeira | Produtor tenta ler MDR/Taxa Disk interna | Bloqueio no servidor/API |
| E2E | Produtor → evento → lote → pedido → pagamento teste → validação → borderô | Fluxo reproduzível com IDs de teste |
| Migração | Aplicação em HML com base preservada | Relatório de objetos, dados e rollback |
| Regressão | Menus/rotas e relatórios antigos | Comparativo antes/depois |
| Observabilidade | Erros, jobs, webhook e falhas de conciliação | Logs e alertas sem segredos |

**Definição de pronto de qualquer submódulo:** interface navegável, rota protegida, dados persistidos, CRUD/caso de uso testado, regras e erros exibidos, auditoria quando exigível, testes automatizados, permissões por perfil e documentação mínima. Sem isso: `parcial`, nunca `operacional`.

## 13. Riscos e decisões abertas

| ID | Risco / ponto aberto | Mitigação |
|---|---|---|
| R-01 | Não há snapshot atual do repo nesta solicitação | Gate 00 obrigatório |
| R-02 | Divergência possível entre Prisma/SQL/Neon | Gate 01 bloqueia migrações funcionais |
| R-03 | Duplicação de entidades e serviços existentes | Mapa de ownership por módulo |
| R-04 | Regra de virada de lotes não resolvida no histórico | ADR específico antes do desenvolvimento |
| R-05 | Concorrência em reservas de assento | Constraint e testes de carga/transação |
| R-06 | Divergência entre pedido, PSP e ledger | Webhook confiável + conciliação + outbox |
| R-07 | Dados biométricos sensíveis | Privacy/security review e segregação |
| R-08 | Funcionalidade do site confundida com tela de ERP | Definir fronteira: backoffice vs app público |
| R-09 | Aprovações divergentes em contratos/local/evento | Máquina de estados e matriz de alçadas |
| R-10 | HML afetar pagamentos/estornos reais | Credenciais sandbox e feature flags |

**ADRs a produzir:** ADR-001 fronteiras BRAVO_II/site/PDV/validador; ADR-002 política de reservas/lotes; ADR-003 motor de assentos; ADR-004 integração pagamentos/ledger; ADR-005 biometria/LGPD; ADR-006 política de aprovação/publicação.

## 14. Instrução-mestra para o Gemini no VS Code

> Copiar como comando de trabalho **no repositório já aberto** do BRAVO_II:

```text
PROJETO: BRAVO_II — INCORPORAÇÃO FUNCIONAL CONTROLADA

Leia docs/arquitetura/BRAVO_II_ARQUITETURA_IMPLANTACAO.md.
NÃO crie um novo projeto, não troque a stack sem auditoria, não reescreva módulos
existentes e não execute qualquer migração destrutiva.

EXECUTE PRIMEIRO APENAS O PACOTE 00 E O DIAGNÓSTICO DO PACOTE 01:
1. Identifique o commit-base, a stack real, o layout do monorepo e as ferramentas.
2. Inventarie menus, páginas, APIs, módulos, autenticação, guards, roles e testes.
3. Conte modelos Prisma reais, liste migrations e descreva como comparar com Neon
   HML sem expor credenciais ou modificar a base.
4. Mapeie requisitos históricos a funcionalidades existentes, parciais e ausentes.
5. Gere os arquivos de inventário, lacunas, riscos e plano de implementação.
6. Faça somente correções P0 comprovadas, pequenas e seguras, com testes e diffs
   revisáveis. Antes de migrações estruturais, deixe a proposta para aprovação.
7. Execute lint, typecheck, testes e build que realmente existirem; reporte
   comandos, resultados e bloqueios. Não simule sucesso.

FORMATO DA ENTREGA:
- Arquivos alterados e motivo de cada alteração
- Menus/telas/APIs/modelos já existentes e ausentes
- Inconsistências e prioridades P0/P1/P2
- Testes efetivamente executados e resultados
- Evidência da persistência HML, se acesso seguro estiver disponível
- Próximo pacote apto a começar e dependências pendentes

RESTRIÇÕES:
- Não publicar em produção.
- Não executar repasses, estornos ou cobranças reais.
- Não gravar segredos ou dados sensíveis no repositório.
- Preservar interface pt-BR.
- Não considerar telas vazias como funcionalidade concluída.
```

## 15. Checklist de aceitação da implantação

- [ ] Repositório e stack reais inventariados; commit-base registrado.
- [ ] Todos os apontamentos históricos catalogados com origem e tratamento.
- [ ] Nenhum módulo ou entidade duplicado sem justificativa documentada.
- [ ] Modelos Prisma, migrations e Neon HML reconciliados.
- [ ] Backend sem fallback indevido de banco e sem segredo exposto.
- [ ] Perfis e escopos testados no backend.
- [ ] Reserva de assentos protegida contra concorrência.
- [ ] Checkout/PSP/PDV em sandbox com eventos idempotentes.
- [ ] Ledger concilia vendas, recebimentos, obrigações e receita própria.
- [ ] Borderôs refletem fontes verificáveis e aprovações registradas.
- [ ] Auditoria cobre ações sensíveis com acesso restrito.
- [ ] Biometria condicionada a avaliação e controles específicos.
- [ ] UI pt-BR e menus funcionais por perfil.
- [ ] Testes de regressão completos e evidências anexadas.
- [ ] Preview/HML homologado antes de qualquer rollout de produção.

## 16. Resultado esperado e limite desta entrega

Este arquivo é **o plano técnico de implantação**, pronto para ser incluído em `docs/arquitetura/` e usado como referência pelo Gemini no VS Code. **Não** afirma que a incorporação foi realizada, que as 55 entidades existem, que o banco foi testado ou que sistemas externos foram integrados.

A execução técnica deve começar pelos **Pacotes 00 e 01**, avançando aos demais somente após os gates definidos. A incorporação final deve usar o código do BRAVO_II como fonte de verdade estrutural e o documento histórico como fonte de necessidades de negócio.

---

**Origem dos requisitos:** `Texto colado(4).txt` (registros operacionais de 31/01/2025 a 21/01/2026).  
**Recomendações de arquitetura, organização, APIs, entidades e gates:** propostas técnicas deste documento, sujeitas à auditoria do repositório.
