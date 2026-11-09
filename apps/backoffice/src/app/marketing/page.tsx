'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BravoApiClient } from '@bravo-ii/sdk';
import type { CouponCampaignDto, EventSummaryViewDto } from '@bravo-ii/contracts';
import { ActionPanel, KpiCard, OperationalEmptyState, WorkspaceHeader } from '@bravo-ii/ui';
import { useBravoSession } from '../../context/session-context';

export default function MarketingPage() {
  const { actor, sessionToken, isAuthenticated, hasPermission } = useBravoSession();
  const canRead = hasPermission('marketing:read');

  const client = useMemo(
    () => new BravoApiClient({ sessionToken: sessionToken ?? undefined }),
    [sessionToken]
  );

  const [events, setEvents] = useState<EventSummaryViewDto[]>([]);
  const [coupons, setCoupons] = useState<CouponCampaignDto[]>([]);
  const [selectedEventCode, setSelectedEventCode] = useState('');
  const [utmSource, setUtmSource] = useState('instagram');
  const [utmMedium, setUtmMedium] = useState('paid_social');
  const [utmCampaign, setUtmCampaign] = useState('lancamento_lote1');

  useEffect(() => {
    if (!canRead || !isAuthenticated) return;
    void Promise.all([
      client.listAuthorizedEvents().catch(() => ({ items: [] })),
      client.listCouponCampaigns().catch(() => ({ items: [] })),
    ]).then(([evtsRes, cpnsRes]) => {
      const evts = evtsRes.items ?? [];
      setEvents(evts);
      setCoupons(cpnsRes.items ?? []);
      if (evts.length > 0) setSelectedEventCode(evts[0].code);
    });
  }, [canRead, isAuthenticated, client]);

  if (!canRead) {
    return (
      <OperationalEmptyState
        title="Acesso Restrito a Marketing e Atribuição"
        description={`Sua credencial atual (${actor.roles.join(', ') || 'Não autenticada'}) não possui permissão para acessar esta área operacional.`}
      />
    );
  }

  const generatedUtmUrl = `https://homolog.diskingressos.com.br/evento/${encodeURIComponent(
    selectedEventCode || 'EVT-CODIGO'
  )}?utm_source=${encodeURIComponent(utmSource)}&utm_medium=${encodeURIComponent(
    utmMedium
  )}&utm_campaign=${encodeURIComponent(utmCampaign)}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <WorkspaceHeader
        eyebrow="Marketing e Aquisição"
        title="Campanhas, Parâmetros UTM e Cupons Vinculados"
        subtitle="Acompanhamento de eventos publicados, cupons promocionais e padronização de links de atribuição UTM. Relatórios de mídia nunca alteram o Livro Razão financeiro."
        statusBadge="Parcialmente Implementada · Sem Conector Externo de Mídia"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}
      >
        <KpiCard
          label="Eventos no Escopo"
          value={events.length}
          helperText={`${events.filter((e) => e.status === 'PUBLICADO').length} publicado(s)`}
          tone="accent"
        />
        <KpiCard
          label="Cupons Promocionais"
          value={coupons.length}
          helperText="Campanhas cadastradas no banco"
          tone="positive"
        />
        <KpiCard
          label="Conectores Meta/Google Ads"
          value="Desativados"
          helperText="Bloqueado por dependência externa em homologação"
          tone="warning"
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
        }}
      >
        <ActionPanel
          title="Construtor Padronizado de Rastreamento UTM por Evento"
          subtitle="Gera URLs parametrizadas para campanhas de divulgação dos eventos cadastrados."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Evento Alvo
              </label>
              <select
                value={selectedEventCode}
                onChange={(e) => setSelectedEventCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              >
                {events.length === 0 && <option value="EVT-HOMOLOG">Nenhum evento cadastrado</option>}
                {events.map((evt) => (
                  <option key={evt.id} value={evt.code}>
                    {evt.code} — {evt.title} ({evt.status})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  utm_source
                </label>
                <input
                  type="text"
                  value={utmSource}
                  onChange={(e) => setUtmSource(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  utm_medium
                </label>
                <input
                  type="text"
                  value={utmMedium}
                  onChange={(e) => setUtmMedium(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  utm_campaign
                </label>
                <input
                  type="text"
                  value={utmCampaign}
                  onChange={(e) => setUtmCampaign(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontFamily: 'monospace',
                fontSize: '12px',
                wordBreak: 'break-all',
              }}
            >
              {generatedUtmUrl}
            </div>
          </div>
        </ActionPanel>

        <ActionPanel
          title="Cupons e Campanhas Promocionais Ativas"
          subtitle="Consulte os cupons registrados no banco e o consumo de cada campanha."
        >
          {coupons.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Nenhum cupom promocional registrado até o momento.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {coupons.map((cpn) => (
                <div
                  key={cpn.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>{cpn.code}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Usos: {cpn.usedCount}/{cpn.maxUses} · {cpn.discountType}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700 }}>{cpn.status}</span>
                </div>
              ))}
            </div>
          )}
        </ActionPanel>
      </div>
    </div>
  );
}
