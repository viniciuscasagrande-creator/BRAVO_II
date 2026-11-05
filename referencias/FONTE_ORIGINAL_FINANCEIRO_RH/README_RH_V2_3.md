# RH Disk V2.3 — Operação Real do RH

Base: RH Disk V2.2 integrada ao Módulo Financeiro oficial.

## Evoluções
- Telas RH V2 passam a persistir registros de homologação no navegador.
- Botão principal cria registros operacionais.
- Workflow por registro: Aprovar, Analisar, Reprovar e Excluir.
- KPIs das telas são recalculados a partir dos registros persistidos.
- Seeds mínimos de férias, aprovações e reembolso permitem validar o fluxo.
- Mantidos dashboards hierárquicos, Ponto/Jornada, geofence, custos por evento e integrações existentes.

## Importante
A persistência V2.3 é operacional para homologação e validação de UX/fluxos. O Core/API/PostgreSQL corporativo continua sendo a camada definitiva a conectar na próxima evolução. Integrações legais/externas não devem ser tratadas como produção sem credenciais, homologação e backend correspondente.

## Validação
- npm run build: aprovado
- Integridade financeira: 14/14
- Views: 50/50
- Repasses: 11/11
- Conta financeira: 18/18
- RH Disk / Disk Ponto: 19/19
