# Padronização Global de UX e Fluxos — 2026-10-07

Aplicada sobre a base RH Disk V2.3 integrada ao Módulo Financeiro oficial.

## Regra global de página
1. Cabeçalho e contexto
2. KPIs fixos e alinhados
3. Pendências/atenção
4. Etapas do processo
5. Filtros e ação principal
6. Tabela/conteúdo operacional
7. Histórico/auditoria

## Ajustes estruturais
- KPIs em grade determinística, mesma altura e sem reposicionamento no hover.
- Navegação interna deixou de ser carrossel horizontal: agora usa grade fixa responsiva.
- Removido auto-scroll lateral do ScrollSpy.
- Barras de filtro e ações quebram linha de forma controlada e não escondem botões.
- Pipeline financeiro foi convertido para grade de etapas; atalhos transversais redundantes do cabeçalho foram ocultados.
- Tabs/faixas horizontais passam a quebrar linha em vez de exigir arraste.
- Tabelas mantêm rolagem horizontal somente quando o conteúdo tabular realmente exigir.
- Regras aplicadas globalmente via design system, atingindo RH, Financeiro e demais telas que usam os componentes compartilhados.

## Responsividade
Desktop: 4 KPIs por linha; tablet: 2; mobile: 1. Navegação de processo adapta 4/3/2/1 colunas conforme largura.
