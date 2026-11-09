# INSTRUÇÃO OPERACIONAL — GEMINI NO VS CODE

Você está no monorepo BRAVO_II existente. **Não reinicie o projeto e não crie outro ERP.**

1. Faça backup/branch `feat/financeiro-video-completo` antes de editar.
2. Leia `docs/financeiro-video/INVENTARIO-VIDEO.md` e `apps/backoffice/src/modules/financeiro-disk-video/catalogo.json`.
3. Verifique navegação em `/financeiro/operacoes` e **cada tela** listada no catálogo; valide o login e a permissão `finance:read`.
4. Compare com `REFERENCIA_ORIGINAL/Modulo_Financeiro_V1_BACKUP_GERAL_OFICIAL_20261105.zip`: arquivos frontend, serviços, documentos e fluxo. Migrar e adaptar regras, não copiar autenticação demo nem dados simulados.
5. Conecte `GET /v1/financeiro/operacoes` à API NestJS em modo leitura por área; implemente filtros por produtor/evento, paginação, trilha de auditoria e testes. A interface já expõe estado de API pendente sem falsificar dados.
6. A seguir, para cada tela, implementar os fluxos reais de criação/edição/aprovação com contratos tipados, validação, idempotência, testes de transação, migração e permissão. Nenhuma operação externa de banco, estorno, repasse ou evento deve ser ativada sem homologação.
7. **Não substituir** os 104 itens de Financeiro Disk, 45 itens de RH, Core, Prisma, Vercel ou o Portal Produtor atual. Use integração aditiva.
8. Corrija o 404 de `/v1/health` e os CSS faltantes do shell antes de declarar Preview validado.
9. Rodar `pnpm install --frozen-lockfile`, `pnpm run build:packages`, `pnpm run build:web`, `pnpm run build:api`, `pnpm test`, checar rotas e revisar visualmente todas as telas.
10. Entregar relatório por rota: tela, endpoint, tabela, RBAC, ações, testes e status `interface / conectada / homologada`.

### Critérios de aceite
- Contagem e nomes de telas 1:1 com `catalogo.json`;
- Visual Fintech Premium, hierarquia de menus, filtros e responsividade;
- Nenhuma tela mostra quantias falsas ou diz estar operacional sem consulta bem-sucedida;
- 403 para usuário sem `finance:read`; 401 para visitante em API;
- Sem criação de saldo, estorno, pagamento, publicação ou assinatura em modo demo;
- Nenhum arquivo de domínio RH/Financeiro legado eliminado.
