'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { get } from '../../../lib/bravo-api';
import { Head, Notice, Panel } from '../../../components/bravo-p06';

export default function AuditoriaIntegracoesPage() {
  const [health, setHealth] = useState<{ status?: string; service?: string; timestamp?: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    get<{ status?: string; service?: string; timestamp?: string }>('health')
      .then(setHealth)
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <main className="b6">
      <Head
        title="AUD-02 · Saúde das Integrações, Webhooks, Idempotência e Outbox"
        description="Inspeção de conectores externos, travas de segurança de homologação e fila transacional Outbox."
        action={
          <Link className="b6-btn b6-btn-secondary" href="/auditoria/logs">
            Logs de Auditoria (AUD-01)
          </Link>
        }
      />
      <Notice text={error} error />

      <div className="b6-grid">
        <Panel title="Saúde do Core Transacional (/v1/health)">
          <div className="b6-sublist">
            <div>
              <strong>Status da API Core:</strong> {health?.status || 'VERIFICANDO'}
            </div>
            <div>
              <strong>Serviço:</strong> {health?.service || 'bravo-ii-core-api'}
            </div>
            <div>
              <strong>Timestamp do servidor:</strong> {health?.timestamp || '—'}
            </div>
          </div>
        </Panel>

        <Panel title="Estado dos conectores externos em homologação">
          <div className="b6-sublist">
            <div>
              <strong>Pagamentos Reais (`ENABLE_REAL_PAYMENTS`):</strong> Desabilitado (`false` —
              somente tentativa/consulta sandbox permitida)
            </div>
            <div>
              <strong>Estornos Bancários Reais (`ENABLE_REAL_REFUNDS`):</strong> Desabilitado (`false`
              — dupla alçada interna sem disparo bancário)
            </div>
            <div>
              <strong>Publicação Externa (`ENABLE_EXTERNAL_PUBLICATION`):</strong> Desabilitado
              (`false` — eventos gravados em `outbox_events`)
            </div>
            <div>
              <strong>Biometria Facial Portaria:</strong> Integração não configurada (sem coleta de
              biometria bruta)
            </div>
          </div>
        </Panel>
      </div>
    </main>
  );
}
