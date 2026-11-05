import { formatCurrency } from '../../formatters.js';

export function renderDiskFechamentos(state) {
  const eventos = state.data?.events || [];
  const bordero = state.data?.bordero;
  const produtor = state.data?.producer;
  const bruto = bordero?.summary?.grossRevenue || 0;
  const liquido = bordero?.summary?.netEventBalance || 0;
  const repassado = bordero?.summary?.alreadyTransferred || 0;
  const remanescente = bordero?.summary?.remainingBalance || 0;
  const nomeEvento = bordero?.eventName || eventos[0]?.name || 'Evento selecionado';

  return `
    <div class="limitless-page-header">
      <div class="breadcrumbs"><span>Financeiro Disk</span><span class="breadcrumb-separator">/</span><span class="breadcrumb-active">Fechamentos e Dossiês</span></div>
      <div class="page-title-row">
        <div class="page-title-group">
          <h1><i class="ph-folder-lock"></i> Fechamentos, Borderôs e Dossiês</h1>
          <p class="page-title-desc">Central administrativa para encerrar eventos, consolidar prestação de contas, controlar assinaturas e preservar o dossiê financeiro.</p>
        </div>
        <div class="header-action-group">
          <button class="btn btn-secondary" onclick="window.app.navigate('bordero')"><i class="ph-file-text"></i> Abrir Borderô</button>
          <button class="btn btn-primary" onclick="window.print()"><i class="ph-printer"></i> Imprimir visão</button>
        </div>
      </div>
    </div>

    <div class="limitless-content">
      <div class="row g-3 mb-4">
        ${kpi('Eventos em fechamento', '4', 'ph-calendar-check', 'Conciliação e documentos em andamento')}
        ${kpi('Aguardando assinatura', '2', 'ph-signature', 'Produtor ou Financeiro Disk')}
        ${kpi('Pendências de conciliação', '3', 'ph-warning-circle', 'Impedem o encerramento definitivo')}
        ${kpi('Fechados no período', '18', 'ph-seal-check', 'Dossiês concluídos e preservados')}
      </div>

      <div class="card-panel mb-4">
        <div class="card-header-bar"><div class="card-title-group"><h2>Esteira de Fechamento</h2><p class="card-subtitle">O evento somente chega a “Fechado” depois das validações financeiras e assinaturas obrigatórias.</p></div></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:repeat(7,minmax(120px,1fr));gap:10px;overflow:auto;">
            ${etapa('1','Evento encerrado','Concluído')}${etapa('2','Vendas e estornos','Concluído')}${etapa('3','Conciliação','Em revisão')}${etapa('4','Borderô','Gerado')}${etapa('5','Produtor assina','Pendente')}${etapa('6','Disk assina','Bloqueado')}${etapa('7','Dossiê fechado','Bloqueado')}
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;">
        <div class="card-panel">
          <div class="card-header-bar"><div class="card-title-group"><h2>Fechamento por Evento</h2><p class="card-subtitle">Visão financeira consolidada do evento antes do encerramento definitivo.</p></div></div>
          <div class="card-body card-body-no-padding">
            <table class="limitless-table"><thead><tr><th>Evento</th><th>Produtor</th><th>Receita bruta</th><th>Resultado líquido</th><th>Situação</th><th></th></tr></thead>
            <tbody>
              <tr><td><strong>${nomeEvento}</strong><div class="text-muted fs-xs">${bordero?.venue || 'Local do evento'}</div></td><td>${produtor?.name || 'Produtor'}</td><td>${formatCurrency(bruto)}</td><td><strong>${formatCurrency(liquido)}</strong></td><td><span class="badge bg-warning text-dark">Em fechamento</span></td><td><button class="btn btn-sm btn-secondary" onclick="window.app.navigate('bordero')">Detalhes</button></td></tr>
              <tr><td><strong>Festival Horizonte</strong><div class="text-muted fs-xs">Arena Principal</div></td><td>Produtora Horizonte</td><td>R$ 1.284.550,00</td><td><strong>R$ 1.041.230,00</strong></td><td><span class="badge bg-success">Fechado</span></td><td><button class="btn btn-sm btn-secondary">Dossiê</button></td></tr>
              <tr><td><strong>Experiência Verão</strong><div class="text-muted fs-xs">Parque Central</div></td><td>Eventos Sul</td><td>R$ 684.200,00</td><td><strong>R$ 552.410,00</strong></td><td><span class="badge bg-danger">Pendência</span></td><td><button class="btn btn-sm btn-secondary">Analisar</button></td></tr>
            </tbody></table>
          </div>
        </div>

        <div class="card-panel">
          <div class="card-header-bar"><div class="card-title-group"><h2>Resumo do Evento</h2><p class="card-subtitle">${nomeEvento}</p></div></div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:12px;">
            ${linha('Receita bruta', formatCurrency(bruto))}
            ${linha('Resultado líquido', formatCurrency(liquido))}
            ${linha('Já repassado', formatCurrency(repassado))}
            ${linha('Saldo remanescente', formatCurrency(remanescente), true)}
            <hr style="border:0;border-top:1px solid var(--border-color);width:100%;">
            ${check('Vendas consolidadas', true)}${check('Estornos consolidados', true)}${check('Conciliação final', false)}${check('Borderô definitivo', true)}${check('Assinatura do Produtor', false)}${check('Assinatura Financeiro Disk', false)}
          </div>
        </div>
      </div>

      <div class="card-panel mt-4">
        <div class="card-header-bar"><div class="card-title-group"><h2>Dossiê Financeiro</h2><p class="card-subtitle">Documentos e evidências preservados por evento. O fechamento não apaga nem substitui o histórico.</p></div></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
            ${doc('Borderô definitivo','Gerado','ph-file-text')}${doc('Conciliação final','Em revisão','ph-arrows-left-right')}${doc('Termo assinado','Aguardando','ph-signature')}${doc('Comprovantes de repasse','3 arquivos','ph-receipt')}
            ${doc('Extrato do Ledger','Disponível','ph-book-bookmark')}${doc('Estornos e chargebacks','Consolidado','ph-warning-octagon')}${doc('Relatório de vendas','Disponível','ph-chart-bar')}${doc('Trilha de auditoria','Preservada','ph-scroll')}
          </div>
        </div>
      </div>

      <div class="card-panel mt-4">
        <div class="card-header-bar"><div class="card-title-group"><h2>Regra de Encerramento</h2><p class="card-subtitle">Controles obrigatórios do Módulo Financeiro V1.</p></div></div>
        <div class="card-body">
          <div class="alert alert-info mb-0"><strong>Fechamento definitivo bloqueado:</strong> enquanto houver divergência de conciliação, solicitação financeira pendente ou assinatura obrigatória ausente. O Produtor assina primeiro e o Financeiro Disk é sempre o último signatário.</div>
        </div>
      </div>
    </div>`;
}
function kpi(t,v,i,s){return `<div class="col"><div class="card-panel h-100"><div class="card-body"><div class="d-flex align-items-center gap-2 mb-2"><i class="${i} fs-4"></i><span class="text-muted fs-xs">${t}</span></div><div class="fs-3 fw-bold">${v}</div><div class="text-muted fs-xxs mt-1">${s}</div></div></div></div>`}
function etapa(n,t,s){return `<div style="border:1px solid var(--border-color);border-radius:10px;padding:12px;background:#fff;min-width:130px"><div class="text-muted fs-xxs">ETAPA ${n}</div><div class="fw-bold fs-xs mt-1">${t}</div><div class="text-muted fs-xxs mt-2">${s}</div></div>`}
function linha(k,v,forte=false){return `<div style="display:flex;justify-content:space-between;gap:12px"><span class="text-muted">${k}</span><strong${forte?' style="color:var(--primary)"':''}>${v}</strong></div>`}
function check(t,ok){return `<div class="d-flex align-items-center gap-2"><i class="${ok?'ph-check-circle text-success':'ph-clock text-warning'}"></i><span class="fs-xs">${t}</span></div>`}
function doc(t,s,i){return `<div style="border:1px solid var(--border-color);border-radius:10px;padding:14px"><i class="${i} fs-4"></i><div class="fw-bold fs-xs mt-2">${t}</div><div class="text-muted fs-xxs mt-1">${s}</div></div>`}
