'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { get, post } from '../../../../lib/bravo-api';
import { dateBR, Empty, Field, Head, Notice, Panel } from '../../../../components/bravo-p06';

type Terminal = { id: string; code: string; label: string; venue: string; status: string };
type Shift = {
  id: string;
  terminalId: string;
  terminalCode: string;
  terminalLabel: string;
  operatorId: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  reconciliation: {
    totalOrders: number;
    reservedCount: number;
    reservedAmountCents: number;
    paidCount: number;
    paidAmountCents: number;
    cancelledOrExpiredCount: number;
  };
};

const real = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function CaixaPdvPage() {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedTerminalId, setSelectedTerminalId] = useState('');
  const [terminalRecon, setTerminalRecon] = useState<{
    totalOrders: number;
    reservedCount: number;
    reservedAmountCents: number;
    paidCount: number;
    paidAmountCents: number;
    cancelledOrExpiredCount: number;
  } | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      get<{ items: Terminal[] }>('pdv/terminais'),
      get<{ items: Shift[] }>('pdv/turnos').catch(() => ({ items: [] })),
    ])
      .then(([t, s]) => {
        setTerminals(t.items);
        setShifts(s.items);
        if (t.items[0] && !selectedTerminalId) {
          setSelectedTerminalId(t.items[0].id);
        }
      })
      .catch((e) => setError((e as Error).message));
  }, [selectedTerminalId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedTerminalId) return;
    get<{ reconciliation: NonNullable<typeof terminalRecon> }>(
      `pdv/terminais/${selectedTerminalId}/conciliacao`
    )
      .then((r) => setTerminalRecon(r.reconciliation))
      .catch(() => setTerminalRecon(null));
  }, [selectedTerminalId]);

  async function openShift() {
    if (!selectedTerminalId) return;
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await post(`pdv/terminais/${selectedTerminalId}/turnos`);
      setMessage('Turno aberto com sucesso.');
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function closeShift(shiftId: string) {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await post(`pdv/turnos/${shiftId}/fechar`);
      setMessage('Turno encerrado e conciliado.');
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="b6">
      <Head
        title="PDV-03 · Abertura, Fechamento e Conciliação de Caixa PDV"
        description="Conferência de turnos e conciliação de pedidos reservados, liquidados e cancelados por terminal sem lançamentos fictícios."
        action={
          <Link className="b6-btn b6-btn-secondary" href="/pdv/vendas">
            Vendas no PDV (PDV-04)
          </Link>
        }
      />
      <Notice text={error} error />
      <Notice text={message} />

      <div className="b6-grid">
        <Panel title="Inspeção e abertura de turno por terminal">
          <Field name="Terminal PDV">
            <select
              value={selectedTerminalId}
              onChange={(e) => setSelectedTerminalId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {terminals.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} — {t.label} ({t.status})
                </option>
              ))}
            </select>
          </Field>
          {terminalRecon && (
            <div className="b6-sublist" style={{ marginTop: 12 }}>
              <div>
                <strong>Total de pedidos no terminal:</strong> {terminalRecon.totalOrders}
              </div>
              <div>
                <strong>Reservados:</strong> {terminalRecon.reservedCount} (
                {real(terminalRecon.reservedAmountCents)})
              </div>
              <div>
                <strong>Liquidados:</strong> {terminalRecon.paidCount} (
                {real(terminalRecon.paidAmountCents)})
              </div>
              <div>
                <strong>Cancelados / Expirados:</strong> {terminalRecon.cancelledOrExpiredCount}
              </div>
            </div>
          )}
          <div className="b6-actions" style={{ marginTop: 12 }}>
            <button className="b6-btn" onClick={openShift} disabled={busy || !selectedTerminalId}>
              Solicitar abertura de turno
            </button>
          </div>
        </Panel>

        <Panel title={`Turnos registrados (${shifts.length})`}>
          {shifts.length ? (
            <div className="b6-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Terminal</th>
                    <th>Status</th>
                    <th>Abertura</th>
                    <th>Liquidados</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((s) => (
                    <tr key={s.id}>
                      <td>{s.terminalCode}</td>
                      <td>{s.status}</td>
                      <td>{dateBR(s.openedAt)}</td>
                      <td>
                        {s.reconciliation.paidCount} ({real(s.reconciliation.paidAmountCents)})
                      </td>
                      <td>
                        {s.status === 'ABERTO' ? (
                          <button
                            type="button"
                            className="b6-btn b6-btn-secondary"
                            onClick={() => closeShift(s.id)}
                            disabled={busy}
                          >
                            Fechar turno
                          </button>
                        ) : (
                          'Fechado'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty message="Nenhum turno aberto neste ambiente." />
          )}
        </Panel>
      </div>
    </main>
  );
}
