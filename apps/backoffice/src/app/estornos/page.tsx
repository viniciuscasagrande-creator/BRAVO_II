import React from 'react';
import { ModuleFoundationView } from '../../components/module-foundation-view';

export default function EstornosPage() {
  return (
    <ModuleFoundationView
      title="Estornos e Contestação"
      subtitle="Gestão de solicitações de estorno, alçada de aprovação financeira e conciliação de callbacks de adquirentes."
      moduleCode="RFD"
      packageBadge="Guarda de Alçada Ativa (Pacote 01) · Fluxo Completo nos Pacotes 06 e 07"
      requiredPermission="refund:request"
      emptyStateTitle="Nenhuma solicitação de estorno pendente"
      emptyStateDescription="A tabela refund_requests está ativa e validada sem solicitações abertas no momento."
      governanceRules={[
        'O SAC solicita o estorno, mas a API bloqueia qualquer tentativa do SAC de aprovar ou executar o estorno (HTTP 403 + AuditRecord DENIED).',
        'O Financeiro Disk aprova a solicitação (transicionando para APROVADO), impedindo autoaprovação pelo mesmo usuário solicitante.',
        'A aprovação financeira nunca marca o estorno como CONCLUIDO; a conclusão exige confirmação comprovada do provedor de pagamento.',
      ]}
    />
  );
}
