# BRAVO_II — Portal do Produtor, incremento 01
Data: 10/11/2026. Fonte: BRAVO_II_BACKUP_GERAL_COMPLETO.zip, versão declarada 0.12.0. Não comprovado como HEAD atual.

## Entrega implementada
- Substituída a apresentação da rota /produtores-pdt por tela de consulta de eventos, seleção, programação, lotes e preços nominais.
- Carregamento, vazio, falha, atualização e proteção contra respostas atrasadas na troca de evento.
- Navegação própria responsiva, sem alternador de perfis no portal.
- Sessão conferida em GET /v1/auth/me; consultas GET /v1/events e /v1/events/:id pelo BFF já existente. Autorização efetiva permanece no servidor.
- Marketing: geração e cópia de link HTTPS com UTM, preservando parâmetros de compra. Sem armazenamento ou atribuição de vendas implementada.
- Financeiro: estado explícito de integração pendente; nenhum valor simulado, solicitação ou assinatura fictícia.
- Nenhum cadastro, tabela, migration, pedido, ledger ou produtor duplicado. Nenhuma movimentação financeira em produção.

## Evidências e limites
Executado: `node --test tests/producer-portal.test.mjs`: 3 testes passaram (parâmetros, caracteres, protocolos e validação).
Tentativa: `npm --prefix apps/backoffice run build`: bloqueada por `next: not found`; dependências não instaladas no ambiente.
Não executados: typecheck completo, build Next, navegador, sessão real, acesso Neon, testes cruzados por produtor, persistência e deploy. Não declarar homologado ou pronto para produtores reais.
Inspeção de contrato corrigiu EventSessionDto.title (não name).

## Aplicação no VS Code / Gemini
1. Comparar a versão atual com o backup; não substituir arquivos atuais cegamente.
2. Copiar os componentes producer-portal e o teste preservando os caminhos. Na página /produtores-pdt renderizar ProducerPortal.
3. Em BravoShell, antes do retorno do shell interno, incluir a condição de bypass somente para pathname === '/produtores-pdt'. O arquivo completo fornecido é referência do backup: integrar essa pequena alteração manualmente se houve evolução.
4. Usar autenticação e BFF atuais; configurar API_UPSTREAM_URL conforme contrato existente, sem credenciais no frontend.
5. Instalar dependências pelo gerenciador do repositório, executar typecheck e build web; corrigir incompatibilidades antes do Preview.
6. Testar duas contas reais de homologação: eventos próprios aparecem, GET por ID de outro produtor é negado, taxa interna ausente também da resposta de rede. Testar sessão expirada, vazio e erro da API.
7. Login existente no backup contém recursos de inspeção e credenciais de desenvolvimento. Substituir pela autenticação de produção existente antes de liberar externamente. Este pacote não homologa a segurança do login legado nem do backend atual.

## Continuidade fixa — próximo incremento
1. Conferir HEAD e reconciliar schema/migrations/Neon, conforme relatório técnico de 10/11.
2. Implementar projeção financeira exclusiva de produtor: bruto, recebido, retido e disponível, sem detalhes privados Disk. Não somar famílias duplicadas de pedidos.
3. Solicitação persistida e idempotente de repasse → aprovação interna → assinatura produtor → assinatura Financeiro → confirmação e conciliação. Reusar entidades reais, com auditoria.
4. Campanhas persistidas e vinculadas a evento, atribuição real e materiais de divulgação; provedores de anúncios dependem de integrações disponíveis.
5. Homologação ponta a ponta e publicação em Preview.

Status: código de primeiro incremento sobre backup; integração e homologação pendentes. Não alterar o PDT público atual automaticamente.
