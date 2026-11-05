/**
 * Dados Bancários - Contas Cadastradas para Recebimento de Repasses do Produtor
 * Padrão de Governança: Versionamento estrito (v1 -> v2), Validação mandatória pelo Financeiro Disk, Preservação de Histórico
 */
import { createStatusBadge } from '../formatters.js';

export function renderDadosBancarios(state) {
  const producer = state.activeProducer || state.data.producer;
  const accounts = producer.bankAccounts || state.data.bankAccounts || [];

  // Verifica se há alguma conta pendente de homologação pelo Financeiro Disk
  const hasPendingValidation = accounts.some(acc => acc.status === 'Pendente de validação' || acc.status === 'Pendente');

  return `
    <!-- Header -->
    <div class="limitless-page-header">
      <div class="breadcrumbs">
        <span>Financeiro</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-active">Dados Bancários & PIX</span>
      </div>
      <div class="page-title-row">
        <div class="page-title-group">
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 21h18"></path><path d="M3 10h18"></path><path d="M5 6l7-3 7 3"></path><path d="M4 10v11"></path><path d="M20 10v11"></path><path d="M8 14v4"></path><path d="M12 14v4"></path><path d="M16 14v4"></path></svg>
            Contas de Recebimento & Chaves PIX
          </h1>
          <p class="page-title-desc">Contas homologadas para liquidação de repasses e antecipações com versionamento e compliance antifraude.</p>
        </div>
        <div class="header-action-group">
          <button class="btn btn-primary" onclick="window.app.openRequestBankChangeModal()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Solicitar Alteração / Nova Conta
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="limitless-content">

      <!-- Alerta Informativo de Segurança e Governança BACEN -->
      <div class="info-banner info-banner-blue">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        <div>
          <strong>Política de Versionamento & Segurança Antifraude:</strong> Qualquer alteração de domicílio bancário ou chave PIX gera uma <strong>nova versão (ex: v2)</strong> e entra em <em>Validação pelo Financeiro Disk</em>. A conta anterior <strong>permanece ativa</strong> até que a nova seja formalmente homologada via Bacen/CIP, garantindo que nenhum repasse seja interrompido ou transferido sem conferência documental.
        </div>
      </div>

      ${hasPendingValidation ? `
        <div class="info-banner info-banner-yellow" style="border-left: 4px solid #f59e0b; background: #fffbeb;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <div>
            <strong style="color: #92400e;">Alteração Bancária em Análise pelo Financeiro Disk:</strong>
            Existe uma nova versão de dados bancários aguardando conferência do comprovante e homologação CIP. Enquanto a análise estiver em curso, a conta atualmente ativa continua sendo utilizada como destino padrão para repasses.
          </div>
        </div>
      ` : ''}

      <!-- Grid de Contas Bancárias Cadastradas -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 20px;">
        ${accounts.map(acc => {
          const isPending = acc.status === 'Pendente de validação' || acc.status === 'Pendente';
          const isActive = acc.status === 'Validada & Ativa' || acc.status === 'Ativa';

          return `
          <div class="card-panel" style="padding: 24px; border-top: 4px solid ${isPending ? '#f59e0b' : (acc.isDefault ? '#10b981' : '#3b82f6')}; position: relative;">
            
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin-bottom: 0;">${acc.bankName}</h3>
                  <span class="badge ${isPending ? 'bg-warning text-dark' : 'bg-primary'}" style="font-size: 0.72rem;">v${acc.version || 1}</span>
                  ${acc.isDefault ? '<span class="badge badge-success">Principal p/ Repasses</span>' : ''}
                </div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">
                  ${acc.accountType || 'Conta Corrente PJ'} • Vínculo: <strong>${acc.eventName || 'Geral (Todos os Eventos)'}</strong>
                </div>
                ${acc.replacesAccountId ? `
                  <div style="font-size: 0.72rem; color: #64748b; margin-top: 2px;">
                    <i class="ph-arrow-counter-clockwise"></i> Substitui conta anterior (${acc.replacesAccountId})
                  </div>
                ` : ''}
              </div>
              <div>
                ${createStatusBadge(acc.status)}
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.84rem; background: var(--surface-alt); padding: 16px; border-radius: var(--radius-md);">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Agência:</span>
                <strong style="font-family: monospace;">${acc.agency}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Conta Corrente:</span>
                <strong style="font-family: monospace;">${acc.accountNumber}${acc.digit ? '-' + acc.digit : ''}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Titular da Conta:</span>
                <strong>${acc.holderName}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">CNPJ Homologado:</span>
                <strong>${acc.cnpj}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Chave PIX:</span>
                <strong style="color: var(--primary);">${acc.pixKey || 'Não informada'}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; border-top: 1px dashed var(--border-color); padding-top: 8px; margin-top: 4px;">
                <span style="color: var(--text-muted);">Documento Anexo:</span>
                <span class="text-primary fw-bold fs-xs">
                  <i class="ph-file-text"></i> ${acc.documents && acc.documents[0] ? acc.documents[0].name : 'comprovante_bancario.pdf'}
                </span>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px; font-size: 0.75rem; color: var(--text-muted); flex-wrap: wrap; gap: 10px;">
              <div>
                ${isPending ? `
                  <span class="text-warning fw-bold">● Sob conferência documental pelo Financeiro</span>
                ` : `
                  <span>Validação Bacen/CIP: <strong>${acc.validatedAt || '15/01/2025'}</strong></span>
                `}
              </div>

              <div style="display: flex; gap: 6px;">
                <button class="btn btn-outline-secondary btn-xs" onclick="window.app.openBankAccountHistoryModal('${acc.id}')" title="Ver Histórico de Versões e Auditoria">
                  Histórico
                </button>
                ${isActive && !acc.isDefault ? `
                  <button class="btn btn-outline-primary btn-xs" onclick="window.app.setAccountAsDefault('${acc.id}')">
                    Definir Principal
                  </button>
                ` : ''}
                <button class="btn btn-secondary btn-xs" onclick="window.app.openRequestBankChangeModal('${acc.id}')" title="Solicitar alteração desta conta">
                  Alterar Conta
                </button>
              </div>
            </div>

          </div>
        `;
        }).join('')}
      </div>

    </div>
  `;
}
