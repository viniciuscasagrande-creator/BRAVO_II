const pendencias = [
  ['REP-00281','Repasse','ABC Eventos','Aguardando aprovação','Hoje 14:00','diskAprovacoes'],
  ['ANT-00042','Antecipação','Sul Produções','Aguardando assinatura','Hoje 16:30','diskAssinaturas'],
  ['CON-00118','Conciliação','Festival Norte','Divergência bancária','Hoje 17:00','diskConciliacao'],
  ['PAG-00491','Pagamento','Fornecedor XPTO','Vencimento próximo','Amanhã','diskContasPagar'],
  ['FEC-00031','Fechamento','Evento Verão','Checklist incompleto','Amanhã','diskFechamentos']
];

export function renderDiskCentralTrabalho(state, section='central') {
  const tabs = [['central','Central de Trabalho'],['alertas','Alertas'],['sla','SLA Financeiro'],['pendencias','Pendências'],['agenda','Agenda Operacional'],['notificacoes','Notificações']];
  const active = tabs.find(t=>t[0]===section)?.[1] || 'Central de Trabalho';
  const cards = [
    ['Aprovações pendentes', state.pendingApprovalsCount || 8, 'diskAprovacoes', 'ph-check-square-offset'],
    ['Assinaturas pendentes', 6, 'diskAssinaturas', 'ph-signature'],
    ['Divergências', 4, 'diskConciliacao', 'ph-warning-circle'],
    ['Pagamentos próximos', 11, 'diskAgendaPagamentos', 'ph-calendar-check']
  ];
  return `<div class="container-fluid py-3">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
      <div><div class="text-uppercase text-muted fs-xxs fw-bold">FINANCEIRO DISK</div><h3 class="mb-0">${active}</h3><div class="text-muted">Fila operacional única para acompanhar, priorizar e encaminhar o trabalho financeiro.</div></div>
      <div class="d-flex gap-2"><button class="btn btn-outline-primary" onclick="window.app.financeAction('atualizar-central')"><i class="ph-arrows-clockwise me-1"></i>Atualizar</button><button class="btn btn-primary" onclick="window.app.navigate('diskSolicitacoes')"><i class="ph-inbox me-1"></i>Solicitações</button></div>
    </div>
    <div class="card mb-3"><div class="card-body py-2 d-flex flex-wrap gap-2">${tabs.map(t=>`<button class="btn btn-sm ${section===t[0]?'btn-primary':'btn-outline-secondary'}" onclick="window.app.navigate('diskTrabalho_${t[0]}')">${t[1]}</button>`).join('')}</div></div>
    <div class="row g-3 mb-3">${cards.map(c=>`<div class="col-md-3"><div class="card h-100"><div class="card-body"><div class="d-flex justify-content-between"><div class="text-muted small">${c[0]}</div><i class="${c[3]} fs-5"></i></div><div class="fs-3 fw-bold">${c[1]}</div><button class="btn btn-link p-0" onclick="window.app.navigate('${c[2]}')">Abrir módulo →</button></div></div></div>`).join('')}</div>
    <div class="row g-3">
      <div class="col-lg-8"><div class="card"><div class="card-header d-flex justify-content-between"><strong>Fila priorizada</strong><span class="badge bg-warning text-dark">${pendencias.length} itens críticos/próximos</span></div><div class="table-responsive"><table class="table table-hover mb-0"><thead><tr><th>Protocolo</th><th>Tipo</th><th>Contexto</th><th>Pendência</th><th>Prazo</th><th></th></tr></thead><tbody>${pendencias.map(p=>`<tr><td class="fw-semibold">${p[0]}</td><td>${p[1]}</td><td>${p[2]}</td><td>${p[3]}</td><td>${p[4]}</td><td><button class="btn btn-sm btn-outline-primary" onclick="window.app.navigate('${p[5]}')">Tratar</button></td></tr>`).join('')}</tbody></table></div></div></div>
      <div class="col-lg-4"><div class="card mb-3"><div class="card-header"><strong>SLA Financeiro</strong></div><div class="card-body"><div class="d-flex justify-content-between mb-2"><span>Dentro do prazo</span><strong>87%</strong></div><div class="progress mb-3" style="height:8px"><div class="progress-bar" style="width:87%"></div></div><div class="small text-muted">3 operações vencidas e 7 próximas do limite.</div><button class="btn btn-sm btn-outline-primary mt-3" onclick="window.app.navigate('diskTrabalho_sla')">Ver SLA</button></div></div>
      <div class="card"><div class="card-header"><strong>Atalhos operacionais</strong></div><div class="card-body d-grid gap-2"><button class="btn btn-outline-secondary text-start" onclick="window.app.navigate('diskAprovacoes')">Central de Aprovações</button><button class="btn btn-outline-secondary text-start" onclick="window.app.navigate('diskAssinaturas')">Assinaturas</button><button class="btn btn-outline-secondary text-start" onclick="window.app.navigate('diskAgendaPagamentos')">Agenda de Pagamentos</button><button class="btn btn-outline-secondary text-start" onclick="window.app.navigate('diskGovernanca_bloqueios')">Bloqueios e Exceções</button></div></div></div>
    </div>
    <div class="card mt-3"><div class="card-header"><strong>Comunicação entre módulos</strong></div><div class="card-body small text-muted">Cada item da fila mantém o protocolo e encaminha para o módulo responsável. Aprovação, assinatura, pagamento, conciliação e fechamento devem atualizar o mesmo fluxo operacional, evitando tarefas isoladas entre telas.</div></div>
  </div>`;
}
