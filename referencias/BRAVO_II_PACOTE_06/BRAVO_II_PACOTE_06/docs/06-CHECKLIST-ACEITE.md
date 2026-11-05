# Matriz de aceite P06

## Segurança e funcionamento (obrigatório)
- [ ] Pacote 05 disponível e build Next/Nest aprovado.
- [x] Core de regras TypeScript compilado isoladamente.
- [x] Testes unitários de domínio executados e aprovados.
- [x] Inventário Financeiro/RH preservado com 149 IDs.
- [ ] Migrations Prisma aprovadas e executadas em PostgreSQL de homologação.
- [ ] Endpoints Nest compilados e validados com PostgreSQL.
- [ ] Sessão do Core real em todas as rotas; `401` sem autenticação e `403` sem papel/escopo.
- [ ] CPF/CNPJ e PII protegidos; dados privados não expostos por API pública.
- [ ] Duas pessoas diferentes validam cadastro/Taxa Disk.
- [ ] Dois eventos do mesmo produtor têm Taxa Disk independente.
- [ ] Fluxo de sessões, categorias, lotes, canais e validação de capacidade sem condições de corrida.
- [ ] Quatro etapas aprovadas em ordem, com ator/justificativa/auditoria.
- [ ] Nenhum evento `PUBLICADO` por clique sem recibo do site.
- [ ] Site recebe somente payload público e não Taxa Disk.
- [ ] PDT não vê taxa, contratos internos ou dados de outro produtor.
- [ ] Todos os links do menu levam a telas reais e respeitam permissão.
- [ ] Teste visual responsivo desktop/mobile aprovado (não executado neste pacote).
- [ ] Auditoria criada atomicamente com transições, sem UPDATE/DELETE não autorizado.
- [ ] Financeiro/RH sem regressão funcional; 149 IDs preservados, e testes existentes continuam passando.
- [ ] Testar não publicação, retries, webhooks duplicados, falhas de conectividade, idempotência.
- [ ] Backups, planos de reversão, log e autorização para Preview antes de produção.

## Casos de integração e2e para o Gemini
1. Cadastrar uma produtora PJ, tentar validar com mesmo usuário — deve falhar.
2. Tentar validar produtora sem documento verificado — deve falhar.
3. Validar documentos e produtora com papel Cadastro (segundo usuário) — deve aprovar.
4. Criar evento A e B com mesma produtora, Taxa A percentual e Taxa B fixa — nenhum compartilhamento involuntário.
5. Aprovar taxa proposta pelo próprio aprovador — deve responder 403/422.
6. Enviar evento sem sessão/canal/taxa e tentar publicar — deve falhar.
7. Aprovar etapa OPERACIONAL antes de CADASTRAL e COMERCIAL — deve falhar.
8. Criar evento completo e solicitar publicação — deve permanecer PENDENTE_INTEGRACAO.
9. Tentar abrir endpoints de taxas com perfil produtor — 403, sem payload ou dados vazados.
10. Alterar taxa depois que vendas iniciaram — nova versão prospectiva, snapshot anterior preservado.
11. Publicar evento via worker com recibo inválido — não confirmar.
12. Repetir mesmo pedido de publicação — uma linha de outbox efetiva, sem disparo duplicado.
13. Rodar testes/rotas legados Fin/RH e confirmar 149 IDs presentes.
