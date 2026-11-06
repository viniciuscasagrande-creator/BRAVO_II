# BRAVO_II — Pacote 07: Integração e Homologação Técnica

## Objetivo

Conectar **Core novo + PostgreSQL/Prisma + autenticação por sessão + navegação por perfil** ao código de Comercial, Produtores e Eventos do Pacote 06. **Financeiro Disk (104 funções) e RH (45) permanecem preservados em catálogo e NÃO passam a ser executáveis por esta instalação.**

## Estado de entrega

- Código de monorepo, backend NestJS, front Next.js, prisma e módulo P06 integrados em fontes.
- Guard de sessão com cookie HttpOnly, CSRF, verificação de Origin, roles no servidor e auditoria.
- Sem conta admin predefinida, sem dados simulados e sem seed de ingressos, saldos ou clientes.
- Testes de domínio e política funcionam offline. Instalação integral das dependências **não foi possível neste ambiente sem internet**.
- Ainda faltam `npm install`, migrations, build Nest/Next, PostgreSQL ativo, smoke, testes de navegador, revisão de segurança, configuração Preview e confirmação de acesso.
- Publicação de eventos, execução bancária, repasses e estornos reais permanecem impossibilitados pelas flags de startup e por ausência de workers.

## O que foi mantido

O pacote incorpora fontes do P06, não altera o backup original. Os catálogos do Pacote Mestre Financeiro/RH foram copiados de forma somente-leitura para `reference/`; não foram implementadas 149 rotas de RH/Financeiro. Sem código do SIGE, nenhuma dependência com ele.

## Critério de aceite

1. Banco em execução e migrations geradas, revisadas e aplicadas em base **descartável**.
2. `prisma validate` e builds de Nest/Next sem erros.
3. Login real via usuário criado sob controle administrativo; sessão HttpOnly + proteção de origem/CSRF.
4. Menu por perfil não revela funcionalidades alheias; endpoints também retornam 401/403.
5. Cadastro de produtor, evento, Taxa Disk distinta por evento, submissão e aprovações funcionando ponta a ponta com banco.
6. `POST /v1/eventos/:id/publicacoes/solicitar` produz somente fila local; nada enviado a site externo.
7. Visões do Financeiro/RH identificadas como implantação pendente; nunca exibir indicadores artificiais.
8. `npm run test:smoke` passando contra o ambiente real, com evidências de URLs, status HTTP e logs sanitizados.

**Sem banco acessível e credenciais válidas, o status de homologação é PENDENTE.**
