/**
 * Pacote 18 — Central Operacional de Gateways e Adquirentes
 * Infraestrutura técnica de pagamento, credenciais seguras, meios aceitos,
 * custos reais de adquirência (MDR), segurança e conexão com Taxas & Conciliação.
 * 
 * Regra Arquitetural:
 * Gateways e Adquirentes define a infraestrutura e o custo financeiro real (MDR).
 * Taxas e Regras Comerciais consome essa infraestrutura para parametrizar a precificação
 * repassada ao Produtor/Comprador e apurar o spread líquido.
 */
import { formatCurrency, formatPercent } from '../../formatters.js';
import { renderScrollSpyNav } from '../../components/scrollSpy.js';

export const gatewayTabs = [
  ['config', 'Configurações', 'ph-sliders-horizontal'],
  ['credenciais', 'Credenciais', 'ph-key'],
  ['cartoes', 'Bandeiras e Cartões', 'ph-credit-card'],
  ['pix', 'PIX', 'ph-qr-code'],
  ['boleto', 'Boletos', 'ph-barcode'],
  ['parcelamento', 'Parcelamento', 'ph-calculator'],
  ['antifraude', 'Antifraude', 'ph-shield-check'],
  ['webhooks', 'Webhooks', 'ph-plugs-connected'],
  ['conciliacao', 'Conciliação', 'ph-arrows-left-right'],
  ['estornos', 'Estornos', 'ph-arrow-counter-clockwise'],
  ['logs', 'Logs de Auditoria', 'ph-clock-counter-clockwise'],
  ['relatorios', 'Relatórios', 'ph-chart-line-up']
];

export function renderDiskGateways(state, currentFilter = 'all') {
  const data = state?.data || state || {};
  const gs = data.gatewayConfigs || [];
  const rawGateways = data.gateways || [];
  const activeGateways = gs.filter(x => x.enabled).length;
  const totalVolume = rawGateways.reduce((sum, g) => sum + (g.totalVolumeProcessed || 0), 0);
  const prodCount = gs.filter(x => x.environment === 'Produção').length;
  const pendingCount = gs.filter(x => x.connectionStatus && x.connectionStatus.includes('Não configurado')).length;

  const activeTab = (typeof window !== 'undefined' ? window.app?.currentP18Tab : null) || 'config';

  return `
    <!-- Header Oficial Limitless -->
    <div class="limitless-page-header" style="background: #0f172a; color: white; border-bottom: 2px solid #3b82f6;">
      <div class="breadcrumbs" style="color: #94a3b8;">
        <span>Financeiro Disk</span>
        <span class="breadcrumb-separator">/</span>
        <span style="color: #60a5fa;">Gateways e Adquirentes</span>
      </div>
      <div class="page-title-row">
        <div class="page-title-group">
          <h1 style="color: #f8fafc; font-size: 1.45rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">
            <i class="ph-cpu text-primary"></i> Central Operacional de Gateways e Adquirentes
          </h1>
          <p class="page-title-desc" style="color: #94a3b8; font-size: 0.85rem;">
            Infraestrutura de pagamento, credenciais seguras, meios aceitos, custos reais (MDR), segurança e operação multicamadas.
          </p>
        </div>
        <div class="header-action-group" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <button class="btn btn-light btn-sm" onclick="window.app.navigate('diskTaxas')">
            <i class="ph-percent me-1"></i> Taxas & Regras Comerciais (Pacote 17)
          </button>
          <button class="btn btn-primary btn-sm" onclick="window.app.p18Action('novo')" style="background: #2563eb; border-color: #1d4ed8; font-weight: 700;">
            <i class="ph-plus me-1"></i> + Novo Gateway
          </button>
        </div>
      </div>
    </div>

    <div class="limitless-content">

      <!-- Alerta Estrito de Sensibilidade e Governança Técnica -->
      <div class="card-panel" style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 20px; margin-bottom: 16px;">
        <div style="font-weight: 700; color: #92400e; font-size: 0.95rem; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
          <i class="ph-shield-warning" style="font-size: 1.15rem;"></i>
          Segurança de Credenciais & Isolamento de Dados Operacionais
        </div>
        <div style="font-size: 0.85rem; color: #78350f; line-height: 1.5;">
          <strong>Exclusivo Financeiro Disk:</strong> Client Secrets e chaves privadas nunca são exibidos em texto aberto no frontend. Em produção real, os segredos residem exclusivamente em Key Management Services (KMS/Vault) no backend.<br>
          <strong>Sem Falso Sucesso:</strong> Testes de conexão refletem a integridade cadastral e requerem comunicação com os endpoints das operadoras. O Portal do Produtor não tem acesso a credenciais de adquirentes ou custos internos de adquirência.
        </div>
      </div>

      <!-- KPIs da Central Operacional de Adquirência -->
      <div class="kpi-grid">
        <div class="kpi-card highlight">
          <div class="kpi-header"><span class="kpi-title">Gateways Ativos</span></div>
          <div class="kpi-value">${activeGateways} <span style="font-size: 0.85rem; font-weight: normal; color: #64748b;">/ ${gs.length} cadastrados</span></div>
          <div class="kpi-subtext"><span style="color: #059669; font-weight: 600;">Roteamento ativo & failover</span></div>
        </div>

        <div class="kpi-card success-accent">
          <div class="kpi-header"><span class="kpi-title">Volume Transacionado</span></div>
          <div class="kpi-value" style="color: #059669;">${formatCurrency(totalVolume)}</div>
          <div class="kpi-subtext"><span>Processado no ecossistema Disk</span></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header"><span class="kpi-title">Ambientes em Produção</span></div>
          <div class="kpi-value" style="color: #2563eb;">${prodCount}</div>
          <div class="kpi-subtext"><span>Operando com tráfego real de vendas</span></div>
        </div>

        <div class="kpi-card warning-accent">
          <div class="kpi-header"><span class="kpi-title">Pendentes de Integração</span></div>
          <div class="kpi-value" style="color: #d97706;">${pendingCount}</div>
          <div class="kpi-subtext"><span>Requerem homologação técnica</span></div>
        </div>
      </div>

      <!-- Barra de Navegação Interna Sticky ScrollSpy (12 Seções Operacionais) -->
      ${renderScrollSpyNav(
        gatewayTabs.map(([tabId, tabName, iconClass]) => ({
          id: `sec-gw-${tabId}`,
          label: tabName,
          icon: iconClass
        })),
        `sec-gw-${activeTab}`,
        { navId: 'gateways-scrollspy-nav' }
      )}

      <!-- Fluxo Contínuo das 12 Seções Operacionais com ScrollSpy -->
      <div id="p18-scroll-container" class="scrollspy-content-flow">
        ${gatewayTabs.map(([tabId, tabName, iconClass]) => `
          <section id="sec-gw-${tabId}" class="scrollspy-section mb-4" data-scrollspy-section>
            <div class="card-panel mb-2" style="background: #f8fafc; border-left: 3px solid #2563eb; padding: 10px 16px;">
              <div class="d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center gap-2">
                  <i class="${iconClass} text-primary fs-5"></i>
                  <span class="fw-bold text-dark fs-sm">${tabName}</span>
                  <span class="badge bg-light text-muted border fs-xxs">SEÇÃO OPERACIONAL</span>
                </div>
                <button type="button" class="btn btn-link btn-xs text-muted text-decoration-none" onclick="window.app && window.app.scrollToSpySection('sec-gw-config')">
                  <i class="ph-arrow-up"></i> Topo
                </button>
              </div>
            </div>
            <div id="p18-tab-${tabId}-body">
              ${renderGatewayTab(state, tabId)}
            </div>
          </section>
        `).join('')}
      </div>

    </div>
  `;
}

/**
 * Renderizador de Abas Internas da Central de Gateways
 */
export function renderGatewayTab(state, tab = 'config') {
  const data = state?.data || state || {};
  const gs = data.gatewayConfigs || [];
  const rawGateways = data.gateways || [];

  if (tab === 'config') {
    return renderTabConfig(gs, rawGateways);
  }
  if (tab === 'credenciais') {
    return renderTabCredenciais(gs);
  }
  if (tab === 'cartoes') {
    return renderTabCartoes(gs);
  }
  if (tab === 'pix') {
    return renderTabPix(gs);
  }
  if (tab === 'boleto') {
    return renderTabBoleto(gs);
  }
  if (tab === 'parcelamento') {
    return renderTabParcelamento(gs);
  }
  if (tab === 'antifraude') {
    return renderTabAntifraude(gs);
  }
  if (tab === 'webhooks') {
    return renderTabWebhooks(gs);
  }
  if (tab === 'conciliacao') {
    return renderTabConciliacao(gs);
  }
  if (tab === 'estornos') {
    return renderTabEstornos(gs);
  }
  if (tab === 'logs') {
    return renderTabLogs(gs);
  }
  if (tab === 'relatorios') {
    return renderTabRelatorios(gs, rawGateways);
  }
  return renderTabConfig(gs, rawGateways);
}

// 1. ABA: CONFIGURAÇÕES GERAIS
function renderTabConfig(gs, rawGateways) {
  return `
    <div class="card-panel">
      <div class="card-header-bar">
        <div class="card-title-group">
          <h2>Gateways e Adquirentes Cadastrados</h2>
          <p class="card-subtitle">Cadastro de infraestrutura de adquirência, ambiente, conexão e parametrização operacional</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="window.app.p18Action('novo')">
          <i class="ph-plus me-1"></i> Novo Gateway
        </button>
      </div>
      <div class="card-body card-body-no-padding">
        <div class="table-responsive">
          <table class="limitless-table">
            <thead>
              <tr>
                <th>Gateway / Provedor</th>
                <th>Ambiente</th>
                <th>Status de Conexão</th>
                <th>Bandeiras Aceitas</th>
                <th style="text-align: center;">PIX</th>
                <th style="text-align: center;">Boleto</th>
                <th style="text-align: center;">Situação</th>
                <th style="text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${gs.length > 0 ? gs.map(g => {
                const raw = rawGateways.find(x => x.id === g.id);
                return `
                  <tr>
                    <td>
                      <div style="font-weight: 700; color: #1e293b; font-size: 0.92rem;">${g.name}</div>
                      <div style="font-size: 0.72rem; color: #64748b; font-family: monospace;">${g.id} · ${g.providerType || 'Adquirente'}</div>
                    </td>
                    <td>
                      <span class="badge ${g.environment === 'Produção' ? 'badge-success' : 'badge-warning'}" style="font-weight: 700;">
                        ${g.environment === 'Produção' ? '🟢 Produção' : '🟡 Sandbox'}
                      </span>
                    </td>
                    <td>
                      <div style="font-size: 0.82rem; font-weight: 600; color: ${g.connectionStatus.includes('Não configurado') ? '#dc2626' : '#059669'};">
                        ${g.connectionStatus}
                      </div>
                      <div style="font-size: 0.7rem; color: #94a3b8;">Último teste: ${g.lastTestAt || g.updatedAt || '—'}</div>
                    </td>
                    <td>
                      <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                        ${(g.cards || []).map(c => `<span class="badge badge-neutral" style="font-size: 0.7rem;">${c}</span>`).join('') || '<span class="text-muted fs-xs">Nenhuma</span>'}
                      </div>
                    </td>
                    <td style="text-align: center;">
                      ${g.pix?.enabled 
                        ? `<span class="badge badge-success" style="font-size: 0.72rem;">Ativo (${g.pix.term || 'D+0'})</span>` 
                        : `<span class="badge badge-neutral" style="font-size: 0.72rem;">Inativo</span>`}
                    </td>
                    <td style="text-align: center;">
                      ${g.boleto?.enabled 
                        ? `<span class="badge badge-success" style="font-size: 0.72rem;">Ativo (${g.boleto.bank || 'Banco'})</span>` 
                        : `<span class="badge badge-neutral" style="font-size: 0.72rem;">Inativo</span>`}
                    </td>
                    <td style="text-align: center;">
                      <span class="badge ${g.enabled ? 'badge-success' : 'badge-neutral'}" style="font-weight: 700; padding: 4px 8px;">
                        ${g.enabled ? '🟢 Ativo' : '⚪ Inativo'}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <div style="display: flex; gap: 4px; justify-content: flex-end;">
                        <button class="btn btn-outline-primary btn-xs" onclick="window.app.p18Action('editar', '${g.id}')" title="Editar gateway">
                          <i class="ph-pencil"></i> Editar
                        </button>
                        <button class="btn btn-outline-secondary btn-xs" onclick="window.app.p18Action('testar', '${g.id}')" title="Testar integridade da conexão">
                          <i class="ph-shield-check"></i> Testar
                        </button>
                        <button class="btn btn-outline-${g.enabled ? 'danger' : 'success'} btn-xs" onclick="window.app.p18Action('status', '${g.id}')" title="${g.enabled ? 'Inativar' : 'Ativar'}">
                          <i class="ph-power"></i>
                        </button>
                        <button class="btn btn-light btn-xs" onclick="window.app.p18Action('logs', '${g.id}')" title="Ver logs">
                          <i class="ph-clock-counter-clockwise"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('') : `
                <tr><td colspan="8" style="text-align: center; padding: 24px; color: #64748b;">Nenhum gateway configurado.</td></tr>
              `}
            </tbody>
          </table>
        </div>

        <div style="padding: 16px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div style="font-size: 0.82rem; color: #64748b;">
            Integração transversal: A infraestrutura configurada aqui alimenta automaticamente a apuração de <strong>Taxas/MDR</strong>, <strong>Recebíveis</strong> e <strong>Conciliação</strong>.
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-primary btn-sm" onclick="window.app.navigate('diskTaxas')">
              <i class="ph-percent me-1"></i> Ir para Taxas e Regras Comerciais
            </button>
            <button class="btn btn-light btn-sm" onclick="window.app.navigate('diskConciliacao')">
              <i class="ph-arrows-left-right me-1"></i> Abrir Conciliação
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 2. ABA: CREDENCIAIS
function renderTabCredenciais(gs) {
  return `
    <div class="row g-3">
      ${gs.map(g => `
        <div class="col-12 col-md-6 col-xl-4">
          <div class="card-panel h-100" style="display: flex; flex-column: justify-content: space-between;">
            <div>
              <div class="card-header-bar" style="padding-bottom: 10px;">
                <div>
                  <h3 style="font-size: 1.05rem; font-weight: 800; color: #1e293b; margin: 0;">${g.name}</h3>
                  <div style="font-size: 0.75rem; color: #64748b;">${g.id} · Ambiente: <strong>${g.environment}</strong></div>
                </div>
                <span class="badge ${g.environment === 'Produção' ? 'badge-success' : 'badge-warning'}">${g.environment}</span>
              </div>
              <div style="padding: 16px 20px;">
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Merchant ID</div>
                  <div style="font-family: monospace; font-size: 0.95rem; font-weight: 700; color: #1e293b;">${g.merchantId || '••••••••'}</div>
                </div>
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Client ID</div>
                  <div style="font-family: monospace; font-size: 0.88rem; color: #2563eb;">${g.clientId || 'Não informado'}</div>
                </div>
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Client Secret</div>
                  <div>
                    <span class="badge ${g.secretConfigured ? 'badge-success' : 'badge-danger'}" style="font-size: 0.75rem;">
                      ${g.secretConfigured ? '✓ CONFIGURADO NO VAULT' : '⚠ NÃO CONFIGURADO'}
                    </span>
                  </div>
                </div>
                <div style="margin-bottom: 6px;">
                  <div style="font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Status de Conexão</div>
                  <div style="font-size: 0.8rem; font-weight: 600; color: ${g.connectionStatus.includes('Não configurado') ? '#dc2626' : '#059669'};">
                    ${g.connectionStatus}
                  </div>
                  <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 2px;">Último teste: ${g.lastTestAt || 'Pendente'}</div>
                </div>
              </div>
            </div>
            <div style="padding: 12px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; gap: 8px;">
              <button class="btn btn-outline-secondary btn-xs" onclick="window.app.p18Action('testar', '${g.id}')">
                <i class="ph-shield-check"></i> Testar Conexão
              </button>
              <button class="btn btn-primary btn-xs" onclick="window.app.p18Action('configurar-cred', '${g.id}')">
                <i class="ph-key"></i> Atualizar Credenciais
              </button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// 3. ABA: BANDEIRAS E CARTÕES
function renderTabCartoes(gs) {
  return `
    <div class="row g-3">
      ${gs.map(g => `
        <div class="col-12 col-md-6">
          <div class="card-panel h-100">
            <div class="card-header-bar">
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 800; color: #1e293b; margin: 0;">${g.name}</h3>
                <div style="font-size: 0.75rem; color: #64748b;">Bandeiras aceitas para processamento de Cartão de Crédito e Débito</div>
              </div>
              <button class="btn btn-outline-primary btn-xs" onclick="window.app.p18Action('configurar-cards', '${g.id}')">
                <i class="ph-gear"></i> Configurar Bandeiras
              </button>
            </div>
            <div style="padding: 16px 20px;">
              <div style="font-size: 0.78rem; font-weight: 700; color: #64748b; margin-bottom: 8px; text-transform: uppercase;">Bandeiras Homologadas:</div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px;">
                ${(g.cards || []).map(c => `
                  <span class="badge bg-light text-dark border" style="font-size: 0.85rem; padding: 6px 10px; font-weight: 600;">
                    <i class="ph-credit-card text-primary me-1"></i> ${c}
                  </span>
                `).join('') || '<span class="text-muted">Nenhuma bandeira configurada.</span>'}
              </div>
              <div style="font-size: 0.8rem; color: #64748b; line-height: 1.5; background: #f8fafc; border-radius: 6px; padding: 10px;">
                <strong>Captura Automática:</strong> Ativada • <strong>Pré-autorização:</strong> Habilitada para reserva de ingressos (30 min) • <strong>3DS 2.0:</strong> Obrigatório acima de R$ 500,00.
              </div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// 4. ABA: PIX
function renderTabPix(gs) {
  return `
    <div class="row g-3">
      ${gs.map(g => {
        const pix = g.pix || {};
        return `
          <div class="col-12 col-md-6">
            <div class="card-panel h-100">
              <div class="card-header-bar">
                <div>
                  <h3 style="font-size: 1.05rem; font-weight: 800; color: #1e293b; margin: 0;">${g.name} — PIX SPI</h3>
                  <div style="font-size: 0.75rem; color: #64748b;">Parametrização do arranjo de pagamento instantâneo do Banco Central</div>
                </div>
                <button class="btn btn-outline-primary btn-xs" onclick="window.app.p18Action('configurar-pix', '${g.id}')">
                  <i class="ph-gear"></i> Configurar PIX
                </button>
              </div>
              <div style="padding: 16px 20px;">
                <div class="row g-3 mb-3">
                  <div class="col-6">
                    <div style="font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Situação do PIX</div>
                    <div style="margin-top: 4px;">
                      <span class="badge ${pix.enabled ? 'badge-success' : 'badge-neutral'}" style="font-weight: 700; padding: 4px 8px;">
                        ${pix.enabled ? '🟢 Ativo no Checkout' : '⚪ Desativado'}
                      </span>
                    </div>
                  </div>
                  <div class="col-6">
                    <div style="font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Prazo de Liquidação</div>
                    <div style="font-size: 0.95rem; font-weight: 800; color: #059669; margin-top: 2px;">
                      ${pix.term || 'D+0 (Instantâneo)'}
                    </div>
                  </div>
                </div>
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Chave Operacional da Plataforma</div>
                  <div style="font-family: monospace; font-size: 0.85rem; color: #2563eb; font-weight: 700;">
                    ${pix.key || '12.345.678/0001-90 (CNPJ Disk Ingressos)'}
                  </div>
                </div>
                <div style="font-size: 0.8rem; color: #64748b; background: #f8fafc; padding: 10px; border-radius: 6px;">
                  <strong>Split Imediato:</strong> ${pix.immediateSplit ? 'Ativo na confirmação' : 'Aguardando liquidação diária'} • <strong>Webhook SPI:</strong> Homologado.
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// 5. ABA: BOLETOS
function renderTabBoleto(gs) {
  return `
    <div class="row g-3">
      ${gs.map(g => {
        const bol = g.boleto || {};
        return `
          <div class="col-12 col-md-6">
            <div class="card-panel h-100">
              <div class="card-header-bar">
                <div>
                  <h3 style="font-size: 1.05rem; font-weight: 800; color: #1e293b; margin: 0;">${g.name} — Emissão de Boletos</h3>
                  <div style="font-size: 0.75rem; color: #64748b;">Cobrança bancária registrada com split e liquidação D+1/D+2</div>
                </div>
                <button class="btn btn-outline-primary btn-xs" onclick="window.app.p18Action('configurar-boleto', '${g.id}')">
                  <i class="ph-gear"></i> Configurar Boleto
                </button>
              </div>
              <div style="padding: 16px 20px;">
                <div class="row g-3 mb-3">
                  <div class="col-6">
                    <div style="font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Banco / Carteira</div>
                    <div style="font-weight: 700; font-size: 0.9rem; color: #1e293b;">${bol.bank || 'Banco do Brasil (001)'}</div>
                    <div style="font-size: 0.72rem; color: #64748b;">Carteira: ${bol.wallet || '17'} · Convênio: ${bol.agreement || '3482109'}</div>
                  </div>
                  <div class="col-6">
                    <div style="font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Dias para Vencimento</div>
                    <div style="font-weight: 800; font-size: 0.95rem; color: #2563eb;">${bol.dueDays || 3} dias corridos</div>
                    <div style="font-size: 0.72rem; color: #64748b;">Multa: ${bol.finePercent || 2.0}% · Juros: ${bol.dailyInterestPercent || 0.033}% a.d.</div>
                  </div>
                </div>
                <div style="font-size: 0.78rem; color: #64748b; background: #f8fafc; border-radius: 6px; padding: 10px;">
                  <strong>Instruções de Impressão:</strong> ${bol.instructions || 'Sr. Caixa, não receber após o vencimento. Aceitar somente valor integral.'}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// 6. ABA: PARCELAMENTO
function renderTabParcelamento(gs) {
  return `
    <div class="row g-3">
      ${gs.map(g => {
        const inst = g.installments || {};
        return `
          <div class="col-12 col-md-6">
            <div class="card-panel h-100">
              <div class="card-header-bar">
                <div>
                  <h3 style="font-size: 1.05rem; font-weight: 800; color: #1e293b; margin: 0;">${g.name} — Regras de Parcelamento</h3>
                  <div style="font-size: 0.75rem; color: #64748b;">Política de parcelas no checkout e repasse de custos de juros</div>
                </div>
                <button class="btn btn-outline-primary btn-xs" onclick="window.app.p18Action('configurar-installments', '${g.id}')">
                  <i class="ph-gear"></i> Configurar Parcelamento
                </button>
              </div>
              <div style="padding: 16px 20px;">
                <div class="row g-3 mb-3">
                  <div class="col-4">
                    <div style="font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Máximo de Parcelas</div>
                    <div style="font-size: 1.25rem; font-weight: 800; color: #1e293b;">${inst.max || 12}x</div>
                  </div>
                  <div class="col-4">
                    <div style="font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Início de Juros Comprador</div>
                    <div style="font-size: 1.25rem; font-weight: 800; color: #d97706;">A partir de ${inst.interestFrom || 7}x</div>
                  </div>
                  <div class="col-4">
                    <div style="font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Parcela Mínima</div>
                    <div style="font-size: 1.25rem; font-weight: 800; color: #059669;">${formatCurrency(inst.minInstallmentAmount || 15.0)}</div>
                  </div>
                </div>
                <div style="font-size: 0.8rem; color: #64748b; background: #f8fafc; border-radius: 6px; padding: 10px;">
                  As opções de parcelamento 1x até ${(inst.interestFrom || 7) - 1}x são absorvidas conforme negociado no contrato com o Produtor. De ${inst.interestFrom || 7}x a ${inst.max || 12}x, incide taxa de conveniência parcelada repassada ao comprador final.
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// 7. ABA: ANTIFRAUDE
function renderTabAntifraude(gs) {
  return `
    <div class="row g-3">
      ${gs.map(g => {
        const anti = g.antifraud || {};
        return `
          <div class="col-12 col-md-6">
            <div class="card-panel h-100">
              <div class="card-header-bar">
                <div>
                  <h3 style="font-size: 1.05rem; font-weight: 800; color: #1e293b; margin: 0;">${g.name} — Camada Antifraude</h3>
                  <div style="font-size: 0.75rem; color: #64748b;">Proteção contra chargebacks, análise comportamental e risco operacional</div>
                </div>
                <button class="btn btn-outline-primary btn-xs" onclick="window.app.p18Action('configurar-antifraud', '${g.id}')">
                  <i class="ph-gear"></i> Configurar Antifraude
                </button>
              </div>
              <div style="padding: 16px 20px;">
                <div class="row g-3 mb-3">
                  <div class="col-6">
                    <div style="font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Motor de Risco</div>
                    <div style="font-weight: 800; font-size: 0.95rem; color: #1e293b;">${anti.provider || 'ClearSale Total'}</div>
                  </div>
                  <div class="col-6">
                    <div style="font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Modo de Decisão</div>
                    <div style="font-size: 0.85rem; font-weight: 600; color: #059669;">${anti.mode || 'Automático com 3DS 2.0'}</div>
                  </div>
                </div>
                <div style="font-size: 0.8rem; color: #64748b; background: #f8fafc; border-radius: 6px; padding: 10px;">
                  Score de corte automático: <strong>${anti.scoreMinApproval || 85}/100</strong>. Pedidos com score intermediário (50–84) são encaminhados para validação cautelar manual na Central de Segurança.
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// 8. ABA: WEBHOOKS
function renderTabWebhooks(gs) {
  return `
    <div class="row g-3">
      ${gs.map(g => {
        const wh = g.webhooks || {};
        return `
          <div class="col-12 col-md-6">
            <div class="card-panel h-100">
              <div class="card-header-bar">
                <div>
                  <h3 style="font-size: 1.05rem; font-weight: 800; color: #1e293b; margin: 0;">${g.name} — Webhooks de Notificação</h3>
                  <div style="font-size: 0.75rem; color: #64748b;">Recepção em tempo real de autorizações, capturas e estornos</div>
                </div>
                <button class="btn btn-outline-primary btn-xs" onclick="window.app.p18Action('configurar-webhooks', '${g.id}')">
                  <i class="ph-gear"></i> Configurar Webhook
                </button>
              </div>
              <div style="padding: 16px 20px;">
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase;">URL de Notificação Registrada</div>
                  <div style="font-family: monospace; font-size: 0.82rem; color: #2563eb; background: #eff6ff; padding: 8px; border-radius: 4px; word-break: break-all;">
                    ${wh.url || `https://api.diskingressos.com.br/v1/webhooks/${g.id}`}
                  </div>
                </div>
                <div style="font-size: 0.8rem; color: #64748b; background: #f8fafc; border-radius: 6px; padding: 10px;">
                  <strong>Assinatura HMAC:</strong> ${wh.hmacConfigured ? 'Ativa (Validação de payload SHA-256)' : 'Pendente'} • <strong>Retentativas:</strong> Exponencial com 5 tentativas • <strong>Status:</strong> ${wh.enabled ? '🟢 Online' : '⚪ Pausado'}.
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// 9. ABA: CONCILIAÇÃO
function renderTabConciliacao(gs) {
  return `
    <div class="card-panel">
      <div class="card-header-bar">
        <div class="card-title-group">
          <h2>Fluxo Integrado de Conciliação Financeira</h2>
          <p class="card-subtitle">Cadeia operacional: Gateway → Recebível → Liquidação → Extrato Bancário → Ledger</p>
        </div>
      </div>
      <div class="card-body">
        <div class="row g-3 mb-4">
          <div class="col-md-3">
            <div class="border rounded p-3 h-100 bg-light">
              <div class="fw-bold text-primary fs-sm">Etapa 1</div>
              <div class="fw-bold mt-1">Autorização & Captura</div>
              <div class="text-muted fs-xs mt-1">Gateway processa venda no checkout e emite comprovante NSU.</div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="border rounded p-3 h-100 bg-light">
              <div class="fw-bold text-primary fs-sm">Etapa 2</div>
              <div class="fw-bold mt-1">Geração de Recebível</div>
              <div class="text-muted fs-xs mt-1">Agenda financeira é projetada com prazos D+0, D+14 e D+30.</div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="border rounded p-3 h-100 bg-light">
              <div class="fw-bold text-primary fs-sm">Etapa 3</div>
              <div class="fw-bold mt-1">Liquidação pela Operadora</div>
              <div class="text-muted fs-xs mt-1">Adquirente deduz o MDR contratual e liquida o líquido no banco Disk.</div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="border rounded p-3 h-100 bg-light">
              <div class="fw-bold text-primary fs-sm">Etapa 4</div>
              <div class="fw-bold mt-1">Conciliação Contábil & Ledger</div>
              <div class="text-muted fs-xs mt-1">Batimento do extrato bancário com o Ledger e liberação ao produtor.</div>
            </div>
          </div>
        </div>

        <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div>
            <div style="font-weight: 700; color: #1e3a8a; font-size: 0.95rem;">Ir para a Central de Conciliação Contábil & Financeira</div>
            <div style="font-size: 0.82rem; color: #3b82f6;">Verifique as divergências de taxas, lotes não batidos e liquidações pendentes.</div>
          </div>
          <button class="btn btn-primary" onclick="window.app.navigate('diskConciliacao')">
            <i class="ph-arrows-left-right me-1"></i> Abrir Conciliação Disk
          </button>
        </div>
      </div>
    </div>
  `;
}

// 10. ABA: ESTORNOS
function renderTabEstornos(gs) {
  return `
    <div class="card-panel">
      <div class="card-header-bar">
        <div class="card-title-group">
          <h2>Gestão Integrada de Estornos, Chargebacks & Disputas</h2>
          <p class="card-subtitle">Rastreamento de cancelamentos voluntários, contestações de compra e reservas cautelares</p>
        </div>
      </div>
      <div class="card-body">
        <p style="font-size: 0.88rem; color: #475569; line-height: 1.5;">
          Quando um pedido é contestado ou cancelado, a adquirente comunica a reversão via webhook. O Core Financeiro Disk bloqueia preventivamente o valor da subconta do produtor correspondente, preservando a liquidez e registrando o protocolo no Ledger.
        </p>
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div>
            <div style="font-weight: 700; color: #991b1b; font-size: 0.95rem;">Centro de Controle de Estornos & Risco Operacional</div>
            <div style="font-size: 0.82rem; color: #b91c1c;">Acompanhe a taxa de chargeback de cada adquirente e dispute cancelamentos indevidos.</div>
          </div>
          <button class="btn btn-danger" onclick="window.app.navigate('diskEstornos')">
            <i class="ph-arrow-counter-clockwise me-1"></i> Abrir Central de Estornos
          </button>
        </div>
      </div>
    </div>
  `;
}

// 11. ABA: LOGS DE AUDITORIA
function renderTabLogs(gs) {
  const allLogs = [];
  gs.forEach(g => {
    (g.logs || []).forEach(l => {
      allLogs.push({ ...l, gatewayName: g.name, gatewayId: g.id });
    });
  });

  return `
    <div class="card-panel">
      <div class="card-header-bar">
        <div class="card-title-group">
          <h2>Logs de Auditoria e Configuração dos Gateways</h2>
          <p class="card-subtitle">Histórico cronológico de testes de conexão, alterações cadastrais e mutações de ambiente</p>
        </div>
      </div>
      <div class="card-body card-body-no-padding">
        <div class="table-responsive">
          <table class="limitless-table">
            <thead>
              <tr>
                <th>Data & Hora</th>
                <th>Gateway / Adquirente</th>
                <th>Operação Executada</th>
                <th>Operador Responsável</th>
                <th>Resultado / Detalhes</th>
              </tr>
            </thead>
            <tbody>
              ${allLogs.length > 0 ? allLogs.map(l => `
                <tr>
                  <td style="font-size: 0.8rem; color: #64748b; font-family: monospace;">${l.at}</td>
                  <td><strong>${l.gatewayName}</strong> <span class="text-muted fs-xs font-monospace">(${l.gatewayId})</span></td>
                  <td><span class="badge bg-light text-dark border">${l.action}</span></td>
                  <td>${l.actor || 'Operador Disk'}</td>
                  <td><span class="text-muted fs-sm">${l.result || 'Concluído com sucesso'}</span></td>
                </tr>
              `).join('') : `
                <tr><td colspan="5" style="text-align: center; padding: 24px; color: #64748b;">Nenhum evento registrado até o momento.</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// 12. ABA: RELATÓRIOS
function renderTabRelatorios(gs, rawGateways) {
  return `
    <div class="card-panel">
      <div class="card-header-bar">
        <div class="card-title-group">
          <h2>Relatórios e Desempenho Operacional por Gateway</h2>
          <p class="card-subtitle">Métricas de volume, taxa de autorização e disponibilidade</p>
        </div>
      </div>
      <div class="card-body">
        <div class="row g-3">
          ${gs.map(g => {
            const raw = rawGateways.find(x => x.id === g.id) || {};
            const volume = raw.totalVolumeProcessed || 0;
            return `
              <div class="col-12 col-md-6">
                <div class="border rounded p-3 h-100 bg-white">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <strong style="font-size: 1rem; color: #1e293b;">${g.name}</strong>
                    <span class="badge ${g.enabled ? 'badge-success' : 'badge-neutral'}">${g.enabled ? 'Ativo' : 'Inativo'}</span>
                  </div>
                  <div style="font-size: 0.82rem; color: #64748b; margin-bottom: 8px;">
                    Ambiente: <strong>${g.environment}</strong> · Conexão: <strong>${g.connectionStatus}</strong>
                  </div>
                  <div class="row g-2 pt-2 border-top">
                    <div class="col-6">
                      <div class="text-muted fs-xs">Volume Processado</div>
                      <div class="fw-bold fs-5 text-primary">${formatCurrency(volume)}</div>
                    </div>
                    <div class="col-6">
                      <div class="text-muted fs-xs">Taxa de Aprovação</div>
                      <div class="fw-bold fs-5 text-success">98,4%</div>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}
