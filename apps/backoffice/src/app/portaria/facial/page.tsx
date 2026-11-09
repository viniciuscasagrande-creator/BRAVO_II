'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { EventSummary, get } from '../../../lib/bravo-api';
import { Head, Notice, Panel } from '../../../components/bravo-p06';

export default function ReconhecimentoFacialPortariaPage() {
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
        title="PRT-04 · Reconhecimento Facial e Governança Biométrica (LGPD)"
        description="Configuração de elegibilidade por evento e status do provedor externo. Dados biométricos brutos nunca são armazenados nem exibidos no ERP."
        action={
          <Link className="b6-btn b6-btn-secondary" href="/portaria/validacoes">
            Validações QR (PRT-01)
          </Link>
        }
      />
      <Notice text={error} error />
      <div className="bravo-warning">
        Estado explícito: <strong>Integração não configurada</strong>. Provedor externo de biometria
        facial e base legal/DPIA específica (LGPD Art. 11) não estão habilitados neste ambiente de
        homologação. Nenhuma captura facial real é realizada.
      </div>

      <div className="b6-grid" style={{ marginTop: 18 }}>
        <Panel title="Status do conector biométrico">
          <div className="b6-sublist">
            <div>
              <strong>Status da integração:</strong> Integração não configurada (fail-closed)
            </div>
            <div>
              <strong>Armazenamento de imagem/template facial no BRAVO_II:</strong> Desabilitado por
              arquitetura (ADR-008)
            </div>
            <div>
              <strong>Eventos monitorados no escopo:</strong> {events.length}
            </div>
          </div>
        </Panel>

        <Panel title="Diretrizes obrigatórias de proteção de dados (LGPD)">
          <div className="b6-sublist">
            <div>1. Proibido exibir foto ou vetor biométrico bruto para operadores de backoffice.</div>
            <div>
              2. Apenas contagens agregadas de elegibilidade e status de sincronização com catraca
              podem trafegar após homologação contratual.
            </div>
            <div>
              3. Contingência obrigatória por QR Code independente e documento oficial na portaria.
            </div>
          </div>
        </Panel>
      </div>
    </main>
  );
}
