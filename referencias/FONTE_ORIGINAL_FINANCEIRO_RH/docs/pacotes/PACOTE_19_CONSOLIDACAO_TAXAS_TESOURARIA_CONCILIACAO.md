# Pacote 19 — Consolidação Operacional de Taxas, Tesouraria e Conciliação

## Objetivo
Fechar o circuito financeiro existente sem criar novos menus laterais: Gateway/Adquirente → custo MDR → regra comercial → spread → obrigação → agenda → pagamento → PIX/CNAB → retorno → conciliação → Ledger/Auditoria.

## Taxas e Regras Comerciais
- Central administrativa do Financeiro Disk com filtros e indicadores calculados das regras persistidas.
- Regra Geral Disk, Produtor ou Evento, com prioridade Evento → Produtor → Geral Disk.
- Gateway/adquirente, meio, bandeira, parcelamento, MDR, tarifa fixa, taxa cobrada, responsável, vigência e versionamento.
- Simulador operacional para localizar a regra aplicável e decompor custo, receita de taxa e spread.
- Histórico preservado; regra com histórico não é excluída, apenas inativada.

## Tesouraria
- A tela deixa de tratar CNAB como transmissão real quando não existe integração bancária homologada.
- Lotes ficam em fluxo Preparado → Aprovado → Arquivo gerado → Aguardando retorno → Liquidado/Rejeitado.
- Drill-down de lote e preparação de arquivo CNAB.
- Contexto Produtor/Evento deve ser respeitado; consolidados Disk são identificados.
- Atalhos para Agenda, Pagamentos em Lote, PIX, CNAB e Conciliação usam os módulos já existentes.

## Conciliação
- Camadas Bancária, PIX/CNAB, Gateways, Adquirentes, Recebíveis, Repasses e Ledger.
- Divergência possui protocolo, causa, responsável, evidência/observação, ação corretiva e histórico.
- Resolver divergência não altera silenciosamente valores originais e não duplica Ledger.

## Regra de homologação
Ações externas sem backend/credencial real são identificadas como preparação/homologação. Nenhuma tela deve declarar transmissão bancária ou integração externa concluída sem confirmação real.
