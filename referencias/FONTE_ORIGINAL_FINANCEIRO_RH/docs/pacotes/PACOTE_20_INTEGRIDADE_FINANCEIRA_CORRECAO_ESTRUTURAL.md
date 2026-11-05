# Pacote 20 — Integridade Financeira e Correção Estrutural

## Escopo executado
Este pacote não cria menus. Corrige regras financeiras e impede estados inválidos no protótipo.

### Correções aplicadas
- Transferência entre eventos calcula `base financeira - reservado - retido - bloqueado` e exibe o valor transferível.
- Transferência registra uma única partida balanceada vinculada a um protocolo, em vez de duplicar lançamentos equivalentes.
- Aprovação/rejeição exigem estado compatível; operações pagas/rejeitadas não podem ser decididas novamente.
- Assinatura do Financeiro continua bloqueada antes da assinatura do Produtor e agora também bloqueia assinatura duplicada/status incompatível.
- Liquidação duplicada é bloqueada por status/data/id de liquidação.
- Segregação de funções: criador não decide a própria operação; aprovador não liquida a mesma operação, inclusive para Administrador.
- Checklist deixou de usar `true` fixo para dados bancários, regularidade e limite; as validações passam a ser derivadas dos dados disponíveis.
- Liquidação da demo não declara conciliação bancária real: o Ledger fica pendente de retorno/API homologada.
- Corrigidas chamadas do front para os métodos reais de assinatura (`signByProducer` / `signByDisk`).
- Schema Prisma alterado de `Float` para `Decimal` nos campos numéricos financeiros/percentuais existentes.
- Backend de homologação teve contratos alinhados com o `WorkflowEngine` estático, login desconhecido deixou de receber perfil Financeiro automaticamente e CORS deixou de ser `*`.

## Validação automatizada
`node tests/integridade-financeira.test.mjs`

Cobre: fórmula do transferível; checklist; estado de aprovação; ordem de assinatura; liquidação duplicada; segregação aprovação/liquidação.

## Limite explícito
PIX, CNAB, Autentique, certificado digital e conciliação bancária continuam sem homologação externa real. Este pacote impede que a demo apresente essas etapas como confirmação bancária real.

## Backend
O código TypeScript foi corrigido estruturalmente, porém a compilação do backend não foi declarada como validada nesta entrega porque a instalação das dependências do backend excedeu o tempo disponível no ambiente de geração. O build estático do front e os testes Node do motor local foram executados com sucesso.
