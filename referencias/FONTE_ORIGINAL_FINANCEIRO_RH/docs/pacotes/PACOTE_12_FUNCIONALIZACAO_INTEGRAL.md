# Módulo Financeiro V1 — Pacote 12
## Funcionalização Integral — sem novos menus

Este pacote congela a expansão de menus e concentra o trabalho no comportamento das telas existentes.

### Entregas desta etapa
- Persistência local do estado operacional da demonstração: solicitações, reservas, aprovações, assinaturas, liquidações, Ledger e timeline deixam de desaparecer ao atualizar a página.
- Protocolo e `workflowId` únicos nas solicitações de repasse e antecipação.
- Registro transversal de eventos da operação (`operationEvents`) para comunicação entre módulos.
- Validações de origem por ambiente: Produtor solicita/assina como Produtor; Financeiro Disk aprova, rejeita, assina por último e liquida.
- Validação de saldo, evento, valor e conta bancária antes de criar repasse.
- Rejeição exige motivo e observação e devolve a reserva.
- Aprovação, assinatura do Produtor, assinatura final da Disk e liquidação passam a registrar eventos no mesmo workflow.
- Liquidação continua gerando Ledger e conciliação vinculados ao protocolo da operação.

### Regra funcional
`Produtor → Solicitação → Reserva → Financeiro Disk → Aprovação → Assinatura Produtor → Assinatura Disk → Tesouraria → Liquidação → Ledger → Conciliação → Histórico`

### Limite desta entrega
A persistência adicionada é local ao navegador para tornar o protótipo funcional e testável. Ela NÃO substitui banco/API de produção. Integrações externas (Autentique, Conta Azul, bancos, PIX/CNAB) continuam exigindo credenciais, backend e homologação reais; o sistema não deve apresentar uma chamada externa simulada como confirmação real.

### Próxima regra de trabalho
Não adicionar menus. Corrigir os botões/telas restantes por criticidade e substituir persistência local por API + banco quando o backend de produção for conectado.
