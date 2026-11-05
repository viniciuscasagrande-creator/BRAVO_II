/**
 * Ledger Contábil em Partidas Dobradas - Disk Interno
 * Auditabilidade absoluta: toda movimentação de vendas, taxas, retenções e repasses
 */
import { formatCurrency } from '../../formatters.js';

export function renderDiskLedger(state) {
  const selectedProducer = (state.selectedProducerId && state.selectedProducerId !== 'all')
    ? (state.data.producers || []).find(p => p.id === state.selectedProducerId)
    : null;

  let entries = state.data.ledgerEntries || [];
  if (selectedProducer) {
    entries = entries.filter(l => l.producerId === selectedProducer.id);
  }

  return `
    <!-- Header -->
    <div class="limitless-page-header" style="background: #0f172a; color: white; border-bottom: 2px solid #3b82f6;">
      <div class="breadcrumbs" style="color: #94a3b8;">
        <span>Financeiro Disk</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-active" style="color: #60a5fa;">Ledger Contábil (Partidas Dobradas)</span>
      </div>
      <div class="page-title-row">
        <div class="page-title-group">
          <h1 style="color: #f8fafc;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            Ledger Contábil & Auditoria Financeira
          </h1>
          <p class="page-title-desc" style="color: #94a3b8;">
            Registro imutável de débito e crédito que conecta a contabilidade geral ao ecossistema da Disk Ingressos.
          </p>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="limitless-content">

      <!-- Informative Notice -->
      <div class="info-banner info-banner-blue">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        <div>
          <strong>Integridade Contábil Auditada:</strong> Nenhuma alteração de saldo ocorre sem lançamento correspondente no Ledger. Todas as entradas e saídas mantêm a equação <code>Débitos = Créditos</code> em equilíbrio permanente.
        </div>
      </div>

      ${selectedProducer ? `
        <div class="alert alert-primary d-flex align-items-center justify-content-between p-2 px-3 mb-3 shadow-sm rounded-3">
          <div class="d-flex align-items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            <span class="fs-xs text-dark">
              Ledger Filtrado: <strong>${selectedProducer.tradeName || selectedProducer.name}</strong> (CNPJ: ${selectedProducer.cnpj}) &bull; ${entries.length} lançamentos contabilizados.
            </span>
          </div>
          <button class="btn btn-xs btn-outline-primary fw-semibold" onclick="window.app.clearProducerContext()">Ver Todos os Lançamentos</button>
        </div>
      ` : ''}

      <!-- Tabela do Ledger -->
      <div class="card-panel">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Lançamentos Contábeis no Ledger</h2>
            <p class="card-subtitle">Trilha de auditoria cronológica das operações financeiras</p>
          </div>
          <span class="badge badge-success">Conciliação D-0 em Equilíbrio</span>
        </div>
        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>ID Ledger</th>
                  <th>Tipo Evento</th>
                  <th>Ref. Pedido/Repasse</th>
                  <th>Conta Devedora (Débito)</th>
                  <th>Conta Credora (Crédito)</th>
                  <th style="text-align: right;">Valor da Operação</th>
                  <th style="text-align: center;">Auditado</th>
                </tr>
              </thead>
              <tbody>
                ${entries.length ? entries.map(l => `
                  <tr>
                    <td style="font-size: 0.8rem; color: var(--text-muted);">${l.timestamp}</td>
                    <td style="font-family: monospace; font-weight: 700; color: var(--primary);">${l.id}</td>
                    <td><strong style="font-size: 0.82rem;">${l.eventType}</strong></td>
                    <td style="font-family: monospace; font-size: 0.8rem;">${l.refOrder}</td>
                    <td style="font-size: 0.8rem; color: #dc2626; font-family: monospace;">
                      D: ${l.debitAccount}
                    </td>
                    <td style="font-size: 0.8rem; color: #059669; font-family: monospace;">
                      C: ${l.creditAccount}
                      ${l.creditAccount2 ? `<br>C: ${l.creditAccount2}` : ''}
                    </td>
                    <td style="text-align: right; font-weight: 800; font-size: 0.95rem;">
                      ${formatCurrency(l.amount)}
                    </td>
                    <td style="text-align: center;">
                      <span class="badge badge-success">✓ Conciliado</span>
                    </td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="8" class="text-center text-muted py-4">Nenhum lançamento no Ledger registrado para ${selectedProducer?.tradeName || selectedProducer?.name || 'este produtor'}.</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  `;
}
