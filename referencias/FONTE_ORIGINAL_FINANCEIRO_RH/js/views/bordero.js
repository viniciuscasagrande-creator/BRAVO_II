/**
 * Borderô Oficial - Fechamento Financeiro e Contábil do Evento
 * Detalhamento por lote, setor, cortesias, canais/PDVs, deduções e saldo líquido final
 */
import { formatCurrency, formatNumber, createStatusBadge } from '../formatters.js';

export function renderBordero(state) {
  const bordero = state.data.bordero;
  const events = state.data.events;
  const s = bordero.summary;
  const activeBordero = state.data.approvalQueue.find(a => a.type === 'Borderô' && a.eventId === bordero.eventId);

  return `
    <!-- Header -->
    <div class="limitless-page-header">
      <div class="breadcrumbs">
        <span>Financeiro</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-active">Borderô do Evento</span>
      </div>
      <div class="page-title-row">
        <div class="page-title-group">
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Borderô Oficial & Fechamento Financeiro
          </h1>
          <p class="page-title-desc">Documento oficial de prestação de contas com divisão de ingressos por setor, lotes, cortesias e conciliação final.</p>
        </div>
        <div class="header-action-group">
          <button class="btn btn-secondary" onclick="window.print()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Imprimir Borderô (PDF)
          </button>
          <button class="btn btn-primary" onclick="window.app.openPayoutModal('${bordero.eventId}')">
            Solicitar Saldo
          </button>
          <button class="btn btn-success" onclick="window.app.openSubmitBorderoModal('${bordero.eventId}')">
            ✍️ Fechar & Homologar Borderô
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="limitless-content">

      <!-- Status do Fechamento Formal com Dupla Assinatura -->
      ${activeBordero ? `
        <div class="card-panel" style="border-left: 4px solid #10b981; padding: 20px; background: #ffffff; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 12px;">
            <div>
              <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: #059669; letter-spacing: 0.05em;">
                HOMOLOGAÇÃO DE FECHAMENTO &bull; DUPLA ASSINATURA OBRIGATÓRIA (FINANCEIRO DISK POR ÚLTIMO)
              </div>
              <h3 style="font-size: 1.15rem; font-weight: 800; margin: 4px 0 0 0; color: var(--text-main);">
                Protocolo de Fechamento: ${activeBordero.id} (${activeBordero.documentId})
              </h3>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              ${createStatusBadge(activeBordero.status)}
              <button class="btn btn-secondary btn-sm" onclick="window.app.openAuditTrailModal('${activeBordero.id}')">
                📜 Trilha
              </button>
            </div>
          </div>

          <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; font-size: 0.82rem;">
            <div>
              <span style="font-weight: 700; color: ${activeBordero.signatures?.producer.signed ? '#10b981' : '#2563eb'};">
                ${activeBordero.signatures?.producer.signed ? `✓ Produtor Assinou (${activeBordero.signatures.producer.signedBy})` : '○ 1. Aguardando Assinatura do Produtor'}
              </span>
              <span style="margin: 0 8px; color: #94a3b8;">&bull;</span>
              <span style="font-weight: 700; color: ${activeBordero.signatures?.disk.signed ? '#10b981' : (!activeBordero.signatures?.producer.signed ? '#94a3b8' : '#2563eb')};">
                ${activeBordero.signatures?.disk.signed ? `✓ Financeiro Disk Assinou por Último` : '🔒 2. Assinatura Final Disk (Por Último)'}
              </span>
              <span style="margin: 0 8px; color: #94a3b8;">&bull;</span>
              <span style="font-weight: 700; color: ${activeBordero.status === 'Pago' ? '#10b981' : '#94a3b8'};">
                ${activeBordero.status === 'Pago' ? '✓ 3. Fechamento Liquidado / Concluído' : '○ 3. Liquidação'}
              </span>
            </div>

            <div style="display: flex; gap: 8px;">
              ${activeBordero.status === 'Aguardando assinatura do Produtor' ? `
                <button class="btn btn-success btn-sm" onclick="window.app.openSignDocumentModal('${activeBordero.id}')">
                  ✍️ Assinar Termo de Borderô (Produtor)
                </button>
              ` : ''}
              ${activeBordero.status === 'Pago' ? `
                <button class="btn btn-secondary btn-sm" onclick="window.app.showPayoutReceipt('${activeBordero.id}')">
                  Comprovante de Liquidação
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Borderô Official Header Sheet -->
      <div class="card-panel" style="border-top: 4px solid var(--primary);">
        <div class="card-header-bar" style="background: #f8fafc;">
          <div>
            <span style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; color: var(--primary);">Disk Ingressos • Documento de Fechamento Contábil</span>
            <h2 style="font-size: 1.25rem; font-weight: 800; margin-top: 2px;">${bordero.eventName}</h2>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
              Local: <strong>${bordero.venue}</strong> • Emissão: <strong>${bordero.closureDate}</strong>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">Produtor Responsável:</div>
            <strong style="font-size: 0.95rem;">${state.data.producer.name}</strong>
            <div style="font-size: 0.75rem; color: var(--text-muted);">CNPJ: ${state.data.producer.cnpj}</div>
          </div>
        </div>

        <!-- Grade de Ingressos por Lote e Setor -->
        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Setor</th>
                  <th>Lote</th>
                  <th style="text-align: right;">Preço Unitário</th>
                  <th style="text-align: right;">Vendidos (Pagos)</th>
                  <th style="text-align: right;">Cortesias</th>
                  <th style="text-align: right;">Total Emitido</th>
                  <th style="text-align: right;">Receita Bruta Total</th>
                </tr>
              </thead>
              <tbody>
                ${bordero.lots.map(l => `
                  <tr>
                    <td style="font-weight: 700;">${l.sector}</td>
                    <td style="color: var(--text-muted);">${l.lot}</td>
                    <td style="text-align: right; font-weight: 600;">${formatCurrency(l.price)}</td>
                    <td style="text-align: right; font-weight: 700;">${formatNumber(l.soldQty)}</td>
                    <td style="text-align: right; color: var(--text-muted);">${formatNumber(l.compQty)}</td>
                    <td style="text-align: right; font-weight: 600;">${formatNumber(l.soldQty + l.compQty)}</td>
                    <td style="text-align: right; font-weight: 700; font-size: 0.95rem; color: var(--text-main);">
                      ${formatCurrency(l.grossTotal)}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="background: #f8fafc; font-weight: 800; border-top: 2px solid var(--border-color);">
                  <td colspan="3" style="text-transform: uppercase;">Subtotais de Emissão de Ingressos</td>
                  <td style="text-align: right; color: var(--primary);">${formatNumber(s.totalSoldTickets)}</td>
                  <td style="text-align: right;">${formatNumber(s.totalComps)}</td>
                  <td style="text-align: right;">${formatNumber(s.totalSoldTickets + s.totalComps)}</td>
                  <td style="text-align: right; font-size: 1.05rem; color: var(--text-main);">${formatCurrency(s.grossRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- Resumo da Conciliação Financeira do Borderô -->
      <div style="display: grid; grid-template-columns: 3fr 2fr; gap: 24px;">
        
        <!-- Demonstrativo de Deduções e Líquido -->
        <div class="card-panel">
          <div class="card-header-bar">
            <div class="card-title-group">
              <h2>Demonstrativo de Fechamento Financeiro</h2>
              <p class="card-subtitle">Receita bruta, taxas contratuais apuradas e saldo líquido</p>
            </div>
          </div>
          <div class="card-body">
            <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.88rem;">
              
              <div style="display: flex; justify-content: space-between;">
                <span>(+) Arrecadação Bruta Total de Ingressos:</span>
                <strong>${formatCurrency(s.grossRevenue)}</strong>
              </div>

              <div style="display: flex; justify-content: space-between; color: #dc2626;">
                <span>(-) Taxa de Serviço Disk Ingressos (10,0%):</span>
                <strong>-${formatCurrency(s.deductions.diskServiceFee)}</strong>
              </div>

              <div style="display: flex; justify-content: space-between; color: #dc2626;">
                <span>(-) Taxa de Processamento e Segurança:</span>
                <strong>-${formatCurrency(s.deductions.processingFee)}</strong>
              </div>

              <div style="display: flex; justify-content: space-between; color: #dc2626;">
                <span>(-) Estornos / Cancelamentos Deferidos:</span>
                <strong>-${formatCurrency(s.deductions.refundsSubtotal)}</strong>
              </div>

              <div style="display: flex; justify-content: space-between; color: #dc2626;">
                <span>(-) Outros Encargos / Emissão Cortesias excedentes:</span>
                <strong>-${formatCurrency(s.deductions.otherDeductions)}</strong>
              </div>

              <hr style="border: none; border-top: 2px dashed var(--border-color); margin: 6px 0;">

              <div style="display: flex; justify-content: space-between; font-size: 1.05rem; font-weight: 800;">
                <span>(=) Resultado Líquido Apurado do Evento:</span>
                <span style="color: #059669;">${formatCurrency(s.netEventBalance)}</span>
              </div>

              <div style="display: flex; justify-content: space-between; color: var(--text-muted); font-size: 0.84rem;">
                <span>(-) Repasses já Transferidos à Conta:</span>
                <span>-${formatCurrency(s.alreadyTransferred)}</span>
              </div>

              <div style="background: var(--primary-light); border: 1px solid var(--primary-border); padding: 12px 16px; border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                <span style="font-weight: 700; color: #1e40af;">Saldo Remanescente para Repasse:</span>
                <span style="font-weight: 800; font-size: 1.25rem; color: #1e40af;">${formatCurrency(s.remainingBalance)}</span>
              </div>

            </div>
          </div>
        </div>

        <!-- Subdivisão por Ponto de Venda (PDV) -->
        <div class="card-panel">
          <div class="card-header-bar">
            <div class="card-title-group">
              <h2>Arrecadação por Canal / PDV</h2>
              <p class="card-subtitle">Canais de captação do borderô</p>
            </div>
          </div>
          <div class="card-body" style="display: flex; flex-direction: column; gap: 16px;">
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
                <strong>Web & Mobile Disk Ingressos</strong>
                <span>72% • ${formatCurrency(s.grossRevenue * 0.72)}</span>
              </div>
              <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                <div style="width: 72%; height: 100%; background: #2563eb;"></div>
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
                <strong>App Disk Ingressos (iOS/Android)</strong>
                <span>18% • ${formatCurrency(s.grossRevenue * 0.18)}</span>
              </div>
              <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                <div style="width: 18%; height: 100%; background: #7c3aed;"></div>
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
                <strong>PDVs Físicos (Shopping Palladium Curitiba)</strong>
                <span>10% • ${formatCurrency(s.grossRevenue * 0.10)}</span>
              </div>
              <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                <div style="width: 10%; height: 100%; background: #10b981;"></div>
              </div>
            </div>

            <div style="font-size: 0.75rem; color: var(--text-muted); background: var(--surface-alt); padding: 12px; border-radius: var(--radius-sm); margin-top: 10px;">
              Este borderô foi gerado com base nas emissões auditadas pelo sistema fiscal da Disk Ingressos.
            </div>
          </div>
        </div>

      </div>

    </div>
  `;
}
