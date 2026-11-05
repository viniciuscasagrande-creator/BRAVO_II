# PROMPT — PACOTE 03: RH, DP E DISK PONTO INTEGRAIS

Leia o mapa de 45 funções `03-RH-DP/MAPA-45-FUNCOES.md`, o plano `03-RH-DP/PACOTE-03-ESCOPO-IMPLEMENTACAO.md` e toda a referência RH: `js/views/rh/rhViews.js`, `backend/src/rh/`, `RH_DISK_V1/`, `mobile/disk-ponto/`, seus schemas, docs e testes. Integre todas as 45 rotas ao mesmo shell do BRAVO_II, incluindo as capacidades de RH fora do menu.

O registro de empregado e o login corporativo são únicos. Não criar duas tabelas `Colaborador` paralelas. Implementar escopos separados RH, DP, gestor, colaborador e Financeiro. Cifrar/mascarar dados sensíveis com acesso por finalidade, auditoria e política de retenção. Um funcionário consulta apenas seus documentos, registros de ponto e holerites. Gestor enxerga apenas equipe vinculada. Financeiro recebe somente totais autorizados e metadados, não salários individuais, CPFs ou atestados.

Não transportar `localStorage` V2.3, `Maps` de colaboradores, login sem senha ou rotas `/api/rh` desprotegidas. Selecionar um app mobile Disk Ponto canônico, com fila offline, idempotência e testes de dispositivos/geofence. Implementar workflows de admissão, férias, benefícios, folha, staff por evento, desligamento e eSocial sem transmissão real. Verificar parâmetros legais vigentes antes do uso. Entregar matriz 45/45 e testes negativos de autorização.
