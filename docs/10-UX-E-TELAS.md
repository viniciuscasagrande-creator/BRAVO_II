# 10 — Diretrizes visuais, telas e navegação

## Estilo
ERP moderno de operação, layout claro profissional, navegação lateral expansível com grupos por área, barra superior com busca global e contexto de produtor/evento, breadcrumbs, resumo operacional, cartões de indicadores reais e tabelas somente onde apoiam decisões. Alta densidade de informação **organizada**, sem janelas sobrepostas estilo SIGE. Design system acessível e responsivo, pt-BR, datas `dd/mm/aaaa`, moeda `R$` e fuso apresentado.

## Hierarquia da experiência
- **Home geral**: painel do dia, eventos em venda, ingressos confirmados, receitas/saldos em escopos permitidos, filas SAC, aprovações pendentes, riscos e alertas.
- **Home do evento**: nome/status, sessões, aprovação/publicação, vendas/ingressos, estoque/bloqueios, comercial e Taxa Disk (somente interno autorizado), incidências e ações pertinentes.
- **Formulários**: seções orientadas por etapa, salvamento explícito/autosave de rascunho onde seguro, validação e pré-visualização antes de publicar.
- **Detalhe do pedido**: cliente, origem do canal, itens/tickets, transações, histórico, atendimento, ações autorizadas e justificativas.
- **Central de ingressos**: pesquisa por oito dígitos/cliente/evento/pedido/status, resultado contextual e trilha; ações em painéis laterais com confirmação.
- **SAC**: lista e detalhe de caso lado a lado, cronômetro SLA, canal, contexto do pedido e fluxos guiados para troca/estorno.
- **Financeiro**: dashboards por evento/produtor/Disk com totais reconciliados, filas de aprovação, extratos, taxas, repasses e auditoria.
- **Comercial**: ficha do produtor, contratos, eventos vinculados e versões de condições comerciais.
- **PDT**: portal independente, escopo restrito, dashboards, borderô, mapa e solicitações sem menus financeiros internos.

## Event Builder por etapas
1. Dados gerais: título, local, classificação, responsável, calendário, datas/horas.
2. Produtor e contratos: PJ, produtor principal/secundário, autorizações.
3. Sessões e locais: agenda, aforo, acesso e regras de remarcação.
4. Mapa/áreas/assentos: setores, lotação, bloqueios, disponibilidade.
5. Modalidades/lotes/preços: inteiras/meias/categorias, vigências, máximos.
6. Canais: site, PDV, bilheteria, formas de pagamento, regras aprovadas.
7. Comercial: taxa Disk aprovada por evento e versão, visível somente ao interno.
8. Conteúdo: imagens, descrição, mídia, documentação e política pública.
9. Revisão e aprovação: pendências explícitas, histórico, versões e responsáveis.
10. Publicação/Monitoramento: agenda de abertura, status de sincronização, alertas e despublicação controlada.

## Padrões de interação
- Não pedir login novamente em cada submenu; usar sessão única e revalidação MFA para ação de alto risco.
- Evitar modais em cascata; preferir telas ou drawer de contexto com retorno claro.
- Desabilitar botões por permissão/estado e explicar o motivo; não deixar ações decorativas.
- Operação financeira crítica requer resumo de impacto, dupla confirmação quando exigida e registro de motivo.
- Exibir status real de entrega do e-mail, webhook, pagamento e processamento de estorno.
- Pesquisas com filtros salvos, paginação, exportação controlada e dados sensíveis mascarados.
- Zero valores/indicadores sintéticos fora dos testes; usar `Nenhuma venda registrada` e não números inventados.

## Verificação de navegação
Manter testes automatizados que percorrem links visíveis por perfil, verificam 200/403 esperados, ausência de 404, segurança contextual e resultado útil. Cada submenu deve mapear para rota definida com componente implementado, permissão, estado de carregamento e resposta de erro.
