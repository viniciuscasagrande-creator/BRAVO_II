# Contrato de integração do Financeiro Disk (BRAVO_II)

## Consulta (a implementar no NestJS)
`GET /v1/financeiro/operacoes?modulo=<grupo/rotina>&produtorId=&eventoId=&periodo=mes`

Requisitos:
- cookie HttpOnly e CSRF/origem conforme política BRAVO_II;
- permissão `finance:read` validada no servidor, nunca apenas no React;
- filtro por produtor e evento no banco, com escopo obrigatório;
- `200 {"items": [...]}` com propriedades alinhadas às colunas da tela, sem valores simulados;
- `404` ou `501` quando rotina ainda não implementada, sem fallback silencioso;
- paginação, limite de tamanho, filtro de data e logs de auditoria;
- valores monetários tipados (centavos), datas ISO, valores ausentes `null`;
- rotas de escrita **não fazem parte** deste pacote. Devem ser implementadas individualmente após homologação.

## Domínios a mapear
- Recebíveis: pedidos pagos, adquirentes, conciliação e liquidação;
- MDR, Taxa Disk, Spread/Rebate: configuração por evento e alçadas internas;
- Tesouraria: contas bancárias, PIX e CNAB com aprovação e execução externa separadas;
- Ledger: partidas dobradas, trilhas e vínculo ao evento;
- Estorno: dupla aprovação e confirmação externa antes da conclusão;
- RH: permanece independente, com referências e vínculos no financeiro por lançamentos aprovados.

## Fluxos protegidos
Uma tela visualmente concluída não comprova serviço operacional. Não declarar pagamento, conciliação, assinatura ou estorno como real sem evidência de API, transação em PostgreSQL e integração homologada. Nunca usar os dados demonstrativos do backup como dados reais.

## Implementado nesta entrega
`FinanceiroVideoController` cadastrado no módulo Financeiro, com `AuthGuard` + `finance:read` + bloqueio de Produtor. Leituras PostgreSQL com até 100 linhas e sem movimentações. Fontes iniciais: `produtores/produtores`, `produtores/eventos`, `ledger/lancamentos`, `controladoria/centros-custo`, `estornos/historico`. Demais rotas respondem **HTTP 501** com erro explícito `ROTINA_EM_IMPLANTACAO`. Algumas colunas são apenas identificadores provisórios; os DTOs financeiros ainda devem ser normalizados. **Não realizar decisões financeiras com os valores formatados em centavos sem conversão segura**.

### Pendências obrigatórias antes da operação
- Implementar fontes de dados por grupo conforme contratos próprios, validação de escopos por evento/produtor, filtros reais e paginação;
- revisar campos retornados (ex.: código do evento não equivale a produtor) e expor DTOs tipados sem aproximações;
- registrar auditoria por requisição e aplicar limitação de taxa;
- implementar APIs de escrita apenas com testes transacionais e aprovações.
