# BRAVO_II — PACOTE DE CORREÇÃO: CRIAÇÃO DAS TELAS FUNCIONAIS

**Versão:** 1.0 — 09/11/2026  
**Destino:** repositório BRAVO_II existente, via VS Code + Gemini  
**Complementa:** `BRAVO_II_ARQUITETURA_IMPLANTACAO.md`  
**Tipo:** ordem de implementação, não relatório de execução. Nenhum arquivo do repositório foi alterado por este documento.

## 0. Ordem direta ao Gemini

> **CORREÇÃO DE ESCOPO — EXECUTAR, NÃO APENAS PLANEJAR.** O trabalho anterior inseriu menus, mas deixou páginas inexistentes, vazias ou incompletas. Sua tarefa agora é **CRIAR AS TELAS REAIS DE CADA MENU E SUBMENU NO REPOSITÓRIO EXISTENTE DO BRAVO_II**, conectá-las à navegação e implementar os fluxos funcionais. Não entregar somente rotas, cartões vazios, placeholders, dados simulados, wireframes ou documentos. Reutilize telas existentes que já funcionam e corrija as incompletas. Não crie outro projeto. Não substitua o stack sem necessidade. Não destrua dados.

**Critério absoluto:** menu só conta como entregue quando abrir uma página renderizada e utilizável, com ações concretas, permissões, carregamento, estados vazio/erro/sucesso, integração com backend e persistência nos casos de cadastro/movimentação. Recursos externos sem credencial ou contrato devem ter configuração real e estado explícito `Integração não configurada`, jamais sucesso fictício.

## 1. Passos de execução obrigatórios, nesta ordem

1. Abra o workspace **atual** do BRAVO_II. Não crie novo repositório ou app paralelo.
2. Leia `package.json`, rotas atuais, componentes de layout, menus, autenticação, middleware/guards, endpoints, schema Prisma, migrations, testes e variáveis documentadas (sem expor segredos).
3. Crie `docs/implantacao/MATRIZ_TELAS_BRAVO_II.md` com **todos** os itens da seção 3 deste documento. Para cada item marque `existente funcional`, `existente incompleta`, `inexistente`, `dependência externa` e a rota real identificada.
4. Antes de escrever, compare cada tela com páginas já presentes; **preserve código e estilos funcionais**. Se existir rota de menu sem página, implemente a página. Se existir página vazia, complete-a.
5. Implemente por **fatias verticais**: frontend da tela + componentes + validação + servidor/serviço + persistência + autorização + teste. Não criar dezenas de páginas fake para contar cobertura.
6. Execute lint, typecheck, build e testes a cada fatia; corrija falhas antes de avançar. Use comandos reais do `package.json`, nunca invente scripts.
7. Liste ao final de cada fatia os **arquivos criados/alterados**, rotas abertas, endpoints conectados, cenários testados, erros restantes e evidências. Não escreva "100% funcional" sem prova.
8. Siga avançando pelas telas da matriz; não interrompa depois de produzir o menu nem trate uma landing page genérica como substituto de páginas distintas.

**Bloqueios técnicos:** não executar `prisma migrate reset`, `db push --force-reset`, exclusão de tabela, transferência financeira real, estorno real, cobrança real, disparo real ou biometria real. Revisar a divergência histórica entre contagens de modelos Prisma; considerar apenas a contagem efetivamente verificada. Testar schema/migrações em homologação antes de qualquer alteração estrutural. Se houver bloqueio de credencial, concluir a interface, contratos e estado seguro desabilitado; identificar a dependência.

## 2. Padrão OBRIGATÓRIO de tela real

Cada tela de listagem deve ter: título e breadcrumbs, descrição curta, botão principal com ação concreta, filtros e busca ligados a dados, tabela/lista com paginação ou carregamento incremental, indicador de carregamento, estado vazio honesto, erro com tentativa de recarregar, ações por linha (ver/editar quando permitidas), rótulos pt-BR, controle de acesso. KPIs apenas com agregações reais, sem valores inventados.

Cada tela de cadastro/edição deve ter: formulário com campos e máscaras pertinentes, obrigatoriedade e mensagens de validação, salvar/cancelar, feedback do servidor, prevenção de envio duplo, atualização da listagem, detalhe consultável, tratamento de concorrência e log de alteração quando relevante.

Cada tela operacional (aprovação, pagamento, reserva, acesso etc.) deve incluir: status, transições explícitas permitidas, confirmação de ações críticas, autorização no backend, idempotência, erros e auditoria, além das regras de domínio da seção 4.

**Proibido:** `onClick={() => {}}`, botão sem função, `href="#"`, rota que leva a 404, `console.log` fingindo salvar, modal sem confirmação efetiva, listas preenchidas com arrays fictícios em produção, telas com "Em breve" tratadas como entregues, permissões aplicadas só na interface.

## 3. MATRIZ OBRIGATÓRIA — telas, funções e ações

A matriz é o **mínimo de escopo de interface** proveniente dos requisitos históricos. Se a navegação atual usa nomes ou agrupamentos diferentes, preservar o layout existente e mapear a mesma capacidade funcional, sem duplicar menus. Rotas abaixo são **sugestões lógicas**, não caminhos preexistentes confirmados.

### A. COMERCIAL E PRODUTORES

| ID | Tela / rota sugerida | Conteúdo mínimo da tela | Ações reais obrigatórias |
|---|---|---|---|
| COM-01 | Produtores `/comercial/produtores` | Lista, CPF/CNPJ autorizado, nome, status, período, responsável | Buscar, filtrar, abrir ficha, iniciar cadastro |
| COM-02 | Novo/Editar Produtor `/comercial/produtores/novo` | PF/PJ, dados legais, responsável, endereço, contatos, arquivos e validações | Salvar rascunho, anexar, submeter, editar conforme status |
| COM-03 | Detalhe do Produtor `/comercial/produtores/:id` | Abas geral, documentos, eventos, contas, contratos, histórico | Editar, consultar vínculos, abrir pendências |
| COM-04 | Aprovação de Produtores `/comercial/aprovacoes` | Pendentes, documentos, responsável, prazo, histórico | Aprovar/reprovar com justificativa, notificar, auditar |
| COM-05 | Negociações e Planos `/comercial/negociacoes` | Condições comerciais e planos por produtor/evento | Registrar/editar negociação autorizada, versionar |
| COM-06 | Contratos `/comercial/contratos` | Lista, documentos, partes, status de assinaturas | Criar minuta/registro, enviar à assinatura se integrado, acompanhar |
| COM-07 | Contas e Beneficiários `/comercial/beneficiarios` | Dados bancários protegidos, titularidade, contas de terceiros | Adicionar/verificar/editar conforme autorização; registrar trilha |

### B. EVENTOS, SESSÕES, LOTES E INGRESSOS

| ID | Tela / rota sugerida | Conteúdo mínimo | Ações reais obrigatórias |
|---|---|---|---|
| EVT-01 | Eventos `/eventos` | Lista, produtor, local, data, sessões, status | Buscar, filtrar, abrir, iniciar evento |
| EVT-02 | Criar/Editar Evento `/eventos/novo` | Identificação, produtor, local, datas, capacidade, políticas | Validar, salvar rascunho, editar, submeter |
| EVT-03 | Detalhe do Evento `/eventos/:id` | Resumo com abas sessões, ingressos, vendas, aprovações e histórico | Navegar em cada aba com dados do evento |
| EVT-04 | Sessões `/eventos/:id/sessoes` | Lista, horário, local, capacidade, status | Criar, editar, ativar/desativar com guardas |
| EVT-05 | Lotes `/eventos/:id/lotes` | Lote, vigência, disponibilidade, quantidade, preço sem arredondamento indevido | Criar, editar, configurar virada e validar disponibilidade |
| EVT-06 | Categorias e Preços `/eventos/:id/ingressos` | Categorias, regras de meia-entrada, limites, titularidade | Criar/editar, configurar restrições, auditar |
| EVT-07 | Cupons `/eventos/:id/cupons` | Código, validade, limite, sessões, regras | Criar, ativar, revogar, testar elegibilidade |
| EVT-08 | Cortesias `/eventos/:id/cortesias` | Emissões por setor, identificação, restrição de transferência | Emitir via fluxo autorizado, listar, bloquear quando permitido |
| EVT-09 | Aprovações de Evento `/eventos/:id/aprovacoes` | Fluxos independentes: comercial, contrato, técnica e local | Aprovar/reprovar, registrar responsável/data/motivo |
| EVT-10 | Locais `/eventos/locais` | Locais, capacidades, contatos, autorizações | Criar/editar local; autorizar uso conforme política |

### C. MAPAS, ASSENTOS E RESERVAS

| ID | Tela / rota sugerida | Conteúdo mínimo | Ações reais obrigatórias |
|---|---|---|---|
| MAP-01 | Construtor de Mapas `/mapas` | Canvas editor de setores, filas, assentos, identificação e zoom; estado versionado | Criar, salvar, editar, duplicar, excluir com validações, pré-visualizar |
| MAP-02 | Mapa do Evento `/eventos/:id/mapa` | Layout aplicado, ocupação, vendidos/reservados, legenda | Vincular versão permitida, consultar ocupação real, impedir colisões |
| MAP-03 | Reservas de Assentos `/eventos/:id/reservas` | Lista de reservas, expiração, pedido, assentos e situação | Consultar, cancelar/liberar com regras e auditoria |
| MAP-04 | Diagnóstico de Assentos `/relatorios/assentos` | Pesquisa por evento de possíveis duplicidades e inconsistências | Executar consulta, abrir pedido/assento e exportar se autorizado |

### D. PEDIDOS, VENDAS, CHECKOUT E PAGAMENTOS

| ID | Tela / rota sugerida | Conteúdo mínimo | Ações reais obrigatórias |
|---|---|---|---|
| PED-01 | Pedidos `/pedidos` | Lista por evento, consumidor autorizado, canal, status, valor, pagamento | Buscar, filtrar, abrir pedido |
| PED-02 | Detalhe do Pedido `/pedidos/:id` | Titular, ingressos, sessão, fila/poltrona, cobranças, eventos, histórico | Consultar, ações autorizadas e auditadas |
| PED-03 | Criar Pedido Administrativo `/pedidos/novo` | Seleção de evento, ingresso, cliente, limites, disponibilidade e modalidade | Adicionar/remover com cálculo transacional, submeter sem duplicar |
| PED-04 | Reservas e Desistências `/pedidos/reservas` | Reservas por prazo, carrinhos abandonados, vínculo com pedido | Cancelar/liberar, converter parcialmente quando suportado |
| PED-05 | Cupons e Descontos `/vendas/descontos` | Regras por evento/sessão, validade, utilização | Configurar e consultar efeitos reais |
| PED-06 | Pagamentos `/pagamentos` | Autorização, captura, status, meio de pagamento, webhooks | Consultar, reconciliar; nenhuma captura/estorno real por padrão |
| PED-07 | Métodos e Tarifas `/pagamentos/configuracoes` | Adquirente, bandeira, parcelamento, MDR e taxa por escopo | Editar apenas perfil autorizado, simular cálculo sem transação real |
| PED-08 | Transferências de Titularidade `/pedidos/transferencias` | Origem, destino, prazo, contagem de transferências, bloqueios | Solicitar, aprovar/negar quando autorizado; validar regras |

### E. PDV, BILHETERIA E PORTARIA

| ID | Tela / rota sugerida | Conteúdo mínimo | Ações reais obrigatórias |
|---|---|---|---|
| PDV-01 | Pontos de Venda `/pdv/pontos` | PDVs, eventos, setores autorizados, responsáveis | Criar, editar, ativar/desativar e vincular setores |
| PDV-02 | Operadores `/pdv/operadores` | Usuários, perfil, pontos e eventos autorizados | Vincular/desvincular, auditar |
| PDV-03 | Caixa `/pdv/caixa` | Abertura, movimentos, fechamento, divergências | Abrir/fechar com conferência; sem lançamentos fictícios |
| PDV-04 | Vendas no PDV `/pdv/vendas` | Histórico de vendas presenciais e impressão | Consultar, registrar venda somente se integrado e homologado |
| PRT-01 | Validações `/portaria/validacoes` | Ingressos, estado de validação, dispositivo e data | Buscar, investigar acesso, registrar correções autorizadas |
| PRT-02 | Usuários Validadores `/portaria/validadores` | Vinculação de usuários, eventos e portões | Criar/vincular/desvincular permissões |
| PRT-03 | Regras de Acesso `/portaria/regras` | QR dinâmico, validação exclusiva, bloqueios e políticas | Configurar e versionar política por evento |
| PRT-04 | Reconhecimento Facial `/portaria/facial` | Configuração, contagens de elegibilidade/cadastro, status do provedor | Configurar integração, consultar agregados autorizados; NÃO exibir biometria bruta |

### F. FINANCEIRO, ATENDIMENTO, RELATÓRIOS E ADMINISTRAÇÃO

| ID | Tela / rota sugerida | Conteúdo mínimo | Ações reais obrigatórias |
|---|---|---|---|
| FIN-01 | Visão Financeira `/financeiro` | Indicadores reais de vendas, recebimentos, obrigações e receita Disk separados | Filtrar produtor, evento, período; aprofundar composição |
| FIN-02 | Ledger `/financeiro/ledger` | Movimentos imutáveis, origem, contraparte, referências | Consultar, pesquisar, rastrear origem; ajuste só por lançamento compensatório autorizado |
| FIN-03 | Repasses `/financeiro/repasses` | Solicitações, beneficiários, saldos, estados de aprovação/assinatura | Solicitar, analisar, aprovar/reprovar, assinar em ordem, sem transferência real automática |
| FIN-04 | Despesas e Fornecedores `/financeiro/despesas` | Despesas, vencimentos, fornecedores, contas e comprovantes | Cadastrar, consultar, submeter aprovação |
| FIN-05 | Borderôs `/financeiro/borderos` | Por evento, receitas/deduções, responsáveis, assinaturas | Gerar preview a partir de dados reais, revisar e aprovar conforme política |
| FIN-06 | Conciliação `/financeiro/conciliacao` | Pedido x gateway x ledger x banco, divergências | Listar, classificar, reconciliar com evidência, sem lançamentos fictícios |
| SAC-01 | Clientes `/sac/clientes` | Pesquisa segura, tickets/pedidos autorizados, contatos | Consultar e abrir atendimento; mascarar dados conforme perfil |
| SAC-02 | Ocorrências `/sac/ocorrencias` | Fila, prioridade, responsável, status, histórico | Criar, atribuir, comentar, resolver, reabrir conforme permissão |
| SAC-03 | Reenvio de Ingressos `/sac/reenvios` | Pedido, titular, canal e histórico de envios | Validar titularidade, solicitar envio com provedor configurado; auditar |
| REL-01 | Central de Relatórios `/relatorios` | Catálogo de relatórios filtrado por perfil | Abrir relatório, filtrar e exportar autorizado |
| REL-02 | Vendas e Ingressos `/relatorios/vendas` | Vendas por evento/canal/lote, reservas e cortesias | Filtrar, detalhar, exportar |
| REL-03 | Acessos `/relatorios/acessos` | Check-ins válidos por evento, data, portaria | Filtrar, agregar, exportar |
| ADM-01 | Usuários e Perfis `/administracao/usuarios` | Usuários, funções, status, escopo, permissões | Criar/editar, bloquear, conceder/revogar acesso |
| ADM-02 | Tarefas e Notificações `/administracao/tarefas` | Responsável, prazo, origem, status, alertas | Criar, atribuir, concluir, registrar histórico |
| AUD-01 | Auditoria `/auditoria/logs` | Ator, data, ação, entidade, resultado, identificador de correlação | Buscar, filtrar, inspecionar, exportar conforme autorização |
| AUD-02 | Integrações `/auditoria/integracoes` | Webhooks, retries, falhas, idempotência, rastreio | Consultar, reprocessar apenas com permissão e segurança |

**Total mínimo da matriz: 53 telas funcionais distintas**. O número é a contagem das linhas de tela propostas nesta matriz, **não a contagem de modelos Prisma** nem de telas já existentes. O Gemini deve atualizar a contagem conforme o inventário do código, sem reduzir cobertura funcional.
