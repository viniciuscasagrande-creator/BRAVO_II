# PROMPT — PACOTE 04: FINANCEIRO + RH + CONTABILIDADE POR CENTRO DE CUSTO

Implemente integração transacional entre RH/DP e Financeiro Disk. Use `04-INTEGRACAO/PACOTE-04-CONTRATOS-E-MIGRACAO.md` e `contracts/bridge-rh-financeiro.mjs` como contrato de referência, NÃO como API pronta. Crie no BRAVO_II NestJS/Postgres eventos e tabelas versionadas com outbox e idempotência.

Regras obrigatórias: RH aprova folha/custos de equipes; Financeiro recebe o total e aprova a instrução de pagamento; Tesouraria agenda a transmissão; somente confirmação bancária conciliada liquida. Registrar cadeia de decisões e proibir autoaprovação, duplicação de lotes, pagamento acima do saldo autorizado, manipulação de status pelo frontend e divulgação de documentos pessoais. RH da empresa separado de custo atribuído a evento. O Financeiro Disk pode analisar impacto de folha e custos no caixa sem visualizar dados médicos nem remuneração individual sem autorização específica. Nunca enviar PIX ou CNAB reais durante testes.

Adicionar testes de concorrência, 409 por idempotência, falha de banco, retry, reprocessamento da outbox, escopos de acesso, dupla autorização e histórico. Fornecer checklist de ativação futura de gateways. Não marcar a integração como produção enquanto não houver evidência de integração sandbox e reconciliação.
