# Prompt de execução imediata — Cole no Gemini no VS Code

Vou construir um ERP novo chamado **BRAVO_II** para a DiskIngressos. O sistema SIGE antigo existe apenas como referência em vídeo e descrições operacionais; **NÃO POSSUÍMOS O CÓDIGO-FONTE DO SIGE** e o acesso ao banco/exportações é desconhecido. Proibido pedir esse código ou condicionar a entrega a ele.

Leia `README.md`, `GEMINI.md`, `docs/11-CONSTRUCAO-SEM-FONTE-SIGE.md`, `docs/03-ARQUITETURA-TECNICA.md`, `docs/05-SEGURANCA-GOVERNANCA.md`, `docs/09-ROADMAP-ACEITE.md` e `prompts/00-PROMPT-MESTRE.md`.

**Execute agora apenas Fases 00 e 01** criando a base de código. Repositório novo (TypeScript, Next.js, NestJS, PostgreSQL), schema de banco próprio com migrations, identidade e RBAC+escopo, menu lateral pt-BR com rotas reais, sessão única sem relogin por submenu, página inicial com estado vazio, healthcheck, logs de auditoria e testes. Não use dados fictícios na aplicação operacional. Criar integrações por interfaces; não executar cobrança, estorno, repasse ou publicação real. Não alterar o sistema anterior.

Entregue arquivos de código, configuração do ambiente, comandos de execução, migrations e testes automatizados. Execute os comandos disponíveis e crie `docs/execucao/FASE-00.md` e `FASE-01.md` com resultados verdadeiros; não afirmar que algo está funcionando sem testar. Pare depois da Fase 01. O próximo fluxo funcional será Comercial → Produtor → Taxa Disk **por evento** → Evento → Aprovação.
