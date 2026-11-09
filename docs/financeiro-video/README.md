# Pacote BRAVO_II — Telas completas do Financeiro observado no vídeo

## Entrega
- Catálogo com navegação abrangente pelas telas e grupos da gravação;
- rotas Next.js integradas no monorepo em `/financeiro/operacoes`;
- painel de módulo com navegação hierárquica, filtros, tabela e exportação real do resultado;
- verificação de `finance:read` na interface (o servidor deve exigir a mesma permissão);
- estado explícito de backend pendente, sem dados fictícios;
- referência original completa para migração seletiva de serviços e regras;
- contrato de APIs e instruções para implementação no Gemini.

## Não inclui
Ainda **não** entrega a implementação operacional de todas as transações, pagamentos, conciliação, RH ou autenticação: isso depende dos serviços da API NestJS, banco Neon e integrações específicas. Não considera menus visíveis como funcionalidades prontas.

## Aplicação
Os arquivos sob `BRAVO_II/` são um snapshot do backup fornecido com apenas os acréscimos do módulo de interface. O Gemini deve aplicar o diff ao repositório principal, não sobrescrever cegamente arquivos mais recentes no GitHub.

Depois de aplicar, abrir `/financeiro/operacoes` em uma sessão do Financeiro Disk. Conferir todas as rotas. Não executar dados demo.
