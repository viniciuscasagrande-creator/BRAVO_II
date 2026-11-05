# Pacote 06 — Entregas, limites e evidências

## Fonte de referência
- Fluxo descrito pelo usuário: produtor PJ → negociação por evento → montagem de evento com preço → aprovações internas → publicação na DiskIngressos → venda online e PDV.
- SIGE não tem fonte disponível: vídeo é referência de UX/funcionalidade, sem suposição de API/banco legado.
- Financeiro Disk e RH catalogados no Pacote Mestre (104 + 45 = 149 entradas); dois cadastros financeiros antigos de produtores não devem criar uma segunda fonte canônica.
- Pacote 05: **implementação do Core não recebida**. Logo o P06 é incremental, dependente de integração, NÃO implantado nem homologado em produção.

## Estado de cada entrega
| Entrega | Estado | Evidência |
|---|---|---|
| Domínio TypeScript independente | COMPILADO | `tsc -p packages/domain/tsconfig.json` |
| Testes de regras CNPJ/taxa/aprovação/publicação | TESTADO_LOCAL | `node --test packages/domain/tests/*.test.mjs` |
| Modelos Prisma / PostgreSQL | ENTREGUE_NAO_EXECUTADO | `database/schema.p06.prisma` |
| Rotas/services NestJS | ENTREGUE_NAO_COMPILADO | `apps/api/src/modules/pacote06/` |
| Páginas e formulários Next.js | ENTREGUE_NAO_COMPILADO | `apps/backoffice/src/` |
| Autenticação do Core + RBAC/ABAC completo | DEPENDENTE_PACOTE_05 | Nenhum login demo neste pacote |
| Upload de documentos e armazenagem privada | PARCIAL | Referências de documento; integração de storage pendente |
| Editor visual de mapas e inventário real | PARCIAL | Áreas e assentos modelados, editor visual pendente |
| API oficial DiskIngressos publicação | BLOQUEADO | Worker/credenciais não recebidos; outbox não executado externamente |
| PDV/ingressos vendidos/repasses/estornos bancários | FORA_DA_EXECUCAO | Pacotes seguintes, integrações deliberadamente desativadas |

## Escopo dos fluxos
1. Cadastrar produtora PJ: CNPJ, razão social, nome fantasia, endereço, telefone, e-mail, representante, documentos.
2. Conferir documentação, aprovar cadastro com um usuário diferente de quem criou.
3. Criar rascunho de evento com produtor principal e possíveis secundários.
4. Montar sessões e capacidades; áreas, assentos; modalidades; lotes com preço em centavos; canais online, PDV e bilheteria.
5. Negociar Taxa Disk por evento; versão com referencial contratual e início de vigência, percentual OU fixa.
6. Aprovar proposta por usuário comercial diferente; manter histórico versionado; repassar informação por evento privado ao Financeiro.
7. Enviar evento à análise cadastral, comercial, operacional e publicação, em ordem, com justificativas para reprovação.
8. Solicitar publicação por outbox idempotente, gerar status `PUBLICACAO_SOLICITADA` e `PENDENTE_INTEGRACAO`.
9. Somente um worker autenticado, após API oficial confirmar, muda status para `PUBLICADO` (não há HTTP público para isso).
10. Manter auditoria imutável em todos os atos importantes e preparar rastreabilidade Financeiro/PDT.

## O que NÃO foi declarado implementado
Gestão comercial CRM completa, assinaturas digitais, upload de arquivos, calendário editorial, mapas em canvas, mapas numerados em grande volume, reserva concorrente de assento, PDV real, checkout, QR, emissão, integração oficial com www.diskingressos.com.br, validação de obrigações fiscais e regulatórias. Existem inventário e planos para esses complementos.
