'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { EventSummary, get } from '../../../lib/bravo-api';
import { Empty, Head, Notice, Panel } from '../../../components/bravo-p06';

export default function UsuariosValidadoresPortariaPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    get<EventSummary[]>('eventos')
      .then(setEvents)
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <main className="b6">
      <Head
        title="PRT-02 · Usuários Validadores, Portões e Escopo de Portaria"
        description="Governança de operadores com perfil PORTARIA_CHECKIN (`checkin:validate`) e vínculo por evento/sessão."
        action={
          <div className="b6-actions">
            <Link className="b6-btn b6-btn-secondary" href="/portaria/validacoes">
              Validações QR (PRT-01)
            </Link>
            <Link className="b6-btn b6-btn-secondary" href="/portaria/regras">
              Regras de Acesso (PRT-03)
            </Link>
          </div>
        }
      />
      <Notice text={error} error />

      <div className="b6-grid">
        <Panel title="Política de autorização de validadores">
          <div className="b6-sublist">
            <div>
              <strong>Perfil canônico:</strong> <code>PORTARIA_CHECKIN</code>
            </div>
            <div>
              <strong>Permissão exigida no backend:</strong> <code>checkin:validate</code> e{' '}
              <code>ticket:read</code>
            </div>
            <div>
              <strong>Segregação:</strong> Validadores de portaria não possuem acesso a Taxa Disk,
              relatórios financeiros ou estornos.
            </div>
          </div>
        </Panel>

        <Panel title={`Eventos disponíveis para operação de portaria (${events.length})`}>
          {events.length ? (
            <div className="b6-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Local</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id}>
                      <td>{ev.name}</td>
                      <td>{ev.venueName}</td>
                      <td>{ev.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty message="Nenhum evento ativo para vinculação de portaria." />
          )}
        </Panel>
      </div>
    </main>
  );
}
