# Estrutura de menus BRAVO_II — Comercial e Eventos

## Comercial
1. Visão Comercial — pipeline, propostas e tarefas (planejado).
2. Central de Produtores — listagem, cadastro, ficha e validação (**adaptador de frontend/backend entregue**).
3. Propostas e Negociações — oportunidades por produtora, histórico de contatos e aprovações (**a desenvolver**).
4. Contratos — documentos comerciais, assinatura, vigência e anexos (**a desenvolver**).
5. Taxas por Evento — gestão de propostas/versionamento em página interna do evento (**adaptador entregue**).
6. Carteira de Produtores — responsáveis comerciais e carteira (**a desenvolver**).
7. Histórico Comercial — alterações e eventos de negociação (**auditoria no backend; tela agregada planejada**).

## Gestão de Eventos
1. Central de Eventos — listagem/estado e acesso ao evento.
2. Montagem de Eventos — formulário inicial + Event Builder em blocos.
3. Sessões e Agenda — CRUD inicial por evento, calendário agregador ainda pendente.
4. Mapas, Áreas e Poltronas — dados/assentos modelados; editor de mapa e venda sob controle de estoque pendentes.
5. Modalidades, Lotes e Preços — formulário por evento, preços em centavos e limites de capacidade.
6. Canais Online e PDV — ON/OFF por evento; conector PDV ainda pendente.
7. Central de Aprovações — decisões internas sequenciais na ficha do evento; fila de tarefas agregada planejada.
8. Publicação e Sincronização — solicitação via outbox, sem integração externa.
9. Cancelados e Adiados — caso de gestão de mudança com comunicação e regras de estorno planejado, NÃO trocar status de forma cega.
10. Histórico de Alterações — audit log por ato; tela de consulta agregada pendente.

## Navegação
- O menu lateral do Core deve receber grupos `COMERCIAL` e `GESTÃO DE EVENTOS` sem remover/substituir as 149 rotas Financeiro/RH do Pacote Mestre.
- Itens `PLANEJADO` do JSON de menu não devem ser clicáveis até que exista uma tela funcional; exibir planejamento em documentação, não no menu operacional.
- O produtor acessa seus eventos via PDT e NÃO o menu interno do BRAVO_II; o Financeiro Disk possui visão interna limitada ao seu escopo.
- Filtros por produtor/evento na listagem, pesquisa global, paginação e atalhos de aprovação agregados precisam ser incorporados pelo Core.

## Telas entregues para adaptar no Next.js
- `/comercial`, `/comercial/produtores`, `/comercial/produtores/novo`, `/comercial/produtores/[id]`.
- `/eventos`, `/eventos/novo`, `/eventos/[id]` e `/comercial/eventos/[id]/taxas`.
- CSS isolado: `apps/backoffice/src/components/bravo-p06.css`, importado pelo layout com sessão real, uma única vez.
