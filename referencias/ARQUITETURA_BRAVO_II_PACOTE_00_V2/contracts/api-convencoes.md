# Convenções de contratos e eventos — BRAVO_II

**API**: `/api/v1`, OpenAPI versionado, DTOs validados, horários ISO-8601 UTC, mensagens ao usuário em pt-BR, erros consistentes e logs técnicos por correlação.

**Campos padrões de requisição:** `Idempotency-Key` para comandos relevantes, `X-Correlation-Id`, identidade confiável pelo token, contexto de `producer_id`/`event_id` obtido/validado pelo backend e não considerado autorizado só porque veio da URL.

**Exemplo de resposta de erro (documentação, não endpoint implementado):**
```json
{
  "error": {
    "code": "EVENT_FEE_APPROVAL_REQUIRED",
    "message": "O evento exige aprovação comercial antes da publicação.",
    "correlationId": "id-de-correlacao",
    "details": []
  }
}
```

**Eventos outbox:** nomes verbais no passado, identificador único, versão do schema, timestamp, origin, aggregate, correlação, produtor/evento quando aplicável, payload mínimo e deduplicação de consumidor. **Sem CPF, PAN/CVV, token de acesso ou segredos em payload.**

**Mudança incompatível:** criar nova versão de API/evento; testes de contratos impedem alterações silenciosas no PDT/site/PDV.

**Compatibilidade com legado:** `legacy_source`, `legacy_id` e tabela de equivalência; não converter integer legado diretamente em UUID inexistente.
