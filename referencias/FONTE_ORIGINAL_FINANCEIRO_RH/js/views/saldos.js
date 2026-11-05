/**
 * Saldos - Gestão de Saldos do Produtor por Evento & Composição do Saldo
 * Padrão Limitless: Segregação por Evento, Transferência com Regra Rígida e Composição Transparente
 */
import { formatCurrency, formatNumber } from '../formatters.js';
import { financialStore } from '../state.js';

export function renderSaldos(state) {
  const producer = state.activeProducer;
  const selectedEventId = state.selectedEventId || 'all';
  const isAllScope = selectedEventId === 'all';
  const allEvents = state.data.events.filter(e => e.producerId === producer.id);
  const events = isAllScope ? allEvents : allEvents.filter(e => e.id === selectedEventId);
  const transfers = state.data.eventTransfers || [];
  const retentions = (state.data.retentions || []).filter(r => r.producerId === producer.id && (isAllScope || r.eventId === selectedEventId));

  // Composição canônica do saldo do produtor (100% conciliada com Visão Geral e Eventos)
  const comp = typeof financialStore.getProducerBalanceComposition === 'function'
    ? financialStore.getProducerBalanceComposition(producer.id, selectedEventId)
    : {
        scopeLabel: 'Todos os Eventos (4 produções consolidadas)',
        referenceDate: '04/11/2026 11:00 BRT',
        grossSales: 1410000.00,
        refunds: 27000.00,
        chargebacks: 12000.00,
        diskFees: 103000.00,
        netRevenue: 1268000.00,
        payoutsDone: 398000.00,
        reservedBalance: 75000.00,
        retentionsBalance: 45000.00,
        availableBalance: 750000.00
      };

  const totalRetentionsVal = comp.retentionsBalance;

  return `
    <!-- Header -->
    <div class="limitless-page-header">
      <div class="breadcrumbs">
        <span>Financeiro</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-active">Saldos & Composição</span>
      </div>
      <div class="page-title-row">
        <div class="page-title-group">
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <rect x="2" y="4" width="20" height="16" rx="2"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
            Saldos Financeiros & Composição
          </h1>
          <p class="page-title-desc">Transparência completa de receitas, deduções contratuais, retenções e transferências entre produções.</p>
        </div>
        <div class="header-action-group">
          <button class="btn btn-secondary" onclick="window.app.openTransferBetweenEventsModal()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="17 1 21 5 17 9"></polyline>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
              <polyline points="7 23 3 19 7 15"></polyline>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
            </svg>
            Transferir entre Eventos
          </button>
          <button class="btn btn-primary" onclick="window.app.openPayoutModal()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Solicitar Repasse de Saldo
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="limitless-content">

      <!-- Hero Card: Saldo Consolidado e Indicadores Principais -->
      <div class="card-panel" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: white; border: none; padding: 26px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 20px;">
          <div>
            <span style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; font-weight: 600;">Saldo Disponível Consolidado</span>
            <div style="font-size: 2.6rem; font-weight: 800; letter-spacing: -0.03em; margin: 4px 0 10px 0; color: #34d399;">
              ${formatCurrency(comp.availableBalance)}
            </div>
            <div style="font-size: 0.85rem; color: #cbd5e1; display: flex; gap: 20px; flex-wrap: wrap;">
              <span><strong>Produtor:</strong> ${producer.name}</span>
              <span><strong>CNPJ:</strong> ${producer.cnpj}</span>
              <span><strong>Eventos Ativos:</strong> ${events.length} produções segregadas</span>
            </div>
          </div>

          <!-- Mini Stats Grid in Hero -->
          <div style="display: flex; gap: 14px; flex-wrap: wrap;">
            <div style="background: rgba(255,255,255,0.06); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid rgba(255,255,255,0.1); cursor: pointer;" onclick="window.app.openBalanceCompositionModal()" title="Ver Composição do Saldo">
              <div style="font-size: 0.72rem; text-transform: uppercase; color: #93c5fd; font-weight: 600;">Receita Líquida</div>
              <div style="font-size: 1.25rem; font-weight: 700; color: #93c5fd; margin-top: 2px;">${formatCurrency(comp.netRevenue)}</div>
              <div style="font-size: 0.7rem; color: #94a3b8;">Após taxas e estornos ↗</div>
            </div>

            <div style="background: rgba(255,255,255,0.06); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid rgba(255,255,255,0.1); cursor: pointer;" onclick="window.app.navigate('repasses')" title="Ver Repasses">
              <div style="font-size: 0.72rem; text-transform: uppercase; color: #f59e0b; font-weight: 600;">Em Reserva Repasse</div>
              <div style="font-size: 1.25rem; font-weight: 700; color: #f59e0b; margin-top: 2px;">${formatCurrency(comp.reservedBalance)}</div>
              <div style="font-size: 0.7rem; color: #94a3b8;">Em análise / assinatura ↗</div>
            </div>

            <div style="background: rgba(255,255,255,0.06); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid rgba(255,255,255,0.1); cursor: pointer;" onclick="window.app.openRetentionsModal('all')" title="Ver Detalhamento das Retenções">
              <div style="font-size: 0.72rem; text-transform: uppercase; color: #f87171; font-weight: 600;">Retenções</div>
              <div style="font-size: 1.25rem; font-weight: 700; color: #f87171; margin-top: 2px;">${formatCurrency(totalRetentionsVal)}</div>
              <div style="font-size: 0.7rem; color: #94a3b8;">${retentions.length} itens retidos ↗</div>
            </div>

            <div style="background: rgba(255,255,255,0.06); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid rgba(255,255,255,0.1);">
              <div style="font-size: 0.72rem; text-transform: uppercase; color: #cbd5e1; font-weight: 600;">Repasses Concluídos</div>
              <div style="font-size: 1.25rem; font-weight: 700; color: #cbd5e1; margin-top: 2px;">${formatCurrency(comp.payoutsDone)}</div>
              <div style="font-size: 0.7rem; color: #94a3b8;">Já creditados em conta</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================================================================== -->
      <!-- COMPOSIÇÃO DO SALDO ("De onde veio meu saldo?") -->
      <!-- ==================================================================== -->
      <div class="card-panel">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Composição do Saldo Financeiro</h2>
            <p class="card-subtitle">Entenda detalhadamente cada elemento que compõe seu saldo disponível. Clique em qualquer linha para abrir a auditoria.</p>
          </div>
          <button class="btn btn-outline-primary btn-sm" onclick="window.app.openBalanceCompositionModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            Entenda a Fórmula
          </button>
        </div>

        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Componente Contábil</th>
                  <th>Conceito / Origem</th>
                  <th style="text-align: right;">Impacto</th>
                  <th style="text-align: right;">Valor</th>
                  <th style="text-align: center;">Ação de Detalhamento</th>
                </tr>
              </thead>
              <tbody>
                <!-- 1. Vendas Brutas -->
                <tr style="cursor: pointer;" onclick="window.app.navigate('vendas')" title="Ver relatório de vendas">
                  <td>
                    <div class="d-flex align-items-center gap-2">
                      <span class="badge bg-primary" style="font-size: 0.7rem;">+ ENTRADA</span>
                      <strong style="color: var(--text-main); font-size: 0.95rem;">Vendas Brutas</strong>
                    </div>
                  </td>
                  <td class="text-muted fs-sm">Total de ingressos transacionados em todos os canais (Web, PDV e App)</td>
                  <td style="text-align: right;" class="text-success fw-bold">(+) Crédito</td>
                  <td style="text-align: right; font-weight: 800; font-size: 1rem; color: var(--text-main);">
                    ${formatCurrency(comp.grossSales)}
                  </td>
                  <td style="text-align: center;">
                    <button class="btn btn-outline-secondary btn-xs" onclick="event.stopPropagation(); window.app.navigate('vendas')">Ver Vendas →</button>
                  </td>
                </tr>

                <!-- 2. Estornos -->
                <tr style="cursor: pointer;" onclick="window.app.navigate('estornos')" title="Ver estornos processados">
                  <td>
                    <div class="d-flex align-items-center gap-2">
                      <span class="badge bg-danger" style="font-size: 0.7rem;">- DEDUÇÃO</span>
                      <strong style="color: var(--text-main); font-size: 0.95rem;">(-) Estornos de Compras</strong>
                    </div>
                  </td>
                  <td class="text-muted fs-sm">Cancelamentos voluntários solicitados por compradores dentro do prazo legal</td>
                  <td style="text-align: right;" class="text-danger fw-bold">(-) Débito</td>
                  <td style="text-align: right; font-weight: 700; font-size: 0.95rem; color: #dc2626;">
                    - ${formatCurrency(comp.refunds)}
                  </td>
                  <td style="text-align: center;">
                    <button class="btn btn-outline-secondary btn-xs" onclick="event.stopPropagation(); window.app.navigate('estornos')">Ver Estornos →</button>
                  </td>
                </tr>

                <!-- 3. Chargebacks -->
                <tr style="cursor: pointer;" onclick="window.app.navigate('estornos')" title="Ver contestações">
                  <td>
                    <div class="d-flex align-items-center gap-2">
                      <span class="badge bg-danger" style="font-size: 0.7rem;">- DEDUÇÃO</span>
                      <strong style="color: var(--text-main); font-size: 0.95rem;">(-) Chargebacks & Contestações</strong>
                    </div>
                  </td>
                  <td class="text-muted fs-sm">Contestações de compra abertas por portadores de cartão junto aos emissores</td>
                  <td style="text-align: right;" class="text-danger fw-bold">(-) Débito</td>
                  <td style="text-align: right; font-weight: 700; font-size: 0.95rem; color: #dc2626;">
                    - ${formatCurrency(comp.chargebacks)}
                  </td>
                  <td style="text-align: center;">
                    <button class="btn btn-outline-secondary btn-xs" onclick="event.stopPropagation(); window.app.navigate('estornos')">Ver Disputas →</button>
                  </td>
                </tr>

                <!-- 4. Taxas Aplicáveis -->
                <tr style="cursor: pointer;" onclick="window.app.navigate('taxas')" title="Ver taxas contratuais">
                  <td>
                    <div class="d-flex align-items-center gap-2">
                      <span class="badge bg-secondary" style="font-size: 0.7rem;">- DEDUÇÃO</span>
                      <strong style="color: var(--text-main); font-size: 0.95rem;">(-) Taxas Contratuais Disk</strong>
                    </div>
                  </td>
                  <td class="text-muted fs-sm">Taxa de serviço e conveniência estipuladas no contrato do produtor</td>
                  <td style="text-align: right;" class="text-danger fw-bold">(-) Débito</td>
                  <td style="text-align: right; font-weight: 700; font-size: 0.95rem; color: #dc2626;">
                    - ${formatCurrency(comp.diskFees)}
                  </td>
                  <td style="text-align: center;">
                    <button class="btn btn-outline-secondary btn-xs" onclick="event.stopPropagation(); window.app.navigate('taxas')">Ver Taxas →</button>
                  </td>
                </tr>

                <!-- Subtotal: Receita Líquida -->
                <tr style="background: #f1f5f9; font-weight: 700; border-top: 1px solid var(--border-color); border-bottom: 2px solid var(--border-color);">
                  <td colspan="2">
                    <div class="d-flex align-items-center gap-2">
                      <span class="badge bg-dark" style="font-size: 0.72rem;">= SUB-TOTAL</span>
                      <span style="font-size: 0.98rem; text-transform: uppercase; letter-spacing: 0.04em;">(=) Receita Líquida Apurada</span>
                    </div>
                  </td>
                  <td style="text-align: right;" class="text-primary fw-bold">(=) Base Líquida</td>
                  <td style="text-align: right; font-size: 1.05rem; font-weight: 800; color: #1e293b;">
                    ${formatCurrency(comp.netRevenue)}
                  </td>
                  <td style="text-align: center;">
                    <span class="badge badge-light fs-xs">Subtotal</span>
                  </td>
                </tr>

                <!-- 5. Repasses Realizados -->
                <tr style="cursor: pointer;" onclick="window.app.navigate('repasses')" title="Ver repasses concluídos">
                  <td>
                    <div class="d-flex align-items-center gap-2">
                      <span class="badge bg-warning text-dark" style="font-size: 0.7rem;">- SAÍDA</span>
                      <strong style="color: var(--text-main); font-size: 0.95rem;">(-) Repasses Já Realizados</strong>
                    </div>
                  </td>
                  <td class="text-muted fs-sm">Valores já transferidos e liquidados na conta bancária do produtor</td>
                  <td style="text-align: right;" class="text-muted fw-bold">(-) Saída Bancária</td>
                  <td style="text-align: right; font-weight: 700; font-size: 0.95rem; color: var(--text-muted);">
                    - ${formatCurrency(comp.payoutsDone)}
                  </td>
                  <td style="text-align: center;">
                    <button class="btn btn-outline-secondary btn-xs" onclick="event.stopPropagation(); window.app.navigate('repasses')">Comprovantes →</button>
                  </td>
                </tr>

                <!-- 6. Reservas de Solicitações em Andamento -->
                <tr style="cursor: pointer;" onclick="window.app.navigate('repasses')" title="Ver repasses em análise">
                  <td>
                    <div class="d-flex align-items-center gap-2">
                      <span class="badge bg-warning text-dark" style="font-size: 0.7rem;">- RETENÇÃO</span>
                      <strong style="color: var(--text-main); font-size: 0.95rem;">(-) Reservado para Repasses em Análise</strong>
                    </div>
                  </td>
                  <td class="text-muted fs-sm">Pedidos de repasse protocolados aguardando análise de risco ou assinatura</td>
                  <td style="text-align: right;" class="text-warning fw-bold">(-) Reserva Transitória</td>
                  <td style="text-align: right; font-weight: 700; font-size: 0.95rem; color: #d97706;">
                    - ${formatCurrency(comp.reservedBalance)}
                  </td>
                  <td style="text-align: center;">
                    <button class="btn btn-outline-secondary btn-xs" onclick="event.stopPropagation(); window.app.navigate('repasses')">Fila Repasses →</button>
                  </td>
                </tr>

                <!-- 7. Retenções Operacionais & Contratuais -->
                <tr style="cursor: pointer;" onclick="window.app.openRetentionsModal('all')" title="Ver detalhamento de retenções">
                  <td>
                    <div class="d-flex align-items-center gap-2">
                      <span class="badge bg-danger" style="font-size: 0.7rem;">- BLOQUEIO</span>
                      <strong style="color: var(--text-main); font-size: 0.95rem;">(-) Retenções Operacionais & Contratuais</strong>
                    </div>
                  </td>
                  <td class="text-muted fs-sm">Reserva operacional pós-evento, estornos em fila e garantia contratual</td>
                  <td style="text-align: right;" class="text-danger fw-bold">(-) Retenção Cautelar</td>
                  <td style="text-align: right; font-weight: 700; font-size: 0.95rem; color: #dc2626;">
                    - ${formatCurrency(comp.retentionsBalance)}
                  </td>
                  <td style="text-align: center;">
                    <button class="btn btn-danger btn-xs" onclick="event.stopPropagation(); window.app.openRetentionsModal('all')">Ver Retenções (4) →</button>
                  </td>
                </tr>

                <!-- Total: Saldo Disponível -->
                <tr style="background: #ecfdf5; font-weight: 800; border-top: 2px solid #10b981; border-bottom: 2px solid #10b981;">
                  <td colspan="2">
                    <div class="d-flex align-items-center gap-2">
                      <span class="badge bg-success" style="font-size: 0.78rem;">= RESULTADO</span>
                      <span style="font-size: 1.05rem; color: #065f46; text-transform: uppercase; letter-spacing: 0.05em;">(=) Saldo Livre Disponível para Repasse</span>
                    </div>
                  </td>
                  <td style="text-align: right;" class="text-success fw-bold">(=) Líquido Elegível</td>
                  <td style="text-align: right; font-size: 1.25rem; font-weight: 900; color: #047857;">
                    ${formatCurrency(comp.availableBalance)}
                  </td>
                  <td style="text-align: center;">
                    <button class="btn btn-success btn-sm" onclick="event.stopPropagation(); window.app.openPayoutModal()">
                      Solicitar Repasse Agora
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ==================================================================== -->
      <!-- TABELA OFICIAL DE SALDOS POR EVENTO (SEGREGAÇÃO PATRIMONIAL) -->
      <!-- ==================================================================== -->
      <div class="card-panel">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Detalhamento Segregado por Evento</h2>
            <p class="card-subtitle">Cada evento possui livro-caixa isolado. Valores transferíveis respeitam as deduções de retenções e reservas.</p>
          </div>
          <div class="filter-controls-group">
            <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500;">${events.length} produções ativas</span>
          </div>
        </div>

        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Evento / Produção</th>
                  <th>Data & Local</th>
                  <th style="text-align: right;">Saldo Total</th>
                  <th style="text-align: right;">Disponível</th>
                  <th style="text-align: right;">Reservado</th>
                  <th style="text-align: right;">Retido</th>
                  <th style="text-align: right;">Transferível</th>
                  <th style="text-align: center;">Ações do Evento</th>
                </tr>
              </thead>
              <tbody>
                ${events.map(evt => {
                  const restrictions = typeof financialStore.getEventRestrictions === 'function'
                    ? financialStore.getEventRestrictions(evt)
                    : { reserved: evt.reservedBalance || 0, retained: evt.retainedBalance || evt.blockedBalance || 0, blocked: evt.blockedBalance || 0 };
                  const retained = restrictions.retained;
                  const reserved = restrictions.reserved;
                  const transferable = typeof financialStore.getTransferableAmount === 'function'
                    ? financialStore.getTransferableAmount(evt)
                    : Math.max(0, (evt.availableBalance || 0) - reserved - retained - restrictions.blocked);

                  return `
                  <tr>
                    <td>
                      <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-main);">${evt.name}</div>
                      <div style="font-size: 0.74rem; color: var(--primary); font-weight: 500;">${evt.category} • ID: <code>${evt.id}</code></div>
                    </td>
                    <td>
                      <div style="font-size: 0.82rem; font-weight: 600;">${evt.date}</div>
                      <div style="font-size: 0.73rem; color: var(--text-muted);">${evt.venue}</div>
                    </td>
                    <td style="text-align: right; font-weight: 700; font-size: 0.95rem;">
                      ${formatCurrency(evt.totalBalance)}
                    </td>
                    <td style="text-align: right; font-weight: 800; font-size: 0.95rem; color: #059669;">
                      ${formatCurrency(evt.availableBalance)}
                    </td>
                    <td style="text-align: right; font-weight: 700; font-size: 0.9rem; color: ${reserved > 0 ? '#d97706' : '#94a3b8'};">
                      ${formatCurrency(reserved)}
                    </td>
                    <td style="text-align: right; font-weight: 700; font-size: 0.9rem; color: ${retained > 0 ? '#dc2626' : '#94a3b8'};">
                      ${formatCurrency(retained)}
                    </td>
                    <td style="text-align: right; font-weight: 800; font-size: 0.95rem; color: #2563eb; background: #eff6ff;">
                      ${formatCurrency(transferable)}
                    </td>
                    <td style="text-align: center;">
                      <div style="display: inline-flex; gap: 6px;">
                        <button class="btn btn-outline-primary btn-xs" onclick="window.app.openPayoutModal('${evt.id}')" title="Solicitar Repasse deste Evento">
                          Solicitar Repasse
                        </button>
                        <button class="btn btn-outline-secondary btn-xs" onclick="window.app.openTransferBetweenEventsModal('${evt.id}')" title="Transferir saldo para outro evento">
                          Transferir
                        </button>
                        <button class="btn btn-light btn-xs" onclick="window.app.openRetentionsModal('${evt.id}')" title="Ver retenções deste evento">
                          Retenções
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ==================================================================== -->
      <!-- HISTÓRICO DE TRANSFERÊNCIAS ENTRE EVENTOS (LEDGER AUDITÁVEL) -->
      <!-- ==================================================================== -->
      <div class="card-panel">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Transferências entre Eventos Realizadas</h2>
            <p class="card-subtitle">Movimentações entre subcontas com partidas dobradas no Ledger da Disk Ingressos</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="window.app.openTransferBetweenEventsModal()">
            + Nova Transferência
          </button>
        </div>

        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Protocolo</th>
                  <th>Data/Hora</th>
                  <th>Evento Origem (Débito)</th>
                  <th>Evento Destino (Crédito)</th>
                  <th>Motivo Operacional</th>
                  <th style="text-align: right;">Valor Movimentado</th>
                  <th style="text-align: center;">Situação</th>
                </tr>
              </thead>
              <tbody>
                ${transfers.length === 0 ? `
                  <tr><td colspan="7" class="text-center text-muted p-4">Nenhuma transferência interna realizada até o momento.</td></tr>
                ` : transfers.map(t => `
                  <tr>
                    <td><code><strong>${t.id}</strong></code></td>
                    <td class="text-muted fs-sm">${t.timestamp}</td>
                    <td>
                      <span class="badge bg-danger fs-xxs">Origem -</span>
                      <strong class="ms-1">${t.fromEventName}</strong>
                    </td>
                    <td>
                      <span class="badge bg-success fs-xxs">Destino +</span>
                      <strong class="ms-1">${t.toEventName}</strong>
                    </td>
                    <td class="text-muted fs-sm">${t.reason}</td>
                    <td style="text-align: right; font-weight: 800; font-size: 0.95rem; color: #2563eb;">
                      ${formatCurrency(t.amount)}
                    </td>
                    <td style="text-align: center;">
                      <span class="badge badge-success">${t.status}</span>
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
