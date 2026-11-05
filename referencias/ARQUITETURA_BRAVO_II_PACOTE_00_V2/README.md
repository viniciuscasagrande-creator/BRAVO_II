# BRAVO_II — ERP modular DiskIngressos

**Pacote 00 v2 — Reconstrução independente SEM código-fonte do SIGE; arquitetura-alvo e instruções para implementação no VS Code com Gemini**  
Referência de trabalho: 05/11/2026. Idioma de interfaces: **pt-BR**.

## Escopo e situação real
Este pacote contém a proposta de arquitetura e os critérios de implementação do **BRAVO_II**, sucessor do SIGE legado. A gravação examinada é `Gravando 2026-11-05 141403.mp4` (6min48s), com amostragem temporal e inspeção dirigida de telas e transições; este procedimento **não é auditoria do código-fonte, do banco de dados, de APIs nem das integrações de produção**. Os 12 fluxos fornecidos pelo solicitante são os requisitos de negócio de partida. Nenhum código do ERP foi alterado, nenhuma integração em produção foi ativada e nenhuma movimentação financeira foi executada.

**Fato confirmado em 05/11/2026:** a DiskIngressos **não dispõe do código-fonte do SIGE**. Não se sabe se existem exportações/API/banco acessíveis. **Não exigir nem aguardar o código SIGE para construir o BRAVO_II.** Leia `docs/11-CONSTRUCAO-SEM-FONTE-SIGE.md` antes de usar o pacote.

## Decisões estruturantes
1. Construir um **monólito modular** no backend em primeira etapa, com fronteiras fortes entre domínios, banco PostgreSQL e eventos via outbox. Microserviços somente após evidências de necessidade operacional.
2. Ter um **núcleo único** de identidades, produtores, clientes, eventos, sessões, ingressos, pedidos, pagamentos e lançamentos; apps independentes consomem as APIs e permissões do núcleo.
3. **Taxa Disk negociada por evento**, fixa ou percentual sobre valor-base do ingresso; versionar a regra e congelar a regra aplicada à transação. Não confundir taxa Disk, tarifa do gateway, comissão de PDV ou desconto.
4. **Um ingresso, um identificador numérico público de oito dígitos**, único segundo a política definitiva, e **um token de validação de alta entropia independente** (QR/assinatura); o código numérico nunca concede acesso por si só.
5. Vendas e dinheiro segregados: valor total recebido pela Disk != receita própria da Disk != obrigação com produtor != valor liberado para repasse.
6. Proteger operações críticas (cancelamento, mudança de sessão, estorno, repasse, antecipação, taxas, acessos) com autenticação, autorização, trilha de auditoria e estados explícitos.
7. **Dados reais apenas.** Não semear CPF, ingressos ou valores falsos; testes usam fixtures isoladas e nunca aparecem na produção.
8. Portal do Produtor (PDT) e site público permanecem protegidos, integrados por contrato; substituir interfaces apenas após equivalência funcional, homologação e estratégia de transição.

## Como usar no VS Code
1. Extraia o ZIP numa pasta `BRAVO_II` e abra a pasta no VS Code.
2. Entregue ao Gemini o `GEMINI.md` e o arquivo `prompts/00-PROMPT-MESTRE.md` como instrução principal.
3. Solicite **somente a Fase 00 e a Fase 01**, com relatório de arquivos modificados, migrations, testes e resultado de build.
4. Valide os critérios em `docs/09-ROADMAP-ACEITE.md` antes de iniciar fases seguintes.
5. **Comece de um repositório novo**. Fontes históricas são opcionais e não bloqueiam o início; se futuramente houver exportação autorizada, tratá-la em projeto de ingestão separado. **Não presumir tabelas antigas a partir do vídeo.**

## Índice
- `docs/00-ANALISE-DO-VIDEO.md`: cenas observadas com marcação temporal, preservação e lacunas.
- `docs/01-JORNADA-OPERACIONAL.md`: as 12 etapas e fluxos conectados.
- `docs/02-MODULOS-E-MENUS.md`: menu interno e fronteiras de módulos.
- `docs/03-ARQUITETURA-TECNICA.md`: stack, monorepo, modularidade, APIs e eventos.
- `docs/04-DADOS-E-REGRAS.md`: modelo lógico, regras financeiras e de ticket.
- `docs/05-SEGURANCA-GOVERNANCA.md`: perfis, autorização, auditoria, LGPD e segregação.
- `docs/06-ESTADOS-EXCECOES.md`: máquinas de estados e exceções críticas.
- `docs/07-CONTRATOS-INTEGRACOES.md`: APIs, eventos, provedores, PDT, site e PDV.
- `docs/08-MIGRACAO-HOMOLOGACAO.md`: transição segura sem código-fonte do SIGE.
- `docs/11-CONSTRUCAO-SEM-FONTE-SIGE.md`: decisão greenfield, planos de dados e bloqueios de virada.
- `docs/09-ROADMAP-ACEITE.md`: ordem de desenvolvimento, critérios de sucesso.
- `docs/10-UX-E-TELAS.md`: padrão visual moderno, telas por operação.
- `GEMINI.md`: regras operacionais que o Gemini deve cumprir.
- `prompts/00A-INICIO-SEM-SIGE.md`: instrução curta e explícita para iniciar do zero.
- `prompts/*.md`: comandos por fase para usar no Gemini.
- `diagrams/*.mmd`: fluxos em Mermaid editáveis.
- `contracts/api-convencoes.md`: contratos mínimos de API e mensagens.

## Pontos a confirmar na implementação
- Código de oito dígitos único **globalmente** (recomendação) versus único somente por evento; política de convivência com códigos históricos.
- Definição comercial/contábil exata de *Spread*, *Rebate* e *Advanced*, inclusive critérios, titularidades e aprovações.
- Integrações reais do site, PDT, PDV, pagamentos, e-mail e comunicação; **não depender de modelos do SIGE**.
- Política de retenção de dados, contratos, permissões e matriz de responsabilidade legal.

**Regra de transparência:** este é um pacote técnico de planejamento e implementação guiada, não um ERP já instalado, testado ou publicado.
