# Pacote 17 — Taxas e Regras Comerciais Funcionais

## Objetivo
Corrigir a tela **Taxas e Regras Comerciais** do ambiente Financeiro Disk para que seja administrativa e operacional, sem reutilizar a visão contratual do Produtor.

## Tratativas implementadas
- `+ Nova Taxa` com formulário operacional.
- Adquirente/Gateway, meio de pagamento, bandeira, parcelamento, MDR, taxa cobrada, tarifa fixa, responsável pelo custo e prazo.
- Abrangência: **Geral Disk**, **Produtor** ou **Evento**.
- Vigência inicial/final.
- Cálculo do spread líquido: taxa cobrada - MDR.
- Prioridade conceitual: Evento → Produtor → Geral Disk.
- Editar cria nova versão e preserva snapshot anterior no histórico.
- Duplicar regra.
- Ativar/Inativar.
- Histórico de versões.
- Excluir somente regra sem histórico/versionamento; caso contrário, deve ser inativada.
- Auditoria das alterações em `operationEvents`.
- Persistência na camada de homologação já usada pelo Financeiro V1.

## Separação de acesso
- **Financeiro Disk:** administra MDR, taxa comercial, spread e abrangência.
- **Produtor:** continua vendo somente suas condições comerciais contratuais; não recebe acesso ao MDR interno da Disk.

## Comunicação
As regras ficam no mesmo `spreadRules` utilizado pelo módulo Spread & Adquirentes e podem ser consumidas posteriormente pelo Checkout, Recebíveis, Ledger, Rentabilidade e Conciliação.

## Regra de produção
A persistência atual é a camada de homologação do projeto. Antes do go-live, as mutações devem ser ligadas ao backend/Core real e às permissões/autoria definitivas.
