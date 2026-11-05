import React from 'react';
import { ModuleFoundationView } from '../../components/module-foundation-view';

export default function RelatoriosPage() {
  return (
    <ModuleFoundationView
      title="Relatórios e Inteligência Operacional"
      subtitle="Catálogo de relatórios oficiais de eventos, vendas, ingressos, SAC e financeiro, com trilha de auditoria de exportação."
      moduleCode="REP"
      packageBadge="Previsto no Pacote 10"
      requiredPermission="reports:read"
      emptyStateTitle="Nenhuma exportação ou relatório gerado"
      emptyStateDescription="Os relatórios oficiais consultam projeções derivadas do núcleo transacional e do ledger, sem somas paralelas no frontend."
      governanceRules={[
        'Toda geração ou exportação de relatório respeita o escopo de produtor/evento do usuário e grava registro em ExportAudit.',
        'Relatórios exibidos a produtores ocultam integralmente a Taxa Disk interna e custos de adquirência da Disk.',
      ]}
    />
  );
}
