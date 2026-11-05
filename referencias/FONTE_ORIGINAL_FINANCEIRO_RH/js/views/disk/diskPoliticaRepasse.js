/**
 * Política de Repasse & Autorizações Excepcionais (Pacote 23 - Financeiro Disk)
 * Parametrização hierárquica (Geral Disk → Produtor → Evento) e Motor de Elegibilidade (50% vendas -> 20% liberação)
 */
import { formatCurrency } from '../../formatters.js';
import { financialStore } from '../../state.js';

export function renderDiskPoliticaRepasse(state, filterArg = 'politica') {
  const globalPolicy = state.data.payoutPolicies?.global || {
    minSalesPercent: 50,
    releasePercent: 20,
    considerRefunds: true,
    considerChargebacks: true,
    considerMdr: true,
    requireValidatedBank: true,
    requireDiskApproval: true,
    requireDigitalSignature: true,
    allowAdministrativeException: true,
    updatedAt: "30/09/2026 10:00",
    updatedBy: "Diretoria Financeira Disk"
  };

  const exceptions = state.data.exceptionalAuthorizations || [];
  const events = state.data.events || [];
  const producers = state.data.producers || [];

  const activeExceptions = exceptions.filter(e => e.status === 'ATIVA' && !e.consumed);
  const totalExceptionalAmount = activeExceptions.reduce((acc, e) => acc + Number(e.amount || 0), 0);

  // Calcula elegibilidade de todos os eventos para o simulador
  const eventEligibilityList = events.map(ev => {
    return financialStore.calculatePayoutEligibility(ev.id);
  }).filter(Boolean);

  const eligibleCount = eventEligibilityList.filter(e => e.ruleMet || e.isExceptional).length;
  const blockedCount = eventEligibilityList.length - eligibleCount;

  return `
    <!-- Header Limitless -->
    <div class="limitless-page-header" style="background: #0f172a; color: white; border-bottom: 2px solid #3b82f6;">
      <div class="breadcrumbs" style="color: #94a3b8;">
        <span>Financeiro Disk</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-active" style="color: #60a5fa;">Política de Repasse & Autorizações</span>
      </div>
      <div class="page-title-row">
        <div class="page-title-group">
          <h1 style="color: #f8fafc;">
            <i class="ph-sliders-horizontal me-2" style="color: #60a5fa;"></i>
            Política de Repasse & Motor de Elegibilidade
          </h1>
          <p class="page-title-desc" style="color: #94a3b8;">
            Parametrização dinâmica do gatilho de vendas (50%) e liberação (20%), hierarquia de precedência e governança de Exceções Administrativas.
          </p>
        </div>
        <div class="header-action-group">
          <button class="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm" onclick="window.app.openExceptionalAuthorizationModal()">
            <i class="ph-shield-plus"></i> + Autorizar Repasse Excepcional
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="limitless-content">

      <!-- Informative Banner -->
      <div class="info-banner info-banner-blue">
        <i class="ph-info fs-5 me-2"></i>
        <div>
          <strong>Hierarquia de Precedência Comercial:</strong> A regra específica do <em>Evento</em> prevalece sobre a do <em>Produtor</em>, que por sua vez prevalece sobre a <em>Regra Geral Disk</em>. Exceções Administrativas liberam valores pontuais sem alterar a regra permanente.
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid">
        <div class="kpi-card highlight">
          <div class="kpi-header">
            <span class="kpi-title">Gatilho Mínimo de Vendas</span>
            <div class="kpi-icon-wrap" style="background: rgba(37,99,235,0.1); color: #2563eb;">
              <i class="ph-target fs-5"></i>
            </div>
          </div>
          <div class="kpi-value" style="color: #2563eb;">${globalPolicy.minSalesPercent}%</div>
          <div class="kpi-subtext"><span>Percentual de vendas para habilitar</span></div>
        </div>

        <div class="kpi-card success-accent">
          <div class="kpi-header">
            <span class="kpi-title">Percentual Liberado</span>
            <div class="kpi-icon-wrap" style="background: rgba(16,185,129,0.1); color: #10b981;">
              <i class="ph-percent fs-5"></i>
            </div>
          </div>
          <div class="kpi-value" style="color: #059669;">${globalPolicy.releasePercent}%</div>
          <div class="kpi-subtext"><span>Sobre o volume vendido do evento</span></div>
        </div>

        <div class="kpi-card warning-accent">
          <div class="kpi-header">
            <span class="kpi-title">Exceções Administrativas Ativas</span>
            <div class="kpi-icon-wrap" style="background: rgba(245,158,11,0.1); color: #f59e0b;">
              <i class="ph-shield-check fs-5"></i>
            </div>
          </div>
          <div class="kpi-value" style="color: #d97706;">${activeExceptions.length}</div>
          <div class="kpi-subtext"><span>Total: ${formatCurrency(totalExceptionalAmount)}</span></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">Status dos Eventos</span>
            <div class="kpi-icon-wrap" style="background: rgba(139,92,246,0.1); color: #8b5cf6;">
              <i class="ph-chart-bar fs-5"></i>
            </div>
          </div>
          <div class="kpi-value" style="font-size: 1.25rem;">
            <span class="text-success">${eligibleCount} Habilitados</span> / <span class="text-warning">${blockedCount} Bloqueados</span>
          </div>
          <div class="kpi-subtext"><span>Em monitoramento no motor</span></div>
        </div>
      </div>

      <!-- SEÇÃO 1: FORMULÁRIO DE PARAMETRIZAÇÃO DA POLÍTICA GERAL DISK -->
      <div class="card-panel mb-4 shadow-sm">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>
              <i class="ph-gear-six me-2 text-primary"></i>
              Parâmetros da Política Geral Disk
            </h2>
            <p class="card-subtitle">Configurações globais que regem todos os repasses da plataforma, salvo sobreposição por Produtor ou Evento.</p>
          </div>
          <div class="fs-xxs text-muted">
            Última alteração: <strong>${globalPolicy.updatedAt || 'Recente'}</strong> por ${globalPolicy.updatedBy || 'Administrador'}
          </div>
        </div>
        <div class="card-body">
          <form onsubmit="window.app.handleSaveGlobalPayoutPolicy(event)">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 20px;">
              <div>
                <label class="form-label fw-bold fs-xs text-uppercase text-muted">
                  Percentual Mínimo de Vendas para Habilitar (%)
                </label>
                <div class="input-group">
                  <input type="number" class="form-control fw-bold" id="policyMinSales" min="1" max="100" value="${globalPolicy.minSalesPercent}" required>
                  <span class="input-group-text">% da meta</span>
                </div>
                <div class="form-text fs-xxs text-muted">Abaixo deste percentual, o botão de repasse do produtor permanece travado preventivamente.</div>
              </div>

              <div>
                <label class="form-label fw-bold fs-xs text-uppercase text-muted">
                  Percentual Inicial Liberado para Repasse (%)
                </label>
                <div class="input-group">
                  <input type="number" class="form-control fw-bold text-success" id="policyReleasePercent" min="1" max="100" value="${globalPolicy.releasePercent}" required>
                  <span class="input-group-text">% das vendas</span>
                </div>
                <div class="form-text fs-xxs text-muted">Cálculo: (Vendas Realizadas &times; %) &minus; Repasses Anteriores &minus; Valores Bloqueados.</div>
              </div>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 20px;">
              <div class="fw-bold fs-xs text-uppercase text-muted mb-3">Travas de Governança & Retenções Obrigatórias</div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="policyRefunds" ${globalPolicy.considerRefunds ? 'checked' : ''}>
                  <label class="form-check-label fs-xs fw-semibold" for="policyRefunds">Deduzir cancelamentos & estornos</label>
                </div>
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="policyChargebacks" ${globalPolicy.considerChargebacks ? 'checked' : ''}>
                  <label class="form-check-label fs-xs fw-semibold" for="policyChargebacks">Deduzir contestações & chargebacks</label>
                </div>
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="policyMdr" ${globalPolicy.considerMdr ? 'checked' : ''}>
                  <label class="form-check-label fs-xs fw-semibold" for="policyMdr">Deduzir taxas de processamento / MDR</label>
                </div>
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="policyBank" ${globalPolicy.requireValidatedBank ? 'checked' : ''}>
                  <label class="form-check-label fs-xs fw-semibold" for="policyBank">Exigir conta bancária PJ homologada</label>
                </div>
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="policyApproval" ${globalPolicy.requireDiskApproval ? 'checked' : ''}>
                  <label class="form-check-label fs-xs fw-semibold" for="policyApproval">Exigir aprovação prévia Financeiro Disk</label>
                </div>
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="policySignature" ${globalPolicy.requireDigitalSignature ? 'checked' : ''}>
                  <label class="form-check-label fs-xs fw-semibold" for="policySignature">Exigir assinatura digital bilateral (Produtor + Disk)</label>
                </div>
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="policyException" ${globalPolicy.allowAdministrativeException ? 'checked' : ''}>
                  <label class="form-check-label fs-xs fw-semibold text-primary" for="policyException">Permitir Exceção Administrativa (Mesa Disk)</label>
                </div>
              </div>
            </div>

            <div class="d-flex justify-content-end gap-2">
              <button type="submit" class="btn btn-primary btn-sm px-4 fw-bold">
                <i class="ph-floppy-disk me-1"></i> Salvar Política Geral
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- SEÇÃO 2: AUTORIZAÇÕES EXCEPCIONAIS (A TRAVA HUMANA) -->
      <div class="card-panel mb-4 shadow-sm" style="border-left: 4px solid #3b82f6;">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>
              <i class="ph-shield-check me-2 text-primary"></i>
              Autorizações Excepcionais (A Trava Humana)
            </h2>
            <p class="card-subtitle">
              Liberações comerciais pontuais autorizadas pelo Financeiro Disk com justificativa auditável, permitindo repasse antes dos 50% ou acima dos 20%.
            </p>
          </div>
          <button class="btn btn-outline-primary btn-sm fw-bold" onclick="window.app.openExceptionalAuthorizationModal()">
            <i class="ph-plus me-1"></i> Nova Autorização Excepcional
          </button>
        </div>
        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Protocolo</th>
                  <th>Produtor & Evento</th>
                  <th style="text-align: right;">Valor Autorizado</th>
                  <th>Responsável Disk</th>
                  <th>Justificativa Obrigatória</th>
                  <th style="text-align: center;">Status</th>
                  <th style="text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${exceptions.length === 0 ? `
                  <tr>
                    <td colspan="7" class="text-center py-4 text-muted">
                      Nenhuma autorização excepcional emitida no momento.
                    </td>
                  </tr>
                ` : exceptions.map(exc => `
                  <tr>
                    <td>
                      <code class="fw-bold text-primary">${exc.protocol || exc.id}</code>
                      <div class="fs-xxs text-muted">${exc.createdDate}</div>
                    </td>
                    <td>
                      <div class="fw-bold fs-xs">${exc.producerName}</div>
                      <div class="fs-xxs text-muted">${exc.eventName}</div>
                    </td>
                    <td style="text-align: right; font-weight: 800; font-size: 0.95rem; color: #1e293b;">
                      ${formatCurrency(exc.amount)}
                    </td>
                    <td class="fs-xs fw-semibold">
                      ${exc.authorizedBy}
                    </td>
                    <td style="max-width: 280px;">
                      <div class="fs-xs" style="white-space: normal; line-height: 1.3;">
                        "${exc.reason}"
                      </div>
                    </td>
                    <td style="text-align: center;">
                      ${exc.consumed ? `
                        <span class="badge bg-secondary">Consumida (${exc.payoutId || 'Solicitado'})</span>
                      ` : (exc.status === 'ATIVA' ? `
                        <span class="badge bg-success">Ativa (Aguardando Pedido)</span>
                      ` : `
                        <span class="badge bg-danger">Cancelada</span>
                      `)}
                    </td>
                    <td style="text-align: right;">
                      ${!exc.consumed && exc.status === 'ATIVA' ? `
                        <button class="btn btn-outline-danger btn-xs" onclick="window.app.cancelExceptionalAuthorization('${exc.id}')" title="Revogar autorização">
                          Revogar
                        </button>
                      ` : `
                        <span class="fs-xxs text-muted">—</span>
                      `}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- SEÇÃO 3: SIMULADOR DE ELEGIBILIDADE DOS EVENTOS EM TEMPO REAL -->
      <div class="card-panel shadow-sm">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>
              <i class="ph-chart-line-up me-2 text-success"></i>
              Simulador & Posição de Elegibilidade de Todos os Eventos
            </h2>
            <p class="card-subtitle">
              Monitoramento em tempo real do motor de cálculo: meta prevista, vendas apuradas, gatilho dos 50%, limite liberado e saldo livre.
            </p>
          </div>
        </div>
        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Evento / Produtor</th>
                  <th style="text-align: right;">Meta Vendas</th>
                  <th style="text-align: right;">Vendido Real</th>
                  <th style="text-align: center;">Progresso (%)</th>
                  <th style="text-align: center;">Status do Motor</th>
                  <th style="text-align: right;">Limite Bruto (20%)</th>
                  <th style="text-align: right;">Deduções</th>
                  <th style="text-align: right;">Saldo Disponível</th>
                  <th style="text-align: right;">Ação</th>
                </tr>
              </thead>
              <tbody>
                ${eventEligibilityList.map(e => `
                  <tr>
                    <td>
                      <div class="fw-bold fs-xs">${e.eventName}</div>
                      <div class="fs-xxs text-muted">${e.producerName} (${e.eventId})</div>
                    </td>
                    <td style="text-align: right; font-weight: 600;">
                      ${formatCurrency(e.salesTarget)}
                    </td>
                    <td style="text-align: right; font-weight: 700; color: #1e293b;">
                      ${formatCurrency(e.grossSales)}
                    </td>
                    <td style="text-align: center; min-width: 120px;">
                      <div class="d-flex align-items-center gap-2 justify-content-center">
                        <div class="progress flex-grow-1" style="height: 6px; background: #e2e8f0; width: 60px;">
                          <div class="progress-bar" style="width: ${Math.min(e.progressPercent, 100)}%; background: ${e.ruleMet ? '#10b981' : '#f59e0b'};"></div>
                        </div>
                        <span class="fw-bold fs-xxs">${e.progressPercent}%</span>
                      </div>
                      ${!e.ruleMet ? `<div class="fs-xxs text-muted">Faltam ${formatCurrency(e.faltamVendas)}</div>` : ''}
                    </td>
                    <td style="text-align: center;">
                      ${e.status === 'EXCECAO_AUTORIZADA' ? `
                        <span class="badge bg-primary">🛡️ Exceção Autorizada</span>
                      ` : (e.ruleMet ? `
                        <span class="badge bg-success">✓ Habilitado (${e.minSalesPercent}%)</span>
                      ` : `
                        <span class="badge bg-warning text-dark">🔒 Bloqueado (< ${e.minSalesPercent}%)</span>
                      `)}
                    </td>
                    <td style="text-align: right; font-weight: 600;">
                      ${formatCurrency(e.limiteBruto)}
                    </td>
                    <td style="text-align: right; color: #dc2626; font-size: 0.82rem;">
                      -${formatCurrency(e.totalDeductions)}
                    </td>
                    <td style="text-align: right; font-weight: 800; font-size: 0.95rem; color: ${e.disponivelFinal > 0 ? '#059669' : '#64748b'};">
                      ${formatCurrency(e.disponivelFinal)}
                    </td>
                    <td style="text-align: right;">
                      ${!e.ruleMet && !e.isExceptional ? `
                        <button class="btn btn-outline-primary btn-xs" onclick="window.app.openExceptionalAuthorizationModal('${e.eventId}')" title="Autorizar Exceção Administrativa">
                          + Exceção
                        </button>
                      ` : (e.isExceptional ? `
                        <span class="badge bg-light text-primary border border-primary fs-xxs">Exceção Ativa</span>
                      ` : `
                        <span class="badge bg-light text-success border border-success fs-xxs">Regra OK</span>
                      `)}
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
