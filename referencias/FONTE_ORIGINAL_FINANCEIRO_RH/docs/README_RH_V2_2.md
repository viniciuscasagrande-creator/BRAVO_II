# RH Disk V2.2 — Dashboards Operacionais Integrados

Evolução da V2.1 integrada ao Módulo Financeiro oficial do Disk Ingressos.

## Arquitetura: O Dashboard como Área de Trabalho

O dashboard agora atua como a bancada de trabalho operacional diária do usuário, unindo indicadores em tempo real, pendências com ação direta e visão gerencial.

### Dashboards Operacionais por Domínio

1. **Pessoas e Estrutura (`diskRH_dashPessoas`)**:
   - Headcount ativo, novas admissões, contratos e documentos a vencer, movimentações de cargos/salários pendentes.
   - Alertas com links para resolução direta de contratos em vencimento e admissões digitais.
2. **Departamento Pessoal (`diskRH_dashDP`)**:
   - Folha de pagamento atual, programação de férias, afastamentos ativos, lotes do eSocial.
   - Alertas críticos: rescisões pendentes, férias aguardando aprovação, inconsistências do eSocial e fechamento de folha.
3. **Ponto e Jornada (`diskRH_dashPonto`)**:
   - Presentes agora, colaboradores em intervalo, atrasos do dia, ajustes pendentes de aprovação.
   - Ocorrências de batidas fora de geofence autorizada e banco de horas acumulado (+340h).
4. **Talentos e Desenvolvimento (`diskRH_dashTalentos`)**:
   - Vagas abertas prioritárias, pipeline de candidatos, avaliações 360° em aberto, certificações e NRs obrigatórias a vencer.
5. **Saúde e Segurança - SST (`diskRH_dashSST`)**:
   - ASOs a vencer nos próximos 30 dias, exames periódicos pendentes, fichas e renovação de EPIs, histórico de CAT / acidentes zero.
6. **Eventos e Custos (`diskRH_dashEventos`)**:
   - Eventos e arenas ativas hoje, profissionais alocados (CLT + freelancers), diárias PIX e apropriação direta para o DRE do evento.
7. **Portais e Gestão (`diskRH_dashGestao`)**:
   - Pendências da equipe, aprovações abertas, autoatendimento no portal do colaborador e métricas de liderança.
8. **Administração do RH (`diskRH_dashAdmin`)**:
   - Conectores ERP/eSocial, auditoria imutável (logs de acessos sensíveis LGPD), políticas publicadas e integridade de filas.

## Interatividade e Recursos

- **Área "Precisa da sua atenção"**: Cards e badges prioritários (🔴 URGENTE, 🟠 ATENÇÃO, 🟡 VENCIMENTO, 🔵 ROTINA) que direcionam o gestor com um único clique para o registro a ser resolvido.
- **KPIs Clicáveis**: Cada métrica possui navegação contextual direta.
- **Ações Rápidas**: Botões para abrir formulários e processos mais utilizados.
- **Evolução Gerencial**: Histórico visual dos últimos 6 meses com atalho para o People Analytics.
- **Segregação de Homologação**: Indicadores com rotulagem clara demonstrativa até a conexão final com as rotinas do Core.
