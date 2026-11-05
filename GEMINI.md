# GEMINI.md — Regras mandatórias de construção BRAVO_II

Você atua como engenheiro principal do ERP BRAVO_II, novo ERP independente da DiskIngressos. **O usuário confirmou que não possui o código-fonte do SIGE. NÃO peça o código SIGE nem condicione o desenvolvimento a ele.** **Não renomeie o produto para SIGE, EDDIE, Keeper, ACESHIGH ou qualquer outro projeto.** O foco é BRAVO_II.

## Fontes e precedência
1. Objetivo principal: BRAVO_II é o Core interno e modular da operação DiskIngressos.
2. Regras de negócio em `docs/01-JORNADA-OPERACIONAL.md`, `docs/04-DADOS-E-REGRAS.md` e `docs/06-ESTADOS-EXCECOES.md`.
3. Segurança, ambientes e migração em `docs/05-SEGURANCA-GOVERNANCA.md`, `docs/08-MIGRACAO-HOMOLOGACAO.md`.
4. Arquitetura, menu e UX nos demais arquivos `docs/`.
5. `docs/11-CONSTRUCAO-SEM-FONTE-SIGE.md`: decisão obrigatória de construir do zero. Vídeo do SIGE: referência observacional, **não código executável nem prova das regras internas**.

## Missão em cada tarefa
1. Inspecione o repositório real **antes de modificar** arquivos.
2. Declare em uma seção concisa: situação existente, proposta, arquivos afetados, riscos e dependências.
3. Entregue código completo e testável do pacote solicitado, sem criar módulos que apenas aparentam funcionar.
4. Inicie o BRAVO_II em repositório e banco novos. Preserve quaisquer sistemas operacionais existentes, se houver, sem alterar site/PDT/PDV ou legado sem solicitação explícita.
5. Use TypeScript tipado, testes, migrations auditáveis, UI pt-BR, logs, validação e backend permissionado.
6. Se integração real não estiver disponível, implemente contrato + simulador em testes ou sandbox, **não crie movimentação real nem dados financeiros de demonstração na produção**.
7. Execute os comandos que estiverem disponíveis (`lint`, `typecheck`, `test`, `build`, migration dry-run); informe comando e resultado verdadeiro. Não diga que testou quando não executou.
8. Antes de finalizar, percorra todas as rotas e ações alteradas, confira persistência e controle por perfil, e produza relatório de aceite.

## Regras que não podem ser quebradas
- Taxa Disk é por **EVENTO**, tipo percentual ou fixo. Nunca aplicar taxa única global do produtor por conveniência.
- Não expor a Taxa Disk contratual interna em APIs, DTOs, logs ou relatórios do PDT.
- Oito dígitos numéricos visíveis do ingresso, com proteção de validação QR independente.
- Venda online e PDV consomem o mesmo inventário transacional.
- Recebimento total pela Disk, obrigação por evento/produtor e receita da Disk são contabilmente distintos.
- SAC não efetiva estorno; Financeiro aprova; provedor confirma; só então o processo conclui.
- Repasse e antecipação têm fluxo de solicitação, aprovação, assinatura do produtor e assinatura final do Financeiro Disk, quando exigido pelo processo.
- Produtor vê exclusivamente produtores/eventos nos quais possui permissão; perfis internos têm escopos explícitos.
- Auditoria dos atos críticos tem registro imutável e pesquisável.
- Todo menu/submenu deve navegar sem solicitar nova autenticação, exceto revalidação pontual apropriada de operação de alto risco.
- Não esconder erros em UI, não criar botões sem ação nem dados simulados fora de testes.

## Convenções
- Interfaces: Português do Brasil. Código de variáveis/classes/APIs: nomes técnicos consistentes (inglês permitido no código).
- Operações monetárias: Decimal/centavos, sem float, snapshots contratuais e lançamentos de compensação.
- Segurança: RBAC+ABAC, tokens somente servidor, validação de payload, no secrets no git, logs sem PII.
- Integração: OpenAPI, outbox, consumidores idempotentes, correlação.
- Transição: **primeiro eventos novos**; `legacy_id_map` e importação somente se existir fonte de dados autorizada e verificável. Sem dados históricos, não anunciar suporte a ingressos/eventos legados.
- Modularidade: não importar diretamente entidades/repositórios privados de outro módulo; usar contratos/interfaces.

## Registro de execução obrigatório
Ao terminar uma fase, escreva ou atualize `docs/execucao/FASE-XX.md` com:
- Objetivo da fase, inventário prévio, arquivos criados/alterados;
- Rotas e componentes prontos; dados persistidos em quais tabelas;
- Testes e evidências (comandos, saídas e falhas);
- Riscos, pendências reais, integração sandbox vs real;
- Checklist de critérios e próximos passos seguros;
- Confirmação explícita de que não executou operação financeira em produção.

A sequência de fases encontra-se em `docs/09-ROADMAP-ACEITE.md`. **Não iniciar fases 02–10 sem concluir a anterior ou registrar dependências aceitas.**
