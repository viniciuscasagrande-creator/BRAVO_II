# Matriz de homologação (preencher durante execução)

| Componente | Evidência exigida | Status nesta entrega |
|---|---|---|
| Validador de ambiente | `npm run doctor` | CÓDIGO ENTREGUE, execução local a confirmar |
| Node e dependências | `npm install` + lockfile | PENDENTE: npm indisponível neste ambiente |
| Esquema PostgreSQL | Prisma validate + migration SQL revisada | PENDENTE |
| Integridade dados | CRUD produtores/eventos e taxas | PENDENTE — exige PostgreSQL |
| Auth real | login, cookie HttpOnly, logout, bloqueio | Fonte entregue, runtime pendente |
| Autorização | teste 401/403 em todas as rotas | Política offline aprovada, HTTP pendente |
| CSRF e origem | rejeitar origem externa e mutações sem CSRF | Política offline aprovada, HTTP pendente |
| Menu | menu por perfil, navegação no browser | Fonte entregue, browser pendente |
| Fee por evento | dois eventos de mesmo produtor, taxas diferentes | Teste puro APROVADO, DB pendente |
| Aprovação | cada etapa, usuário distinto | Teste puro APROVADO, DB pendente |
| Publicação | somente `outbox`, sem worker ativo | Proteção de inicialização presente; DB pendente |
| Financeiro/RH | 149 itens preservados sem fingir execução | Inventário e sinalização aprovados |
| Preview | URL, capturas, logs, aceite | PENDENTE |

Não alterar PENDENTE para APROVADO sem registrar data, executor, URL do ambiente, commit, evidência e resultado. Nunca colocar credenciais nos relatórios.
