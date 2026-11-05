/**
 * Tesouraria & Gestão Operacional de Caixa - Financeiro Disk (Pacote 19)
 * Central de Contas Corporativas, Liquidação via PIX/CNAB e Preparação de Lotes.
 * Regra Arquitetural: Não simula transmissão bancária como concluída sem retorno/VAN homologada.
 */
import { formatCurrency } from '../../formatters.js';
import { renderScrollSpyNav } from '../../components/scrollSpy.js';

export function renderDiskTesouraria(state) {
  const accounts = state.data.treasuryAccounts || [];
  const batches = state.data.cnabBatches || [];
  const totalInBatches = batches.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
  const totalPayments = batches.reduce((sum, b) => sum + Number(b.count || 0), 0);

  const selectedProd = state.data.producers?.find(p => p.id === state.selectedProducerId);
  const selectedEvt = state.data.events?.find(e => e.id === state.selectedEventId);
  const hasContext = state.selectedProducerId && state.selectedProducerId !== 'all';

  const tesourariaSpyItems = [
    { id: 'sec-tesouraria-posicao', label: 'Posição dos Caixas', icon: 'ph-vault' },
    { id: 'sec-tesouraria-contas', label: 'Contas Corporativas', icon: 'ph-bank', badge: accounts.length },
    { id: 'sec-tesouraria-lotes', label: 'Lotes CNAB 240/400', icon: 'ph-file-arrow-down', badge: batches.length },
    { id: 'sec-tesouraria-fluxo', label: 'Fluxo de Execução', icon: 'ph-flow-arrow' }
  ];

  return `
    <!-- Header Oficial Limitless -->
    <div class="limitless-page-header" style="background: #0f172a; color: white; border-bottom: 2px solid #3b82f6;">
      <div class="breadcrumbs" style="color: #94a3b8;">
        <span>Financeiro Disk</span>
        <span class="breadcrumb-separator">/</span>
        <span style="color: #60a5fa;">Tesouraria Operacional</span>
      </div>
      <div class="page-title-row">
        <div class="page-title-group">
          <h1 style="color: #f8fafc; font-size: 1.45rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">
            <i class="ph-bank text-primary"></i> Tesouraria & Contas Corporativas
          </h1>
          <p class="page-title-desc" style="color: #94a3b8; font-size: 0.85rem;">
            Execução financeira de caixas, gestão de contas corporativas por finalidade e preparação de remessas bancárias.
          </p>
        </div>
        <div class="header-action-group" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <button class="btn btn-light btn-sm" onclick="window.app.navigate('diskAgendaPagamentos')">
            <i class="ph-calendar me-1"></i> Agenda de Pagamentos
          </button>
          <button class="btn btn-light btn-sm" onclick="window.app.navigate('diskPagamentosLote')">
            <i class="ph-stack me-1"></i> Pagamentos em Lote
          </button>
          <button class="btn btn-primary btn-sm" onclick="window.app.p19OpenTreasuryAccountModal()" style="background: #2563eb; border-color: #1d4ed8; font-weight: 700;">
            <i class="ph-plus me-1"></i> + Nova Conta Corporativa
          </button>
        </div>
      </div>
    </div>

    <div class="limitless-content">

      ${hasContext ? `
        <!-- Aviso de Contexto Selecionado vs Consolidado Corporativo -->
        <div class="card-panel" style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 18px; margin-bottom: 18px;">
          <div style="font-size: 0.85rem; color: #92400e; font-weight: 700; display: flex; align-items: center; gap: 8px;">
            <i class="ph-info fs-5"></i>
            Contexto Ativo: ${selectedProd?.name || state.selectedProducerId} ${selectedEvt ? '→ ' + selectedEvt.name : ''}
          </div>
          <div style="font-size: 0.8rem; color: #78350f; margin-top: 2px;">
            Atenção: Os saldos e contas bancárias exibidos abaixo correspondem à <strong>Tesouraria Corporativa Disk Ingressos</strong> (disponibilidades consolidadas da plataforma). Os repasses do produtor em fila são debitados destas contas após homologação.
          </div>
        </div>
      ` : ''}

      <!-- Sticky ScrollSpy Navigation Bar -->
      ${renderScrollSpyNav(tesourariaSpyItems, 'sec-tesouraria-posicao', { navId: 'tesouraria-scrollspy-nav' })}

      <!-- SEÇÃO 1: Posição Consolidada das Contas Corporativas -->
      <section id="sec-tesouraria-posicao" class="scrollspy-section mb-4" data-scrollspy-section>
        <div class="kpi-grid">
          ${accounts.map((acc, idx) => `
            <div class="kpi-card ${acc.isMain ? 'highlight' : 'success-accent'}">
              <div class="kpi-header"><span class="kpi-title">${acc.bankName}</span></div>
              <div class="kpi-value" style="${!acc.isMain ? 'color: #059669;' : ''}">${formatCurrency(acc.balance)}</div>
              <div class="kpi-subtext"><span>Ag. ${acc.agency} • C/C ${acc.accountNumber} • ${acc.purpose.split('(')[0].trim()}</span></div>
            </div>
          `).join('')}

          <div class="kpi-card">
            <div class="kpi-header"><span class="kpi-title">Lotes Preparados para Execução</span></div>
            <div class="kpi-value" style="color: #2563eb;">${formatCurrency(totalInBatches)}</div>
            <div class="kpi-subtext"><span>${totalPayments} pagamentos aguardando arquivo/retorno</span></div>
          </div>
        </div>
      </section>

      <!-- SEÇÃO 2: Gestão Operacional de Contas Bancárias Corporativas -->
      <section id="sec-tesouraria-contas" class="scrollspy-section mb-4" data-scrollspy-section>
        <div class="card-panel">
          <div class="card-header-bar">
            <div class="card-title-group">
              <h2>Contas Correntes Corporativas (Disk Ingressos)</h2>
              <p class="card-subtitle">Contas com finalidade estrita para evitar confusão entre fluxo de caixa operacional e liquidação de repasses</p>
            </div>
            <button class="btn btn-outline-primary btn-sm" onclick="window.app.p19OpenTreasuryAccountModal()">
              <i class="ph-plus me-1"></i> Adicionar Conta
            </button>
          </div>
          <div class="card-body card-body-no-padding">
            <div class="table-responsive">
              <table class="limitless-table">
                <thead>
                  <tr>
                    <th>Instituição Financeira</th>
                    <th>Agência / Conta</th>
                    <th>Finalidade Operacional</th>
                    <th>Canal de Liquidação</th>
                    <th style="text-align: right;">Saldo Disponível</th>
                    <th style="text-align: center;">Status</th>
                    <th style="text-align: right;">Ações Operacionais</th>
                  </tr>
                </thead>
                <tbody>
                  ${accounts.map(acc => `
                    <tr>
                      <td>
                        <div class="fw-bold text-dark">${acc.bankName}</div>
                        <div class="text-muted fs-xs">${acc.accountType}</div>
                      </td>
                      <td>
                        <strong>Ag. ${acc.agency}</strong> · C/C <strong>${acc.accountNumber}</strong>
                      </td>
                      <td>
                        <span class="badge ${acc.isMain ? 'badge-primary' : 'badge-info'}" style="font-size: 0.78rem;">
                          ${acc.purpose}
                        </span>
                      </td>
                      <td>
                        <span class="text-muted fs-xs">${acc.settlementChannel}</span>
                      </td>
                      <td style="text-align: right; font-weight: 800; font-size: 0.95rem; color: #1e293b;">
                        ${formatCurrency(acc.balance)}
                      </td>
                      <td style="text-align: center;">
                        <span class="badge ${acc.status === 'Ativa' ? 'badge-success' : 'badge-neutral'}">
                          ${acc.status}
                        </span>
                      </td>
                      <td style="text-align: right;">
                        <div class="d-flex gap-1 justify-content-end">
                          <button class="btn btn-outline-primary btn-xs" title="Ver extrato da conta" onclick="window.app.p19TreasuryAccountStatement('${acc.id}')">
                            <i class="ph-file-text"></i> Extrato
                          </button>
                          <button class="btn btn-outline-secondary btn-xs" title="Editar finalidade" onclick="window.app.p19OpenTreasuryAccountModal('${acc.id}')">
                            <i class="ph-pencil"></i>
                          </button>
                          <button class="btn btn-outline-info btn-xs" title="Conciliação bancária desta conta" onclick="window.app.navigate('diskConciliacao')">
                            <i class="ph-arrows-left-right"></i> Conciliação
                          </button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <!-- SEÇÃO 3: Grade de Lotes CNAB 240 / 400 com Homologação Verídica -->
      <section id="sec-tesouraria-lotes" class="scrollspy-section mb-4" data-scrollspy-section>
        <div class="card-panel">
          <div class="card-header-bar">
            <div class="card-title-group">
              <h2>Lotes de Pagamento CNAB 240 / 400</h2>
              <p class="card-subtitle">Geração e preparação de arquivos para transmissão bancária. A confirmação de liquidação depende do retorno bancário.</p>
            </div>
            <button class="btn btn-primary btn-sm" onclick="window.app.p19PrepareCnab()" style="background: #2563eb; border-color: #1d4ed8; font-weight: 700;">
              <i class="ph-file-arrow-down me-1"></i> Preparar Arquivo CNAB (Homologação)
            </button>
          </div>
          <div class="card-body card-body-no-padding">
            <div class="table-responsive">
              <table class="limitless-table">
                <thead>
                  <tr>
                    <th>Lote CNAB</th>
                    <th>Banco Liquidador</th>
                    <th>Conta Origem Disk</th>
                    <th>Data Agendada</th>
                    <th>Qtd Favorecidos</th>
                    <th style="text-align: right;">Total do Lote</th>
                    <th style="text-align: center;">Status</th>
                    <th style="text-align: right;">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${batches.map(b => `
                    <tr>
                      <td style="font-family: monospace; font-weight: 700; color: #1e40af;">${b.batchId}</td>
                      <td><strong>${b.bank}</strong></td>
                      <td style="color: var(--text-muted); font-size: 0.8rem;">${b.agencyAccount}</td>
                      <td style="font-weight: 600;">${b.scheduledDate}</td>
                      <td style="font-weight: 700;">${b.count} pagamentos</td>
                      <td style="text-align: right; font-weight: 800; font-size: 0.95rem; color: #1e40af;">
                        ${formatCurrency(b.totalAmount)}
                      </td>
                      <td style="text-align: center;">
                        <span class="badge badge-info">${b.status}</span>
                      </td>
                      <td style="text-align: right;">
                        <button class="btn btn-light btn-xs" onclick="window.app.p19BatchDetail('${b.batchId}')">
                          <i class="ph-eye me-1"></i> Ver Lote
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <!-- SEÇÃO 4: Fluxo Operacional & Segurança Contábil -->
      <section id="sec-tesouraria-fluxo" class="scrollspy-section mb-4" data-scrollspy-section>
        <div class="row g-3">
          <div class="col-lg-8">
            <div class="card-panel h-100">
              <div class="card-header-bar">
                <div class="card-title-group">
                  <h2>Fluxo Operacional de Execução Financeira</h2>
                  <p class="card-subtitle">Da obrigação contratual até o registro imutável no Ledger</p>
                </div>
              </div>
              <div class="card-body">
                <div class="row g-2">
                  ${[
                    ['1. Obrigação', 'Venda confirmada gera obrigação de repasse ao produtor.'],
                    ['2. Agenda', 'Previsão de liquidação por data e alçada financeira.'],
                    ['3. Preparado', 'Agrupamento em lote e verificação de saldo da conta.'],
                    ['4. Aprovação', 'Mesa de aprovações com dupla assinatura sequencial.'],
                    ['5. PIX / CNAB', 'Geração de arquivo ou ordem SPI com conta validada.'],
                    ['6. Retorno', 'Processamento do arquivo retorno do banco com conciliação.'],
                    ['7. Conciliação', 'Conferência contra extrato bancário oficial.'],
                    ['8. Ledger', 'Baixa contábil definitiva e auditoria imutável.']
                  ].map(([title, desc]) => `
                    <div class="col-12 col-md-6">
                      <div class="p-2 border rounded bg-white h-100">
                        <strong class="fs-xs text-primary d-block">${title}</strong>
                        <span class="fs-xxs text-muted">${desc}</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>

          <div class="col-lg-4">
            <div class="card-panel h-100">
              <div class="card-header-bar">
                <div class="card-title-group">
                  <h2>Regras de Homologação</h2>
                </div>
              </div>
              <div class="card-body fs-xs">
                <ul class="list-unstyled mb-0" style="line-height: 1.8;">
                  <li><i class="ph-check-circle text-success me-1"></i> <strong>Sem transmissão fictícia:</strong> enquanto não houver VAN bancária homologada, arquivos são preparados para download.</li>
                  <li><i class="ph-check-circle text-success me-1"></i> <strong>Conta de Repasse Homologada:</strong> dinheiro só sai para contas validadas com conferência Bacen/CIP.</li>
                  <li><i class="ph-check-circle text-success me-1"></i> <strong>Retorno Bancário:</strong> a liquidação só muda para 'Pago' após leitura do arquivo de retorno.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  `;
}
