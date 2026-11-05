# Módulo Financeiro V1 — Pacote 6
## Fechamentos, Borderôs, Prestação de Contas e Dossiê Financeiro

Este pacote mantém os dois ambientes do Módulo Financeiro V1: **Produtor** e **Financeiro Disk**. A nova Central de Fechamentos pertence ao **Financeiro Disk**; o Produtor continua acessando somente seus próprios borderôs, documentos e assinaturas.

### Fluxo de fechamento
Evento encerrado → consolidação de vendas/estornos → conciliação final → borderô definitivo → assinatura do Produtor → assinatura final do Financeiro Disk → encerramento → dossiê financeiro.

### Regras
- Um evento não pode ser fechado definitivamente com divergências críticas de conciliação.
- Solicitações financeiras pendentes devem ser tratadas antes do encerramento definitivo.
- O Produtor assina antes; o Financeiro Disk é sempre o último signatário.
- Fechamento não apaga lançamentos, documentos ou evidências anteriores.
- Correções posteriores devem gerar nova versão/ajuste com trilha de auditoria.
- O dossiê reúne referências para borderô, conciliação, extrato do Ledger, repasses, comprovantes, estornos/chargebacks, relatórios e auditoria.

### Escopo visual implantado
- Central `Fechamentos e Dossiês` no menu Financeiro Disk.
- Esteira de fechamento com etapas e bloqueios.
- Fechamento por evento e situação.
- Resumo financeiro do evento.
- Checklist de encerramento.
- Dossiê financeiro documental.
- Borderô preservado como tela própria.

### Próxima integração real
Persistir estados de fechamento, versões do borderô, documentos, assinaturas e vínculos do dossiê no backend/banco. Geração de PDF e assinatura eletrônica devem usar provedores homologados na implantação de produção.
