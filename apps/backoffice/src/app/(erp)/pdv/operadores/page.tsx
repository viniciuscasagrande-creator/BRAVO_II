'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { get } from '../../../../lib/bravo-api';
import { dateBR, Empty, Head, Notice, Panel } from '../../../../components/bravo-p06';

type Terminal = {
  id: string;
  code: string;
  label: string;
  venue: string;
  status: string;
  createdAt: string;
};

type Shift = {
  id: string;
  terminalCode: string;
  terminalLabel: string;
  operatorId: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
};

export default function OperadoresPdvPage() {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      get<{ items: Terminal[] }>('pdv/terminais'),
      get<{ items: Shift[] }>('pdv/turnos').catch(() => ({ items: [] })),
    ])
      .then(([t, s]) => {
        setTerminals(t.items);
        setShifts(s.items);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <main className="b6">
      <Head
        title="PDV-02 · Operadores e Vínculos de Terminal PDV"
        description="Relação de terminais homologados e operadores vinculados a turnos autenticados."
        action={
          <div className="b6-actions">
            <Link className="b6-btn b6-btn-secondary" href="/pdv/pontos">
              Pontos de Venda (PDV-01)
            </Link>
            <Link className="b6-btn b6-btn-secondary" href="/pdv/caixa">
              Caixa e Conciliação (PDV-03)
            </Link>
          </div>
        }
      />
      <Notice text={error} error />

      <div className="b6-grid">
        <Panel title={`Terminais registrados (${terminals.length})`}>
          {terminals.length ? (
            <div className="b6-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Identificação</th>
                    <th>Local</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {terminals.map((t) => (
                    <tr key={t.id}>
                      <td>{t.code}</td>
                      <td>{t.label}</td>
                      <td>{t.venue}</td>
                      <td>{t.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty message="Nenhum terminal PDV cadastrado." />
          )}
        </Panel>

        <Panel title={`Histórico de operadores em turnos (${shifts.length})`}>
          {shifts.length ? (
            <div className="b6-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Operador</th>
                    <th>Terminal</th>
                    <th>Status</th>
                    <th>Abertura</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <code>{s.operatorId}</code>
                      </td>
                      <td>{s.terminalCode}</td>
                      <td>{s.status}</td>
                      <td>{dateBR(s.openedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty message="Nenhum turno de operador aberto (equipamentos físicos em modo bloqueado até homologação)." />
          )}
        </Panel>
      </div>
    </main>
  );
}
