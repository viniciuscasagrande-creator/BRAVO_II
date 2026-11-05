# Questões de negócio e bloqueios de produção

Esses pontos NÃO devem ser presumidos pelo Gemini. Podem ser definidos posteriormente sem impedir o cadastro inicial do evento.

1. **CNPJ alfanumérico 2026:** suporte obrigatório em cadastro e integrações. Ver manual da Receita Federal: https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf
2. **Documentação PJ e contratos:** conjunto oficial exigido para aprovação cadastral, política de renovação e assinatura digital (representantes, atos societários, comprovantes, poderes de assinatura).
2. **Taxa Disk:** fonte contratual exata, se a taxa fixa incide por ingresso ou por pedido (neste pacote foi assumida POR INGRESSO conforme a regra conhecida); tratamento de cortesias, descontos, meia-entrada, combos, taxas de serviço, tributos, cancelamento, chargeback e absorção por canal. Não aplicar cálculo financeiro definitivo até regras aprovadas.
3. **Comissão de produtor secundário:** habilitar somente mediante contrato/percentuais aprovados. Papel secundário não gera participação financeira automática.
4. **Data de abertura das vendas:** é obrigatória para publicação. Confirmar fuso horário operacional do evento e datas de corte de lote. Armazenar em UTC, exibir no timezone do evento. O UI atual usa timezone local do navegador e deve ser revisado para multi-fuso.
5. **Assentos numerados:** os dados permitem cadastro de assento, mas não existe ainda bloqueio/hold transacional de estoque; não habilitar compras até implantação.
6. **Publicação:** definir API oficial, identidade do publicador, contrato de retorno, idempotência, agendamento, retries e despublicação. Não acionar site público sem autorização expressa.
7. **Propostas e contratos:** o backend deste pacote entrega regra de taxa, não um CRM B2B ou editor completo de contratos. Os itens de menu restantes continuam planejados.
8. **Alteração de evento publicado:** regras para mudança de sessão, aumento de lotação, correção de preço e cancelamento/adiamento; abrir solicitação versionada e envolver Financeiro/SAC sempre que afetar compradores.
9. **Segurança:** role por si só não substitui alçada por recurso, MFA, política de SoD e auditores append-only. `P06PrincipalGuard` é guard complementar, não autentica cookies/token.
10. **Confiabilidade:** endpoints de cadastros ainda não usam idempotency-key em todos os POSTs; rever contra envio duplo. Concorrência de lotes/áreas requer lock explícito/retry serializable.
11. **PII:** CNPJ/representante/endereço sob proteção LGPD e perfis; definir prazo de retenção de documentos e mecanismos de exportação/auditoria.
12. **Origem do financeiro:** 149 entradas do catálogo estão preservadas, mas código financeiro e RH produtivo não foi implantado como Core nesta etapa.

## Decisões técnicas propostas (reversíveis)
- Monólito modular NestJS, Next.js, PostgreSQL e Prisma; um schema e banco canônicos.
- Taxa em pontos-base (`625` = `6,25%`) ou valor fixo em centavos. Arredondamento half-up positivo, revisar política financeira final.
- Evento não é publicado automaticamente pelo cadastro, aprovação ou solicitação.
- `BravoProducer`/`BravoEvent` são nomes temporários dos modelos; conciliar com entidades canônicas do Pacote 05 e normalizar antes da migration.
