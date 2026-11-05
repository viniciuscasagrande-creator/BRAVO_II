# Seeds Técnicos do BRAVO_II

Seguindo `GEMINI.md` e `docs/03-ARQUITETURA-TECNICA.md`:
- O diretório `database/seeds/` contém **exclusivamente catálogos técnicos mínimos** (papéis RBAC, permissões canônicas e credenciais técnicas de operador local para verificação de login em desenvolvimento).
- **Proibido semear dados fictícios de negócio**: nenhum CPF falso, ingresso fictício, pedido inventado ou saldo financeiro artificial é inserido fora das fixtures isoladas de testes automatizados (`packages/testing`).
