# Contratos oficiais de integração — verificação em 06/11/2026

**PagBank**

- `https://developer.pagbank.com.br/docs/checkout`
- `https://developer.pagbank.com.br/reference/criar-checkout`: endpoint do sandbox `POST https://sandbox.api.pagseguro.com/checkouts`.
- `https://developer.pagbank.com.br/reference/consultar-checkout`: endpoint do sandbox `GET /checkouts/{checkout_id}`.
- `https://developer.pagbank.com.br/reference/webhooks-checkout`: notificação dos pagamentos; status de checkout ≠ status transacional.
- `https://developer.pagbank.com.br/reference/validacao-de-autenticidade`: fluxo mais recente de assinatura assimétrica ECDSA sobre corpo bruto.
- `https://developer.pagbank.com.br/reference/confirmar-autenticidade-da-notificacao`: modelo legado de hash SHA-256; **não intercambiar os modelos** sem verificar a API exata.

**Rede:** adaptador mantido não operacional; verificar contrato e modelo de homologação do adquirente antes de implementar autorização/captura/estorno.

O P09 apenas inicia e consulta checkout **em sandbox** com credencial opt-in. Payload preliminar deve ser verificado em chamada real de sandbox autorizada antes do aceite. Nenhum webhook de confirmação foi disponibilizado no pacote.
