# BRAVO_II — Regras para agentes de desenvolvimento

1. Responda e escreva interfaces/documentos em pt-BR.
2. Não declarar funções operacionais antes de build, banco e E2E comprovados.
3. O vídeo SIGE não implica disponibilidade de código legado; não depender dele.
4. Financeiro 104 + RH 45 funções preservadas em `reference/`, sem tela funcional ainda.
5. Taxa Disk apenas por evento; nunca expor em público/PDT. Acesso à API é controlado pelo servidor.
6. Nunca habilitar publicação externa, pagamentos e estornos reais neste pacote.
7. Sessão HttpOnly; usuários/roles exclusivamente do banco, CSRF e Origin nas mutações.
8. PostgreSQL único via Prisma Core; migração em base descartável e revisada.
9. Nunca inventar senhas ou usar dados fictícios financeiros.
10. Testar e registrar resultados sem esconder pendências.

## Complemento P08
11. Não persistir CPF em claro; `CPF_HASH_PEPPER` deve ter 32+ caracteres realmente aleatórios, gerenciados fora do repositório.
12. Não colocar CPF, e-mail, endereço, senhas ou tokens em logs de auditoria ou console.
13. Ingresso exige número exatamente de oito dígitos numéricos e unicidade global; o número não é credencial QR.
14. Não usar `float` para valores financeiros; sempre centavos inteiros.
15. Reservas são atômicas no PostgreSQL e possuem expiração; testar concorrência antes de ativar vendas.
16. Nenhum endpoint público de confirmar pagamento pode ser criado sem integração da operadora, validação criptográfica e conciliação.
17. Não declarar PDV operacional sem identificação de dispositivo, escopo por ponto de venda, autenticação própria e testes de autorização.
18. Emissão de ingresso, e-mail, QR, validação de portaria e estorno não estão operacionalizados no P08 Preview.

## Complemento P09
19. PagBank fica restrito a `sandbox.api.pagseguro.com` e a token exclusivamente sandbox. Não usar `api.pagseguro.com` em testes.
20. A consulta de status externo é exclusivamente informativa. Nunca usar `AUTHORIZED` como sinônimo de pagamento capturado e nunca emitir ingresso por consulta sem fluxo transacional confiável.
21. Não criar endpoint de confirmação ou webhook público sem verificação da assinatura correta e idempotência em banco e auditoria; definir tratamento de chargeback, expiração e reconciliação antes de qualquer ativação.
22. Cadastro de PDV não autoriza operação de caixa. Dispositivo, operador, turno, vínculo ao evento, conciliação e inventário devem ser homologados.
23. Permanecem preservados os catálogos Financeiro 104 e RH 45; não substituir esses sistemas por tabelas simuladas nem inventar valores.
24. Uma tentativa por pedido na homologação, com idempotência no banco e sem repetição automática em falha de rede de resultado indeterminado.
25. Ao finalizar, comprovar comandos e resultados; não confundir testes de código puro com Prisma/Nest/Next/PG testados.
