import React from 'react';
import { ModuleFoundationView } from '../../components/module-foundation-view';

export default function ProdutoresPdtPage() {
  return (
    <ModuleFoundationView
      title="Produtores / Portal PDT (Visão Restrita por Escopo)"
      subtitle="Projeção autorizada para produtores vinculados: borderô, mapa de ocupação, cortesias e solicitações dentro do próprio evento."
      moduleCode="PRT"
      packageBadge="Isolamento de Escopo Ativo (Pacote 01) · Coexistência PDT no Pacote 09"
      requiredPermission="pdt:portal-read"
      emptyStateTitle="Nenhum borderô ou evento vinculado com movimentação no escopo"
      emptyStateDescription="O adaptador PDT filtra rigorosamente os recursos pelo escopo user_producer_scopes e user_event_scopes."
      governanceRules={[
        'Um produtor vinculado ao Evento A jamais consegue consultar ou inferir dados do Evento B de outro produtor (HTTP 403 CROSS_EVENT_SCOPE_FORBIDDEN).',
        'A Taxa Disk contratual interna é estritamente suprimida de todos os DTOs, relatórios e respostas destinadas ao PDT.',
        'O produtor não possui acesso às telas internas do Financeiro Disk.',
      ]}
    />
  );
}
