import { formatCurrency } from '../formatters.js';

export function renderComprovantes(state) {
  const producerId = state.currentUser?.producerId || state.selectedProducerId;
  const docs = (state.data.financialDocuments || []).filter(d => d.producerId === producerId && d.visibleToProducer === true);
  return `
    <div class="limitless-page-header">
      <div class="breadcrumbs"><span>Financeiro do Produtor</span><span class="breadcrumb-separator">/</span><span class="breadcrumb-active">Comprovantes e Transações</span></div>
      <div class="page-title-row"><div class="page-title-group"><h1><i class="ph-files"></i> Comprovantes e Transações</h1><p class="page-title-desc">Documentos financeiros disponibilizados oficialmente pelo Financeiro Disk.</p></div></div>
    </div>
    <div class="limitless-content">
      <div class="card-panel">
        <div class="card-header-bar"><div class="card-title-group"><h2>Documentos disponíveis</h2><p class="card-subtitle">Somente arquivos publicados pelo Financeiro Disk aparecem nesta área.</p></div></div>
        <div class="table-responsive"><table class="table"><thead><tr><th>Data</th><th>Operação</th><th>Evento</th><th>Referência</th><th>Valor</th><th>Arquivo</th><th></th></tr></thead><tbody>
          ${docs.length ? docs.map(d => `<tr><td>${d.date}</td><td><strong>${d.type}</strong><div class="text-muted fs-xs">${d.description || ''}</div></td><td>${d.eventName || 'Consolidado'}</td><td>${d.reference || '—'}</td><td><strong>${formatCurrency(d.amount || 0)}</strong></td><td><i class="ph-file-pdf text-danger"></i> ${d.fileName}</td><td><button class="btn btn-sm btn-outline-primary" onclick="window.app.downloadFinancialDocument('${d.id}')"><i class="ph-download-simple"></i> Baixar</button></td></tr>`).join('') : `<tr><td colspan="7" class="text-center text-muted py-5">Nenhum comprovante foi disponibilizado pelo Financeiro Disk.</td></tr>`}
        </tbody></table></div>
      </div>
    </div>`;
}
