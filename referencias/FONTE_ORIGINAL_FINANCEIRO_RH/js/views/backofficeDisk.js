/**
 * Backoffice Interno - Financeiro Disk Ingressos
 * 
 * Demonstração da Camada Interna segregada do Produtor:
 * Venda → Gateway/Adquirente → MDR → Liquidação → Ledger → Conciliação → Saldo do Evento → Aprovação → Repasse → Banco
 */
import { formatCurrency, createStatusBadge } from '../formatters.js';

export function renderBackofficeDisk(state) {
  const disk = state.data.diskInternalBackoffice;

  return `
    <!-- Header Especial de Backoffice -->
    <div class="limitless-page-header" style="background: #0f172a; color: white; border-bottom: 2px solid #3b82f6;">
      <div class="breadcrumbs" style="color: #94a3b8;">
        <span>Disk Ingressos (Interno)</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-active" style="color: #60a5fa;">Backoffice Financeiro & Tesouraria</span>
      </div>
      <div class="page-title-row">
        <div class="page-title-group">
          <h1 style="color: #f8fafc;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            Backoffice Financeiro Disk (Camada Interna)
          </h1>
          <p class="page-title-desc" style="color: #94a3b8;">
            Ambiente restrito da Disk Ingressos. Engenharia financeira, adquirentes, taxas MDR, spread, ledger e fila de aprovação de repasses.
          </p>
        </div>
        <div class="header-action-group">
          <button class="btn btn-primary" onclick="window.app.toggleRole('producer')">
            ← Retornar ao Portal do Produtor
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="limitless-content">

      <!-- Diagrama de Arquitetura Comparativo -->
      <div class="card-panel" style="border: 2px solid #3b82f6; background: #ffffff;">
        <div class="card-header-bar" style="background: #eff6ff;">
          <div class="card-title-group">
            <h2 style="color: #1e40af;">Separação de Domínios: Produtor vs. Disk Interno</h2>
            <p class="card-subtitle">Conceito fundamental da arquitetura Limitless implementada</p>
          </div>
        </div>
        <div class="card-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 0.82rem;">
            
            <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px;">
              <div style="font-weight: 700; color: #059669; text-transform: uppercase; margin-bottom: 6px;">
                👤 Visão do Produtor (Simplicidade & Autonomia)
              </div>
              <p style="color: var(--text-muted); margin-bottom: 10px;">
                Focado no seu dinheiro: quanto vendeu, o que tem, taxas dele, quanto pode receber e quando receberá.
              </p>
              <div style="font-family: monospace; font-size: 0.78rem; background: white; padding: 10px; border-radius: 4px; border: 1px solid #e2e8f0; color: #1e293b;">
                Venda → Saldo → Extrato → Taxas dele → Solicitação de Repasse/Antecipação → Recebimento → Borderô/Relatórios
              </div>
            </div>

            <div style="background: #0f172a; color: white; border-radius: var(--radius-md); padding: 16px;">
              <div style="font-weight: 700; color: #60a5fa; text-transform: uppercase; margin-bottom: 6px;">
                🏢 Visão Disk Interno (Engenharia & Controle Financeiro)
              </div>
              <p style="color: #94a3b8; margin-bottom: 10px;">
                Controle multiadquirente, conciliação de adquirentes, spread financeiro, ledger contábil e liquidação bancária.
              </p>
              <div style="font-family: monospace; font-size: 0.78rem; background: #1e293b; padding: 10px; border-radius: 4px; border: 1px solid #334155; color: #38bdf8;">
                Venda → Adquirentes → MDR → Liquidação → Ledger → Conciliação → Saldo Evento → Aprovação → Repasse → Banco
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- Fila de Aprovação de Repasses da Tesouraria Disk -->
      <div class="card-panel">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Fila de Repasses Pendentes de Autorização (Tesouraria Disk)</h2>
            <p class="card-subtitle">Pedidos submetidos pelos produtores aguardando validação de compliance e liberação</p>
          </div>
          <span class="badge badge-warning">1 Repasse Pendente</span>
        </div>
        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Produtor</th>
                  <th>Evento Origem</th>
                  <th>Solicitado em</th>
                  <th style="text-align: right;">Valor</th>
                  <th>Análise de Risco</th>
                  <th style="text-align: right;">Ação do Operador Disk</th>
                </tr>
              </thead>
              <tbody>
                ${disk.pendingApprovals.map(p => `
                  <tr>
                    <td style="font-family: monospace; font-weight: 700;">${p.payoutId}</td>
                    <td><strong>${p.producer}</strong></td>
                    <td style="color: var(--text-muted);">${p.event}</td>
                    <td style="font-size: 0.8rem;">${p.requestedAt}</td>
                    <td style="text-align: right; font-weight: 800; font-size: 0.95rem; color: #1e40af;">${formatCurrency(p.amount)}</td>
                    <td><span class="badge badge-success">${p.riskScore}</span></td>
                    <td style="text-align: right;">
                      <button class="btn btn-success btn-sm" onclick="window.app.approvePayoutDisk('${p.payoutId}')">
                        ✓ Aprovar & Incluir no Lote CNAB
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Gestão Multi-Adquirente & MDR Interno (NÃO EXPOSTO AO PRODUTOR) -->
      <div class="card-panel">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Roteamento de Adquirentes & MDR Efetivo Disk</h2>
            <p class="card-subtitle">Taxas internas de processamento acordadas pela Disk com as adquirentes</p>
          </div>
          <span class="badge badge-purple">Spread Médio Disk: ${disk.diskAverageSpread}</span>
        </div>
        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Gateway / Adquirente</th>
                  <th>MDR Crédito</th>
                  <th>MDR Débito</th>
                  <th>MDR PIX</th>
                  <th>Volume Roteado</th>
                  <th>Status do Gateway</th>
                </tr>
              </thead>
              <tbody>
                ${disk.gateways.map(g => `
                  <tr>
                    <td><strong>${g.name}</strong></td>
                    <td style="font-weight: 600;">${g.mdrCredit}</td>
                    <td style="font-weight: 600;">${g.mdrDebit}</td>
                    <td style="font-weight: 600; color: #059669;">${g.mdrPix}</td>
                    <td style="font-weight: 700;">${g.volumeShare}</td>
                    <td><span class="badge ${g.status.includes('Backup') ? 'badge-warning' : 'badge-success'}">${g.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Ledger Contábil e Remessa Bancária CNAB -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <div class="card-panel" style="padding: 20px;">
          <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 6px;">Motor Contábil (Ledger em Partidas Dobradas)</h3>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 12px;">
            Conciliação automática D-0 entre extrato de adquirentes e saldos de produtores.
          </p>
          <div style="background: var(--surface-alt); padding: 12px; border-radius: var(--radius-sm); font-size: 0.78rem; font-family: monospace;">
            D: Transitória Cielo (Ativo) R$ 480.000,00<br>
            C: Saldo Produtor Opus (Passivo) R$ 432.000,00<br>
            C: Receita Taxa Disk (Resultado) R$ 48.000,00
          </div>
          <div style="margin-top: 10px; font-size: 0.75rem; color: #059669; font-weight: 600;">
            ✓ ${disk.ledgerStatus}
          </div>
        </div>

        <div class="card-panel" style="padding: 20px;">
          <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 6px;">Remessa Bancária CNAB 240/400 (Tesouraria)</h3>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 12px;">
            Transmissão de lotes de pagamento para a rede bancária.
          </p>
          <div style="background: var(--surface-alt); padding: 12px; border-radius: var(--radius-sm); font-size: 0.8rem;">
            <div>Lote: <strong>${disk.cnabBatch.batchId}</strong></div>
            <div>Banco Emissor: <strong>${disk.cnabBatch.bank}</strong></div>
            <div>Pagamentos Agendados: <strong>${disk.cnabBatch.scheduledPaymentCount} repasses (${formatCurrency(disk.cnabBatch.totalAmount)})</strong></div>
          </div>
          <button class="btn btn-secondary btn-sm" style="margin-top: 12px;" onclick="alert('Arquivo CNAB 240 gerado e pronto para envio via VAN bancária.')">
            Transmitir Remessa CNAB
          </button>
        </div>
      </div>

    </div>
  `;
}
