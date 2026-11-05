# 06 — Máquinas de estado, exceções e barreiras de integridade

## Evento
`RASCUNHO → ENVIADO_PARA_ANALISE → VALIDACAO_CADASTRAL → ANALISE_COMERCIAL → ANALISE_OPERACIONAL → APROVADO → AGENDADO_PARA_PUBLICACAO → PUBLICADO → EM_VENDA → ENCERRADO → CONCLUIDO`.

Ramos: `REPROVADO` (retorna com motivo), `SUSPENSO`, `ADIADO`, `CANCELADO`. `CANCELADO` não é uma simples edição de status: abre caso de cancelamento com política, comunicação, pendências financeiras e decisão sobre tickets. Cada transição define ator, permissões, pré-condições e eventos emitidos.

## Pedido / Pagamento / Ingresso
- Pedido: `RASCUNHO → RESERVADO → AGUARDANDO_PAGAMENTO → CONFIRMADO → FINALIZADO` com ramos `EXPIRADO`, `CANCELAMENTO_SOLICITADO`, `CANCELADO`, `PARCIALMENTE_CANCELADO`.
- Pagamento: `CRIADO → AUTORIZACAO_PENDENTE → AUTORIZADO → CAPTURADO → LIQUIDACAO_PENDENTE → LIQUIDADO` e ramos `RECUSADO`, `CANCELADO`, `ESTORNO_PENDENTE`, `ESTORNADO`, `CONTESTADO`.
- Ingresso: `RESERVADO → EMITIDO → ENVIADO → VALIDADO` ou `BLOQUEADO`, `TROCADO`, `CANCELADO`, `ESTORNADO`. Envio é um **estado de entrega**, não deve sobrescrever o status de validade; modelar eixos separados para `validade`, `entrega` e `check-in`.

## Troca de sessão / poltrona
1. SAC identifica ingresso e confirma autorização do solicitante.
2. Sistema verifica regra do evento, prazo, status de check-in e preço/diferença.
3. Bloqueia nova disponibilidade temporariamente em transação.
4. Registra ajuste de pedido e cobrança/crédito adicional, se aplicável.
5. Confirma troca com novo direito de entrada e invalida credencial anterior; libera assento antigo.
6. Notifica cliente e mantém trilha de antes/depois com vínculo entre ingresso anterior e novo.

Não mover assento diretamente no banco nem 'apagar e recriar' ingresso sem histórico.

## Estorno
`SOLICITADO → EM_TRIAGEM → AGUARDANDO_APROVACAO_FINANCEIRA → APROVADO → ENVIADO_AO_PROVEDOR → PROCESSANDO → CONFIRMADO_PELO_PROVEDOR → CONCILIADO → CONCLUIDO`.

Ramos: `REPROVADO`, `AGUARDANDO_INFORMACOES`, `FALHA_REPROCESSAVEL`, `NEGADO_PELO_PROVEDOR`, `CANCELADO_COM_JUSTIFICATIVA`. A API aceita identificador idempotente por tentativa. Nunca marcar `CONCLUIDO` ao clicar em "Aprovar"; manter evidência do provedor e saldo impactado.

## Repasse
`SOLICITADO → EM_ANALISE → APROVADO / REJEITADO → AGUARDANDO_ASSINATURA_PRODUTOR → AGUARDANDO_ASSINATURA_FINANCEIRO → PROGRAMADO → ENVIADO_BANCO → CONFIRMADO_BANCO → CONCILIADO`.

Ramos de erro/revisão preservam toda trilha. Saldo disponível deve descontar repasses **reservados e ainda não executados**, para evitar aprovação dupla sobre o mesmo recurso.

## Cupons e cortesias
Cupom: `RASCUNHO → APROVADO → ATIVO → PAUSADO/ENCERRADO/EXPIRADO`; cada resgate tem chave única e snapshot de regra, quota e pedido. Cortesia: `SOLICITADA → AUTORIZADA → EMITIDA → ENVIADA → VALIDADA` ou `REVOGADA`, com política de taxa e limite por perfil/evento.

## Casos de uso com falha e resultado esperado
| Falha | Controle obrigatório |
|---|---|
| Dois compradores escolhem o mesmo assento | Apenas uma reserva confirmada; outra recebe indisponibilidade |
| Gateway envia webhook duplicado | Um único lançamento e um único ingresso correspondente à compra |
| Cobrança aprovada mas entrega de e-mail falhou | Ingresso permanece emitido, entrega entra em retry e notificação no painel |
| Ingresso cancelado aparece no leitor | Validação nega acesso (incluindo cache offline com sincronização e política explícita) |
| SAC tenta estorno sem aprovação | API responde sem permissão; grava auditoria |
| Financeiro aprova mas gateway fica indisponível | Estorno pendente/processando, sem conclusão e sem dupla execução |
| Produtor A tenta ID de evento do produtor B | API retorna 403/404 sem vazamento de recursos |
| Comercial edita taxa de evento com vendas | Nova versão prospectiva; vendas antigas preservam snapshot |
| PDV perde conexão | Sem vendas duplas; quotas/offline apenas sob política técnica estabelecida |
| Evento cancelado com múltiplas sessões | Plano por sessão, ingressos, pagamentos e cobranças; comunicação e saldos conferidos |
