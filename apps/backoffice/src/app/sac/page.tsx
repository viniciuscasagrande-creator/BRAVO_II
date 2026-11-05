import React from 'react';
import { ModuleFoundationView } from '../../components/module-foundation-view';

export default function SacPage() {
  return (
    <ModuleFoundationView
      title="SAC / Atendimento e SLA"
      subtitle="Central omnicanal de chamados, acompanhamento de SLA/ITIL, trocas de sessão autorizadas e abertura de solicitações de estorno."
      moduleCode="CS"
      packageBadge="Previsto no Pacote 06"
      requiredPermission="sac:read"
      emptyStateTitle="Nenhum chamado de atendimento aberto"
      emptyStateDescription="A fila de atendimento SAC encontra-se vazia no banco de dados."
      governanceRules={[
        'O SAC pode consultar pedidos e ingressos, realizar trocas de sessão dentro da política e abrir solicitações de estorno.',
        'O SAC NÃO possui permissão para aprovar ou executar estorno bancário (bloqueado por refund:approve na API).',
        'O SAC NÃO visualiza a Taxa Disk contratual interna negociada com o produtor.',
      ]}
    />
  );
}
