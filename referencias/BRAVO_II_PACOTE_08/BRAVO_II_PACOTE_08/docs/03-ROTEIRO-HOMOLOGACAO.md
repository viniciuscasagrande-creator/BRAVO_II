# Roteiro de homologação — Pacote 08 (bloqueio de produção)

## Preparação

1. Usar Node.js 22, Docker Desktop, npm e PostgreSQL exclusivo `bravo_ii_hml`.
2. Copiar `.env.example` e `.env.local.example` indicados no README. Não compartilhar as credenciais.
3. `CPF_HASH_PEPPER` deve ser aleatório e exclusivo deste projeto, com comprimento mínimo de 32; não usar placeholder. Pode ser gerado localmente com:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

4. Fixar flags em `false` para publicação externa, pagamentos reais e estornos reais.
5. Conferir se existe migration P07 aplicada. Se existir, gerar delta P08. Não recriar banco de produção.

## Comandos para o Gemini executar

```bash
npm install
npm run build:packages
npm run test:offline
npm run doctor
npm run db:validate
npm run db:generate
npx prisma migrate dev --schema prisma/schema.prisma --name p08_clientes_pedidos_ingressos
npm run build:api
npm run build:web
npm run doctor:ready
```

Depois de iniciar API/Next.js, executar os testes HTTP:

```bash
npm run dev:api
# segundo terminal
npm run dev:web
# terceiro terminal, se a app estiver disponível
npm run test:smoke
npm run test:smoke:p08
```

## Matriz de homologação obrigatória

| Verificação | Como demonstrar | Estado na entrega |
|---|---|---|
| Compilação domínio P06, P07, P08 | `npm run test:offline` | Executado offline |
| Banco Prisma/PostgreSQL | `db:validate`, migration revisada, `db:generate` | Pendente execução local |
| Build API NestJS | `npm run build:api` | Pendente dependências |
| Build Next.js | `npm run build:web` | Pendente dependências |
| Login, Origin, CSRF e autorização | Smoke P07/P08 + 401/403 | Testes HTTP pendentes |
| CPF matemático e dados mínimos | testes domínio | Aprovado offline |
| Reserva com dois operadores simultâneos sobre último ingresso | teste de transação real com duas conexões | Pendente PostgreSQL |
| Repetição idempotente (mesmo pedido) | repetição da chave + conferência no banco | Pendente PostgreSQL |
| Excesso de capacidade | 409 sem alteração indevida | Pendente PostgreSQL |
| Expiração / liberação sem estoque negativo | rodar limpeza e inspecionar contadores | Pendente PostgreSQL |
| Assento numerado | 400 e nenhuma reserva | Regra testada offline |
| Evento sem publicação real | bloqueio; nenhuma reserva | Regra testada offline |
| Ingresso antes de pagamento | inexistente; endpoint de emissão ausente | Validado em inspeção estática |
| Isolamento de CPF e Taxa Disk | inspecionar JSON, banco e logs | Pendente integração real |
| Leitura Financeiro/RH preservados | inventário 149 itens sem exclusões | Verificado offline |
| Acessibilidade e layout mobile | navegador desktop + celular | Pendente navegador real |

## Cuidados ao testar

- **Não forçar `PUBLICADO` num banco com eventos reais** para superar os bloqueios. Use uma fixture de teste **isolada e descartável** depois de construir harness de integração autenticado, com rollback e sem conexão ao site público.
- Não armazenar CPF real em homologação nem exibir credenciais ou dados pessoais nos relatórios.
- Não executar confirmação financeira simulada em fluxos que serão reutilizados para produção.
- Repetir os testes de estoque sob carga antes de qualquer integração real de checkout ou PDV.
- Depois da homologação, registrar evidências com horário, comando, resultado e hash do pacote no relatório de aceite.
