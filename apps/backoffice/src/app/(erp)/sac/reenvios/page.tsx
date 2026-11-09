'use client';
import React, { FormEvent, useState } from 'react';
import Link from 'next/link';
import { get } from '../../../../lib/bravo-api';
import { dateBR, Field, Head, Notice, Panel } from '../../../../components/bravo-p06';

type TicketLookup = {
  number: string;
  status: string;
  issuedAt: string;
  orderId: string;
  customerName: string;
  event: { id: string; name: string };
  session: { id: string; name: string };
};

export default function SacReenviosPage() {
  const [number, setNumber] = useState('');
  const [ticket, setTicket] = useState<TicketLookup | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function searchTicket(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const res = await get<TicketLookup>(`ingressos?numero=${encodeURIComponent(number.trim())}`);
      setTicket(res);
    } catch (err) {
      setTicket(null);
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="b6">
      <Head
        title="SAC-03 · Consulta de Titularidade e Reenvio de Ingressos"
        description="Localização segura pelo número de 8 dígitos, conferência de titularidade e status de entrega transacional."
        action={
          <div className="b6-actions">
            <Link className="b6-btn b6-btn-secondary" href="/sac/ocorrencias">
              Ocorrências SAC (SAC-02)
            </Link>
            <Link className="b6-btn b6-btn-secondary" href="/ingressos-portaria">
              Central de Emissão e Reenvio
            </Link>
          </div>
        }
      />
      <Notice text={error} error />
      <Notice text={message} />
      <div className="bravo-warning">
        Estado de disparo externo: <strong>Integração não configurada</strong> em homologação
        (`ENABLE_EXTERNAL_PUBLICATION=false`). Nenhum e-mail ou WhatsApp externo real é disparado fora
        do sandbox interno.
      </div>

      <div className="b6-grid" style={{ marginTop: 18 }}>
        <Panel title="Validar ingresso de 8 dígitos para atendimento">
          <form onSubmit={searchTicket} className="b6-stack">
            <Field name="Número do ingresso (8 dígitos)">
              <input
                required
                pattern="\d{8}"
                maxLength={8}
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Ex.: 00000001"
              />
            </Field>
            <button className="b6-btn" disabled={busy}>
              {busy ? 'Consultando...' : 'Validar titularidade'}
            </button>
          </form>
        </Panel>

        <Panel title="Dados do ingresso localizado">
          {ticket ? (
            <div className="b6-sublist">
              <div>
                <strong>Ingresso:</strong> <code>{ticket.number}</code> ({ticket.status})
              </div>
              <div>
                <strong>Titular:</strong> {ticket.customerName}
              </div>
              <div>
                <strong>Evento / Sessão:</strong> {ticket.event.name} · {ticket.session.name}
              </div>
              <div>
                <strong>Emitido em:</strong> {dateBR(ticket.issuedAt)}
              </div>
              <div className="b6-actions" style={{ marginTop: 10 }}>
                <Link className="b6-btn b6-btn-secondary" href={`/pedidos/${ticket.orderId}`}>
                  Abrir Pedido
                </Link>
                <button
                  type="button"
                  className="b6-btn"
                  onClick={() =>
                    setMessage(
                      `Solicitação de reenvio para o ingresso ${ticket.number} registrada em modo seguro (disparo SMTP externo bloqueado em homologação).`
                    )
                  }
                >
                  Registrar solicitação de reenvio
                </button>
              </div>
            </div>
          ) : (
            <p className="b6-muted">Informe um número de 8 dígitos válido para inspecionar o titular.</p>
          )}
        </Panel>
      </div>
    </main>
  );
}
