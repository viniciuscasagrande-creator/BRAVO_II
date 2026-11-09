'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { EventSummary, get } from '../../../lib/bravo-api';
import { Empty, Head, Notice, Panel } from '../../../components/bravo-p06';

export default function AdministracaoTarefasNotificacoesPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [cases, setCases] = useState<Array<{ id: string; subject: string; status: string; priority: string }>>([]);
  const [refunds, setRefunds] = useState<Array<{ id: string; status: string; amountCents: number }>>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      get<EventSummary[]>('eventos').catch(() => []),
      get<{ items: Array<{ id: string; subject: string; status: string; priority: string }> }>('sac/chamados').catch(
        () => ({ items: [] })
      ),
      get<{ items: Array<{ id: string; status: string; amountCents: number }> }>('estornos').catch(() => ({
        items: [],
      })),
    ])
      .then(([ev, sac, ref]) => {
        setEvents(ev.filter((e) => e.status !== 'PUBLICADO'));
        setCases(sac.items.filter((c) => c.status !== 'FECHADO'));
        setRefunds(ref.items);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <main className="b6">
      <Head
        title="ADM-02 · Central de Tarefas Operacionais, Pendências e Alertas"
        description="Consolidação real de eventos aguardando aprovação, chamados SAC em aberto e solicitações de estorno pendentes."
        action={
          <Link className="b6-btn b6-btn-secondary" href="/administracao/usuarios">
            Usuários e Perfis (ADM-01)
          </Link>
        }
      />
      <Notice text={error} error />

      <div className="b6-grid">
        <Panel title={`Eventos pendentes de aprovação / publicação (${events.length})`}>
          {events.length ? (
            <div className="b6-sublist">
              {events.map((ev) => (
                <div key={ev.id}>
                  <Link href={`/eventos/${ev.id}/aprovacoes`}>{ev.name}</Link> —{' '}
                  <strong>{ev.status}</strong>
                </div>
              ))}
            </div>
          ) : (
            <Empty message="Nenhum evento com pendência de publicação." />
          )}
        </Panel>

        <Panel title={`Chamados SAC ativos (${cases.length})`}>
          {cases.length ? (
            <div className="b6-sublist">
              {cases.map((c) => (
                <div key={c.id}>
                  <Link href={`/sac/chamados/${c.id}`}>{c.subject}</Link> — {c.priority} ({c.status})
                </div>
              ))}
            </div>
          ) : (
            <Empty message="Nenhum chamado SAC pendente." />
          )}
        </Panel>

        <Panel title={`Solicitações de estorno em análise (${refunds.length})`}>
          {refunds.length ? (
            <div className="b6-sublist">
              {refunds.map((r) => (
                <div key={r.id}>
                  <Link href="/financeiro/estornos">Estorno {r.id.slice(0, 8)}…</Link> — {r.status}
                </div>
              ))}
            </div>
          ) : (
            <Empty message="Nenhuma solicitação de estorno pendente." />
          )}
        </Panel>
      </div>
    </main>
  );
}
