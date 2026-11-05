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
