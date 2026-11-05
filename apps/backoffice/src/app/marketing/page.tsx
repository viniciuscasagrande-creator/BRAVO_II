import React from 'react';
import { ModuleFoundationView } from '../../components/module-foundation-view';

export default function MarketingPage() {
  return (
    <ModuleFoundationView
      title="Marketing e Atribuição de Vendas"
      subtitle="Acompanhamento de campanhas, UTMs, integrações Meta/Google/TikTok/Spotify Ads e funil de conversão."
      moduleCode="MKT"
      packageBadge="Previsto no Pacote 08"
      requiredPermission="marketing:read"
      emptyStateTitle="Nenhuma campanha ou atribuição UTM registrada"
      emptyStateDescription="Não há campanhas ativas registradas no banco de dados."
      governanceRules={[
        'Relatórios de atribuição de marketing nunca substituem nem alteram o razão financeiro (Ledger).',
        'O perfil de Marketing não tem acesso para editar pedidos pagos nem visualizar dados bancários sensíveis.',
      ]}
    />
  );
}
