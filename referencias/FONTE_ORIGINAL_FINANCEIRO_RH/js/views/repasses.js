/**
 * Repasses - Fluxo de Transferência e Pipeline de Pagamentos do Produtor
 * Pipeline Oficial: Solicitação → Recebido Disk → Em Análise → Aprovação → Assinatura Produtor → Assinatura Disk → Programação → Pagamento & Conciliação
 */
import { formatCurrency, createStatusBadge } from '../formatters.js';
import { financialStore } from '../state.js';

export function renderRepasses(state) {
  const producer = state.activeProducer;
  const payouts = state.data.approvalQueue.filter(a => a.type === 'Repasse' && a.producerId === producer.id);
  const availableBalance = producer.totals?.availableBalance || 400000.00;
  const transferredAmount = producer.totals?.transferredAmount || 920000.00;
  const scheduledAmount = payouts.filter(p => ['Programado', 'Aprovado', 'Documento formalizado'].includes(p.status)).reduce((acc, p) => acc + (p.requestedAmount || p.amount || 0), 0);

  // Eventos do produtor e cálculo do Motor de Elegibilidade (50% vendas -> 20% liberação)
  const events = (state.data.events || []).filter(e => e.producerId === producer.id);
  const selectedEventId = (state.selectedEventId && state.selectedEventId !== 'all')
    ? state.selectedEventId
    : (events.find(e => e.id === 'evt-inverno')?.id || events[0]?.id || 'evt-001');
  const currentEvent = events.find(e => e.id === selectedEventId) || events[0] || state.data.events[0];
  const eligibility = financialStore.calculatePayoutEligibility(currentEvent?.id) || {
    eventName: currentEvent?.name || 'Evento',
    salesTarget: 1000000,
    grossSales: 500000,
    progressPercent: 50,
    minSalesPercent: 50,
    releasePercent: 20,
    ruleMet: true,
    faltamVendas: 0,
    limiteBruto: 100000,
    previousPayouts: 40000,
    totalDeductions: 50000,
    disponivelFinal: 50000,
    isExceptional: false,
    status: 'HABILITADO'
  };

  // Repasse em destaque para a régua (prioriza REP-2026-00128 ou o primeiro ativo)
  const activePayout = payouts.find(p => p.id === 'REP-2026-00128') ||
                       payouts.find(p => p.status.includes('análise') || p.status.includes('assinatura') || p.status === 'Aprovado' || p.status === 'Programado') ||
                       payouts[0];

  // Documento aguardando assinatura do produtor
  const needsProducerSignature = payouts.find(p => p.status === 'Aguardando assinatura do Produtor');

  return `
    <!-- Header -->
    <div class="limitless-page-header">
      <div class="breadcrumbs">
        <span>Financeiro</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-active">Repasses</span>
      </div>
      <div class="page-title-row">
        <div class="page-title-group">
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 19V5"></path><polyline points="5 12 12 5 19 12"></polyline></svg>
            Gestão e Acompanhamento de Repasses
          </h1>
          <p class="page-title-desc">Rastreamento ponta a ponta: Motor de Elegibilidade &bull; Solicitação &bull; Análise de Risco &bull; Formalização Digital &bull; Liquidação Bancária.</p>
        </div>
        <div class="header-action-group">
          ${eligibility.disponivelFinal > 0 ? `
            <button class="btn btn-primary" onclick="window.app.openPayoutModal('${currentEvent.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Solicitar Repasse Agora (${formatCurrency(eligibility.disponivelFinal)})
            </button>
          ` : `
            <button class="btn btn-secondary" onclick="window.app.openPayoutModal('${currentEvent.id}')" title="Acesse os detalhes de elegibilidade deste evento">
              <i class="ph-lock me-1"></i> Solicitar Repasse (${eligibility.status === 'BLOQUEADO' ? 'Bloqueado' : 'Sem Limite'})
            </button>
          `}
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="limitless-content">

      <!-- CARD DE ELEGIBILIDADE DO REPASSE (MOTOR 50% VENDAS -> 20% LIBERAÇÃO) -->
      <div class="card-panel mb-4 shadow-sm" style="border: 2px solid ${eligibility.status === 'EXCECAO_AUTORIZADA' ? '#3b82f6' : (eligibility.ruleMet ? '#10b981' : '#f59e0b')}; background: #ffffff;">
        <div class="card-header-bar" style="background: ${eligibility.status === 'EXCECAO_AUTORIZADA' ? 'rgba(59,130,246,0.06)' : (eligibility.ruleMet ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)')};">
          <div class="card-title-group">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span class="badge ${eligibility.status === 'EXCECAO_AUTORIZADA' ? 'bg-primary' : (eligibility.ruleMet ? 'bg-success' : 'bg-warning text-dark')}" style="font-size: 0.75rem; font-weight: 800; letter-spacing: 0.05em; padding: 5px 10px;">
                ${eligibility.status === 'EXCECAO_AUTORIZADA' ? '🛡️ EXCEÇÃO ADMINISTRATIVA AUTORIZADA' : (eligibility.ruleMet ? '✓ REPASSE HABILITADO' : '🔒 REPASSE BLOQUEADO')}
              </span>
              <span style="font-size: 0.8rem; color: var(--text-muted);">
                Motor de Elegibilidade · Política de Repasse Disk (${eligibility.minSalesPercent}% vendas &bull; ${eligibility.releasePercent}% liberado)
              </span>
            </div>
            <h2 style="margin-top: 6px; font-size: 1.25rem;">
              Status do Evento: <strong>${eligibility.eventName}</strong>
            </h2>
            <p class="card-subtitle">
              Meta de vendas: <strong>${formatCurrency(eligibility.salesTarget)}</strong> &bull; Vendas realizadas: <strong>${formatCurrency(eligibility.grossSales)}</strong> (${eligibility.progressPercent}%) &bull; Regra de liberação: ${eligibility.ruleMet ? '<span class="text-success fw-bold">Atingida (mínimo ' + eligibility.minSalesPercent + '%)</span>' : '<span class="text-danger fw-bold">Não atingida (mínimo ' + eligibility.minSalesPercent + '%)</span>'}
            </p>
          </div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <select class="form-select form-select-sm" style="max-width: 280px; font-weight: 600;" onchange="window.app.onRepasseViewEventSelect(this.value)">
              ${events.map(ev => `
                <option value="${ev.id}" ${ev.id === currentEvent.id ? 'selected' : ''}>
                  ${ev.name} (${Math.round((ev.grossSales / (ev.salesTarget || 1000000)) * 100)}% vendido)
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <div class="card-body">
          <!-- Barra de Progresso de Vendas vs Meta -->
          <div style="margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 6px; font-weight: 600;">
              <span>Progresso de Vendas (${eligibility.progressPercent}% de ${formatCurrency(eligibility.salesTarget)})</span>
              <span>${eligibility.ruleMet ? '<span class="text-success">✓ Gatilho mínimo alcançado</span>' : '<span class="text-danger">Faltam ' + formatCurrency(eligibility.faltamVendas) + ' em vendas para liberar repasse</span>'}</span>
            </div>
            <div class="progress" style="height: 12px; background: #e2e8f0; border-radius: 6px; overflow: hidden; position: relative;">
              <div style="position: absolute; left: ${eligibility.minSalesPercent}%; top: 0; bottom: 0; width: 2px; background: #dc2626; z-index: 2;" title="Gatilho Mínimo (${eligibility.minSalesPercent}%)"></div>
              <div class="progress-bar" style="width: ${Math.min(eligibility.progressPercent, 100)}%; background: ${eligibility.ruleMet ? '#10b981' : '#f59e0b'}; transition: width 0.4s ease;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">
              <span>0%</span>
              <span style="color: #dc2626; font-weight: 700;">▲ Gatilho Mínimo: ${eligibility.minSalesPercent}%</span>
              <span>100% (${formatCurrency(eligibility.salesTarget)})</span>
            </div>
          </div>

          <!-- Alerta se houver Autorização Excepcional Ativa -->
          ${eligibility.isExceptional && eligibility.activeException ? `
            <div class="alert alert-info p-3 mb-3 d-flex align-items-center justify-content-between" style="background: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #2563eb; border-radius: 8px;">
              <div>
                <div class="fw-bold text-primary" style="font-size: 0.9rem;">
                  🛡️ Autorização Administrativa Excepcional Ativa (Protocolo: ${eligibility.activeException.protocol})
                </div>
                <div style="font-size: 0.8rem; color: #1e40af; margin-top: 2px;">
                  Responsável: <strong>${eligibility.activeException.authorizedBy}</strong> em ${eligibility.activeException.createdDate} &bull; Limite liberado: <strong>${formatCurrency(eligibility.activeException.amount)}</strong>
                </div>
                <div style="font-size: 0.78rem; color: #475569; margin-top: 4px;">
                  <em>"Justificativa registrada: ${eligibility.activeException.reason}"</em>
                </div>
              </div>
              <span class="badge bg-primary text-white fs-xs px-2 py-1">Exceção Concedida</span>
            </div>
          ` : ''}

          <!-- Alerta se Bloqueado -->
          ${!eligibility.ruleMet && !eligibility.isExceptional ? `
            <div class="alert alert-warning p-3 mb-3" style="background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; border-radius: 8px;">
              <div class="fw-bold text-amber-900" style="font-size: 0.88rem;">
                🔒 Regra de Liberação: Não atingida (mínimo ${eligibility.minSalesPercent}% de vendas)
              </div>
              <div style="font-size: 0.8rem; color: #92400e; margin-top: 3px;">
                Faltam <strong>${formatCurrency(eligibility.faltamVendas)}</strong> em vendas para liberar o primeiro repasse antecipado de até ${eligibility.releasePercent}%. Solicitações manuais ficam travadas preventivamente para proteção do fluxo do evento.
              </div>
            </div>
          ` : ''}

          <!-- Decomposição Canônica do Limite e Saldo Elegível -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; margin-top: 16px;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
              <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Limite Liberado (${eligibility.releasePercent}% vendas)</div>
              <div style="font-size: 1.25rem; font-weight: 800; color: #1e293b; margin: 4px 0;">${formatCurrency(eligibility.limiteBruto)}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Sobre vendas de ${formatCurrency(eligibility.grossSales)}</div>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
              <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">(-) Repasses Já Realizados</div>
              <div style="font-size: 1.25rem; font-weight: 800; color: #dc2626; margin: 4px 0;">-${formatCurrency(eligibility.previousPayouts)}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Transferências anteriores quitadas</div>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
              <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">(-) Em Análise / Bloqueados</div>
              <div style="font-size: 1.25rem; font-weight: 800; color: #d97706; margin: 4px 0;">-${formatCurrency(eligibility.totalDeductions - eligibility.previousPayouts)}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Reservas de pedidos + retenções</div>
            </div>

            <div style="background: ${eligibility.disponivelFinal > 0 ? '#ecfdf5' : '#fef2f2'}; border: 2px solid ${eligibility.disponivelFinal > 0 ? '#10b981' : '#f87171'}; border-radius: 8px; padding: 14px;">
              <div style="font-size: 0.75rem; text-transform: uppercase; color: ${eligibility.disponivelFinal > 0 ? '#047857' : '#991b1b'}; font-weight: 800;">Saldo Disponível p/ Solicitar</div>
              <div style="font-size: 1.35rem; font-weight: 900; color: ${eligibility.disponivelFinal > 0 ? '#065f46' : '#991b1b'}; margin: 4px 0;">${formatCurrency(eligibility.disponivelFinal)}</div>
              <div style="font-size: 0.75rem; color: ${eligibility.disponivelFinal > 0 ? '#047857' : '#991b1b'};">
                ${eligibility.isExceptional ? '★ Autorizado por Exceção' : (eligibility.ruleMet ? (eligibility.disponivelFinal > 0 ? 'Livre para solicitar agora' : 'Limite consumido') : 'Bloqueado pela regra dos 50%')}
              </div>
            </div>
          </div>

          <!-- Ação Direta no Card -->
          <div style="margin-top: 16px; display: flex; justify-content: flex-end; align-items: center; gap: 12px; flex-wrap: wrap;">
            ${!eligibility.ruleMet && !eligibility.isExceptional ? `
              <span class="fs-xs text-muted"><i class="ph-info me-1"></i> Necessário atingir ${eligibility.minSalesPercent}% ou obter autorização excepcional junto ao Financeiro Disk.</span>
              <button class="btn btn-secondary btn-sm" disabled style="opacity: 0.65; cursor: not-allowed;">
                <i class="ph-lock me-1"></i> Solicitar Repasse (Bloqueado)
              </button>
            ` : (eligibility.disponivelFinal <= 0 ? `
              <span class="fs-xs text-muted">Limite total da política vigente já transferido.</span>
              <button class="btn btn-secondary btn-sm" disabled style="opacity: 0.65; cursor: not-allowed;">
                Limite Esgotado
              </button>
            ` : `
              <button class="btn btn-success btn-sm fw-bold px-3 py-2 shadow-sm" onclick="window.app.openPayoutModal('${currentEvent.id}')">
                <i class="ph-hand-coins me-1"></i> Solicitar Repasse de até ${formatCurrency(eligibility.disponivelFinal)} &rarr;
              </button>
            `)}
          </div>
        </div>
      </div>

      <!-- Alerta Crítico: Assinatura Pendente do Produtor -->
      ${needsProducerSignature ? `
        <div class="info-banner info-banner-green" style="border-width: 2px; box-shadow: var(--shadow-md);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          <div style="flex: 1; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <strong style="font-size: 0.95rem;">Ação Necessária: Assinatura Digital do Produtor Pendente</strong>
              <div style="font-size: 0.8rem; margin-top: 2px;">
                O repasse <strong>${needsProducerSignature.id}</strong> (R$ ${(needsProducerSignature.requestedAmount || needsProducerSignature.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) foi aprovado pela Disk e aguarda sua assinatura para que o Financeiro Disk assine por último e libere a transferência bancária.
              </div>
            </div>
            <button class="btn btn-success" onclick="window.app.openSignDocumentModal('${needsProducerSignature.id}')">
              ✍️ Assinar Documento Agora
            </button>
          </div>
        </div>
      ` : ''}

      <!-- KPI Summary Cards -->
      <div class="kpi-grid">
        <div class="kpi-card success-accent">
          <div class="kpi-header"><span class="kpi-title">Saldo Livre p/ Repasse</span></div>
          <div class="kpi-value" style="color: #059669;">${formatCurrency(availableBalance)}</div>
          <div class="kpi-subtext"><span>Disponível para nova solicitação</span></div>
        </div>
        <div class="kpi-card warning-accent">
          <div class="kpi-header"><span class="kpi-title">Saldo Reservado</span></div>
          <div class="kpi-value" style="color: #d97706;">${formatCurrency(producer.totals?.reservedBalance || 80000.00)}</div>
          <div class="kpi-subtext"><span>Retido em solicitações ativas</span></div>
        </div>
        <div class="kpi-card highlight">
          <div class="kpi-header"><span class="kpi-title">Repasses Programados</span></div>
          <div class="kpi-value" style="color: #2563eb;">${formatCurrency(scheduledAmount || 50000.00)}</div>
          <div class="kpi-subtext"><span>Aguardando assinaturas ou lote CNAB</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header"><span class="kpi-title">Total Já Transferido</span></div>
          <div class="kpi-value">${formatCurrency(transferredAmount)}</div>
          <div class="kpi-subtext"><span>Repasses creditados em conta</span></div>
        </div>
      </div>

      <!-- Pipeline de Acompanhamento do Repasse Ativo (Timeline Oficial de 8 Etapas) -->
      ${activePayout ? `
        <div class="card-panel">
          <div class="card-header-bar">
            <div class="card-title-group">
              <h2>Rastreamento em Tempo Real: ${activePayout.id}</h2>
              <p class="card-subtitle">${activePayout.eventName} • Valor solicitado: <strong>${formatCurrency(activePayout.requestedAmount || activePayout.amount)}</strong></p>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              ${createStatusBadge(activePayout.status)}
              <button class="btn btn-outline-primary btn-sm" onclick="window.app.openRepasseTimelineModal('${activePayout.id}')">
                🔍 Ver Timeline Detalhada
              </button>
            </div>
          </div>
          <div class="card-body">
            
            <!-- Linha de Etapas Completa (Timeline com 8 fases estritas) -->
            <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 20px; margin-bottom: 16px;">
              <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; margin-bottom: 16px;">
                Fluxo de Liberação & Trilha de Auditoria do Repasse
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; font-size: 0.78rem;">
                
                <!-- 1. Solicitado pelo Produtor -->
                <div class="p-2 border rounded bg-white" style="border-left: 3px solid #10b981 !important;">
                  <div class="text-success fw-bold">✓ 1. Solicitado</div>
                  <div class="fs-xxs text-muted mt-1">Produtor</div>
                  <div class="fs-xxs text-dark fw-bold">${activePayout.requestDate ? activePayout.requestDate.split(' ')[0] : '30/09'} 09:32</div>
                </div>

                <!-- 2. Recebido pelo Financeiro Disk -->
                <div class="p-2 border rounded bg-white" style="border-left: 3px solid #10b981 !important;">
                  <div class="text-success fw-bold">✓ 2. Recebido</div>
                  <div class="fs-xxs text-muted mt-1">Financeiro Disk</div>
                  <div class="fs-xxs text-dark fw-bold">30/09 09:32</div>
                </div>

                <!-- 3. Em Análise -->
                <div class="p-2 border rounded ${activePayout.status.includes('análise') ? 'bg-amber-50' : 'bg-white'}" style="border-left: 3px solid ${activePayout.status.includes('análise') ? '#f59e0b' : '#10b981'} !important;">
                  <div class="fw-bold" style="color: ${activePayout.status.includes('análise') ? '#d97706' : '#10b981'};">
                    ${activePayout.status.includes('análise') ? '● 3. Em Análise' : '✓ 3. Analisado'}
                  </div>
                  <div class="fs-xxs text-muted mt-1">Resp: Karine</div>
                  <div class="fs-xxs text-dark fw-bold">${activePayout.status.includes('análise') ? 'Em andamento' : '30/09 10:15'}</div>
                </div>

                <!-- 4. Aprovação -->
                <div class="p-2 border rounded bg-white" style="border-left: 3px solid ${['Aprovado', 'Documento formalizado', 'Programado', 'Pago'].includes(activePayout.status) ? '#10b981' : '#cbd5e1'} !important;">
                  <div class="fw-bold" style="color: ${['Aprovado', 'Documento formalizado', 'Programado', 'Pago'].includes(activePayout.status) ? '#10b981' : '#94a3b8'};">
                    ${['Aprovado', 'Documento formalizado', 'Programado', 'Pago'].includes(activePayout.status) ? '✓ 4. Aprovado' : '○ 4. Aprovação'}
                  </div>
                  <div class="fs-xxs text-muted mt-1">Alçada Disk</div>
                  <div class="fs-xxs text-muted">${['Aprovado', 'Documento formalizado', 'Programado', 'Pago'].includes(activePayout.status) ? 'Concluída' : 'Pendente'}</div>
                </div>

                <!-- 5. Assinatura do Produtor -->
                <div class="p-2 border rounded bg-white" style="border-left: 3px solid ${activePayout.signatures?.producer?.signed ? '#10b981' : (activePayout.status.includes('Produtor') ? '#2563eb' : '#cbd5e1')} !important;">
                  <div class="fw-bold" style="color: ${activePayout.signatures?.producer?.signed ? '#10b981' : (activePayout.status.includes('Produtor') ? '#2563eb' : '#94a3b8')};">
                    ${activePayout.signatures?.producer?.signed ? '✓ 5. Assinado' : '○ 5. Assinatura'}
                  </div>
                  <div class="fs-xxs text-muted mt-1">Produtor</div>
                  <div class="fs-xxs text-muted">${activePayout.signatures?.producer?.signed ? 'Concluída' : 'Aguardando'}</div>
                </div>

                <!-- 6. Assinatura Financeiro Disk -->
                <div class="p-2 border rounded bg-white" style="border-left: 3px solid ${activePayout.signatures?.disk?.signed ? '#10b981' : '#cbd5e1'} !important;">
                  <div class="fw-bold" style="color: ${activePayout.signatures?.disk?.signed ? '#10b981' : '#94a3b8'};">
                    ${activePayout.signatures?.disk?.signed ? '✓ 6. Assinado' : '○ 6. Assinatura'}
                  </div>
                  <div class="fs-xxs text-muted mt-1">Disk (Final)</div>
                  <div class="fs-xxs text-muted">${activePayout.signatures?.disk?.signed ? 'Concluída' : 'Trava ativa'}</div>
                </div>

                <!-- 7. Programação Tesouraria -->
                <div class="p-2 border rounded bg-white" style="border-left: 3px solid ${['Programado', 'Pago'].includes(activePayout.status) ? '#10b981' : '#cbd5e1'} !important;">
                  <div class="fw-bold" style="color: ${['Programado', 'Pago'].includes(activePayout.status) ? '#10b981' : '#94a3b8'};">
                    ${['Programado', 'Pago'].includes(activePayout.status) ? '✓ 7. Programado' : '○ 7. Lote CNAB'}
                  </div>
                  <div class="fs-xxs text-muted mt-1">Tesouraria</div>
                  <div class="fs-xxs text-muted">${['Programado', 'Pago'].includes(activePayout.status) ? 'Em lote' : 'Fila'}</div>
                </div>

                <!-- 8. Pagamento & Conciliação -->
                <div class="p-2 border rounded bg-white" style="border-left: 3px solid ${activePayout.status === 'Pago' ? '#10b981' : '#cbd5e1'} !important;">
                  <div class="fw-bold" style="color: ${activePayout.status === 'Pago' ? '#10b981' : '#94a3b8'};">
                    ${activePayout.status === 'Pago' ? '✓ 8. Liquidado' : '○ 8. Pagamento'}
                  </div>
                  <div class="fs-xxs text-muted mt-1">Banco / Conciliação</div>
                  <div class="fs-xxs text-muted">${activePayout.status === 'Pago' ? 'Liquidado' : 'Retorno'}</div>
                </div>

              </div>
            </div>

            <!-- Dados Bancários e Ações -->
            <div style="background: var(--surface-alt); padding: 14px 18px; border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; font-size: 0.82rem;">
              <div>
                <strong>Conta de Recebimento Homologada:</strong> ${activePayout.bankName} (${activePayout.bankAccount}) • Chave PIX: ${activePayout.pixKey}
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-outline-secondary btn-sm" onclick="window.app.openRepasseTimelineModal('${activePayout.id}')">
                  Ver Trilha Completa
                </button>
                ${activePayout.status === 'Aguardando assinatura do Produtor' ? `
                  <button class="btn btn-success btn-sm" onclick="window.app.openSignDocumentModal('${activePayout.id}')">
                    ✍️ Assinar Documento Digitalmente
                  </button>
                ` : ''}
              </div>
            </div>

          </div>
        </div>
      ` : ''}

      <!-- Tabela com Histórico Completo de Repasses -->
      <div class="card-panel">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Histórico de Repasses Solicitados</h2>
            <p class="card-subtitle">Relação completa de pedidos com rastreamento da esteira operacional e comprovantes</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="window.app.exportCurrentView('csv')">Exportar Lista</button>
        </div>
        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Código / Protocolo</th>
                  <th>Evento Origem</th>
                  <th>Data Solicitação</th>
                  <th>Fase Atual / Responsável</th>
                  <th>Conta Bancária</th>
                  <th style="text-align: right;">Valor Solicitado</th>
                  <th style="text-align: center;">Status</th>
                  <th style="text-align: right;">Ações de Rastreamento</th>
                </tr>
              </thead>
              <tbody>
                ${payouts.map(p => `
                  <tr>
                    <td>
                      <code style="font-weight: 700; color: var(--text-main);">${p.id}</code>
                    </td>
                    <td style="font-weight: 600;">${p.eventName}</td>
                    <td style="color: var(--text-muted); font-size: 0.82rem;">${p.requestDate}</td>
                    <td>
                      <div style="font-size: 0.82rem; font-weight: 600;">
                        ${p.status.includes('análise') ? '● Em análise (Karine - Financeiro)' : (p.status.includes('assinatura') ? '● Em fase de assinaturas digitais' : (p.status === 'Pago' ? '✓ Liquidado na conta' : p.status))}
                      </div>
                      <div style="font-size: 0.72rem; color: var(--text-muted);">
                        ${p.status === 'Pago' ? 'Baixa contábil conciliada' : 'Acompanhamento em tempo real'}
                      </div>
                    </td>
                    <td>
                      <div style="font-size: 0.82rem; font-weight: 600;">${p.bankName}</div>
                      <div style="font-size: 0.72rem; color: var(--text-muted);">${p.bankAccount}</div>
                    </td>
                    <td style="text-align: right; font-weight: 800; font-size: 0.95rem; color: var(--text-main);">
                      ${formatCurrency(p.requestedAmount || p.amount)}
                    </td>
                    <td style="text-align: center;">
                      ${createStatusBadge(p.status)}
                    </td>
                    <td style="text-align: right;">
                      <div style="display: inline-flex; gap: 6px;">
                        <button class="btn btn-outline-primary btn-xs" onclick="window.app.openRepasseTimelineModal('${p.id}')" title="Ver Timeline e Etapas">
                          Timeline
                        </button>
                        ${p.status === 'Aguardando assinatura do Produtor' ? `
                          <button class="btn btn-success btn-xs" onclick="window.app.openSignDocumentModal('${p.id}')">
                            Assinar
                          </button>
                        ` : ''}
                        ${p.status === 'Pago' ? `
                          <button class="btn btn-secondary btn-xs" onclick="window.app.showPayoutReceipt('${p.id}')">
                            Comprovante
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  `;
}
