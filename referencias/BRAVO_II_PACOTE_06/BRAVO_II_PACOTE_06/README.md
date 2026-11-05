# BRAVO_II — Pacote 06 | Comercial, Produtores e Gestão de Eventos

**Data de referência:** 05/11/2026 · **Idioma:** pt-BR · **Natureza:** entrega incremental de código e contratos **não implantada no Core**.

Este é o pacote seguinte ao desenho da Fundação Operacional (Pacote 05). **Não recebemos nem verificamos um repositório Pacote 05 compilado, nem credenciais PostgreSQL e nem integração oficial do site DiskIngressos.** Assim, este material é um módulo isolado e integrável, não uma publicação concluída. A compilação e os 15 testes das funções puras de domínio foram executados. O NestJS e as páginas Next.js ainda exigem a integração e suas dependências.

## Entrega

- `packages/domain/`: código TypeScript sem dependência de banco ou framework, compilável e com testes de regras comerciais, CNPJ, transições, taxas e publicação.
- `database/schema.p06.prisma`: modelos do PostgreSQL/Prisma **a mesclar**, sem sobrescrever o schema existente. `migration-hardening.sql` traz restrições adicionais para revisão.
- `apps/api/src/modules/pacote06/`: controllers, serviços NestJS, auditoria por transação, contexto autenticado do Core, e outbox de publicação e taxa. Não há auth de demonstração.
- `apps/backoffice/src/`: telas React/Next.js de cadastros de produtores, evento, Event Builder, taxa por evento e aprovações, preparadas para backend real. Não geram registros fictícios.
- `integracao/`: inventário imutável das 149 funções do Financeiro/RH, menu incremental, eventos de integração e OpenAPI básico.
- `docs/`: especificação integral, lacunas, critérios de homologação, segurança e comandos.
- `prompts/`: sequência de implementação destinada ao Gemini no VS Code.

## Para abrir no VS Code

1. Extraia o pacote em uma pasta separada `BRAVO_II_PACOTE_06`. **Não** copie por cima do Pacote Mestre Financeiro/RH.
2. Abra a pasta no VS Code, entregue `GEMINI.md` ao Gemini e solicite a leitura de `docs/00-ESCOPO-E-STATUS.md`.
3. Rode `cd packages/domain && tsc -p tsconfig.json && node --test tests/*.test.mjs` (Node 22+, TypeScript 5.8+). Na ausência de `tsc`, execute `npm install` **apenas no módulo domínio**.
4. Rode `node tests/validate-package.mjs` na raiz do pacote para verificar o catálogo Financeiro/RH e presença dos arquivos.
5. Só depois de entregar/identificar o Pacote 05 execute o prompt `prompts/01-INTEGRACAO-COM-CORE.md`. Nunca montar rotas sem sessão real.
6. Executar os prompts `02`, `03`, `04` sequencialmente e homologar antes de publicar.

## Condições comerciais imutáveis

- Taxa Disk definida **por evento**, nunca herdada automaticamente de produtora; em percentual (pontos-base) ou valor fixo (centavos).
- A proposta e a aprovação têm usuários distintos; a versão aprovada passa a valer da data contratada, sem recalcular ingressos antigos.
- Apenas Comercial, Financeiro Disk e auditores devidamente autorizados veem a taxa; produtor, PDT, público e SAC não recebem esse dado.
- Cadastro e aprovação cadastral feitos por colaboradores diferentes.
- Evento só solicita publicação após validação da produtora, sessão, preço, canal, taxa e quatro aprovações. Solicitar não significa publicado.
- Publicação real depende de API oficial DiskIngressos + confirmação, nunca presumir êxito. Não há vendas bancárias, estornos ou pagamentos neste pacote.
- O Financeiro/RH do Pacote Mestre permanece inalterado; 149 funções são referência de integração.

## Não afirmar pronto

O código de domínio e seus testes estão validados. **Ainda pendentes**: instalar Nest/Next e Prisma no Core, conciliar schema, autenticar por sessão única, testar endpoints contra PostgreSQL, validar tela no navegador, upload protegido, editor avançado de mapa/assentos, documentos/contratos assinados, conectores do site e PDVs, homologação com produtores e publicações reais.
