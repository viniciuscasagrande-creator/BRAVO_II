'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { get, post } from '../../../../lib/bravo-api';
import { Head, Panel, Field, Notice, Empty } from '../../../../components/bravo-p06';

type Producer = {
  id: string;
  legalName: string;
  tradeName?: string;
  cnpj: string;
  email: string;
  phone: string;
  status: string;
  representative: { name?: string; email?: string; role?: string };
  address: {
    street?: string;
    number?: string;
    district?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  documents: {
    id: string;
    documentType: string;
    checksum: string;
    status: string;
    createdAt?: string;
  }[];
  contracts?: {
    id: string;
    contractNumber: string;
    title: string;
    status: string;
    validFrom: string;
    validUntil?: string | null;
  }[];
  contacts?: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    roleType: string;
    isPrimary: boolean;
  }[];
  events: { eventId: string; role: string }[];
};

export function ProdutorDetalheClient() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname() || '';
  const rawId = params?.id;
  const id =
    rawId && rawId !== '__dynamic__'
      ? rawId
      : pathname.split('/').filter(Boolean)[2] || rawId || '';

  const [producer, setProducer] = useState<Producer | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [doc, setDoc] = useState({ documentType: 'CONTRATO_SOCIAL', storageKey: '', checksum: '' });
  const [contractForm, setContractForm] = useState({
    contractNumber: '',
    title: '',
    status: 'ACTIVE',
  });
  const [contactForm, setContactForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    roleType: 'FINANCIAL',
    isPrimary: false,
  });

  const reload = useCallback(() => {
    if (!id || id === '__dynamic__') return Promise.resolve();
    return get<Producer>(`comercial/produtores/${id}`).then(setProducer);
  }, [id]);

  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, [reload]);

  async function act(path: string, body?: unknown) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await post(`comercial/produtores/${id}/${path}`, body);
      await reload();
      setNotice('Operação registrada com auditoria.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!producer)
    return (
      <main className="b6">
        <Head title="Cadastro do produtor" />
        <Notice text={error} error />
        {!error && <p>Carregando cadastro...</p>}
      </main>
    );

  return (
    <main className="b6">
      <Head
        title={producer.legalName}
        description={`CNPJ ${producer.cnpj} · Situação: ${producer.status}`}
      />
      <Notice text={error} error />
      <Notice text={notice} />
      <div className="b6-grid">
        <Panel title="Dados empresariais">
          <p>
            <strong>Nome fantasia:</strong> {producer.tradeName || 'Não informado'}
          </p>
          <p>
            <strong>E-mail:</strong> {producer.email}
          </p>
          <p>
            <strong>Telefone:</strong> {producer.phone}
          </p>
          <p>
            <strong>Endereço:</strong> {producer.address?.street || '—'},{' '}
            {producer.address?.number || '—'}, {producer.address?.district || '—'} —{' '}
            {producer.address?.city || '—'}/{producer.address?.state || '—'}
          </p>
        </Panel>
        <Panel title="Responsável legal">
          <p>{producer.representative?.name || 'Não informado'}</p>
          <p>{producer.representative?.role || ''}</p>
          <p>{producer.representative?.email || ''}</p>
        </Panel>
        <Panel title="Documentação e validação">
          <div className="b6-sublist">
            {producer.documents.map((d) => (
              <div key={d.id}>
                {d.documentType}: <strong>{d.status}</strong>{' '}
                {d.status === 'PENDENTE' && (
                  <button
                    disabled={busy}
                    type="button"
                    onClick={() => void act(`documentos/${d.id}/validar`, { status: 'VALIDADO' })}
                  >
                    Validar documento
                  </button>
                )}
              </div>
            ))}
            {!producer.documents.length && <Empty message="Documentos ainda não associados" />}
          </div>
          <form
            className="b6-stack"
            onSubmit={(e) => {
              e.preventDefault();
              void act('documentos', doc);
            }}
          >
            <Field name="Tipo do documento">
              <input
                required
                value={doc.documentType}
                onChange={(e) => setDoc((s) => ({ ...s, documentType: e.target.value }))}
              />
            </Field>
            <Field name="Referência no storage privado">
              <input
                required
                placeholder="secure://..."
                value={doc.storageKey}
                onChange={(e) => setDoc((s) => ({ ...s, storageKey: e.target.value }))}
              />
            </Field>
            <Field name="SHA-256 do arquivo">
              <input
                required
                value={doc.checksum}
                onChange={(e) => setDoc((s) => ({ ...s, checksum: e.target.value }))}
              />
            </Field>
            <p className="b6-muted">
              O arquivo deve ter sido carregado por serviço seguro do Core. Este formulário não
              substitui o upload autenticado.
            </p>
            <button disabled={busy} className="b6-btn">
              Associar documento
            </button>
          </form>
          <button
            disabled={busy || producer.status === 'APROVADO'}
            className="b6-btn b6-btn-secondary"
            onClick={() => void act('validar', { decision: 'APROVADO' })}
          >
            Aprovar cadastro da produtora
          </button>
        </Panel>
        <Panel title="Contratos comerciais">
          <div className="b6-sublist">
            {(producer.contracts || []).map((c) => (
              <div key={c.id}>
                <strong>{c.contractNumber}</strong> · {c.title} · <span>{c.status}</span>
              </div>
            ))}
            {!(producer.contracts || []).length && (
              <Empty message="Nenhum contrato comercial registrado" />
            )}
          </div>
          <form
            className="b6-stack"
            onSubmit={(e) => {
              e.preventDefault();
              void act('contratos', contractForm);
              setContractForm({ contractNumber: '', title: '', status: 'ACTIVE' });
            }}
          >
            <Field name="Número do contrato (opcional)">
              <input
                placeholder="Ex.: CTR-2026-001"
                value={contractForm.contractNumber}
                onChange={(e) =>
                  setContractForm((s) => ({ ...s, contractNumber: e.target.value }))
                }
              />
            </Field>
            <Field name="Título do instrumento contratual">
              <input
                required
                placeholder="Contrato Guarda-Chuva de Ticketing e Borderô"
                value={contractForm.title}
                onChange={(e) => setContractForm((s) => ({ ...s, title: e.target.value }))}
              />
            </Field>
            <Field name="Status contratual">
              <select
                value={contractForm.status}
                onChange={(e) => setContractForm((s) => ({ ...s, status: e.target.value }))}
              >
                <option value="ACTIVE">ACTIVE (Vigente)</option>
                <option value="DRAFT">DRAFT (Minuta)</option>
                <option value="SUSPENDED">SUSPENDED (Suspenso)</option>
              </select>
            </Field>
            <button disabled={busy} className="b6-btn">
              Registrar contrato
            </button>
          </form>
        </Panel>
        <Panel title="Contatos corporativos e financeiros">
          <div className="b6-sublist">
            {(producer.contacts || []).map((ct) => (
              <div key={ct.id}>
                <strong>{ct.fullName}</strong> ({ct.roleType}) · {ct.email} · {ct.phone}
              </div>
            ))}
            {!(producer.contacts || []).length && (
              <Empty message="Nenhum contato adicional cadastrado" />
            )}
          </div>
          <form
            className="b6-stack"
            onSubmit={(e) => {
              e.preventDefault();
              void act('contatos', contactForm);
              setContactForm({
                fullName: '',
                email: '',
                phone: '',
                roleType: 'FINANCIAL',
                isPrimary: false,
              });
            }}
          >
            <Field name="Nome completo">
              <input
                required
                value={contactForm.fullName}
                onChange={(e) => setContactForm((s) => ({ ...s, fullName: e.target.value }))}
              />
            </Field>
            <Field name="E-mail">
              <input
                required
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm((s) => ({ ...s, email: e.target.value }))}
              />
            </Field>
            <Field name="Telefone">
              <input
                required
                value={contactForm.phone}
                onChange={(e) => setContactForm((s) => ({ ...s, phone: e.target.value }))}
              />
            </Field>
            <Field name="Papel do contato">
              <select
                value={contactForm.roleType}
                onChange={(e) => setContactForm((s) => ({ ...s, roleType: e.target.value }))}
              >
                <option value="FINANCIAL">Financeiro / Repasses</option>
                <option value="COMMERCIAL">Comercial</option>
                <option value="OPERATIONAL">Operacional / Produção</option>
                <option value="LEGAL_REPRESENTATIVE">Representante Legal</option>
              </select>
            </Field>
            <button disabled={busy} className="b6-btn">
              Adicionar contato
            </button>
          </form>
        </Panel>
        <Panel title="Eventos relacionados">
          <div className="b6-sublist">
            {producer.events.map((e) => (
              <div key={e.eventId}>
                <a href={`/eventos/${e.eventId}`}>{e.eventId}</a> · {e.role}
              </div>
            ))}
            {!producer.events.length && <Empty message="Produtor ainda sem evento vinculado" />}
          </div>
        </Panel>
      </div>
    </main>
  );
}
