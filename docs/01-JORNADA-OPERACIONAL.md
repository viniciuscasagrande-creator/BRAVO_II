# 01 — Jornada operacional ponta a ponta

O BRAVO_II deve operar com um fluxo único, embora usuários de departamentos diferentes visualizem tarefas específicas. O produtor tem sua própria interface, não um clone do backoffice interno.

## Etapas de negócio fornecidas (1–12)

| Etapa | Origem / responsável | Ação principal | Resultado / próximo passo |
|---|---|---|---|
| 1. Cadastro | Produtor / Comercial | Cadastrar pessoa jurídica, responsáveis, contatos, dados financeiros e documentos; propor evento, sessões e ingressos | Produtor verificado; evento em rascunho/análise comercial |
| 2. Aprovação/publicação | Comercial, Operações e Publicação | Conferir documentação, negociar taxa, preços e canais, aprovar eventos e liberar publicação | Evento publicado em `www.diskingressos.com.br` e habilitado nos PDVs permitidos |
| 3. Venda | Cliente / checkout online / PDV | Validar ou criar cadastro PF, emitir pedido, autorizar cobrança, confirmar venda, gerar ingresso de oito dígitos e enviar e-mail | Pedido pago, ingresso emitido, estoque baixado e lançamentos registrados |
| 4. SAC | SAC omnicanal | Atender telefone, chat e e-mail; classificar incidentes, solicitações e reclamações; SLA/ITIL | Ticket de atendimento com responsável, prazos e resolução/auditoria |
| 5. Financeiro | Financeiro Disk | Controlar recebíveis, liquidações, conciliações, Taxa Disk, MDR, spread/rebate/advanced, reservas, estornos, repasses e fluxo de caixa | Saldos por evento/produtor/Disk e aprovações auditáveis |
| 6. Comercial | Comercial | Cadastrar produtores e negociar contrato/taxa **específica de cada evento** | Versão de regra comercial aprovada e vinculada ao evento |
| 7. Marketing | Marketing | Campanhas, UTMs, Meta, Google/GA4, TikTok, Spotify, funil e atribuição de vendas | Métricas reais por evento, campanha e canal |
| 8. Remarketing | Marketing/SAC conforme base legal | Segmentação, WhatsApp, e-mail, SMS, jornadas e consentimentos | Campanhas autorizadas, custo e entrega registrados |
| 9. Cupons/cortesias | Eventos/Comercial/Produtor com limites | Criar cupom, cortesia, código, campanha, cotas, datas e elegibilidade | Resgates rastreáveis, controle de inventário e aprovação quando necessária |
| 10. Alteração de pedido | SAC/Operações | Troca de sessão, modalidade, poltrona, titularidade conforme política, cancelamento | Histórico e efeitos em estoque, ingresso, pedido e finanças, atomicamente |
| 11. Estorno | SAC solicita → Financeiro aprova → provedor confirma | Avaliar elegibilidade, impacto e saldo; enviar estorno ao gateway correto | Concluído **somente com confirmação externa** e lançamentos conciliados |
| 12. PDT | Produtor vinculado ao evento | Relatórios, borderô, mapa, cortesias, bloqueios, repasses/antecipações | Portal integrado por APIs com escopo somente de seus produtores/eventos |

## Vínculos obrigatórios
- **Produtor PJ → Contrato / Condições do Evento → Evento → Sessão → Área/Setor/Assento → Modalidade → Lote/Preço**.
- **Cliente PF → Pedido → Item do Pedido → Pagamento → Ingresso → QR / Validação de Portaria**.
- **Venda confirmada → Ledger → Saldo do Evento → Obrigação do Produtor → Repasse elegível → Aprovação → Execução → Conciliação**.
- **Pedido/Ingresso → Solicitação SAC → Análise de Política → Ajuste ou Estorno → Registro de Auditoria**.
- **Evento/Campanha → UTM/Clique → Pedido Pago → Atribuição → Relatório** (sem confundir atribuição de marketing com conciliação financeira).
- **PDT → Solicitação → Aprovação interna → Assinaturas quando exigidas → Histórico**.

## Regras de ponta a ponta
1. O evento não publica antes de validação cadastral, comercial, operacional e de preço/taxa; uma pessoa não deve aprovar o próprio requisito que criou quando a política exigir segregação.
2. Um ingressos vendido consome disponibilidade por sessão/setor/assento com reserva temporária e liberação automática em caso de falha/expiração.
3. O identificador público de oito dígitos é gerado por ingresso confirmado; o status e a assinatura do QR são verificados no servidor para impedir reuso e fraude.
4. Pedido, ingresso, pagamento e repasse têm identificadores internos diferentes e campos de status independentes.
5. Taxa Disk é contratada por evento; as taxas de adquirência e de PDV podem coexistir, mas não substituem a regra comercial central.
6. Alteração pós-venda nunca deve adulterar histórico financeiro. Usar ajustes compensatórios, não exclusão de lançamentos.
7. Cupom é desconto comercial; cortesia é ingresso gratuito/autorizado. Diferem em elegibilidade, contabilização, quotas e emissão.
8. Para cancelamento/adiamento de evento, comunicar produtores, clientes, operação de ingressos, SAC, financeiro e marketing por um caso de exceção coordenado.
9. Canais online, PDV e produtor compartilham estoque por sessão, com controle de concorrência, e a mesma referência de ingresso.
10. Todo bloqueio/alteração sensível deve guardar usuário, escopo do evento, justificativa e antes/depois.
