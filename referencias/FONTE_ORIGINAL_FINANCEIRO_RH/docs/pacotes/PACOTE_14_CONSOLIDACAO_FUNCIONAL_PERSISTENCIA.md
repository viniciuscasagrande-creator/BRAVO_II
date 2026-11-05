# Pacote 14 — Consolidação Funcional e Persistência Operacional

## Objetivo
Aprofundar o funcionamento das telas existentes sem criar novos menus. O pacote concentra persistência, formulários, edição, aprovação e comunicação entre módulos.

## Entregas funcionais
- Correção do modal operacional global, usado pelos formulários do sistema.
- Persistência local homologável mantida no Core Financeiro (`localStorage`), sem apresentar integrações externas como produção.
- Spread & Adquirentes: criar, editar e duplicar regras; validação Taxa cobrada >= MDR; versionamento; auditoria e persistência.
- Financeiro Advanced: novo lançamento de conta a pagar e liquidação; liquidação gera lançamento no Ledger.
- Divisão de Receitas: formulário de regra por evento; soma obrigatória de 100%; substituição versionada da regra vigente; persistência e auditoria.
- Central de Estornos: formulário de nova solicitação; protocolo único; entrada automática na Central de Aprovações; trilha operacional.
- Repasse/Antecipação preservam o fluxo já existente: reserva → aprovação/rejeição → assinatura Produtor → assinatura Disk → liquidação → Ledger → conciliação.
- Falhas de validação não exibem sucesso e não devem alterar o estado financeiro.

## Regra dos ambientes
Produtor solicita, acompanha e assina suas operações. Financeiro Disk administra a visão global, analisa, aprova/rejeita, assina por último e executa a liquidação.

## Limite de homologação
Autentique, Conta Azul, bancos, PIX e CNAB continuam preparados para integração, mas não são declarados como integrações reais sem credenciais/backend/homologação.
