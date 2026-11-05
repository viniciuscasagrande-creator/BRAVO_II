# Módulo Financeiro V1 — Pacote 2 — Operação Financeira Real

## Escopo implantado
- Fluxo compartilhado Produtor → Financeiro Disk para repasses e antecipações.
- Reserva operacional de saldo no repasse.
- Reserva de recebíveis futuros na antecipação.
- Central de Solicitações do Financeiro Disk separada da Central de Aprovações.
- Aprovação/rejeição com liberação da reserva em caso de rejeição.
- Assinatura sequencial: Produtor primeiro; Financeiro Disk por último.
- Liberação para pagamento somente após ambas as assinaturas.
- Liquidação atualiza Ledger e encerra a reserva.
- Trilha de auditoria por operação.

## Regra estrutural
O Produtor solicita e acompanha. O Financeiro Disk analisa, aprova/rejeita, assina por último e executa a liquidação. Ambos usam o mesmo Core Financeiro.

## Observação
Este pacote consolida o fluxo operacional no protótipo atual. Integração bancária/API real e persistência de produção permanecem para os pacotes de backend/tesouraria.
