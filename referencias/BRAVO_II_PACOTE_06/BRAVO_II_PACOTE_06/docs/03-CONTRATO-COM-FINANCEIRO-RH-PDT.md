# Integrações entre módulos sem vazamento de dados

## Fonte canônica
`BravoProducer.id` e `BravoEvent.id` serão adotados pelo Core como identificadores únicos para o Financeiro Disk, RH (equipes e centro de custo), SAC, Marketing e PDT. Não gerar novos cadastros paralelos quando produtores e eventos aparecerem em outros módulos. Os módulos legados presentes no Pacote Mestre deverão apontar para IDs canônicos por adaptadores de leitura.

## Financeiro Disk
- O Comercial registra e autoriza a Taxa Disk POR EVENTO. O Financeiro pode consultar essa regra por API **interna**.
- Payload de `commercial.event_fee_approved.v1`: `{eventId, feeId, feeVersion}`. Os detalhes da negociação exigem consulta autorizada ao Core. O produtor não recebe rubricas internas.
- O futuro checkout envia `eventId`, `feeId`, `feeVersion`, `ticketFaceValueCents` para o motor financeiro, que guarda snapshot em cada item vendido. Não misturar o valor da taxa com MDR/spread/rebate/advanced.
- O evento criado não gera saldo, repasse, antecipação, obrigação ou receita fictícia. Somente venda e liquidação confirmadas geram lançamentos conforme o motor financeiro.
- Qualquer alteração de taxa após venda é prospectiva e deve ser versionada; desconto, cortesia, taxa absorvida e estorno requerem políticas específicas.

## RH e equipes
- Staff e equipes de eventos referenciam `eventId` do Core. Custo RH por evento é uma obrigação separada do saldo de repasses; informação de salário, atestado, CPF de colaboradores permanece em domínio RH com autorização específica.
- O Pacote 06 não implementa pagamento ou folha, nem deve modificar os 45 itens RH catalogados.

## PDT do Produtor
- Visão limitada a eventos autorizados por vínculo `producerId` e escopo; autorização também no servidor.
- Não enviar Taxa Disk, documentos do produtor de terceiros, mudanças internas ou trilhas financeiras de outros eventos.
- PDT atual permanece intacto até a disponibilidade de adapter de eventos e contratos de segurança homologados.

## Site www.diskingressos.com.br
- `EVENT_PUBLICATION_REQUESTED` apenas enfileira pedido; sem credencial/endpoint oficial, permanece pendente.
- O worker externo deve aplicar idempotência por `publication:eventId:vREVISION`, assinar requisições, verificar recibo de confirmação, salvar ID externo e registrar auditoria.
- Os dados públicos devem ser explicitamente projetados: título, descrição, local, datas, sessões e preços anunciáveis. Nunca serializar a entidade Prisma inteira para o site.
- O banco interno é a verdade sobre aprovações. O site é a verdade sobre publicação efetivamente confirmada, via comprovante de integração.

## Eventos adiados/cancelados
- Criar caso de mudança com sessão, motivo, data e responsáveis; acionar SAC, notificação e avaliação financeira de reembolso/chargeback. Não alterar pedidos ou ingressos diretamente no módulo de cadastro do evento.
- O estorno exige autorização do Financeiro Disk e confirmação da operadora, conforme regras do projeto.
