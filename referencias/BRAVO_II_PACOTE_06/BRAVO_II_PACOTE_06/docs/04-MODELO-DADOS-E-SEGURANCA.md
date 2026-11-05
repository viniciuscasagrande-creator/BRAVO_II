# Estrutura de banco, autorizações, auditoria e LGPD

## Banco
O conjunto `database/schema.p06.prisma` contém `BravoProducer`, `BravoProducerDocument`, `BravoEvent`, `BravoEventProducer`, `BravoEventSession`, `BravoEventArea`, `BravoEventSeat`, `BravoTicketCategory`, `BravoPriceLot`, `BravoEventChannel`, `BravoEventMedia`, `BravoEventFee`, `BravoEventApproval`, `BravoPublication`, `BravoOutbox`, `BravoAudit`.

- ID primário: UUID; CNPJ (numérico ou alfanumérico de 14 caracteres) normalizado em caixa alta com índice único; o algoritmo oficial de verificação usa ASCII menos 48 para as 12 posições-base, módulo 11.
- Produtor pode ter muitos eventos; evento pode ter vários produtores, mas só um principal (`migration-hardening.sql` aplica índice único parcial).
- Evento possui data do evento, abertura de vendas, sessões, local, categorias e preços.
- Taxa Disk em centavos ou pontos-base, sem `Float` monetário. Unicidade de versão por evento.
- Aprovação única por evento/revisão/etapa; registro de usuário que tomou a decisão e justificativa.
- Outbox idempotente em transação; evento aguarda confirmação externa antes de ser `PUBLICADO`.
- `BravoAudit`: alterações no mesmo commit. A auditoria no Core deve ser append-only com privilégio de banco restrito; hash encadeado/WORM em armazenamento de auditoria quando homologado.
- Migrations são de homologação e devem ser revisadas para schema único, tabelas já existentes e permissões do banco.

## Segurança
- Autenticação central do Pacote 05, sessão única, expiração e MFA para atos críticos conforme política; nunca login adicional em submenu.
- `P06PrincipalGuard` só aceita `req.user` verificado por componente anterior de segurança; sem Core, 401 para todas as rotas. Isso NÃO substitui validação real de JWT/sessão.
- RBAC interno inicial: `ADMIN`, `COMERCIAL`, `CADASTRO`, `OPERACOES`, `PUBLICACAO`, `FINANCEIRO_DISK`, `AUDITOR`; `PRODUTOR` não deve usar controllers internos.
- Implementar ABAC por `eventId`, `producerId`, organização e alçada no Core. Uma mera checagem de role não é autorização suficiente para publicação de produção.
- MFA / assinatura dupla e separação de funções devem ser verificados no Core quando se exigir aprovação formal.
- Limitar endpoints de upload por extensão, MIME, antivírus, criptografia, tamanho, retenção e permissão. Exibir só metadados; storageKey nunca deve ser URL pública.
- PII em banco com controles de acesso por finalidade LGPD, máscara em logs e exportação auditada. Não enviar documentos de produtor ao Financeiro ou RH indiscriminadamente.
- O endpoint interno de confirmação de publicação não foi exposto pelo controller; um worker confiável deve chamá-lo após verificação criptográfica do recibo.

## Matriz resumida de permissões
| Ação | Comercial | Cadastro | Operações | Publicação | Financeiro Disk | Produtor |
|---|---|---|---|---|---|---|
| Criar produtor | Sim | Sim | Não | Não | Não | Via PDT solicitação futura |
| Validar produtor | Não | Sim, segundo ator | Não | Não | Não | Não |
| Criar evento interno | Sim | Não | Sim | Não | Não | Solicitação via PDT futuro |
| Propor Taxa Disk | Sim | Não | Não | Não | Consultar | Não |
| Aprovar Taxa Disk | Sim, segundo ator | Não | Não | Não | Não | Não |
| Aprovar cadastro evento | Não | Sim, por etapa | Não | Não | Não | Não |
| Aprovar comercial evento | Sim | Não | Não | Não | Não | Não |
| Aprovar operacional evento | Não | Não | Sim | Não | Não | Não |
| Aprovar publicação | Não | Não | Não | Sim | Não | Não |
| Solicitar publicação | Não | Não | Não | Sim | Não | Não |
| Consultar Taxa Disk | Sim | Não | Não | Não | Sim | Nunca |
| Consultar relatórios PDT | Não | Não | Não | Não | Autorização específica | Próprios eventos |

Administrador precisa de alçadas explícitas e não de um bypass da segregação. Este pacote permite papel ADMIN técnico em etapas internas, mas o Core deve aplicar regras efetivas de alçada e MFA.
