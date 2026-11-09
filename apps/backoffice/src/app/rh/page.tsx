'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BravoApiClient } from '@bravo-ii/sdk';
import type {
  CatalogFunctionItemDto,
  CatalogSummaryDto,
  CostCenterDto,
  EventSummaryViewDto,
  RhEmployeeDto,
  RhGeofenceDto,
  RhPaymentBatchDto,
  RhTimePunchDto,
} from '@bravo-ii/contracts';
import { HonestEmptyState, PageHeader } from '@bravo-ii/ui';
import { useBravoSession } from '../../context/session-context';

const API_BASE_URL = '';

export default function RhDiskPage() {
  const { actor, sessionToken, hasPermission } = useBravoSession();
  const canReadRh = hasPermission('rh:read') || hasPermission('rh:self-read');
  const canWriteRh = hasPermission('rh:write');
  const canRequestPayment = hasPermission('rh:request-payment');
  const canPunchTime = hasPermission('rh:ponto-write');

  const client = useMemo(
    () => new BravoApiClient({ baseUrl: API_BASE_URL, sessionToken: sessionToken ?? undefined }),
    [sessionToken]
  );

  const [catalog, setCatalog] = useState<CatalogSummaryDto | null>(null);
  const [employees, setEmployees] = useState<RhEmployeeDto[]>([]);
  const [geofences, setGeofences] = useState<RhGeofenceDto[]>([]);
  const [timePunches, setTimePunches] = useState<RhTimePunchDto[]>([]);
  const [paymentBatches, setPaymentBatches] = useState<RhPaymentBatchDto[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterDto[]>([]);
  const [events, setEvents] = useState<EventSummaryViewDto[]>([]);

  const [selectedSubgroup, setSelectedSubgroup] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states: Colaborador (#108 / #114)
  const [matricula, setMatricula] = useState('');
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [contractType, setContractType] = useState<
    'CLT' | 'INTERMITENTE' | 'FREELANCER_EVENTO' | 'PJ' | 'ESTAGIO'
  >('CLT');
  const [department, setDepartment] = useState('Operações & Eventos');
  const [roleTitle, setRoleTitle] = useState('Analista de Operações');
  const [baseSalaryCents, setBaseSalaryCents] = useState(450000);
  const [admittedAt, setAdmittedAt] = useState('2026-11-01');

  // Form states: Geofence & Disk Ponto (#127 / #128)
  const [geoCode, setGeoCode] = useState('');
  const [geoName, setGeoName] = useState('');
  const [geoLat, setGeoLat] = useState(-25.4284);
  const [geoLng, setGeoLng] = useState(-49.2733);
  const [geoRadius, setGeoRadius] = useState(150);

  const [punchEmployeeId, setPunchEmployeeId] = useState('');
  const [punchGeofenceId, setPunchGeofenceId] = useState('');
  const [punchType, setPunchType] = useState<'ENTRADA' | 'PAUSA_INICIO' | 'PAUSA_FIM' | 'SAIDA'>('ENTRADA');
  const [punchLat, setPunchLat] = useState(-25.4284);
  const [punchLng, setPunchLng] = useState(-49.2733);

  // Form states: Lote RH → Financeiro (#119 / #137 / #140 / #147)
  const [batchCode, setBatchCode] = useState('');
  const [originType, setOriginType] = useState<'FOLHA' | 'EQUIPE_EVENTO' | 'REEMBOLSO_RH'>('FOLHA');
  const [competencia, setCompetencia] = useState('2026-11');
  const [costCenterId, setCostCenterId] = useState('');
  const [batchEventId, setBatchEventId] = useState('');
  const [headcount, setHeadcount] = useState(12);
  const [grossAmountCents, setGrossAmountCents] = useState(5400000);
  const [deductionsAmountCents, setDeductionsAmountCents] = useState(600000);
  const [encargosAmountCents, setEncargosAmountCents] = useState(1200000);
  const [netAmountCents, setNetAmountCents] = useState(4800000);

  const loadRhData = useCallback(async () => {
    if (!canReadRh || !sessionToken) return;
    try {
      setErrorMessage(null);
      const [catRes, empRes, geoRes, punchRes, batchRes, ccRes, evRes] = await Promise.all([
        client.getCatalogSummary('RH'),
        client.listRhEmployees(),
        client.listRhGeofences(),
        client.listRhTimePunches(),
        client.listRhPaymentBatches(),
        client.listCostCenters(),
        client.listAuthorizedEvents(),
      ]);
      setCatalog(catRes);
      setEmployees(empRes.items);
      setGeofences(geoRes.items);
      setTimePunches(punchRes.items);
      setPaymentBatches(batchRes.items);
      setCostCenters(ccRes.items);
      setEvents(evRes.items);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao carregar dados do RH & DP Disk.');
    }
  }, [canReadRh, sessionToken, client]);

  useEffect(() => {
    void loadRhData();
  }, [loadRhData]);

  const subgroups = useMemo(() => {
    if (!catalog) return [];
    const set = new Set<string>();
    for (const item of catalog.items) {
      set.add(item.subgrupoTitulo ?? 'VISÃO GERAL E APROVAÇÕES');
    }
    return Array.from(set);
  }, [catalog]);

  const filteredCatalogItems = useMemo((): CatalogFunctionItemDto[] => {
    if (!catalog) return [];
    return catalog.items.filter((item) => {
      const subLabel = item.subgrupoTitulo ?? 'VISÃO GERAL E APROVAÇÕES';
      const matchSub = selectedSubgroup === 'TODOS' || subLabel === selectedSubgroup;
      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        item.itemTitulo.toLowerCase().includes(q) ||
        subLabel.toLowerCase().includes(q) ||
        item.rota.toLowerCase().includes(q) ||
        String(item.numero).includes(q);
      return matchSub && matchQuery;
    });
  }, [catalog, selectedSubgroup, searchQuery]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMessage(null);
      setStatusMessage(null);
      const created = await client.createRhEmployee({
        matricula,
        fullName,
        cpf,
        email,
        contractType,
        department,
        roleTitle,
        baseSalaryCents: Number(baseSalaryCents),
        admittedAt,
      });
      setMatricula('');
      setFullName('');
      setCpf('');
      setEmail('');
      setPunchEmployeeId(created.id);
      setStatusMessage(`Colaborador ${created.matricula} cadastrado no PostgreSQL (CPF mascarado: ${created.cpfMasked}).`);
      await loadRhData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao cadastrar colaborador.');
    }
  };

  const handleCreateGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMessage(null);
      setStatusMessage(null);
      const created = await client.createRhGeofence({
        code: geoCode,
        name: geoName,
        latitude: Number(geoLat),
        longitude: Number(geoLng),
        radiusMeters: Number(geoRadius),
      });
      setGeoCode('');
      setGeoName('');
      setPunchGeofenceId(created.id);
      setStatusMessage(`Cerca virtual ${created.code} (${created.radiusMeters}m) registrada.`);
      await loadRhData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao criar cerca virtual.');
    }
  };

  const handleRecordTimePunch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMessage(null);
      setStatusMessage(null);
      const punch = await client.recordRhTimePunch({
        employeeId: punchEmployeeId,
        geofenceId: punchGeofenceId,
        punchType,
        latitude: Number(punchLat),
        longitude: Number(punchLng),
        accuracyMeters: 10,
        idempotencyKey: `ponto-${Date.now()}`,
      });
      setStatusMessage(
        `Ponto NSR #${punch.nsr} registrado a ${punch.distanceMeters}m da cerca -> Status: ${punch.validationStatus} (Hash Portaria 671: ${punch.authenticityHash.slice(0, 16)}...)`
      );
      await loadRhData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao registrar ponto.');
    }
  };

  const handleCreatePaymentBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMessage(null);
      setStatusMessage(null);
      const batch = await client.createRhPaymentBatch({
        batchCode,
        originType,
        competencia,
        costCenterId,
        eventId: originType === 'EQUIPE_EVENTO' ? batchEventId : null,
        headcount: Number(headcount),
        grossAmountCents: Number(grossAmountCents),
        deductionsAmountCents: Number(deductionsAmountCents),
        encargosAmountCents: Number(encargosAmountCents),
        netAmountCents: Number(netAmountCents),
      });
      setBatchCode('');
      setStatusMessage(
        `Lote ${batch.batchCode} enviado ao Financeiro Disk (status: ${batch.status}) via contrato rh.pagamento_aprovado.v1 sem exposição de salários individuais.`
      );
      await loadRhData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao submeter lote de pagamento ao Financeiro.');
    }
  };

  if (!canReadRh) {
    return (
      <div>
        <PageHeader
          title="Recursos Humanos & Departamento Pessoal — RH Disk (45 Opções)"
          moduleCode="RH / DP / DISK PONTO"
          packageBadge="Pacote Mestre RH & DP (Ativo)"
          subtitle="Gestão de pessoas, admissão digital, folha de pagamento, Disk Ponto com geolocalização (Portaria 671), equipes de eventos e integração segregada com o Financeiro Disk."
        />
        <HonestEmptyState
          title="Acesso Restrito ao Perfil RH & DP Disk"
          description={`O perfil ativo (${actor.roles.join(', ')}) não possui permissão para consultar dados trabalhistas ou salários individuais. O Financeiro Disk recebe apenas lotes agregados sem PII.`}
          governanceNote="Proteção LGPD e Segregação de Funções (SoD) ativas no backend (/api/v1/rh/*)."
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <PageHeader
        title="Central de Recursos Humanos e Departamento Pessoal"
        moduleCode="RECURSOS HUMANOS E DP"
        subtitle="Gestão de colaboradores (LGPD), controle de jornada Disk Ponto com geolocalização (Portaria 671), submissão de lotes ao Financeiro Disk e escopo das 45 rotinas do departamento."
      />

      {!sessionToken && (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '8px',
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            color: '#92400e',
            fontSize: '13px',
          }}
        >
          <strong>Autenticação corporativa necessária para persistência:</strong>{' '}
          <Link href="/login" style={{ color: '#b45309', fontWeight: 700 }}>
            Clique aqui para iniciar sessão com sua credencial corporativa autorizada para RH e DP
          </Link>{' '}
          e operar Colaboradores, Disk Ponto e Lotes RH no PostgreSQL.
        </div>
      )}

      {statusMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#dcfce7',
            border: '1px solid #22c55e',
            color: '#166534',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#fee2e2',
            border: '1px solid #ef4444',
            color: '#991b1b',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Seção 1: Cadastro Único de Colaboradores (#108 / #114) & Disk Ponto (#127 / #128) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <section
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '20px',
          }}
        >
          <h2 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
            1. Cadastro Canônico de Colaboradores (#108 / #114 — LGPD)
          </h2>
          {canWriteRh && (
            <form
              onSubmit={(e) => void handleCreateEmployee(e)}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}
            >
              <input
                type="text"
                placeholder="Matrícula (ex.: MAT-1001)"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                required
                style={{ padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
              <input
                type="text"
                placeholder="CPF (11 dígitos)"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                required
                style={{ padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
              <input
                type="text"
                placeholder="Nome Completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                style={{ padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
              <input
                type="email"
                placeholder="E-mail Corporativo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
              <select
                value={contractType}
                onChange={(e) =>
                  setContractType(
                    e.target.value as 'CLT' | 'INTERMITENTE' | 'FREELANCER_EVENTO' | 'PJ' | 'ESTAGIO'
                  )
                }
                style={{ padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              >
                <option value="CLT">CLT</option>
                <option value="INTERMITENTE">Intermitente / Temporário</option>
                <option value="FREELANCER_EVENTO">Freelancer de Evento</option>
                <option value="PJ">Prestador PJ</option>
                <option value="ESTAGIO">Estágio</option>
              </select>
              <input
                type="number"
                placeholder="Salário Base (centavos)"
                value={baseSalaryCents}
                onChange={(e) => setBaseSalaryCents(Number(e.target.value))}
                required
                style={{ padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
              <input
                type="text"
                placeholder="Departamento"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
                style={{ padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
              <input
                type="text"
                placeholder="Cargo"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                required
                style={{ padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
              <button
                type="submit"
                style={{
                  gridColumn: '1 / -1',
                  padding: '8px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Admitir Colaborador no Cadastro Único
              </button>
            </form>
          )}
          <div style={{ fontSize: '12px', color: '#334155', maxHeight: '160px', overflowY: 'auto' }}>
            <strong>Colaboradores Ativos ({employees.length}):</strong>
            <ul style={{ marginTop: '6px', paddingLeft: '18px' }}>
              {employees.map((emp) => (
                <li key={emp.id}>
                  <strong>{emp.matricula}</strong> — {emp.fullName} ({emp.cpfMasked}) · {emp.contractType} ·{' '}
                  {emp.baseSalaryCents !== null
                    ? `R$ ${(emp.baseSalaryCents / 100).toFixed(2)}`
                    : 'Salário Protegido'}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '20px',
          }}
        >
          <h2 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
            2. Disk Ponto & Cercas Virtuais (#127 / #128 — Haversine + Portaria 671)
          </h2>
          {canWriteRh && (
            <form
              onSubmit={(e) => void handleCreateGeofence(e)}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}
            >
              <input
                type="text"
                placeholder="Código Cerca (SEDE-CWB)"
                value={geoCode}
                onChange={(e) => setGeoCode(e.target.value)}
                required
                style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
              <input
                type="text"
                placeholder="Nome Local"
                value={geoName}
                onChange={(e) => setGeoName(e.target.value)}
                required
                style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
              <input
                type="number"
                placeholder="Raio (m)"
                value={geoRadius}
                onChange={(e) => setGeoRadius(Number(e.target.value))}
                required
                style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
              <button
                type="submit"
                style={{
                  gridColumn: '1 / -1',
                  padding: '7px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#334155',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Criar Cerca Virtual (Geofence)
              </button>
            </form>
          )}

          {canPunchTime && (
            <form
              onSubmit={(e) => void handleRecordTimePunch(e)}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}
            >
              <select
                value={punchEmployeeId}
                onChange={(e) => setPunchEmployeeId(e.target.value)}
                required
                style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              >
                <option value="">Colaborador...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.matricula} — {emp.fullName}
                  </option>
                ))}
              </select>
              <select
                value={punchGeofenceId}
                onChange={(e) => setPunchGeofenceId(e.target.value)}
                required
                style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              >
                <option value="">Cerca Virtual...</option>
                {geofences.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.code} ({g.radiusMeters}m)
                  </option>
                ))}
              </select>
              <select
                value={punchType}
                onChange={(e) =>
                  setPunchType(e.target.value as 'ENTRADA' | 'PAUSA_INICIO' | 'PAUSA_FIM' | 'SAIDA')
                }
                style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              >
                <option value="ENTRADA">ENTRADA</option>
                <option value="PAUSA_INICIO">PAUSA_INICIO</option>
                <option value="PAUSA_FIM">PAUSA_FIM</option>
                <option value="SAIDA">SAIDA</option>
              </select>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  type="number"
                  step="0.0001"
                  value={punchLat}
                  onChange={(e) => setPunchLat(Number(e.target.value))}
                  style={{ width: '50%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px' }}
                />
                <input
                  type="number"
                  step="0.0001"
                  value={punchLng}
                  onChange={(e) => setPunchLng(Number(e.target.value))}
                  style={{ width: '50%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px' }}
                />
              </div>
              <button
                type="submit"
                style={{
                  gridColumn: '1 / -1',
                  padding: '7px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#1d4ed8',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Registrar Marcação Disk Ponto (Geolocalização + NSR)
              </button>
            </form>
          )}

          <div style={{ fontSize: '12px', color: '#334155', maxHeight: '120px', overflowY: 'auto' }}>
            <strong>Marcações REP-P ({timePunches.length}):</strong>
            <ul style={{ marginTop: '6px', paddingLeft: '18px' }}>
              {timePunches.map((tp) => (
                <li key={tp.id}>
                  <strong>NSR #{tp.nsr}</strong> · {tp.punchType} · {tp.distanceMeters}m →{' '}
                  <span
                    style={{
                      fontWeight: 700,
                      color: tp.validationStatus === 'VALIDADA' ? '#166534' : '#b91c1c',
                    }}
                  >
                    {tp.validationStatus}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* Seção 2: Geração de Lote de Pagamento RH → Financeiro (#119 / #137 / #147) */}
      <section
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '20px',
        }}
      >
        <h2 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
          3. Ponte RH → Financeiro: Submissão de Lotes de Folha e Equipes de Eventos (Contrato rh.pagamento_aprovado.v1)
        </h2>
        <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#475569' }}>
          O RH calcula e submete lotes consolidados em centavos inteiros por centro de custo (Folha Corporativa sem
          eventId vs Equipe de Evento com eventId obrigatório). Nenhum salário individual, CPF ou prontuário médico é
          exposto na fila financeira.
        </p>

        {canRequestPayment && (
          <form
            onSubmit={(e) => void handleCreatePaymentBatch(e)}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '10px',
              marginBottom: '16px',
            }}
          >
            <input
              type="text"
              placeholder="Código Lote (ex.: FOLHA-2026-11)"
              value={batchCode}
              onChange={(e) => setBatchCode(e.target.value)}
              required
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
            <select
              value={originType}
              onChange={(e) => setOriginType(e.target.value as 'FOLHA' | 'EQUIPE_EVENTO' | 'REEMBOLSO_RH')}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            >
              <option value="FOLHA">FOLHA (Corporativo RH)</option>
              <option value="EQUIPE_EVENTO">EQUIPE_EVENTO (Staff Evento)</option>
              <option value="REEMBOLSO_RH">REEMBOLSO_RH</option>
            </select>
            <input
              type="text"
              placeholder="Competência (YYYY-MM)"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              required
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
            <select
              value={costCenterId}
              onChange={(e) => setCostCenterId(e.target.value)}
              required
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            >
              <option value="">Centro de Custo...</option>
              {costCenters.map((cc) => (
                <option key={cc.id} value={cc.id}>
                  {cc.code} ({cc.centerType})
                </option>
              ))}
            </select>
            {originType === 'EQUIPE_EVENTO' && (
              <select
                value={batchEventId}
                onChange={(e) => setBatchEventId(e.target.value)}
                required
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              >
                <option value="">Evento Vinculado...</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.code} — {ev.title}
                  </option>
                ))}
              </select>
            )}
            <input
              type="number"
              placeholder="Qtd Colaboradores"
              value={headcount}
              onChange={(e) => setHeadcount(Number(e.target.value))}
              required
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
            <input
              type="number"
              placeholder="Líquido Total (centavos)"
              value={netAmountCents}
              onChange={(e) => {
                const v = Number(e.target.value);
                setNetAmountCents(v);
                setGrossAmountCents(v);
              }}
              required
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
            <button
              type="submit"
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#15803d',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Enviar Lote ao Financeiro Disk →
            </button>
          </form>
        )}

        <div style={{ fontSize: '12px', color: '#334155' }}>
          <strong>Lotes Submetidos pelo RH ({paymentBatches.length}):</strong>
          <ul style={{ marginTop: '6px', paddingLeft: '18px' }}>
            {paymentBatches.map((b) => (
              <li key={b.id}>
                <strong>{b.batchCode}</strong> ({b.originType} · Comp. {b.competencia}) — {b.headcount} colab. · R${' '}
                {(b.netAmountCents / 100).toFixed(2)} → Status: <strong>{b.status}</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Seção 3: Matriz Oficial das 45 Opções do RH Disk (8 Subgrupos) */}
      <section
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              4. Matriz Oficial das 45 Opções de Recursos Humanos — RH Disk (8 Subgrupos)
            </h2>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Exibindo {filteredCatalogItems.length} de {catalog?.items.length ?? 45} funções catalogadas (#105 a #149) ·
              0 funções perdidas.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <select
              value={selectedSubgroup}
              onChange={(e) => setSelectedSubgroup(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
              }}
            >
              <option value="TODOS">Todos os 8 Subgrupos ({catalog?.items.length ?? 45})</option>
              {subgroups.map((sg) => (
                <option key={sg} value={sg}>
                  {sg}
                </option>
              ))}
            </select>
            <input
              type="search"
              placeholder="Buscar entre as 45 opções de RH..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                minWidth: '220px',
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '12px',
          }}
        >
          {filteredCatalogItems.map((item) => (
            <Link
              key={item.numero}
              href={item.rota}
              style={{
                display: 'block',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                textDecoration: 'none',
                color: '#0f172a',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7' }}>
                  #{String(item.numero).padStart(3, '0')} · {item.subgrupoTitulo ?? 'VISÃO GERAL RH'}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '999px',
                    fontWeight: 700,
                    backgroundColor:
                      item.statusMigracao === 'TESTADO_HOMOLOGACAO' ? '#dcfce7' : '#f1f5f9',
                    color: item.statusMigracao === 'TESTADO_HOMOLOGACAO' ? '#166534' : '#475569',
                  }}
                >
                  {item.statusMigracao}
                </span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '6px' }}>{item.itemTitulo}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Rota: <code>{item.rota}</code>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
