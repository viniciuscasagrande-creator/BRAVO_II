import React from 'react';
import { ModuleFoundationView } from '../../components/module-foundation-view';

export default function RemarketingPage() {
  return (
    <ModuleFoundationView
      title="Remarketing e Pós-Evento"
      subtitle="Segmentação de públicos, verificação de base legal/consentimento LGPD e disparos auditados."
      moduleCode="MSG"
      packageBadge="Previsto no Pacote 08"
      requiredPermission="remarketing:read"
      emptyStateTitle="Nenhum segmento ou disparo de comunicação ativo"
      emptyStateDescription="Nenhum disparo de e-mail, WhatsApp ou SMS foi configurado."
      governanceRules={[
        'O consentimento de marketing nunca é presumido automaticamente a partir da compra do ingresso.',
        'Todo disparo e exportação de segmento verifica opt-out e registra auditoria de finalidade LGPD.',
      ]}
    />
  );
}
