# 11 — Decisão de arquitetura: BRAVO_II do zero, sem código-fonte do SIGE

## Fato confirmado pelo solicitante (05/11/2026)
A DiskIngressos **não possui o código-fonte do SIGE legado**. O acesso ao banco do SIGE, a exportações de dados, APIs e credenciais de integração **não foi confirmado**. Não presumir disponibilidade de nenhum deles.

## Regra primordial
**Não condicionar a construção do BRAVO_II ao SIGE.** O BRAVO_II é um novo produto, com repositório próprio, banco PostgreSQL próprio, modelos de domínio próprios, APIs próprias, controle de acesso e auditoria próprios. O vídeo é referência de funções e experiência, nunca especificação de implementação, protocolo ou banco. Não reproduzir código, tabelas ou endpoints que não foram disponibilizados.

## Como executar em VS Code/Gemini
1. Criar um repositório vazio `BRAVO_II` com monorepo (`apps/admin`, `apps/api`, `packages/shared`, `packages/ui`, `packages/config`; demais apps quando exigidos por fluxos completos).
2. Seguir `GEMINI.md` e `prompts/00-PROMPT-MESTRE.md`: configurar banco novo, migrations, autenticação segura, RBAC + escopo produtor/evento, navegação em português e logs de auditoria.
3. Implementar primeiro um fluxo vertical persistido: cadastro produtor PJ → condições comerciais **por evento** → cadastro evento → aprovação e preparação de publicação; não oferecer publicação real sem contrato/API do site.
4. Para integrações ainda desconhecidas (site, PDV, PDT, gateway, e-mail), criar portas/interfaces e implementações sandbox/teste isoladas; produção fica desligada até credenciais e homologação.
5. Registrar evidências reais de testes, estados vazios no ambiente operacional e proibir dados fictícios em produção.

## Descoberta funcional: reconstruir sem engenharia reversa de código
- Inventariar telas e operações vistas no vídeo: entradas, ações, filtros, mensagens, estados e permissões aparentes.
- Descrever fluxos fornecidos pela operação DiskIngressos e validar a especificação por departamento.
- Criar a **matriz de paridade funcional por comportamento**: função observada → regra documentada → módulo BRAVO_II → caso de teste → evidência de aceite.
- O que não foi visto no vídeo fica classificado como `a validar`, jamais como inexistente.
- A impossibilidade de examinar a implementação real impede concluir paridade técnica ou qualidade do legado.

## Migração de dados — três cenários alternativos
| Cenário | Estratégia | Limite obrigatório |
|---|---|---|
| A: existe exportação CSV/Excel/relatórios | Criar importador tipado, validação, identificador de origem, deduplicação, reconciliação e carga em staging | Não importar passivos financeiros sem conciliação e autorização |
| B: existem APIs autorizadas | Criar conector com leitura paginada, auditoria, tratamento de erros, mapeamento e idempotência | Não assumir que APIs existem nem tentar acessá-las sem autorização |
| C: não há qualquer acesso a dados legados | Iniciar **somente operações novas** no BRAVO_II e manter registros/ingressos antigos fora da nova base | Não prometer histórico, estornos, check-in ou relatórios antigos no BRAVO_II |

## Restrições críticas de virada
- Eventos com ingressos já vendidos no SIGE não podem ser transferidos por aparência da tela; exigem dados confiáveis de pedido, identidade do ingresso, status, pagamento, mapa/assento e comprovante de reconciliação.
- Sem dados antigos verificáveis, **não migrar eventos ativos**, **não inventar números de pedido**, **não reeditar ingressos históricos**, **não habilitar estorno ou validação de ingressos antigos no BRAVO_II**.
- A disponibilidade do sistema legado durante transição também é desconhecida; se não houver acesso operacional, a equipe deve definir um procedimento formal de contingência antes de atender obrigações antigas.
- Homologar e ativar BRAVO_II inicialmente para novos eventos e novos pedidos, em corte controlado, nunca criando estoque duplicado com o canal legado.
- Reservar intervalo de códigos de 8 dígitos e checar risco de colisão com ingressos antigos; não supor unicidade cruzada sem base histórica.

## Registro de origem por entidade
Manter `source_system` (`BRAVO_II` ou identificador de fonte exportada) e `source_record_id` quando houver dados efetivamente importados; `legacy_id_map` é **opcional**, criado apenas no início de uma migração real autorizada. Não criar importador funcional fictício por obrigação de cronograma.

## Primeiro aceite do projeto
- Repositório limpo criado pelo Gemini a partir do pacote.
- Banco novo PostgreSQL com migrations executadas, login único, RBAC testado, menus sem links quebrados e auditoria para mutações.
- Cadastros vazios em produção/Preview sem dados simulados; fixtures só nos testes.
- Nenhuma dependência de código, tabela ou API do SIGE.
- Fluxo básico de produtor + evento + taxa Disk por evento disponível para implementação nas fases 02–03.
