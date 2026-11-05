# Pacote 01 — Arquitetura, perfis e fonte única da verdade

## Estrutura-alvo

```text
bravo-ii/
  apps/
    backoffice/        # UI pt-BR Next.js para o ERP interno
    api/               # NestJS: monólito modular
    workers/           # webhooks, notificações, tarefas idempotentes
    pdt-adapter/       # integração com o PDT existente
    pdv/               # canal de venda presencial
    disk-ponto/        # aplicativo móvel RH modernizado
  packages/
    ui/                # design system compartilhado
    contracts/         # schemas, DTOs, eventos de domínio
    permissions/       # matriz RBAC/ABAC e alçadas
    observability/     # trilhas de auditoria e métricas
  database/
    migrations/        # PostgreSQL + DDL versionado
  docs/
    runbooks/adr/
```

## Limites de domínio

- **Identidade:** usuários, organizações, papéis, políticas e sessões. Funcionários não herdam acesso financeiro por pertencer à empresa.
- **Comercial/Produtores:** cadastros oficiais, contratos e acordos de taxa POR EVENTO, sem duplicidade em Financeiro.
- **Eventos/Vendas:** publica eventos e gera vendas/pagamentos; Financeiro recebe eventos transacionais confiáveis.
- **Financeiro Disk:** ledger imutável, posição financeira, provisões, MDR, spread, rebate, advanced, recebíveis, estornos, repasses, tesouraria, conciliação, controladoria, relatórios, governança.
- **RH & DP:** colaboradores, vínculos, cargos, admissões, férias, atestados, escalas, ponto, benefícios, folha, eSocial e desligamentos. Dados pessoais especialmente sensíveis isolados por regra e por recurso.
- **Staff Eventos:** alocação de temporários, freelancers, jornadas e despesas do evento; publica valores APROVADOS para obrigações no Financeiro.
- **Contabilidade:** centro de custo empresarial versus centro de custo evento, reconciliados, sem confundir faturamento com receita da Disk.

## Banco de dados

**Novo PostgreSQL** como fonte canônica. Existem **três modelos Prisma na referência** (`database/`, `prisma/` e `RH_DISK_V1/prisma/`): analisar e consolidar, NÃO concatenar arquivos e NÃO criar bancos independentes de pessoas/pagamentos. Introduzir migrations somente após desenho conceitual e testes.

## Perfis mínimos e permissão

| Papel | Vê | Pode aprovar | NÃO pode |
|---|---|---|---|
| Financeiro Disk | Financeiro geral e total autorizado de folha | Repasses, antecipações, estornos e lote RH de acordo com alçada | Ativar pagamento sem liquidação confirmada; abrir atestados sem autorização |
| RH & DP | Pessoas, documentos, folha, ponto | Ajustes e folha por alçada | Executar pagamentos bancários; ver dados comerciais restritos |
| Gestor | Sua equipe e pendências | Solicitações subordinadas autorizadas | Autoaprovar pedidos próprios |
| Colaborador | Seus dados, ponto e holerites | Solicitações próprias | Ver informações de colegas |
| Produtor | Seus eventos e saldos autorizados | Assinar solicitações suas | Ver RH corporativo, Taxa Disk interna ou outros produtores |
| Auditor | Logs por escopo | Não aprova operações | Alterar registros auditados |
| Administrador | Configuração de políticas | Conforme alçada explícita | Desconsiderar segregação de funções |

## Passagem RH → Financeiro

1. RH calcula folha ou despesa de staff e submete para revisão de RH.
2. RH autorizado aprova o lote; genera `rh_batch_id` imutável, competência, centro de custo, valor em centavos, hash de totalização e auditoria.
3. Publica evento `rh.pagamento_aprovado.v1`, com chave de idempotência.
4. Financeiro gera instrução de tesouraria **PENDENTE_APROVACAO_FINANCEIRA**, analisa saldo, retenções e alçada.
5. Financeiro distinto do solicitante aprova; instrução é agendada/enviada somente por integração homologada e explicitamente habilitada.
6. Apenas confirmação do banco/adquirente registra `LIQUIDADO`. Falhas e retornos são conciliados e auditados.
7. RH consulta status do lote e recibos conforme permissões; dados médicos/CPF não trafegam no evento de integração.

## Critérios de aceite do Pacote 01

- 149 entradas preservadas e identificadas; 16 grupos financeiros, 1 RH; 45 opções RH.
- Fonte imutável, hash e testes de origem executados.
- Navegação por perfil, rotas e permissões definidas; sem segundo login por menu.
- Banco mestre de funcionários e empresas desenhado; políticas de confidencialidade explícitas.
- Serviços produtivos ainda **desligados**.
