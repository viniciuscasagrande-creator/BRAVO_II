# Pacote 18 — Central Operacional de Gateways e Adquirentes

## Objetivo
Aprofundar o submenu existente **Gateways e Adquirentes**, sem criar novo menu lateral, transformando-o em central operacional conectada a Taxas/MDR, Conciliação e Estornos.

## Navegação interna
Configurações; Credenciais; Bandeiras e Cartões; PIX; Boletos; Parcelamento; Antifraude; Webhooks; Conciliação; Estornos; Logs; Relatórios.

## Funções implantadas na homologação
- Novo Gateway e edição.
- Ambiente Produção/Sandbox.
- Credenciais mascaradas e indicação explícita de que segredo real deve ficar no backend.
- Ativar/Inativar.
- Configurar bandeiras, PIX, boleto, parcelamento, antifraude e webhooks.
- Logs locais de auditoria.
- Teste de conexão sem falso positivo: enquanto não houver backend homologado, o sistema informa que apenas as credenciais mínimas estão cadastradas.
- Acesso direto a Taxas e Regras Comerciais, Conciliação e Central de Estornos.

## Regra de arquitetura
Gateway/Adquirente → credenciais → meios/bandeiras → parcelamento → MDR/custo real → Taxas e Regras Comerciais → Spread → Checkout → Recebíveis → Liquidação → Conciliação.

O MDR continua informação interna do Financeiro Disk. O ambiente Produtor não recebe credenciais nem custo interno de adquirência.
