# Pacote 13 — Funções Financeiras Avançadas

## Escopo
Telas implementadas a partir das referências visuais fornecidas, mantendo a composição dos prints e adaptando cores/componentes ao design system do Módulo Financeiro V1.

- Spread & Adquirentes
- Financeiro Advanced
- Divisão de Receitas
- Central de Estornos

## Regra
Estas inclusões são exceções justificadas ao congelamento de menus. O foco permanece funcionalização. Botões novos possuem ação/navegação e as operações críticas apontam para módulos existentes (Aprovações/Tesouraria).

## Integração funcional esperada
Gateways/MDR → Spread → Recebíveis → Split → Saldos → Ledger → Tesouraria → Conciliação → Rentabilidade.

Estorno → Pedido/Pagamento original → Alçada → Aprovação → Reversão → Ledger → Conciliação.

## Produção
Os dados financeiros exibidos são demonstrativos. APIs bancárias, adquirentes e persistência de produção exigem backend/credenciais/homologação; a interface não deve representar sucesso real sem confirmação do serviço correspondente.
