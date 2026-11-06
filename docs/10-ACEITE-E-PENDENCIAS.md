# Pacote 10 — Homologação e critérios de aceite

## Testes que podem ser executados offline
1. Compilar domínio P06/P07/P08/P09/P10.
2. Executar os testes de política de transições, aprovação, limites de estorno, SLA, bloqueio de troca e integrações estruturais.
3. Confirmar catálogo original intacto por hash.
4. Conferir que não surgiu endpoint de liquidação ou estorno bancário.

## Homologação obrigatória com banco REAL no VS Code
1. Criar backup do banco `bravo_ii_hml` **sem dados de produção**.
2. `npm install`, `npm run db:validate`, `npm run db:generate`.
3. Inspecionar migrations geradas de `prisma/schema.prisma`; rodar `prisma migrate dev` somente no banco homologado.
4. `npm run build:packages`, `npm run build:api`, `npm run build:web`.
5. Criar usuários de teste autorizados por processo seguro, sem valores financeiros ou credenciais simuladas em produção.
6. Validar SAC por categoria/prioridade e SLA; testar escalonamento e CSAT.
7. Testar concorrência de duas solicitações de troca do mesmo ingresso, evitando conflito; executar trocas físicas **desativado**.
8. Testar concorrência de dois estornos sobre o mesmo pedido; somatório nunca deve exceder pedido liquidado.
9. Testar aprovação com solicitante, primeiro e segundo aprovadores distintos. Repetição deve falhar.
10. Simular falha de backend após etapa 2 e confirmar registro idempotente no Outbox sem chamada a adquirente.
11. Verificar controle de leitura de valores financeiros pelo SAC e trilha de auditoria.
12. Validar responsividade das dez novas páginas e ligações do menu por perfil.
13. Comprovar que nenhuma chamada externa publica evento, cobra cartão, envia ingressos ou devolve dinheiro.

## Bloqueios que impedem declarar Pacote 10 operacional
- Pacote 09 ainda sem PostgreSQL validado e builds completos no ambiente da conversa.
- Conectores multicanal de SAC ainda não instalados.
- Calendário SLA com horários úteis e feriados pendente.
- Portaria e inventário numerado pendentes; troca física não executável.
- Worker financeiro/adquirente, reconciliação e confirmação externa de estornos pendentes.
- Processamento em lote por pedido em cancelamento de evento pendente (somente planejamento entregue).
- Revisão LGPD e avaliação de segurança externa antes de produção.

## Aviso jurídico/operacional
Políticas de cancelamento/reembolso e seus prazos devem ser configuradas após revisão jurídica, conforme situação do evento e legislação aplicável. O ERP não deve concluir automaticamente a elegibilidade apenas por uma data fixa universal.

- Modelo monetário herdado dos Pacotes 08/09 usa `Int` (PostgreSQL INTEGER); para eventos de alto valor, avaliar migração de colunas monetárias para BIGINT/NUMERIC em conjunto, sem conversão isolada de P10.
