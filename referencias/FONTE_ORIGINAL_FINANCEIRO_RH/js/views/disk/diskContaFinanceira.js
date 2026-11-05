/**
 * Conta Financeira de Controle Interno do Produtor por CNPJ (Pacote 24 / V0.3 - Financeiro Disk)
 * Regra Arquitetural Obrigatória:
 *  - O ambiente e a gestão de reservas, retenções, agenda de obrigações, créditos e estornos
 *    são de USO EXCLUSIVO DO FINANCEIRO DISK.
 *  - O Produtor NÃO enxerga retenções internas, reservas preventivas ou critérios de risco;
 *    visualiza apenas seu financeiro operacional líquido.
 *  - Estornos operam com reserva imediata de saldo e DUPLA AUTORIZAÇÃO ESTRITA (SoD).
 *  - Invariante Contábil: Saldo anterior + créditos − débitos = saldo atual.
 */

import { formatCurrency } from '../../formatters.js';
import { financialStore } from '../../state.js';

export function renderDiskContaFinanceira(state, filterArg = 'conta') {
  const selectedProducerId = state.selectedProducerId && state.selectedProducerId !== 'all'
    ? state.selectedProducerId
    : 'prod-abc';

  const accountData = financialStore.getProducerFinancialAccount(selectedProducerId);
  const producer = accountData.producer;
  const summary = accountData.summary;
  const events = accountData.events;
  const credits = accountData.credits || [];
  const obligations = accountData.obligations || [];
  const refunds = accountData.refunds || [];
  const ledger = accountData.ledger || [];

  const producers = state.data.producers || [];
  const currentUser = state.currentUser || { name: 'Operador Disk', id: 'usr-disk-01' };

  return `
    <!-- Header Limitless: Identificação de Ambiente Exclusivo Disk -->
    <div class="limitless-page-header" style="background: #0f172a; color: white; border-bottom: 2px solid #3b82f6; padding: 22px 28px; border-radius: 8px; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <span style="background: #2563eb; color: white; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 4px; letter-spacing: 0.5px;">
              CONTA FINANCEIRA DE CONTROLE INTERNO · LEDGER CENTRAL
            </span>
            <span style="background: #dc2626; color: white; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 4px; letter-spacing: 0.5px;">
              🔒 USO EXCLUSIVO FINANCEIRO DISK · INVISÍVEL AO PRODUTOR
            </span>
          </div>
          <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
            ${producer.name}
          </h1>
          <p style="margin: 6px 0 0; color: #94a3b8; font-size: 13px;">
            CNPJ: <strong style="color: #60a5fa;">${producer.cnpj || '14.829.301/0001-92'}</strong> · 
            Gestor Comercial: <span style="color: #e2e8f0;">${producer.accountManager || 'Karine Mendes (Disk Ingressos)'}</span> · 
            Classificação: <span style="color: #34d399; font-weight: 700;">${producer.rating || 'Tier A - Premium'}</span> ·
            Operador Conectado: <span style="color: #cbd5e1; font-weight: 600;">${currentUser.name}</span>
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="text-align: right;">
            <label style="display: block; font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom: 4px;">
              Alternar Produtor (CNPJ):
            </label>
            <select
              style="background: #1e293b; color: white; border: 1px solid #475569; padding: 8px 12px; border-radius: 6px; font-size: 13px; font-weight: 600;"
              onchange="window.app.onSelectProducer(this.value); window.app.navigate('diskContaFinanceira');"
            >
              ${producers.map(p => `
                <option value="${p.id}" ${p.id === selectedProducerId ? 'selected' : ''}>
                  ${p.name} (${p.cnpj || p.id})
                </option>
              `).join('')}
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Os 5 Blocos do Saldo Consolidado por CNPJ -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 24px;">
      <!-- Card 1: Saldo Consolidado -->
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">
          Saldo Consolidado
        </span>
        <div style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 6px 0;">
          ${formatCurrency(summary.consolidatedBalance)}
        </div>
        <small style="color: #64748b; font-size: 11px;">
          Receita líquida total apurada
        </small>
      </div>

      <!-- Card 2: Disponível para Repasse -->
      <div style="background: #f8faff; border: 1px solid #3b82f6; border-radius: 10px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <span style="font-size: 11px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px;">
          Disponível p/ Repasse
        </span>
        <div style="font-size: 22px; font-weight: 800; color: #1d4ed8; margin: 6px 0;">
          ${formatCurrency(summary.availableForRepasse)}
        </div>
        <small style="color: #2563eb; font-size: 11px;">
          Livre após obrigações, estornos e travas
        </small>
      </div>

      <!-- Card 3: A Liberar (Futuro) -->
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">
          A Liberar (Futuro)
        </span>
        <div style="font-size: 22px; font-weight: 800; color: #d97706; margin: 6px 0;">
          ${formatCurrency(summary.futurePending)}
        </div>
        <small style="color: #b45309; font-size: 11px;">
          Vendas abaixo de 50% ou excedentes
        </small>
      </div>

      <!-- Card 4: Reservas e Retenções Internas -->
      <div style="background: #fff5f5; border: 1px solid #fecaca; border-radius: 10px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <span style="font-size: 11px; font-weight: 700; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.5px;">
          Reservas &amp; Retenções
        </span>
        <div style="font-size: 22px; font-weight: 800; color: #dc2626; margin: 6px 0;">
          ${formatCurrency((summary.blocked || 0) + (summary.retained || 0))}
        </div>
        <small style="color: #991b1b; font-size: 11px;">
          Obrigações: ${formatCurrency(summary.obligationsReserved || 0)} · Estornos: ${formatCurrency(summary.pendingRefundsHold || 0)}
        </small>
      </div>

      <!-- Card 5: Créditos em Aberto -->
      <div style="background: #faf5ff; border: 1px solid #ddd6fe; border-radius: 10px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <span style="font-size: 11px; font-weight: 700; color: #6d28d9; text-transform: uppercase; letter-spacing: 0.5px;">
          Créditos em Aberto
        </span>
        <div style="font-size: 22px; font-weight: 800; color: #7c3aed; margin: 6px 0;">
          ${formatCurrency(summary.outstandingCredits)}
        </div>
        <small style="color: #5b21b6; font-size: 11px;">
          Saldo devedor total em amortização
        </small>
      </div>
    </div>

    <!-- Sub-Navegação dos 6 Domínios Operacionais V0.4 -->
    <div style="display: flex; gap: 8px; margin-bottom: 22px; flex-wrap: wrap;">
      <a href="#sec-conta" style="background: #2563eb; color: white; padding: 7px 14px; border-radius: 20px; font-weight: 700; font-size: 12px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
        📊 1. Conta Interna
      </a>
      <a href="#sec-retencoes" style="background: white; border: 1px solid #cbd5e1; color: #334155; padding: 7px 14px; border-radius: 20px; font-weight: 700; font-size: 12px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
        🔒 2. Reservas e Retenções
      </a>
      <a href="#sec-obrigacoes" style="background: white; border: 1px solid #cbd5e1; color: #334155; padding: 7px 14px; border-radius: 20px; font-weight: 700; font-size: 12px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
        📋 3. Agenda de Obrigações
      </a>
      <a href="#sec-creditos" style="background: white; border: 1px solid #cbd5e1; color: #334155; padding: 7px 14px; border-radius: 20px; font-weight: 700; font-size: 12px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
        💳 4. Créditos / Antecipações
      </a>
      <a href="#sec-estornos" style="background: white; border: 1px solid #cbd5e1; color: #334155; padding: 7px 14px; border-radius: 20px; font-weight: 700; font-size: 12px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
        🛡️ 5. Fila de Estornos (SoD)
      </a>
      <a href="#sec-ledger" style="background: white; border: 1px solid #cbd5e1; color: #334155; padding: 7px 14px; border-radius: 20px; font-weight: 700; font-size: 12px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
        📖 6. Ledger Imutável
      </a>
    </div>

    <!-- Seção 1: Detalhamento por Evento -->
    <div id="sec-conta" style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 22px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <div>
          <h2 style="margin: 0 0 4px; font-size: 17px; font-weight: 800; color: #0f172a;">
            Saldos e Elegibilidade Individual por Evento
          </h2>
          <p style="margin: 0; font-size: 13px; color: #64748b;">
            Base de cálculo livre desconta obrigações reservadas e estornos em andamento antes do motor de 50% → 20%.
          </p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button
            class="btn-primary"
            style="background: #0f172a; color: white; border: 0; padding: 8px 14px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer;"
            onclick="window.app.openAccountBlockModal('${selectedProducerId}');"
          >
            🔒 Novo Bloqueio Cautelar
          </button>
          <button
            class="btn-primary"
            style="background: #2563eb; color: white; border: 0; padding: 8px 14px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer;"
            onclick="window.app.openGrantCreditModal('${selectedProducerId}');"
          >
            💳 Conceder Crédito / Antecipação
          </button>
        </div>
      </div>

      <div style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-size: 10px; color: #475569; letter-spacing: 0.5px;">
              <th style="padding: 12px 14px;">Evento</th>
              <th style="padding: 12px 14px;">Meta de Vendas</th>
              <th style="padding: 12px 14px;">Vendas Apuradas</th>
              <th style="padding: 12px 14px;">Progresso Meta</th>
              <th style="padding: 12px 14px;">Obrigações Reservadas</th>
              <th style="padding: 12px 14px;">Reserva de Estornos</th>
              <th style="padding: 12px 14px;">Dívida Crédito</th>
              <th style="padding: 12px 14px;">Disponível p/ Repasse</th>
              <th style="padding: 12px 14px;">Status</th>
              <th style="padding: 12px 14px;">Ações da Mesa</th>
            </tr>
          </thead>
          <tbody>
            ${events.map(ev => {
              const elig = ev.eligibility || {};
              const progress = elig.progressPercent || 0;
              const ruleMet = elig.ruleMet || elig.isExceptional;

              return `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 12px 14px;">
                    <strong style="color: #0f172a;">${ev.name}</strong>
                    <br /><small style="color: #64748b;">${ev.id}</small>
                  </td>
                  <td style="padding: 12px 14px;">${formatCurrency(ev.salesTarget || 1000000)}</td>
                  <td style="padding: 12px 14px;"><strong style="color: #0f172a;">${formatCurrency(ev.grossSales || 0)}</strong></td>
                  <td style="padding: 12px 14px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div style="width: 70px; height: 7px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                        <div style="width: ${Math.min(progress, 100)}%; height: 100%; background: ${progress >= 50 ? '#10b981' : '#f59e0b'};"></div>
                      </div>
                      <span style="font-size: 11px; font-weight: 700; color: ${progress >= 50 ? '#059669' : '#b45309'};">${progress.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td style="padding: 12px 14px;">
                    <strong style="color: ${Number(elig.obligationsHold || 0) > 0 ? '#b45309' : '#64748b'};">
                      ${formatCurrency(elig.obligationsHold || 0)}
                    </strong>
                  </td>
                  <td style="padding: 12px 14px;">
                    <strong style="color: ${Number(elig.refundsHold || 0) > 0 ? '#dc2626' : '#64748b'};">
                      ${formatCurrency(elig.refundsHold || 0)}
                    </strong>
                  </td>
                  <td style="padding: 12px 14px;">
                    <strong style="color: ${Number(ev.outstandingDebt || 0) > 0 ? '#7c3aed' : '#64748b'};">
                      ${formatCurrency(ev.outstandingDebt || 0)}
                    </strong>
                  </td>
                  <td style="padding: 12px 14px;">
                    <strong style="color: #2563eb; font-size: 14px;">
                      ${formatCurrency(elig.disponivelFinal || 0)}
                    </strong>
                  </td>
                  <td style="padding: 12px 14px;">
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; ${
                      ruleMet ? 'background: #dcfce7; color: #15803d;' : 'background: #fef3c7; color: #b45309;'
                    }">
                      ${ruleMet ? '✓ Habilitado' : 'Bloqueado (< 50%)'}
                    </span>
                  </td>
                  <td style="padding: 12px 14px;">
                    <div style="display: flex; gap: 6px;">
                      <button
                        class="btn-sm"
                        style="background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; padding: 5px 10px; border-radius: 6px; font-weight: 700; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;"
                        onclick="window.app.openEventMovementModal('${ev.id}');"
                        title="Ver toda a movimentação deste evento"
                      >
                        🔍 Movimentação
                      </button>
                      <button
                        class="btn-sm"
                        style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; padding: 5px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; cursor: pointer;"
                        onclick="window.app.handleRegisterRevenue('${ev.id}');"
                        title="Registrar novas vendas / receita de bilheteria e disparar amortizações automáticas"
                      >
                        + Receita
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

    <!-- Seção 2: Agenda de Obrigações do Evento (Reservas Preventivas para Aluguel, ECAD, etc.) -->
    <div id="sec-obrigacoes" style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 22px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <h2 style="margin: 0; font-size: 17px; font-weight: 800; color: #0f172a;">
              Agenda de Obrigações do Evento &amp; Reservas Preventivas
            </h2>
            <span style="background: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">
              Exclusivo Disk
            </span>
          </div>
          <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">
            Obrigações contratuais (aluguel de espaço, ECAD, fornecedores) reservam saldo imediatamente e não são divulgadas ao produtor.
          </p>
        </div>
        <button
          class="btn-primary"
          style="background: #0284c7; color: white; border: 0; padding: 8px 14px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer;"
          onclick="window.app.openNewObligationModal('${selectedProducerId}');"
        >
          + Nova Obrigação / Reserva
        </button>
      </div>

      <div style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-size: 10px; color: #475569; letter-spacing: 0.5px;">
              <th style="padding: 12px 14px;">Categoria / ID</th>
              <th style="padding: 12px 14px;">Evento Vinculado</th>
              <th style="padding: 12px 14px;">Descrição da Obrigação</th>
              <th style="padding: 12px 14px;">Beneficiário / Credor</th>
              <th style="padding: 12px 14px;">Vencimento Previsto</th>
              <th style="padding: 12px 14px;">Valor Reservado</th>
              <th style="padding: 12px 14px;">Status</th>
              <th style="padding: 12px 14px;">Ações da Mesa</th>
            </tr>
          </thead>
          <tbody>
            ${obligations.length === 0 ? `
              <tr>
                <td colspan="8" style="padding: 24px; text-align: center; color: #64748b;">
                  Nenhuma obrigação registrada para os eventos deste produtor.
                </td>
              </tr>
            ` : obligations.map(ob => {
              const statusBadges = {
                'PREVISTO': 'background: #e2e8f0; color: #475569;',
                'RESERVADO': 'background: #fef3c7; color: #b45309;',
                'RETIDO': 'background: #fee2e2; color: #b91c1c;',
                'LIQUIDADO': 'background: #dcfce7; color: #15803d;'
              };

              return `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 12px 14px;">
                    <span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">
                      ${ob.category || 'OUTROS'}
                    </span>
                    <br /><small style="color: #64748b;">${ob.id}</small>
                  </td>
                  <td style="padding: 12px 14px;"><strong style="color: #0f172a;">${ob.eventName || ob.eventId}</strong></td>
                  <td style="padding: 12px 14px;">
                    <strong>${ob.description}</strong>
                    ${ob.documentRef ? `<br /><small style="color: #2563eb;">📄 ${ob.documentRef}</small>` : ''}
                  </td>
                  <td style="padding: 12px 14px;"><span style="color: #334155; font-weight: 600;">${ob.beneficiary}</span></td>
                  <td style="padding: 12px 14px;"><span style="color: #64748b;">${ob.dueDate || 'Não definida'}</span></td>
                  <td style="padding: 12px 14px;">
                    <strong style="color: #0f172a; font-size: 14px;">
                      ${formatCurrency(ob.value)}
                    </strong>
                  </td>
                  <td style="padding: 12px 14px;">
                    <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; ${statusBadges[ob.status] || 'background: #e2e8f0;'}">
                      ${ob.status}
                    </span>
                  </td>
                  <td style="padding: 12px 14px;">
                    ${ob.status === 'RESERVADO' ? `
                      <button
                        style="background: white; border: 1px solid #cbd5e1; padding: 5px 9px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; color: #b91c1c; margin-right: 4px;"
                        onclick="window.app.handleUpdateObligationStatus('${ob.id}', 'RETIDO');"
                      >
                        Reter Formalmente
                      </button>
                      <button
                        style="background: #059669; border: 0; color: white; padding: 5px 9px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;"
                        onclick="window.app.handleUpdateObligationStatus('${ob.id}', 'LIQUIDADO');"
                      >
                        ✓ Liquidar / Pagar
                      </button>
                    ` : (ob.status === 'RETIDO' ? `
                      <button
                        style="background: #059669; border: 0; color: white; padding: 5px 9px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;"
                        onclick="window.app.handleUpdateObligationStatus('${ob.id}', 'LIQUIDADO');"
                      >
                        ✓ Liquidar / Pagar
                      </button>
                    ` : `
                      <span style="color: #059669; font-size: 11px; font-weight: 700;">✓ Pago / Liquidado</span>
                    `)}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Seção 3: Fila de Estornos com Reserva Imediata e Dupla Autorização Estrita (SoD) -->
    <div id="sec-estornos" style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 22px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <h2 style="margin: 0; font-size: 17px; font-weight: 800; color: #0f172a;">
              Fila Interna de Estornos (Dupla Autorização Estrita &amp; Reserva Imediata)
            </h2>
            <span style="background: #fee2e2; color: #991b1b; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">
              SoD Ativo
            </span>
          </div>
          <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">
            Ao abrir o estorno, o valor é <strong>imediatamente reservado</strong>, deduzindo da base de repasse. Efetivação exige <strong>duas aprovações de operadores distintos</strong>.
          </p>
        </div>
        <button
          class="btn-primary"
          style="background: #dc2626; color: white; border: 0; padding: 8px 14px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer;"
          onclick="window.app.openInternalRefundModal('${selectedProducerId}');"
        >
          ↩️ Abrir Estorno c/ Reserva Imediata
        </button>
      </div>

      <div style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-size: 10px; color: #475569; letter-spacing: 0.5px;">
              <th style="padding: 12px 14px;">Protocolo / Pedido</th>
              <th style="padding: 12px 14px;">Evento Vinculado</th>
              <th style="padding: 12px 14px;">Valor Solicitado</th>
              <th style="padding: 12px 14px;">Justificativa Operacional</th>
              <th style="padding: 12px 14px;">Autorizações (SoD)</th>
              <th style="padding: 12px 14px;">Status da Esteira</th>
              <th style="padding: 12px 14px;">Ações da Mesa</th>
            </tr>
          </thead>
          <tbody>
            ${refunds.length === 0 ? `
              <tr>
                <td colspan="7" style="padding: 24px; text-align: center; color: #64748b;">
                  Nenhum estorno interno pendente para este produtor.
                </td>
              </tr>
            ` : refunds.map(r => {
              const approvalsCount = (r.approvals || []).length;
              const hasFirstAuth = approvalsCount >= 1;
              const hasSecondAuth = approvalsCount >= 2;
              const alreadyApprovedByCurrent = (r.approvals || []).some(a => a.userId === currentUser.id || a.userName === currentUser.name);

              return `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 12px 14px;">
                    <strong style="color: #0f172a;">${r.id}</strong>
                    <br /><small style="color: #2563eb; font-weight: 600;">Pedido: ${r.orderId}</small>
                  </td>
                  <td style="padding: 12px 14px;"><strong style="color: #0f172a;">${r.eventName || r.eventId}</strong></td>
                  <td style="padding: 12px 14px;">
                    <strong style="color: #dc2626; font-size: 14px;">${formatCurrency(r.value)}</strong>
                    <br /><span style="background: #fee2e2; color: #991b1b; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;">Saldo Reservado</span>
                  </td>
                  <td style="padding: 12px 14px;">
                    <span style="color: #334155; font-size: 12px;">${r.reason}</span>
                  </td>
                  <td style="padding: 12px 14px;">
                    <div style="font-size: 11px;">
                      <div style="margin-bottom: 2px;">
                        ${hasFirstAuth ? `
                          <span style="color: #059669; font-weight: 700;">✓ 1ª Aut: ${r.approvals[0].userName}</span>
                        ` : `
                          <span style="color: #94a3b8;">○ 1ª Aut: Pendente</span>
                        `}
                      </div>
                      <div>
                        ${hasSecondAuth ? `
                          <span style="color: #059669; font-weight: 700;">✓ 2ª Aut: ${r.approvals[1].userName}</span>
                        ` : `
                          <span style="color: #94a3b8;">○ 2ª Aut: Pendente (Requer outro usuário)</span>
                        `}
                      </div>
                    </div>
                  </td>
                  <td style="padding: 12px 14px;">
                    <span style="display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; ${
                      r.status === 'EFETIVADO' ? 'background: #dcfce7; color: #15803d;' :
                      r.status === 'AUTORIZADO_PARA_EFETIVAR' ? 'background: #e0e7ff; color: #3730a3;' :
                      r.status === 'AGUARDANDO_SEGUNDA_AUTORIZACAO' ? 'background: #fef3c7; color: #b45309;' :
                      r.status === 'CANCELADO' || r.status === 'REJEITADO' ? 'background: #f1f5f9; color: #64748b;' :
                      'background: #fee2e2; color: #b91c1c;'
                    }">
                      ${r.status.replaceAll('_', ' ')}
                    </span>
                  </td>
                  <td style="padding: 12px 14px;">
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                      ${!hasFirstAuth && r.status !== 'CANCELADO' && r.status !== 'REJEITADO' ? `
                        <button
                          style="background: #2563eb; color: white; border: 0; padding: 5px 9px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;"
                          onclick="window.app.handleAuthorizeRefund('${r.id}');"
                        >
                          Dar 1ª Autorização
                        </button>
                      ` : ''}

                      ${hasFirstAuth && !hasSecondAuth && r.status !== 'CANCELADO' && r.status !== 'REJEITADO' ? `
                        ${alreadyApprovedByCurrent ? `
                          <button
                            disabled
                            style="background: #e2e8f0; color: #94a3b8; border: 0; padding: 5px 9px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: not-allowed;"
                            title="Segregação de Funções: O mesmo usuário não pode autorizar duas vezes."
                          >
                            🔒 Bloqueado (SoD)
                          </button>
                        ` : `
                          <button
                            style="background: #7c3aed; color: white; border: 0; padding: 5px 9px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;"
                            onclick="window.app.handleAuthorizeRefund('${r.id}');"
                          >
                            Dar 2ª Autorização (MFA)
                          </button>
                        `}
                      ` : ''}

                      ${r.status === 'AUTORIZADO_PARA_EFETIVAR' ? `
                        <button
                          style="background: #059669; color: white; border: 0; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;"
                          onclick="window.app.handleExecuteRefund('${r.id}');"
                        >
                          ⚡ Efetivar no Gateway
                        </button>
                      ` : ''}

                      ${r.status !== 'EFETIVADO' && r.status !== 'CANCELADO' && r.status !== 'REJEITADO' ? `
                        <button
                          style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;"
                          onclick="window.app.handleRejectRefund('${r.id}');"
                          title="Rejeitar estorno e liberar reserva imediatamente"
                        >
                          ✕ Rejeitar
                        </button>
                        <button
                          style="background: white; border: 1px solid #cbd5e1; color: #64748b; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;"
                          onclick="window.app.handleCancelRefund('${r.id}');"
                        >
                          Cancelar
                        </button>
                      ` : ''}

                      ${r.status === 'EFETIVADO' ? `
                        <span style="color: #059669; font-weight: 700; font-size: 11px;">✓ Liquidado</span>
                      ` : ''}

                      ${r.status === 'REJEITADO' ? `
                        <span style="color: #64748b; font-weight: 700; font-size: 11px;">✕ Rejeitado</span>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Seção 4: Créditos e Antecipações Contratadas -->
    <div id="sec-creditos" style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 22px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <div>
          <h2 style="margin: 0 0 4px; font-size: 17px; font-weight: 800; color: #0f172a;">
            Contratos de Crédito e Antecipações Ativas
          </h2>
          <p style="margin: 0; font-size: 13px; color: #64748b;">
            Capital disponibilizado ao produtor com juros contratados e modelos de amortização programada ou retenção de bilheteria.
          </p>
        </div>
        <button
          class="btn-primary"
          style="background: #7c3aed; color: white; border: 0; padding: 8px 14px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer;"
          onclick="window.app.openGrantCreditModal('${selectedProducerId}');"
        >
          + Novo Contrato de Crédito
        </button>
      </div>

      <div style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-size: 10px; color: #475569; letter-spacing: 0.5px;">
              <th style="padding: 12px 14px;">Protocolo / Data</th>
              <th style="padding: 12px 14px;">Evento Vinculado</th>
              <th style="padding: 12px 14px;">Principal Concedido</th>
              <th style="padding: 12px 14px;">Taxa de Juros</th>
              <th style="padding: 12px 14px;">Total da Dívida</th>
              <th style="padding: 12px 14px;">Saldo Devedor Atual</th>
              <th style="padding: 12px 14px;">Forma de Amortização</th>
              <th style="padding: 12px 14px;">Status</th>
              <th style="padding: 12px 14px;">Ações da Mesa</th>
            </tr>
          </thead>
          <tbody>
            ${credits.length === 0 ? `
              <tr>
                <td colspan="9" style="padding: 24px; text-align: center; color: #64748b;">
                  Nenhum contrato de crédito ativo para este produtor.
                </td>
              </tr>
            ` : credits.map(c => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px 14px;">
                  <strong style="color: #0f172a;">${c.protocol}</strong>
                  <br /><small style="color: #64748b;">${new Date(c.grantedAt).toLocaleDateString('pt-BR')}</small>
                </td>
                <td style="padding: 12px 14px;"><strong style="color: #0f172a;">${c.eventName}</strong></td>
                <td style="padding: 12px 14px;">${formatCurrency(c.principal)}</td>
                <td style="padding: 12px 14px;">
                  <span style="background: #ede9fe; color: #6d28d9; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">
                    ${c.interestRate}% a.m.
                  </span>
                </td>
                <td style="padding: 12px 14px;"><strong>${formatCurrency(c.totalDebt)}</strong></td>
                <td style="padding: 12px 14px;">
                  <strong style="color: ${c.outstandingDebt > 0 ? '#dc2626' : '#059669'}; font-size: 14px;">
                    ${formatCurrency(c.outstandingDebt)}
                  </strong>
                </td>
                <td style="padding: 12px 14px;">
                  <span style="font-size: 12px; font-weight: 600; color: #334155;">
                    ${c.amortizationModel === 'PARCELAS_FIXAS' ? `${c.installmentsCount}x de ${formatCurrency(c.installmentValue)}` : ''}
                    ${c.amortizationModel === 'PERCENTUAL_RECEBIVEIS' ? `${c.receivablePercent}% das vendas líquidas` : ''}
                    ${c.amortizationModel === 'FECHAMENTO_EVENTO' ? 'No encerramento do evento' : ''}
                  </span>
                </td>
                <td style="padding: 12px 14px;">
                  <span style="padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; ${
                    c.status === 'ATIVO' ? 'background: #fef3c7; color: #b45309;' :
                    c.status === 'EM_ATRASO' ? 'background: #fee2e2; color: #b91c1c;' :
                    'background: #dcfce7; color: #15803d;'
                  }">
                    ${c.status === 'EM_ATRASO' ? '⚠️ EM ATRASO' : c.status}
                  </span>
                  ${Array.isArray(c.schedule) && c.schedule.length > 0 ? `
                    <br /><small style="color: #64748b; font-size: 10px;">
                      ${c.schedule.filter(s => s.status === 'PAGO').length}/${c.schedule.length} pagas
                    </small>
                  ` : ''}
                </td>
                <td style="padding: 12px 14px;">
                  ${c.status === 'ATIVO' || c.status === 'EM_ATRASO' ? `
                    <button
                      style="background: white; border: 1px solid #cbd5e1; padding: 5px 9px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; color: #334155;"
                      onclick="window.app.handleAmortizeCredit('${c.id}');"
                    >
                      Abater Parcela
                    </button>
                  ` : `
                    <span style="color: #059669; font-size: 11px; font-weight: 700;">✓ Quitado</span>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Seção 5: Travas Cautelares, Bloqueios e Retenções -->
    <div id="sec-retencoes" style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 22px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <div>
          <h2 style="margin: 0 0 4px; font-size: 17px; font-weight: 800; color: #0f172a;">
            Gestão de Bloqueios e Retenções Administrativas
          </h2>
          <p style="margin: 0; font-size: 13px; color: #64748b;">
            Toda retenção é auditada, vinculada ao evento e exige justificativa formal. Nenhuma edição arbitrária de saldo é permitida.
          </p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px;">
        ${events.map(ev => {
          const hasBlock = (Number(ev.blockedBalance || 0) + Number(ev.retainedBalance || 0)) > 0;
          const blockedVal = Number(ev.blockedBalance || 0) + Number(ev.retainedBalance || 0);

          return `
            <div style="border: 1px solid ${hasBlock ? '#fecaca' : '#e2e8f0'}; background: ${hasBlock ? '#fffaf0' : '#f8fafc'}; border-radius: 8px; padding: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong style="color: #0f172a; font-size: 14px;">${ev.name}</strong>
                <span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; ${hasBlock ? 'background: #fee2e2; color: #b91c1c;' : 'background: #dcfce7; color: #15803d;'}">
                  ${hasBlock ? 'Bloqueio Ativo' : 'Regular'}
                </span>
              </div>
              <div style="font-size: 20px; font-weight: 800; color: ${hasBlock ? '#dc2626' : '#64748b'}; margin-bottom: 6px;">
                ${formatCurrency(blockedVal)}
              </div>
              <p style="font-size: 12px; color: #64748b; margin: 0 0 12px;">
                Disponível no evento: <strong>${formatCurrency(ev.availableBalance || 0)}</strong>
              </p>
              <div style="display: flex; gap: 8px;">
                <button
                  style="flex: 1; background: #fee2e2; border: 1px solid #fca5a5; color: #dc2626; padding: 7px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;"
                  onclick="window.app.openAccountBlockModal('${selectedProducerId}', '${ev.id}');"
                >
                  + Travar Saldo
                </button>
                ${hasBlock ? `
                  <button
                    style="flex: 1; background: #059669; border: 0; color: white; padding: 7px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;"
                    onclick="window.app.handleReleaseAccountBalance('${selectedProducerId}', '${ev.id}', ${blockedVal});"
                  >
                    🔓 Liberar Saldo
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Seção 6: Extrato do Ledger Imutável da Conta Financeira -->
    <div id="sec-ledger" style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 22px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <div>
          <h2 style="margin: 0 0 4px; font-size: 17px; font-weight: 800; color: #0f172a;">
            Extrato Contábil Imutável do Ledger (Partidas Dobradas)
          </h2>
          <p style="margin: 0; font-size: 13px; color: #64748b;">
            Histórico cronológico de lançamentos vinculados aos eventos deste produtor. Invariante: saldo anterior + créditos - débitos = saldo atual.
          </p>
        </div>
      </div>

      <div style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-size: 10px; color: #475569; letter-spacing: 0.5px;">
              <th style="padding: 12px 14px;">Data / ID</th>
              <th style="padding: 12px 14px;">Evento Vinculado</th>
              <th style="padding: 12px 14px;">Tipo de Lançamento</th>
              <th style="padding: 12px 14px;">Valor</th>
              <th style="padding: 12px 14px;">Saldo Após Lançamento</th>
              <th style="padding: 12px 14px;">Responsável (Actor)</th>
              <th style="padding: 12px 14px;">Justificativa / Objeto</th>
            </tr>
          </thead>
          <tbody>
            ${ledger.length === 0 ? `
              <tr>
                <td colspan="7" style="padding: 24px; text-align: center; color: #64748b;">
                  Nenhum lançamento no ledger para este produtor.
                </td>
              </tr>
            ` : ledger.map(l => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px 14px;">
                  <strong style="color: #0f172a;">${l.id}</strong>
                  <br /><small style="color: #64748b;">${new Date(l.createdAt || Date.now()).toLocaleString('pt-BR')}</small>
                </td>
                <td style="padding: 12px 14px;"><strong style="color: #0f172a;">${l.eventName || l.eventId}</strong></td>
                <td style="padding: 12px 14px;">
                  <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; ${
                    (l.type || '').includes('CREDITO') ? 'background: #ede9fe; color: #6d28d9;' :
                    (l.type || '').includes('AMORTIZACAO') ? 'background: #dcfce7; color: #15803d;' :
                    (l.type || '').includes('RETENCAO') || (l.type || '').includes('BLOQUEIO') || (l.type || '').includes('ESTORNO') ? 'background: #fee2e2; color: #b91c1c;' :
                    'background: #eff6ff; color: #1d4ed8;'
                  }">
                    ${(l.type || '').replace(/_/g, ' ')}
                  </span>
                </td>
                <td style="padding: 12px 14px;"><strong style="color: #0f172a;">${formatCurrency(l.value || 0)}</strong></td>
                <td style="padding: 12px 14px;"><strong style="color: #2563eb;">${formatCurrency(l.balanceAfter || 0)}</strong></td>
                <td style="padding: 12px 14px;"><span style="font-size: 11px; font-weight: 600; color: #334155;">${l.actor || 'Sistema'}</span></td>
                <td style="padding: 12px 14px;">
                  <span style="font-size: 12px; color: #334155;">${l.reason || ''}</span>
                  ${l.beneficiary ? `<br /><small style="color: #6366f1; font-weight: 600;">Favorecido: ${l.beneficiary}</small>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
