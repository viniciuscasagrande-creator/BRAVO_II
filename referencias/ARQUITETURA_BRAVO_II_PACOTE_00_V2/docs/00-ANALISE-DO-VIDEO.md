# 00 — Análise do vídeo legado SIGE

**Fonte**: gravação de tela de 408 segundos, 1902x974, aproximadamente 30 fps. Para avaliação, foram extraídos quadros a cada 4s e inspecionadas capturas de maior resolução em transições e operações de interesse. A análise é **visual**. Não demonstra a estrutura do banco, a correção de cálculos, autenticação de API ou comportamento de servidor. Dados pessoais visíveis na gravação não são reproduzidos neste documento.

## Evidências com temporalidade aproximada

| Trecho | O que é visível | Implicação para BRAVO_II |
|---|---|---|
| 00:00–00:40 | Busca de clientes por documento/nome/telefone, abertura de cadastro com informações pessoais e endereço, abas de preferências, comentários e histórico de pedidos | Central de Clientes unificada, busca segura, ficha cadastral e linha do tempo transacional; dados pessoais mascarados por perfil |
| 00:40–01:08 | Navegação de menus antigos de Caixa/Vendas; tela de pedido com status de orçamento, identificação de cliente, vendedor, ponto de venda e abas de informações, pagamentos, entrega, anotações e logs | Pedido deve ter ciclo de vida explícito, canal de origem, operador e histórico; evitar pedidos parcialmente gravados |
| 01:08–02:16 | Tentativas de associar cliente/evento e selecionar ingresso ao pedido; janelas de confirmação e buscas aninhadas; longos carregamentos em alguns momentos | Reorganizar fluxo de vendas com seleção orientada, prevenção de erros, feedback assíncrono e tempo de resposta mensurável |
| 02:16–03:20 | 'Gerar Cupons de Desconto'; seleção de sessão, evento, modalidade e quantidade, uso de filtros e resultado com componentes de desconto | Central de Cupons distinta da emissão de Cortesias; limites, validade, orçamento e auditoria |
| 03:20–03:56 | 'Procurar Ticket' por série, evento, pedido, modalidade, status, PDV e datas; exibição de totais por situação e detalhe do ingresso | Busca única de ingressos, status canônico e operações permitidas conforme perfil e estado |
| 03:56–04:28 | Menus antigos de Ticket, Eventos, E-commerce, Estoque, Entregas, Cartão, Financeiro e Relatórios, entre outros | Reorganização por processo/área e não por janelas técnicas; inventariar funções legadas antes de retirar menus |
| 04:28–05:20 | 'Procurar Evento', escolha de evento e carregamento da ficha; múltiplos indicadores de carregamento | Lista de eventos com filtros, status, atalhos, edição orientada e otimização de carregamento |
| 05:20–05:44 | Aba Cadastro do Evento: identificação, local, status, grupo, venda, datas, modalidades, limite, canais (site e PDVs), métodos de pagamento | Event Builder dividido em cadastro, sessões, estoque, comercial, canais, publicação e monitoramento |
| 05:44–05:56 | Abas Imagens, Site, Classificação, Documentação e outras | Conteúdo/publicação com validações e workflow de aprovação; documentos em repositório versionado |
| 05:56–06:24 | Aba Produtores: produtor principal e secundários, responsáveis e extensa matriz de permissões (relatórios, editar preços/áreas, cortesias, vendas etc.) | Relação muitos-para-muitos evento–produtor; RBAC + autorização contextual por evento; perfis administráveis e auditáveis |
| 06:24–06:32 | Abas de produtos/integrações do evento, algumas listas vazias | Inventariar integrações e funcionalidades opcionais, sem recriar menus vazios sem finalidade |
| 06:32–06:40 | Estrutura/áreas: quantidades, bloqueio, preços por modalidade, taxas por ponto de venda | Inventário transacional e mapa de assentos/áreas; separar preço do ingresso, Taxa Disk e custos por canal |
| 06:40–06:48 | Log com data, usuário, ação e descrição; eventos de mudança no cadastro | Criar log estruturado e imutável com antes/depois, ator, contexto, correlação e razão da alteração |

## Inventário visual de itens legados
Menu principal observado: Clientes, Caixa, Vendas, Ticket, Eventos, Ecommerce, Estoque, Entregas, Cartão, Financeiro, Ocorrências, Mensagens, Banco de Imagens, Configuração, Relatórios, Controle de Acesso, Janelas e Ajuda. A presença no menu **não comprova** que todos os módulos funcionem integralmente.

Ficha de evento observada com abas: Cadastro, Imagens, Informações, Site, Classificação, Produtores, Documentação, Log Produtores, Estrutura, Venda Rápida, Agendamentos e Log, além de ações de Borderô e Despesas. Essa observação é importante para a migração: essas capacidades não podem desaparecer simplesmente porque a navegação será reestruturada.

## Problemas de experiência visíveis (não é diagnóstico de infraestrutura)
- Janela principal cinza com janelas menores, pouco aproveitamento do espaço e dificuldade de contexto.
- Campos e permissões numerosos, apresentados sem agrupamento suficiente para decisões críticas.
- Busca de evento/cliente como modal dentro de outros modais; confirmações repetidas.
- Carregamento sem informação contextual ou prazo, em especial ao abrir evento.
- Distinção pouco evidente entre ações de cadastro, venda, autorização, cancelamento e auditoria.
- Taxas e preços próximos na mesma tela, favorecendo confusão entre base de cálculo e encargos.
- Logs exibem, em certas linhas, nomes de propriedades internas; devem ser traduzidos para ações humanas e ter detalhe técnico separado.

## O que o vídeo não comprova
Não permite afirmar regras de cálculo vigentes, estado das integrações do site, esquema SQL, integridade contábil, funcionamento dos gateways, certificados, LGPD, SLA existente, assinatura digital, conciliação ou atual operação dos módulos não abertos. Esses pontos exigem código, bancos, documentação e testes.

## Regra de preservação
Para cada ação do legado documentar **origem → ação → entidade → destino → autorização → auditoria → equivalência no BRAVO_II**. Não remover funcionalidades por não terem sido demonstradas no vídeo. A reconstrução deve ser baseada em inventário e teste de paridade, nunca apenas na aparência das telas.
