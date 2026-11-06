# Prompt de execução | Pacote 08 — Gemini no VS Code

Atue como engenheiro responsável pela integração do BRAVO_II. Este workspace já incorpora o Pacote 07, incluindo Comercial/Produtores/Eventos, Prisma, NestJS, Next.js, autenticação, auditoria e inventário das 149 funcionalidades Financeiro/RH. O Pacote 08 adiciona clientes, pedidos, reservas e ingressos.

## Missão — executar, não apenas documentar

1. Abra e examine `GEMINI.md`, `AGENTS.md`, `README.md`, `docs/03-ROTEIRO-HOMOLOGACAO.md` e `prisma/schema.prisma`.
2. Execute `npm install`, `npm run test:offline`, `npm run doctor`, `npm run db:validate`, `npm run db:generate`, `npm run build:api` e `npm run build:web`. Se falhar, corrija o código e repita; não declare sucesso sem executar.
3. Use SOMENTE PostgreSQL isolado de homologação. Revise o SQL gerado e aplique migrations de forma incremental. Não faça `db push` em produção ou reset destrutivo.
4. Execute testes de CPF, cadastro de PF, busca, criação de reserva, idempotência, concorrência de estoque, expiração, cancelamento não pago e consulta por número de oito dígitos. Para testes de venda, use fixture isolada e descartável sem publicação externa nem dados reais de clientes.
5. Confirme via API que usuários não autenticados obtêm 401, origem inválida obtém 403, CSRF é exigido e perfis sem alçada obtêm 403. Teste PDV bloqueado.
6. Certifique-se de que a tela de pedido nunca diz 'pago' após reservar e de que não há emissão/e-mail/QR sem confirmação confiável de pagamento. Em Preview, pagamentos e estornos permanecem desligados.
7. Teste responsividade e navegação entre /clientes, /pedidos, /ingressos, /eventos, /comercial, /financeiro (em implantação) e /rh (em implantação).
8. Registre o resultado em `docs/RELATORIO-EXECUCAO-P08.md`: comandos, prints/logs sem PII, erros corrigidos, migrations, testes aprovados/falhos e pendências para Preview.

## Proibições

- Não inventar tabelas financeiras para imitar as 104 funções já catalogadas.
- Não copiar a taxa interna Disk para respostas de pedidos ou relatórios do Produtor.
- Não criar confirmação de pagamento fictícia nem endpoint administrativo para alterar pedido para PAGO.
- Não publicar vendas no domínio `www.diskingressos.com.br`.
- Não inserir dados de produção ou dados pessoais reais como seed.

## Critério de aceite

Nenhuma etapa é aceita por presença de arquivos apenas. Exigir compilação das aplicações, banco conectado, migrations verificadas, HTTP 401/403, autorização, operações de leitura/gravação persistentes, testes de idempotência e concorrência e evidências do comportamento do Preview.
