# PROMPT 02 — Comercial, cadastro mestre e Taxa Disk por evento

Leia `docs/02-JORNADA-OPERACIONAL-E-ESTADOS.md`, `docs/04-MODELO-DADOS-E-SEGURANCA.md`, `apps/api/src/modules/pacote06/producers.service.ts` e `commercial.service.ts`.

Construir e testar as telas `/comercial`, `/comercial/produtores`, `/comercial/produtores/novo`, `/comercial/produtores/[id]` e `/comercial/eventos/[id]/taxas` integradas ao Core.

Obrigatório:
- Persistir produtora PJ única por CNPJ **numérico e alfanumérico** conforme regra 2026 da Receita Federal, endereço, representante, contatos e documentos privados.
- Viabilizar validação cadastral com verificador diferente do cadastrador e requisitos de documentação definidos.
- Criar contratos/propostas estruturados como tarefas adicionais sem inventar assinatura digital ou taxa padrão por produtor.
- Propor Taxa Disk fixa em centavos POR INGRESSO ou percentual em pontos-base POR EVENTO, com número de versão, vigência, documento contratual e aprovador independente.
- Testar dois eventos do mesmo produtor com taxas distintas; versionar atualização apenas prospectiva; snapshots futuros do checkout devem usar versão efetiva na data/hora da venda.
- Restringir Taxa Disk às funções internas autorizadas (backend e frontend), testar 403 para Produtor, SAC, PDT, Marketing e não autorizado.
- Auditoria no mesmo commit com código e IDs não sensíveis; não logar documento bruto ou senha.
- Em RH e Financeiro manter mesmo Producer.id; evitar tabelas duplicadas de produtor.

Critérios: rotas reais, banco persistente, testes de autorização, build e nenhum mock de produtor em tela operacional.
