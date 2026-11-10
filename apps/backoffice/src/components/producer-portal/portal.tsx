'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { EventSummaryViewDto, EventBuilderFullViewDto } from '@bravo-ii/contracts';
import { currentSession, get, post } from '../../lib/bravo-api';
import { campaignLink } from './marketing.mjs';
import { ProducerFinance } from './finance';
import './portal.css';

type Area =
  | 'Visão geral'
  | 'Evento'
  | 'Financeiro'
  | 'Repasses e antecipações'
  | 'Transferências'
  | 'Vendas e público'
  | 'Marketing'
  | 'Operação, Atendimento e Equipe';

interface PortalRecordItem {
  id: string;
  titulo: string;
  detalhe: string;
  responsavel: string;
  valorCents: number;
  status: string;
  createdAt: string;
}

interface ProducerPortalData {
  eventId: string;
  eventCode: string;
  eventTitle: string;
  resumoFinanceiro: {
    vendasRealizadasBrutoCents: number;
    valoresCreditadosProdutorCents: number;
    retencoesPreEventoCents: number;
    repassesSolicitadosOuPagosCents: number;
    saldoDisponivelParaRepasseCents: number;
    eventoJaRealizado: boolean;
    percentualLiberacaoPreEvento: number;
    pedidosConfirmadosCount: number;
    ingressosEmitidosCount: number;
    ingressosValidadosPortariaCount: number;
    cortesiasEmitidasCount: number;
  };
  repasses: Array<{
    id: string;
    protocol: string;
    requestType: string;
    amountCents: number;
    status: string;
    requestedBy: string;
    approvedAt: string | null;
    paidAt: string | null;
    notes: string | null;
    createdAt: string;
  }>;
  transferencias: PortalRecordItem[];
  campanhasMarketing: PortalRecordItem[];
  materiaisDivulgacao: PortalRecordItem[];
  solicitacoesAlteracao: PortalRecordItem[];
  operacaoDemandas: PortalRecordItem[];
  chamadosAtendimento: PortalRecordItem[];
  equipeAcessos: PortalRecordItem[];
}

const statuses: Record<string, string> = {
  DRAFT: 'Rascunho',
  PUBLISHED: 'Publicado',
  PUBLICADO: 'Publicado',
  EM_VENDA: 'Em venda',
  APPROVED: 'Aprovado',
  APROVADO: 'Aprovado',
  CANCELLED: 'Cancelado',
  IN_REVIEW: 'Em análise',
  ACTIVE: 'Ativo',
  CLOSED: 'Encerrado',
};

const payoutStatusLabels: Record<string, string> = {
  SOLICITADO: 'Solicitado — Em análise pelo Financeiro Disk',
  EM_ANALISE: 'Em análise pelo Financeiro Disk',
  APROVADO_FINANCEIRO: 'Aprovado — Aguardando assinatura do Produtor',
  ASSINADO_PRODUTOR: 'Assinado pelo Produtor — Aguardando liquidação final Disk',
  ASSINADO_FINANCEIRO: 'Assinado pelas partes — Em programação bancária',
  CONCLUIDO_HOMOLOGACAO: 'Liquidado / Concluído',
  REJEITADO: 'Recusado pelo Financeiro',
};

const date = (value: string) =>
  new Date(value).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const brlFromCents = (cents: number) =>
  ((cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function ProducerPortal() {
  const [events, setEvents] = useState<EventSummaryViewDto[]>([]);
  const [selected, setSelected] = useState('');
  const [detail, setDetail] = useState<EventBuilderFullViewDto | null>(null);
  const [portalData, setPortalData] = useState<ProducerPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [retry, setRetry] = useState(0);
  const [area, setArea] = useState<Area>('Visão geral');
  const [link, setLink] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Estados de formulário do Portal do Produtor
  const [payoutType, setPayoutType] = useState<'REPASSE' | 'ANTECIPACAO'>('REPASSE');
  const [payoutReais, setPayoutReais] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');

  const [targetEventId, setTargetEventId] = useState('');
  const [transferReais, setTransferReais] = useState('');
  const [transferReason, setTransferReason] = useState('');

  const [changeTitle, setChangeTitle] = useState('');
  const [changeDetail, setChangeDetail] = useState('');

  const [materialTitle, setMaterialTitle] = useState('');
  const [materialUrl, setMaterialUrl] = useState('');

  const [opTitle, setOpTitle] = useState('');
  const [opDetail, setOpDetail] = useState('');

  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDetail, setTicketDetail] = useState('');

  const [teamMemberEmail, setTeamMemberEmail] = useState('');
  const [teamMemberScope, setTeamMemberScope] = useState('Financeiro');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setAuthorized(false);
    setEvents([]);
    setDetail(null);
    setPortalData(null);
    (async () => {
      const session = await currentSession();
      const rawPerms = (session as unknown as { permissions?: string[] }).permissions ?? [];
      const hasPortalRole =
        session.user.roles.includes('PRODUTOR_PDT') ||
        rawPerms.includes('pdt:portal-read') ||
        rawPerms.includes('event:read');
      if (!hasPortalRole) {
        throw new Error('Entre com seu acesso de produtor para consultar o portal.');
      }
      const result = await get<{ items: EventSummaryViewDto[] }>('events');
      if (active) {
        setAuthorized(true);
        setEvents(result.items);
        setSelected(result.items[0]?.id ?? '');
      }
    })()
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : 'Não foi possível carregar seus eventos.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);

  const reloadPortalEvent = useCallback(async (eventId: string) => {
    const [eventValue, portalValue] = await Promise.all([
      get<EventBuilderFullViewDto>(`events/${encodeURIComponent(eventId)}`),
      get<ProducerPortalData>(`events/${encodeURIComponent(eventId)}/portal`),
    ]);
    return { eventValue, portalValue };
  }, []);

  useEffect(() => {
    setDetail(null);
    setPortalData(null);
    setLink('');
    setMessage('');
    if (!authorized || !selected) return;
    let active = true;
    setLoading(true);
    setError('');
    reloadPortalEvent(selected)
      .then(({ eventValue, portalValue }) => {
        if (active) {
          setDetail(eventValue);
          setPortalData(portalValue);
        }
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Não foi possível carregar o evento.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selected, authorized, reloadPortalEvent]);

  async function generate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLink('');
    setMessage('');
    const data = new FormData(e.currentTarget);
    const dest = String(data.get('destination') || '');
    const source = String(data.get('source') || '');
    const medium = String(data.get('medium') || '');
    const campaign = String(data.get('campaign') || '');
    try {
      const generated = campaignLink(dest, source, medium, campaign, selected);
      setLink(generated);
      await post(`events/${encodeURIComponent(selected)}/portal/registros`, {
        category: 'MARKETING_CAMPANHA',
        title: `${campaign} (${source} / ${medium})`,
        detail: generated,
      });
      const updated = await get<ProducerPortalData>(
        `events/${encodeURIComponent(selected)}/portal`
      );
      setPortalData(updated);
      setMessage('Link de campanha gerado e salvo no histórico de marketing do evento.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Confira os dados do link.');
    }
  }

  async function handleRequestPayout(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || submitting) return;
    const parsed = Number(payoutReais.replace(/\./g, '').replace(',', '.'));
    const amountCents = Math.round(parsed * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setMessage('Informe um valor válido em reais para solicitar o repasse.');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      const res = await post<{ protocol: string }>(
        `events/${encodeURIComponent(selected)}/portal/repasses`,
        {
          requestType: payoutType,
          amountCents,
          notes: payoutNotes,
        }
      );
      setPayoutReais('');
      setPayoutNotes('');
      const updated = await get<ProducerPortalData>(
        `events/${encodeURIComponent(selected)}/portal`
      );
      setPortalData(updated);
      setMessage(
        `Solicitação ${res.protocol} enviada para análise do Financeiro Disk. Acompanhe o status abaixo.`
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Não foi possível registrar a solicitação.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignPayout(payoutId: string) {
    if (!selected || submitting) return;
    setSubmitting(true);
    setMessage('');
    try {
      const res = await post<{ protocol: string; signatureStamp: string }>(
        `events/${encodeURIComponent(selected)}/portal/repasses/${encodeURIComponent(payoutId)}/assinar`,
        {}
      );
      const updated = await get<ProducerPortalData>(
        `events/${encodeURIComponent(selected)}/portal`
      );
      setPortalData(updated);
      setMessage(`Documento ${res.protocol} assinado com sucesso (${res.signatureStamp}).`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Falha ao assinar documento de repasse.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || submitting) return;
    const parsed = Number(transferReais.replace(/\./g, '').replace(',', '.'));
    const amountCents = Math.round(parsed * 100);
    if (!targetEventId || !Number.isFinite(amountCents) || amountCents <= 0) {
      setMessage('Selecione o evento de destino e informe um valor válido.');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      await post(`events/${encodeURIComponent(selected)}/portal/transferencias`, {
        targetEventId,
        amountCents,
        reason: transferReason,
      });
      setTransferReais('');
      setTransferReason('');
      const updated = await get<ProducerPortalData>(
        `events/${encodeURIComponent(selected)}/portal`
      );
      setPortalData(updated);
      setMessage('Solicitação de transferência entre eventos enviada para análise do Financeiro Disk.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Não foi possível solicitar a transferência.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreatePortalRecord(
    category:
      | 'MARKETING_MATERIAL'
      | 'ALTERACAO_EVENTO'
      | 'OPERACAO_EVENTO'
      | 'ATENDIMENTO_EVENTO'
      | 'EQUIPE_ACESSOS',
    title: string,
    detailText: string,
    clearFn: () => void
  ) {
    if (!selected || submitting || !title.trim()) return;
    setSubmitting(true);
    setMessage('');
    try {
      await post(`events/${encodeURIComponent(selected)}/portal/registros`, {
        category,
        title,
        detail: detailText,
      });
      clearFn();
      const updated = await get<ProducerPortalData>(
        `events/${encodeURIComponent(selected)}/portal`
      );
      setPortalData(updated);
      setMessage('Registro enviado e vinculado ao evento com sucesso.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Não foi possível salvar o registro.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleDownloadBorderoCsv() {
    if (!detail || !portalData) return;
    const fin = portalData.resumoFinanceiro;
    const lines = [
      'Evento;Codigo;Local;Data_Evento;Vendas_Realizadas_BRL;Creditado_Evento_BRL;Retencao_Pre_Evento_BRL;Solicitado_Ou_Pago_BRL;Saldo_Disponivel_BRL',
      `"${detail.title}";${detail.code};"${detail.venueName}";${detail.startsAt};${(fin.vendasRealizadasBrutoCents / 100).toFixed(2)};${(fin.valoresCreditadosProdutorCents / 100).toFixed(2)};${(fin.retencoesPreEventoCents / 100).toFixed(2)};${(fin.repassesSolicitadosOuPagosCents / 100).toFixed(2)};${(fin.saldoDisponivelParaRepasseCents / 100).toFixed(2)}`,
      '',
      'Protocolo_Repasse;Modalidade;Valor_BRL;Situacao;Solicitante;Data',
      ...portalData.repasses.map(
        (r) =>
          `${r.protocol};${r.requestType};${(r.amountCents / 100).toFixed(2)};"${payoutStatusLabels[r.status] ?? r.status}";${r.requestedBy};${r.createdAt}`
      ),
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bordero-produtor-${detail.code.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const fin = portalData?.resumoFinanceiro ?? {
    vendasRealizadasBrutoCents: 0,
    valoresCreditadosProdutorCents: 0,
    retencoesPreEventoCents: 0,
    repassesSolicitadosOuPagosCents: 0,
    saldoDisponivelParaRepasseCents: 0,
    eventoJaRealizado: false,
    percentualLiberacaoPreEvento: 70,
    pedidosConfirmadosCount: 0,
    ingressosEmitidosCount: 0,
    ingressosValidadosPortariaCount: 0,
    cortesiasEmitidasCount: 0,
  };

  return (
    <div className="producer-portal">
      <header>
        <Link href="/produtores-pdt" className="brand">
          BRAVO_II <small>Portal do Produtor</small>
        </Link>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/">Voltar ao ERP</Link>
          <Link href="/login">Meu acesso</Link>
        </div>
      </header>
      <main>
        <p className="eyebrow">DISKINGRESSOS · SEUS EVENTOS</p>
        <h1>Seu evento, mais perto.</h1>
        <p className="intro">
          Informações e ferramentas para acompanhar vendas, demonstrativo financeiro, repasses,
          assinaturas, marketing e operação de cada produção.
        </p>

        <div className="toolbar">
          <label>
            Evento
            <select
              value={selected}
              disabled={!events.length || loading}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Selecione um evento</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => setRetry((v) => v + 1)} disabled={loading}>
            Atualizar
          </button>
        </div>

        {error && (
          <section role="alert" className="notice">
            <h2>Não foi possível consultar</h2>
            <p>{error}</p>
            <Link href="/login">Acessar minha conta</Link>
          </section>
        )}

        {loading && <p role="status">Carregando informações…</p>}

        {!loading && !error && authorized && !events.length && (
          <section className="notice">
            <h2>Nenhum evento vinculado</h2>
            <p>Solicite à equipe DiskIngressos o vínculo dos seus eventos ao seu acesso.</p>
          </section>
        )}

        {authorized && !!selected && (
          <>
            <nav aria-label="Áreas do evento">
              {(
                [
                  'Visão geral',
                  'Evento',
                  'Financeiro',
                  'Repasses e antecipações',
                  'Transferências',
                  'Vendas e público',
                  'Marketing',
                  'Operação, Atendimento e Equipe',
                ] as Area[]
              ).map((item) => (
                <button
                  key={item}
                  aria-current={area === item ? 'page' : undefined}
                  onClick={() => {
                    setArea(item);
                    setMessage('');
                  }}
                >
                  {item}
                </button>
              ))}
            </nav>

            {message && (
              <section className="notice" role="status">
                <p style={{ margin: 0, fontWeight: 600 }}>{message}</p>
              </section>
            )}

            {detail && !loading && !error && (
              <>
                <section className="event-banner">
                  <div>
                    <small>EVENTO SELECIONADO · {detail.code}</small>
                    <h2>{detail.title}</h2>
                    <p>
                      {detail.venueName} · {detail.city}/{detail.stateUf}
                    </p>
                    <p>{date(detail.startsAt)} · Horário de Brasília</p>
                  </div>
                  <span className="badge">
                    {statuses[detail.status] ?? 'Situação a confirmar'}
                  </span>
                </section>

                {/* ÁREA 1: VISÃO GERAL */}
                {area === 'Visão geral' && (
                  <>
                    <div className="metrics">
                      <article>
                        <small>Vendas realizadas (bruto)</small>
                        <strong>{brlFromCents(fin.vendasRealizadasBrutoCents)}</strong>
                        <span className="muted">
                          {fin.pedidosConfirmadosCount} pedido(s) · {fin.ingressosEmitidosCount}{' '}
                          ingresso(s)
                        </span>
                      </article>
                      <article>
                        <small>Saldo disponível para repasse</small>
                        <strong style={{ color: '#126b5e' }}>
                          {brlFromCents(fin.saldoDisponivelParaRepasseCents)}
                        </strong>
                        <span className="muted">
                          Já descontadas retenções pré-evento e solicitações em andamento
                        </span>
                      </article>
                      <article>
                        <small>Solicitações e assinaturas</small>
                        <strong>{(portalData?.repasses ?? []).length}</strong>
                        <span className="muted">
                          {
                            (portalData?.repasses ?? []).filter(
                              (r) => r.status === 'APROVADO_FINANCEIRO'
                            ).length
                          }{' '}
                          aguardando sua assinatura
                        </span>
                      </article>
                    </div>

                    <section className="panel">
                      <h2>Fluxo Rápido do Produtor</h2>
                      <p>
                        Acompanhe em tempo real o borderô do seu evento, solicite repasses ou
                        antecipações, assine documentos aprovados pelo Financeiro Disk e gerencie
                        suas campanhas de divulgação.
                      </p>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
                        <button className="primary" onClick={() => setArea('Financeiro')}>
                          Consultar Demonstrativo Financeiro
                        </button>
                        <button onClick={() => setArea('Repasses e antecipações')}>
                          Solicitar Repasse / Assinar Borderô
                        </button>
                        <button onClick={() => setArea('Marketing')}>
                          Criar Link de Campanha (UTM)
                        </button>
                        <button onClick={handleDownloadBorderoCsv}>
                          ⬇ Baixar Borderô (CSV)
                        </button>
                      </div>
                    </section>
                  </>
                )}

                {/* ÁREA 2: MEUS EVENTOS (PROGRAMAÇÃO, LOTES E SOLICITAÇÃO DE ALTERAÇÃO) */}
                {area === 'Evento' && (
                  <>
                    <div className="metrics">
                      <article>
                        <small>Sessões cadastradas</small>
                        <strong>{detail.sessions.length}</strong>
                      </article>
                      <article>
                        <small>Setores cadastrados</small>
                        <strong>{detail.sectors.length}</strong>
                      </article>
                      <article>
                        <small>Lotes cadastrados</small>
                        <strong>{detail.priceLots.length}</strong>
                      </article>
                    </div>
                    <section className="panel">
                      <h2>Programação</h2>
                      {!detail.sessions.length ? (
                        <p>Nenhuma sessão cadastrada.</p>
                      ) : (
                        <ul>
                          {detail.sessions.map((s) => (
                            <li key={s.id}>
                              <strong>{s.title}</strong>
                              <span>{date(s.startsAt)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                    <section className="panel">
                      <h2>Setores e lotes</h2>
                      {!detail.priceLots.length ? (
                        <p>Nenhum lote cadastrado.</p>
                      ) : (
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Modalidade</th>
                                <th>Lote</th>
                                <th>Valor do ingresso</th>
                                <th>Capacidade cadastrada</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detail.priceLots.map((l) => (
                                <tr key={l.id}>
                                  <td>{l.modalityName}</td>
                                  <td>{l.lotNumber}</td>
                                  <td>{brlFromCents(l.nominalPriceCents)}</td>
                                  <td>{l.maxQuantity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <p className="muted">
                        Capacidade cadastrada não representa disponibilidade atual nem quantidade
                        vendida.
                      </p>
                    </section>

                    <section className="panel">
                      <h2>Solicitar alteração no evento (sujeita à aprovação)</h2>
                      <p>
                        Pedidos de ajuste de lote, horário, virada ou nomenclatura passam pela
                        validação operacional da DiskIngressos antes de entrar em vigor.
                      </p>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void handleCreatePortalRecord(
                            'ALTERACAO_EVENTO',
                            changeTitle,
                            changeDetail,
                            () => {
                              setChangeTitle('');
                              setChangeDetail('');
                            }
                          );
                        }}
                      >
                        <div className="form-grid">
                          <label>
                            Tipo de alteração solicitada
                            <input
                              value={changeTitle}
                              onChange={(e) => setChangeTitle(e.target.value)}
                              placeholder="Ex.: Virada para 2º lote Plateia"
                              required
                            />
                          </label>
                          <label style={{ gridColumn: 'span 2' }}>
                            Justificativa e detalhes
                            <input
                              value={changeDetail}
                              onChange={(e) => setChangeDetail(e.target.value)}
                              placeholder="Descreva a alteração desejada e data/horário pretendidos"
                              required
                            />
                          </label>
                        </div>
                        <button className="primary" type="submit" disabled={submitting}>
                          Enviar solicitação de alteração
                        </button>
                      </form>
                      {(portalData?.solicitacoesAlteracao ?? []).length > 0 && (
                        <ul>
                          {portalData!.solicitacoesAlteracao.map((item) => (
                            <li key={item.id}>
                              <div>
                                <strong>{item.titulo}</strong>
                                <p className="muted" style={{ margin: '4px 0 0' }}>
                                  {item.detalhe}
                                </p>
                              </div>
                              <span className="badge">{item.status}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </>
                )}

                {/* ÁREA 3: FINANCEIRO DO EVENTO (DISTINÇÃO CLARA ENTRE VENDAS, RECEBIDOS, RETENÇÕES E DISPONÍVEL) */}
                {area === 'Financeiro' && (
                  <>
                    <ProducerFinance key={selected} eventId={selected} />
                    <div className="metrics">
                      <article>
                        <small>1. Vendas realizadas (bruto)</small>
                        <strong>{brlFromCents(fin.vendasRealizadasBrutoCents)}</strong>
                        <span className="muted">Total nominal de ingressos confirmados</span>
                      </article>
                      <article>
                        <small>2. Creditado ao evento (líquido)</small>
                        <strong>{brlFromCents(fin.valoresCreditadosProdutorCents)}</strong>
                        <span className="muted">Valor líquido apurado a favor do evento</span>
                      </article>
                      <article>
                        <small>3. Retenção pré-evento ({100 - fin.percentualLiberacaoPreEvento}%)</small>
                        <strong>{brlFromCents(fin.retencoesPreEventoCents)}</strong>
                        <span className="muted">
                          {fin.eventoJaRealizado
                            ? 'Evento realizado (100% liberado)'
                            : `Liberação pré-evento limitada a ${fin.percentualLiberacaoPreEvento}%`}
                        </span>
                      </article>
                    </div>

                    <div className="metrics">
                      <article>
                        <small>4. Em análise ou já repassado</small>
                        <strong>{brlFromCents(fin.repassesSolicitadosOuPagosCents)}</strong>
                        <span className="muted">Repasses pagos ou aguardando conclusão</span>
                      </article>
                      <article style={{ gridColumn: 'span 2' }}>
                        <small>5. Saldo líquido disponível para repasse imediato</small>
                        <strong style={{ color: '#126b5e' }}>
                          {brlFromCents(fin.saldoDisponivelParaRepasseCents)}
                        </strong>
                        <span className="muted">
                          Uma venda realizada não significa liberação integral imediata: o saldo
                          disponível considera os valores efetivamente creditados menos a retenção
                          contratual pré-evento e os repasses já solicitados.
                        </span>
                      </article>
                    </div>

                    <section className="panel">
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 12,
                        }}
                      >
                        <div>
                          <p className="eyebrow">DEMONSTRATIVO DO PRODUTOR</p>
                          <h2>Composição do Borderô Financeiro</h2>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button onClick={handleDownloadBorderoCsv}>
                            ⬇ Exportar Demonstrativo (CSV)
                          </button>
                          <button
                            className="primary"
                            onClick={() => setArea('Repasses e antecipações')}
                          >
                            Solicitar Repasse →
                          </button>
                        </div>
                      </div>
                      <div className="table-wrap" style={{ marginTop: 12 }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Rubrica do Demonstrativo</th>
                              <th>Descrição Operacional</th>
                              <th>Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>
                                <strong>Vendas Realizadas (Bruto)</strong>
                              </td>
                              <td>Valor nominal total dos ingressos emitidos no evento</td>
                              <td>{brlFromCents(fin.vendasRealizadasBrutoCents)}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Valores Creditados ao Evento</strong>
                              </td>
                              <td>Montante líquido registrado na conta corrente do evento</td>
                              <td>{brlFromCents(fin.valoresCreditadosProdutorCents)}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Retenção de Segurança Pré-Evento</strong>
                              </td>
                              <td>
                                Reserva contratual até a realização do evento (liberação antecipada
                                de até {fin.percentualLiberacaoPreEvento}%)
                              </td>
                              <td>- {brlFromCents(fin.retencoesPreEventoCents)}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Repasses Pagos / Em Processamento</strong>
                              </td>
                              <td>Solicitações já liquidadas ou em fluxo de aprovação/assinatura</td>
                              <td>- {brlFromCents(fin.repassesSolicitadosOuPagosCents)}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Saldo Disponível para Solicitação</strong>
                              </td>
                              <td>Valor livre para nova solicitação de repasse ou antecipação</td>
                              <td>
                                <strong>{brlFromCents(fin.saldoDisponivelParaRepasseCents)}</strong>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </>
                )}

                {/* ÁREA 4: REPASSES, ANTECIPAÇÕES E ASSINATURA DO PRODUTOR */}
                {area === 'Repasses e antecipações' && (
                  <>
                    <section className="panel">
                      <p className="eyebrow">FLUXO DE REPASSE E ASSINATURA</p>
                      <h2>Solicitar repasse ou antecipação</h2>
                      <p>
                        Saldo disponível neste evento:{' '}
                        <strong>{brlFromCents(fin.saldoDisponivelParaRepasseCents)}</strong>. Após
                        enviar a solicitação, o Financeiro Disk realiza a análise e libera o termo
                        para sua assinatura eletrônica aqui mesmo no portal.
                      </p>
                      <form onSubmit={handleRequestPayout}>
                        <div className="form-grid">
                          <label>
                            Modalidade
                            <select
                              value={payoutType}
                              onChange={(e) =>
                                setPayoutType(e.target.value as 'REPASSE' | 'ANTECIPACAO')
                              }
                            >
                              <option value="REPASSE">Repasse de saldo disponível</option>
                              <option value="ANTECIPACAO">Antecipação contratual</option>
                            </select>
                          </label>
                          <label>
                            Valor solicitado (R$)
                            <input
                              value={payoutReais}
                              onChange={(e) => setPayoutReais(e.target.value)}
                              placeholder="Ex.: 15,00"
                              required
                            />
                          </label>
                          <label>
                            Observação / Conta de destino
                            <input
                              value={payoutNotes}
                              onChange={(e) => setPayoutNotes(e.target.value)}
                              placeholder="Conta principal cadastrada no contrato"
                            />
                          </label>
                        </div>
                        <button className="primary" type="submit" disabled={submitting}>
                          Enviar solicitação ao Financeiro Disk
                        </button>
                      </form>
                    </section>

                    <section className="panel">
                      <h2>Acompanhamento de solicitações e assinaturas</h2>
                      {(portalData?.repasses ?? []).length === 0 ? (
                        <p>Nenhuma solicitação de repasse registrada para este evento.</p>
                      ) : (
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Protocolo</th>
                                <th>Tipo</th>
                                <th>Valor</th>
                                <th>Situação no Fluxo</th>
                                <th>Histórico / Assinatura</th>
                                <th>Ação do Produtor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(portalData?.repasses ?? []).map((r) => (
                                <tr key={r.id}>
                                  <td>
                                    <strong>{r.protocol}</strong>
                                  </td>
                                  <td>{r.requestType}</td>
                                  <td>{brlFromCents(r.amountCents)}</td>
                                  <td>{payoutStatusLabels[r.status] ?? r.status}</td>
                                  <td>{r.notes || 'Em processamento'}</td>
                                  <td>
                                    {r.status === 'APROVADO_FINANCEIRO' ? (
                                      <button
                                        className="primary"
                                        disabled={submitting}
                                        onClick={() => void handleSignPayout(r.id)}
                                      >
                                        ✍️ Assinar Termo
                                      </button>
                                    ) : r.status === 'ASSINADO_PRODUTOR' ? (
                                      <span className="badge">Assinado pelo Produtor</span>
                                    ) : (
                                      <span className="muted">Aguardando análise Disk</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  </>
                )}

                {/* ÁREA 5: TRANSFERÊNCIAS ENTRE EVENTOS DO MESMO PRODUTOR */}
                {area === 'Transferências' && (
                  <section className="panel">
                    <h2>Transferência de saldo entre seus eventos</h2>
                    <p>
                      Solicite a transferência de saldo disponível deste evento (
                      <strong>{detail.title}</strong>) para outro evento autorizado da sua
                      produtora, sujeita à aprovação do Financeiro Disk.
                    </p>
                    <form onSubmit={handleRequestTransfer}>
                      <div className="form-grid">
                        <label>
                          Evento de destino
                          <select
                            value={targetEventId}
                            onChange={(e) => setTargetEventId(e.target.value)}
                            required
                          >
                            <option value="">Selecione outro evento seu</option>
                            {events
                              .filter((ev) => ev.id !== selected)
                              .map((ev) => (
                                <option key={ev.id} value={ev.id}>
                                  {ev.title}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label>
                          Valor a transferir (R$)
                          <input
                            value={transferReais}
                            onChange={(e) => setTransferReais(e.target.value)}
                            placeholder="Ex.: 10,00"
                            required
                          />
                        </label>
                        <label>
                          Finalidade / Justificativa
                          <input
                            value={transferReason}
                            onChange={(e) => setTransferReason(e.target.value)}
                            placeholder="Ex.: Cobertura de adiantamento técnico"
                            required
                          />
                        </label>
                      </div>
                      <button className="primary" type="submit" disabled={submitting}>
                        Solicitar transferência entre eventos
                      </button>
                    </form>

                    {(portalData?.transferencias ?? []).length > 0 && (
                      <ul style={{ marginTop: 20 }}>
                        {portalData!.transferencias.map((t) => (
                          <li key={t.id}>
                            <div>
                              <strong>{t.titulo}</strong>
                              <p className="muted" style={{ margin: '4px 0 0' }}>
                                {t.detalhe} · {brlFromCents(t.valorCents)}
                              </p>
                            </div>
                            <span className="badge">{t.status}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}

                {/* ÁREA 6: VENDAS E PÚBLICO */}
                {area === 'Vendas e público' && (
                  <>
                    <div className="metrics">
                      <article>
                        <small>Ingressos emitidos</small>
                        <strong>{fin.ingressosEmitidosCount}</strong>
                        <span className="muted">Em pedidos confirmados</span>
                      </article>
                      <article>
                        <small>Acessos validados (Portaria)</small>
                        <strong>{fin.ingressosValidadosPortariaCount}</strong>
                        <span className="muted">Check-ins QR registrados</span>
                      </article>
                      <article>
                        <small>Cortesias emitidas</small>
                        <strong>{fin.cortesiasEmitidasCount}</strong>
                        <span className="muted">Dentro da cota autorizada</span>
                      </article>
                    </div>

                    <section className="panel">
                      <h2>Desempenho por modalidade e lote</h2>
                      {!detail.priceLots.length ? (
                        <p>Nenhum lote cadastrado.</p>
                      ) : (
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Modalidade</th>
                                <th>Categoria</th>
                                <th>Lote</th>
                                <th>Preço Nominal</th>
                                <th>Capacidade do Lote</th>
                                <th>Situação</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detail.priceLots.map((l) => (
                                <tr key={l.id}>
                                  <td>{l.modalityName}</td>
                                  <td>{l.categoryType}</td>
                                  <td>{l.lotNumber}</td>
                                  <td>{brlFromCents(l.nominalPriceCents)}</td>
                                  <td>{l.maxQuantity}</td>
                                  <td>{statuses[l.status] ?? l.status}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  </>
                )}

                {/* ÁREA 7: MARKETING E MATERIAIS DE DIVULGAÇÃO */}
                {area === 'Marketing' && (
                  <>
                    <section className="panel">
                      <h2>Links de divulgação</h2>
                      <p>
                        Crie um link com identificação de campanha para divulgar este evento. O link
                        gerado também fica registrado no histórico de campanhas do evento.
                      </p>
                      <form key={selected} onSubmit={generate}>
                        <label>
                          Endereço público de compra
                          <input
                            name="destination"
                            type="url"
                            placeholder="https://…"
                            defaultValue="https://www.diskingressos.com.br/evento"
                            required
                          />
                        </label>
                        <div className="form-grid">
                          <label>
                            Origem
                            <input
                              name="source"
                              placeholder="instagram"
                              maxLength={120}
                              required
                            />
                          </label>
                          <label>
                            Meio
                            <input name="medium" placeholder="social" maxLength={120} required />
                          </label>
                          <label>
                            Nome da campanha
                            <input
                              name="campaign"
                              placeholder="divulgacao-evento"
                              maxLength={120}
                              required
                            />
                          </label>
                        </div>
                        <button className="primary" type="submit">
                          Gerar link de campanha
                        </button>
                      </form>
                      {link && (
                        <div className="result">
                          <label>
                            Link gerado
                            <textarea readOnly value={link} />
                          </label>
                          <button
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(link);
                                setMessage('Link copiado.');
                              } catch {
                                setMessage('Selecione e copie o link acima.');
                              }
                            }}
                          >
                            Copiar link
                          </button>
                        </div>
                      )}

                      {(portalData?.campanhasMarketing ?? []).length > 0 && (
                        <div style={{ marginTop: 20 }}>
                          <h3>Campanhas rastreáveis salvas neste evento</h3>
                          <ul>
                            {portalData!.campanhasMarketing.map((c) => (
                              <li key={c.id}>
                                <div>
                                  <strong>{c.titulo}</strong>
                                  <p className="muted" style={{ margin: '4px 0 0', wordBreak: 'break-all' }}>
                                    {c.detalhe}
                                  </p>
                                </div>
                                <span className="badge">{c.status}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </section>

                    <section className="panel">
                      <h2>Materiais de divulgação e solicitações de publicação</h2>
                      <p>
                        Envie peças criativas, banners e solicitações de divulgação para aprovação e
                        publicação nos canais oficiais da DiskIngressos.
                      </p>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void handleCreatePortalRecord(
                            'MARKETING_MATERIAL',
                            materialTitle,
                            materialUrl,
                            () => {
                              setMaterialTitle('');
                              setMaterialUrl('');
                            }
                          );
                        }}
                      >
                        <div className="form-grid">
                          <label>
                            Nome da peça / solicitação
                            <input
                              value={materialTitle}
                              onChange={(e) => setMaterialTitle(e.target.value)}
                              placeholder="Ex.: Banner Oficial Feed + Stories 1080x1920"
                              required
                            />
                          </label>
                          <label style={{ gridColumn: 'span 2' }}>
                            Link do material (Drive/HTTPS) ou especificação
                            <input
                              value={materialUrl}
                              onChange={(e) => setMaterialUrl(e.target.value)}
                              placeholder="https://..."
                              required
                            />
                          </label>
                        </div>
                        <button className="primary" type="submit" disabled={submitting}>
                          Enviar material para aprovação
                        </button>
                      </form>
                      {(portalData?.materiaisDivulgacao ?? []).length > 0 && (
                        <ul>
                          {portalData!.materiaisDivulgacao.map((m) => (
                            <li key={m.id}>
                              <div>
                                <strong>{m.titulo}</strong>
                                <p className="muted" style={{ margin: '4px 0 0' }}>
                                  {m.detalhe}
                                </p>
                              </div>
                              <span className="badge">{m.status}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </>
                )}

                {/* ÁREA 8: OPERAÇÃO DO EVENTO, ATENDIMENTO E EQUIPE/ACESSOS */}
                {area === 'Operação, Atendimento e Equipe' && (
                  <>
                    <section className="panel">
                      <h2>Operação do evento e credenciamento de portaria</h2>
                      <p>
                        Registre demandas técnicas, listas de credenciamento de staff e orientações
                        de abertura de portões para a equipe de operação.
                      </p>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void handleCreatePortalRecord('OPERACAO_EVENTO', opTitle, opDetail, () => {
                            setOpTitle('');
                            setOpDetail('');
                          });
                        }}
                      >
                        <div className="form-grid">
                          <label>
                            Demanda operacional / Portaria
                            <input
                              value={opTitle}
                              onChange={(e) => setOpTitle(e.target.value)}
                              placeholder="Ex.: Credenciamento equipe técnica e catracas VIP"
                              required
                            />
                          </label>
                          <label style={{ gridColumn: 'span 2' }}>
                            Detalhes e horários
                            <input
                              value={opDetail}
                              onChange={(e) => setOpDetail(e.target.value)}
                              placeholder="Ex.: Abertura dos portões às 19h00 com 4 leitores QR"
                              required
                            />
                          </label>
                        </div>
                        <button className="primary" type="submit" disabled={submitting}>
                          Registrar demanda operacional
                        </button>
                      </form>
                      {(portalData?.operacaoDemandas ?? []).length > 0 && (
                        <ul>
                          {portalData!.operacaoDemandas.map((op) => (
                            <li key={op.id}>
                              <div>
                                <strong>{op.titulo}</strong>
                                <p className="muted" style={{ margin: '4px 0 0' }}>
                                  {op.detalhe}
                                </p>
                              </div>
                              <span className="badge">{op.status}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    <section className="panel">
                      <h2>Atendimento ao Produtor (Chamados vinculados ao evento)</h2>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void handleCreatePortalRecord(
                            'ATENDIMENTO_EVENTO',
                            ticketSubject,
                            ticketDetail,
                            () => {
                              setTicketSubject('');
                              setTicketDetail('');
                            }
                          );
                        }}
                      >
                        <div className="form-grid">
                          <label>
                            Assunto do chamado
                            <input
                              value={ticketSubject}
                              onChange={(e) => setTicketSubject(e.target.value)}
                              placeholder="Ex.: Dúvida sobre conciliação de lote promocional"
                              required
                            />
                          </label>
                          <label style={{ gridColumn: 'span 2' }}>
                            Mensagem / Link de anexo
                            <input
                              value={ticketDetail}
                              onChange={(e) => setTicketDetail(e.target.value)}
                              placeholder="Descreva sua solicitação para o atendimento DiskIngressos"
                              required
                            />
                          </label>
                        </div>
                        <button className="primary" type="submit" disabled={submitting}>
                          Abrir chamado do evento
                        </button>
                      </form>
                      {(portalData?.chamadosAtendimento ?? []).length > 0 && (
                        <ul>
                          {portalData!.chamadosAtendimento.map((ch) => (
                            <li key={ch.id}>
                              <div>
                                <strong>{ch.titulo}</strong>
                                <p className="muted" style={{ margin: '4px 0 0' }}>
                                  {ch.detalhe}
                                </p>
                              </div>
                              <span className="badge">{ch.status}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    <section className="panel">
                      <h2>Equipe e acessos do produtor</h2>
                      <p>
                        Convide integrantes da sua produtora e defina se o acesso será voltado a{' '}
                        <strong>Financeiro</strong>, <strong>Marketing</strong> ou{' '}
                        <strong>Operação</strong>.
                      </p>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void handleCreatePortalRecord(
                            'EQUIPE_ACESSOS',
                            teamMemberEmail,
                            `Escopo autorizado no evento: ${teamMemberScope}`,
                            () => {
                              setTeamMemberEmail('');
                            }
                          );
                        }}
                      >
                        <div className="form-grid">
                          <label>
                            E-mail do integrante
                            <input
                              type="email"
                              value={teamMemberEmail}
                              onChange={(e) => setTeamMemberEmail(e.target.value)}
                              placeholder="integrante@produtora.com.br"
                              required
                            />
                          </label>
                          <label>
                            Permissão no evento
                            <select
                              value={teamMemberScope}
                              onChange={(e) => setTeamMemberScope(e.target.value)}
                            >
                              <option value="Financeiro">Financeiro e Borderô</option>
                              <option value="Marketing">Marketing e Divulgação</option>
                              <option value="Operação">Operação e Portaria</option>
                            </select>
                          </label>
                        </div>
                        <button className="primary" type="submit" disabled={submitting}>
                          Convidar integrante
                        </button>
                      </form>
                      {(portalData?.equipeAcessos ?? []).length > 0 && (
                        <ul>
                          {portalData!.equipeAcessos.map((eq) => (
                            <li key={eq.id}>
                              <div>
                                <strong>{eq.titulo}</strong>
                                <p className="muted" style={{ margin: '4px 0 0' }}>
                                  {eq.detalhe}
                                </p>
                              </div>
                              <span className="badge">{eq.status}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </>
                )}
              </>
            )}
          </>
        )}
        <footer>BRAVO_II · Portal do Produtor · DiskIngressos</footer>
      </main>
    </div>
  );
}
