# BRAVO_II — Segurança, deploy e critérios de homologação Vercel

### Garantias adicionadas
- BFF Next server-only para `/v1/*`, no mesmo domínio do usuário: elimina o rewrite direto para API externa.
- Chave de proxy com no mínimo 32 caracteres verificada com hash em tempo constante antes das rotas NestJS.
- Browser envia cookie HttpOnly/Secure/SameSite=Lax à origem do Backoffice; BFF encaminha cookie e CSRF somente ao upstream configurado.
- POST/PATCH/PUT/DELETE requer `Origin` idêntico ao host exato do Backoffice; backend também valida `APP_ORIGIN` e token CSRF.
- Bloqueio explícito para `VERCEL_ENV=production` no frontend e na API.
- Credenciais `DATABASE_URL`, `BRAVO_PROXY_KEY`, `CPF_HASH_PEPPER` nunca no cliente ou no Git.
- Preview exige HTTPS, cookie seguro, banco dedicado, flags financeiras falsas.
- Sem cron de estorno, sem webhook produtivo e sem envio automático de ingressos no deploy.
- O domínio público `www.diskingressos.com.br` está explicitamente proibido como APP_ORIGIN no Core.

### Riscos e compromissos
- Backend API ainda precisa estar acessível na rede para o BFF. No projeto API, o acesso direto é negado pela chave, mas a URL não deve ser tratada como rede privada.
- Vercel Authentication na API diretamente pode bloquear o BFF; habilitar proteção no projeto Web Preview, mantendo a API restrita pela chave interna e pelo Core. Validar com a equipe de segurança.
- Não confiar em `origin` para chamadas diretas fora do BFF: a chave interna é o controle principal de entrada HTTP no backend.
- `APP_ORIGIN` é uma origem EXATA; se URLs de Preview rotacionarem, login POST nas URLs não correspondentes falhará até atualizar a origem.
- Limites de tamanho/duração das Functions, concorrência e pooling precisam de ensaios reais.
- API e web são projetos Vercel separados; se a API ainda não estiver configurada, o web retornará 503 nas chamadas `/v1`.

### Bloqueios de implantação
- **Sem migrations revisadas:** não acessar PostgreSQL com esquema presumido.
- **Sem build integrado:** não declarar Preview funcional.
- **Sem segredos configurados:** não tentar liberar autenticação.
- **Sem evidência de testes RBAC/CSRF/fluxos financeiros:** não liberar produção.
- **Sem portaria/check-in:** não realizar troca física definitiva de ingressos.
- **Sem conector/adquirente homologado:** não executar estorno real.

### Monitoramento de Preview
- Registrar códigos 401, 403, 429, 5xx e latência por rota, sem vazar conteúdo de CPF, senha, pedido ou token.
- Monitorar conexões PostgreSQL e falhas Prisma, tempo de inicialização da função NestJS e cold starts.
- Criar alertas de indisponibilidade de `/v1/saude/banco` via BFF. Não enviar logs financeiros sensíveis ao analytics sem revisão LGPD.
