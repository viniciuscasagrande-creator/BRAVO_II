/**
 * Limitless Financial App — Persistent Operational Header (Pacote 21)
 * 
 * Camada de Integração Transversal e Contexto Operacional:
 * A Operação Financeira (protocolo + produtor + evento) é a fonte da verdade única.
 * Este componente acompanha o usuário através dos múltiplos módulos
 * (Solicitações → Aprovações → Assinaturas → Tesouraria → Ledger → Conciliação → Dossiê)
 * sem perda de contexto ou segregação em ilhas.
 */
import { formatCurrency } from '../formatters.js';

export function renderOperationHeader(context, currentView = '') {
  if (!context || !context.protocolo) return '';

  const {
    protocolo,
    tipo = 'REPASSE',
    produtorNome = 'Produtor',
    produtorId = '',
    eventoNome = 'Evento',
    eventoId = '',
    valor = 0,
    status = 'Em Processamento',
    etapaAtual = 'SOLICITACAO',
    etapas = []
  } = context;

  const defaultEtapas = [
    { id: 'SOLICITACAO', label: 'Solicitação', route: 'diskSolicitacoes', icon: 'ph-file-text' },
    { id: 'APROVACAO', label: 'Aprovação', route: 'diskAprovacoes', icon: 'ph-scales' },
    { id: 'ASSINATURA', label: 'Assinaturas', route: 'diskAssinaturas', icon: 'ph-signature' },
    { id: 'PAGAMENTO', label: 'Tesouraria', route: 'diskTesouraria', icon: 'ph-vault' },
    { id: 'LEDGER', label: 'Ledger', route: 'diskLedger', icon: 'ph-book-bookmark' },
    { id: 'CONCILIACAO', label: 'Conciliação', route: 'diskConciliacao', icon: 'ph-arrows-left-right' },
    { id: 'DOSSIE', label: 'Dossiê', route: 'diskFechamentos', icon: 'ph-folder-lock' }
  ];

  const pipeline = defaultEtapas.map((step, idx) => {
    const existing = etapas.find(e => e.id === step.id);
    let stepStatus = existing?.status || 'pendente';
    if (!existing) {
      const currentIdx = defaultEtapas.findIndex(s => s.id === etapaAtual);
      if (idx < currentIdx) stepStatus = 'concluida';
      else if (idx === currentIdx) stepStatus = 'em_andamento';
      else stepStatus = 'pendente';
    }
    return {
      ...step,
      status: stepStatus,
      date: existing?.date || null
    };
  });

  const tipoBadgeColors = {
    'REPASSE': 'bg-primary text-white',
    'ANTECIPACAO': 'bg-warning text-dark',
    'TRANSFERENCIA': 'bg-purple text-white',
    'BORDERO': 'bg-success text-white'
  };

  const tipoClass = tipoBadgeColors[tipo.toUpperCase()] || 'bg-secondary text-white';

  return `
    <div class="limitless-operation-header card shadow-sm mb-3 border-0" style="border-left: 4px solid #2563eb !important; background: linear-gradient(to right, #ffffff, #f8fafc);">
      <div class="card-body p-3">
        <!-- Top bar: Identificação da Operação & Controles -->
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 border-bottom pb-2 mb-2">
          <div class="d-flex flex-wrap align-items-center gap-2">
            <span class="badge ${tipoClass} fw-bold text-uppercase fs-xxs px-2 py-1">${tipo}</span>
            <span class="badge bg-dark text-white fw-bold fs-xs px-2 py-1 font-monospace">
              <i class="ph-fingerprint me-1"></i>${protocolo}
            </span>
            <span class="text-muted fs-xs">&bull;</span>
            <span class="fs-xs text-dark fw-semibold">
              <i class="ph-buildings me-1 text-primary"></i>${produtorNome}
            </span>
            <span class="text-muted fs-xs">&bull;</span>
            <span class="fs-xs text-muted">
              <i class="ph-ticket me-1 text-success"></i>${eventoNome}
            </span>
          </div>

          <div class="d-flex align-items-center gap-2">
            <div class="text-end">
              <span class="text-muted fs-xxs text-uppercase fw-semibold d-block">Valor da Operação</span>
              <span class="fs-6 fw-bolder text-dark">${formatCurrency(valor)}</span>
            </div>
            <button class="btn btn-sm btn-outline-danger btn-icon rounded-circle ms-2" 
                    title="Fechar contexto da operação ativa" 
                    onclick="window.app && window.app.clearOperationalContext()">
              <i class="ph-x fs-6"></i>
            </button>
          </div>
        </div>

        <!-- Pipeline Stepper Interativo transversal -->
        <div class="operation-stepper-container d-flex flex-wrap align-items-center justify-content-between gap-1 py-1">
          ${pipeline.map((step, index) => {
            const isDone = step.status === 'concluida';
            const isCurrent = step.status === 'em_andamento';
            const isDispensada = step.status === 'dispensada';
            const isViewActive = currentView.toLowerCase().includes(step.route.toLowerCase().replace('disk', ''));

            let badgeIcon = 'ph-circle';
            let itemClass = 'stepper-step-pending text-muted';
            if (isDone) {
              badgeIcon = 'ph-check-circle-fill text-success';
              itemClass = 'stepper-step-done text-dark';
            } else if (isCurrent) {
              badgeIcon = 'ph-spinner-gap-fill text-primary ph-spin';
              itemClass = 'stepper-step-active text-primary fw-bold';
            } else if (isDispensada) {
              badgeIcon = 'ph-minus-circle text-muted';
              itemClass = 'stepper-step-skipped text-muted';
            }

            return `
              <div class="operation-step-pill d-flex align-items-center gap-1 ${itemClass} ${isViewActive ? 'active-step-border' : ''}" 
                   style="cursor: pointer; padding: 4px 8px; border-radius: 6px; font-size: 11.5px; transition: all 0.15s ease;"
                   onclick="window.app && window.app.navigateToOperationalStage('${step.route}', '${protocolo}')"
                   title="Ir para módulo ${step.label} com este protocolo">
                <i class="${badgeIcon} fs-6"></i>
                <span>${step.label}</span>
                ${index < pipeline.length - 1 ? '<i class="ph-caret-right text-muted opacity-50 ms-1" style="font-size: 9px;"></i>' : ''}
              </div>
            `;
          }).join('')}
        </div>

        <!-- Cross-Module Reverse Action Links -->
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 pt-2 mt-2 border-top">
          <div class="d-flex flex-wrap align-items-center gap-1">
            <span class="fs-xxs text-uppercase text-muted fw-bold me-1">Acesso Transversal:</span>
            <button class="btn btn-xs btn-outline-secondary py-1 px-2 fs-xxs d-inline-flex align-items-center gap-1"
                    onclick="window.app && window.app.navigateToOperationalStage('diskSolicitacoes', '${protocolo}')">
              <i class="ph-file-text"></i> Solicitação
            </button>
            <button class="btn btn-xs btn-outline-secondary py-1 px-2 fs-xxs d-inline-flex align-items-center gap-1"
                    onclick="window.app && window.app.navigateToOperationalStage('diskAprovacoes', '${protocolo}')">
              <i class="ph-scales"></i> Aprovação
            </button>
            <button class="btn btn-xs btn-outline-secondary py-1 px-2 fs-xxs d-inline-flex align-items-center gap-1"
                    onclick="window.app && window.app.navigateToOperationalStage('diskAssinaturas', '${protocolo}')">
              <i class="ph-signature"></i> Assinaturas
            </button>
            <button class="btn btn-xs btn-outline-secondary py-1 px-2 fs-xxs d-inline-flex align-items-center gap-1"
                    onclick="window.app && window.app.navigateToOperationalStage('diskTesouraria', '${protocolo}')">
              <i class="ph-vault"></i> Tesouraria
            </button>
            <button class="btn btn-xs btn-outline-secondary py-1 px-2 fs-xxs d-inline-flex align-items-center gap-1"
                    onclick="window.app && window.app.navigateToOperationalStage('diskLedger', '${protocolo}')">
              <i class="ph-book-bookmark"></i> Ledger
            </button>
            <button class="btn btn-xs btn-outline-secondary py-1 px-2 fs-xxs d-inline-flex align-items-center gap-1"
                    onclick="window.app && window.app.navigateToOperationalStage('diskConciliacao', '${protocolo}')">
              <i class="ph-arrows-left-right"></i> Conciliação
            </button>
            <button class="btn btn-xs btn-outline-secondary py-1 px-2 fs-xxs d-inline-flex align-items-center gap-1"
                    onclick="window.app && window.app.navigateToOperationalStage('diskFechamentos', '${protocolo}')">
              <i class="ph-folder-lock"></i> Dossiê
            </button>
          </div>

          <div class="fs-xxs text-muted">
            Situação: <strong class="text-primary">${status}</strong>
          </div>
        </div>
      </div>
    </div>
  `;
}
