'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { EventSummary, get } from '../../../lib/bravo-api';
import { Field, Head, Notice, Panel } from '../../../components/bravo-p06';

const real = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PagamentosConfiguracoesPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState<'PAGBANK' | 'REDE'>('PAGBANK');
  const [method, setMethod] = useState<'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO'>('CARTAO_CREDITO');
  const [installments, setInstallments] = useState(1);
  const [nominalCents, setNominalCents] = useState(10000);
  const [mdrBps, setMdrBps] = useState(299);
  const [diskFeeBps, setDiskFeeBps] = useState(1200);

  useEffect(() => {
    get<EventSummary[]>('eventos')
      .then(setEvents)
      .catch((e) => setError((e as Error).message));
  }, []);

  const mdrCents = Math.round((nominalCents * mdrBps) / 10000);
  const diskFeeCents = Math.round((nominalCents * diskFeeBps) / 10000);
  const netProducerCents = Math.max(0, nominalCents - mdrCents);

  return (
    <main className="b6">
      <Head
        title="PED-07 · Métodos de Pagamento, Adquirentes, Parcelamento e Simulador MDR"
        description="Parametrização de adquirentes homologadas (PagBank e Rede), meios de pagamento e simulação financeira sem transação real."
        action={
          <div className="b6-actions">
            <Link className="b6-btn b6-btn-secondary" href="/pagamentos">
              Tentativas de Pagamento
            </Link>
            <Link
              className="b6-btn b6-btn-secondary"
              href="/financeiro/operacoes/gateways/mdr-taxas"
            >
              Matriz MDR Financeiro
            </Link>
          </div>
        }
      />
      <Notice text={error} error />
      <div className="bravo-warning">
        Simulador determinístico em centavos inteiros. Nenhuma cobrança externa ou alteração de captura
        bancária é disparada nesta tela (`ENABLE_REAL_PAYMENTS=false`).
      </div>

      <div className="b6-grid" style={{ marginTop: 18 }}>
        <Panel title="Parâmetros de simulação de tarifa e MDR">
          <div className="b6-stack">
            <Field name="Adquirente / Gateway">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as 'PAGBANK' | 'REDE')}
              >
                <option value="PAGBANK">PAGBANK (PIX e Cartão)</option>
                <option value="REDE">REDE (Cartão Crédito/Débito)</option>
              </select>
            </Field>
            <Field name="Meio de pagamento">
              <select
                value={method}
                onChange={(e) =>
                  setMethod(e.target.value as 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO')
                }
              >
                <option value="PIX">PIX</option>
                <option value="CARTAO_CREDITO">CARTAO_CREDITO</option>
                <option value="CARTAO_DEBITO">CARTAO_DEBITO</option>
              </select>
            </Field>
            <Field name="Parcelas (1–12)">
              <input
                type="number"
                min={1}
                max={12}
                value={installments}
                onChange={(e) => setInstallments(Number(e.target.value))}
              />
            </Field>
            <Field name="Valor nominal do ingresso (centavos)">
              <input
                type="number"
                min={100}
                value={nominalCents}
                onChange={(e) => setNominalCents(Number(e.target.value))}
              />
            </Field>
            <Field name="Taxa MDR da adquirente (bps: 299 = 2,99%)">
              <input
                type="number"
                min={0}
                max={2000}
                value={mdrBps}
                onChange={(e) => setMdrBps(Number(e.target.value))}
              />
            </Field>
            <Field name="Taxa Disk do evento (bps: 1200 = 12,00%)">
              <input
                type="number"
                min={0}
                max={5000}
                value={diskFeeBps}
                onChange={(e) => setDiskFeeBps(Number(e.target.value))}
              />
            </Field>
          </div>
        </Panel>

        <Panel title="Decomposição contábil simulada (3 naturezas)">
          <div className="b6-sublist">
            <div>
              <strong>Valor de face (obrigação base):</strong> {real(nominalCents)}
            </div>
            <div>
              <strong>Taxa Disk contratual (receita Disk):</strong> {real(diskFeeCents)}
            </div>
            <div>
              <strong>Total cobrado do comprador (1. Recebimento bruto):</strong>{' '}
              {real(nominalCents + diskFeeCents)}
            </div>
            <div>
              <strong>Custo MDR estimado ({provider} · {installments}x):</strong> {real(mdrCents)}
            </div>
            <div>
              <strong>Líquido estimado pós-MDR (2. Obrigação líquida):</strong>{' '}
              {real(netProducerCents)}
            </div>
            <div>
              <strong>Eventos ativos no escopo:</strong> {events.length}
            </div>
          </div>
        </Panel>
      </div>
    </main>
  );
}
