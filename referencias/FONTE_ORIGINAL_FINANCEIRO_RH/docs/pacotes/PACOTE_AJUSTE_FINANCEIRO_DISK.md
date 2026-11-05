# Pacote de Ajuste — Módulo Financeiro V1

## Objetivo
Separar visual e operacionalmente os dois ambientes já definidos no projeto:

- **Financeiro do Produtor** — visão particular, limitada ao próprio produtor e seus eventos.
- **Financeiro Disk** — visão administrativa geral, transversal a todos os produtores e eventos.

Ambos continuam usando o mesmo Core Financeiro, banco, Ledger, workflow e auditoria.

## Ajustes aplicados neste pacote

1. Identificação explícita **FINANCEIRO DISK** no ambiente administrativo.
2. Identificação **FINANCEIRO DO PRODUTOR** no ambiente do produtor.
3. Reorganização do menu administrativo do Financeiro Disk por domínios:
   - Produtores e Eventos
   - Solicitações e Aprovações
   - Recebíveis e Liquidações
   - Processamento e Regras
   - Tesouraria
   - Controle e Conciliação
   - Gestão e Controladoria
   - Informação e Administração
4. Inclusão da **Central de Solicitações** separada da **Central de Aprovações**.
5. Renomeação de **Produtores 360** para **Produtores**.
6. Renomeação de **Ledger Contábil** para **Ledger Financeiro**.
7. Correção do renderizador do Financeiro Disk: Saldos, Repasses, Antecipações, Extrato, Taxas, Estornos, Borderôs, Relatórios e Contas Bancárias deixam de cair silenciosamente no Dashboard.
8. Inclusão de áreas administrativas preparadas para integração futura, sem duplicar dados do Produtor.
9. Preservação do fluxo de assinatura: Produtor assina primeiro e Financeiro Disk por último.
10. Build estático regenerado em `dist/` e validado.

## Regra arquitetural preservada

```text
LOGIN
  ├─ PRODUTOR
  │    └─ Financeiro do Produtor
  │
  └─ FINANCEIRO DISK
       └─ Ambiente Administrativo Geral

              ↓
        CORE FINANCEIRO
              ↓
     Ledger / Workflow / Auditoria
```

O Financeiro Disk pode filtrar Produtor e Evento sem mudar de perfil ou entrar no ambiente do Produtor.

## Observação
Algumas novas entradas administrativas são estruturas de navegação preparadas para receber implementação funcional específica nas próximas entregas. O pacote não simula que módulos ainda não conectados ao Core estejam operacionais.
