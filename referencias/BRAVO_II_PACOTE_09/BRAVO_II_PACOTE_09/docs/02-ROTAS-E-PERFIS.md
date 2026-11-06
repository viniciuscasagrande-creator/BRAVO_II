# Rotas novas — Pacote 08

As rotas usam **exclusivamente** autenticação central do P07, Origin de confiança e `X-CSRF-Token` para mutações.

| Método | Rota | Autorização | Efeito |
|---|---|---|---|
| POST | `/v1/clientes` | ADMIN, OPERACOES, SAC | Cad. de pessoa física, CPF HMAC |
| GET | `/v1/clientes?busca=...` | ADMIN, OPERACOES, SAC, AUDITOR | Busca restrita (mín. 4 caracteres, máx. 25 resultados) |
| GET | `/v1/clientes/:id` | ADMIN, OPERACOES, SAC, AUDITOR | Consulta com CPF mascarado |
| GET | `/v1/pedidos` | ADMIN, OPERACOES, SAC, FINANCEIRO_DISK, AUDITOR | Últimos 100 pedidos; sem Taxa Disk |
| POST | `/v1/pedidos/reservas` | ADMIN, OPERACOES | Reservar lote publicado; canal ONLINE interno apenas |
| POST | `/v1/pedidos/reservas/expiradas/processar` | ADMIN, OPERACOES | Expirar até 100 reservas vencidas por operação |
| GET | `/v1/pedidos/:id` | ADMIN, OPERACOES, SAC, FINANCEIRO_DISK, AUDITOR | Detalhar pedido |
| POST | `/v1/pedidos/:id/cancelar-reserva` | ADMIN, OPERACOES | Cancelar somente reserva não paga |
| GET | `/v1/ingressos?numero=00000001` | ADMIN, OPERACOES, SAC, AUDITOR | Consultar ingresso existente |

**Inexistentes de propósito:** `POST /v1/pagamentos/confirmar`, `POST /v1/ingressos/gerar`, endpoints de PIX/estorno real ou emissão manual. O pagamento deve vir do provedor por adaptador seguro, em fase posterior.

## Payload de reserva (formato)

```json
{
  "eventId":"<uuid do evento>",
  "sessionId":"<uuid da sessão>",
  "lotId":"<uuid do lote>",
  "customerId":"<uuid do cliente>",
  "quantity":2,
  "channel":"ONLINE",
  "idempotencyKey":"<uuid novo por intenção>"
}
```

Valores entre `<>` são **marcadores**, não dados de evento. O limite de dez ingressos é técnico da fase inicial e deve ser parametrizável com regra de antifraude quando houver checkout real.

## Autorização de papéis

- **PRODUTOR:** nenhuma rota privada de SAC, clientes e pedidos neste pacote; consultar apenas futura API própria com filtros por produtor/evento.
- **COMERCIAL:** não cria pedido, não vê cadastro de cliente nem ingressos pessoais.
- **RH:** não tem acesso a dados de consumidores, pedidos ou receitas.
- **FINANCEIRO_DISK:** consulta pedidos; não tem botão para reservar nem acesso por este módulo a funções RH.
- **SAC:** cadastra e consulta clientes; consulta pedidos e ingressos; não aprova pagamento/estorno ou cria reservas neste pacote.
- **PDV:** menu em implantação, sem autorização para criação de vendas antes de cadastrar terminal/ponto de venda.

As restrições são aplicadas no backend e refletidas no menu e nas telas.
