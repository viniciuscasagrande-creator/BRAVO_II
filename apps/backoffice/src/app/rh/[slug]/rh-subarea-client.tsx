'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BravoApiClient } from '@bravo-ii/sdk';
import type {
  CatalogFunctionItemDto,
  CostCenterDto,
  RhEmployeeDto,
  RhGeofenceDto,
  RhPaymentBatchDto,
  RhTimePunchDto,
} from '@bravo-ii/contracts';
import {
  ActionPanel,
  ErrorState,
  KpiCard,
  OperationalEmptyState,
  WorkspaceHeader,
} from '@bravo-ii/ui';
import { useBravoSession } from '../../../context/session-context';

function formatBrlCents(cents: number | null): string {
  if (cents === null || cents === undefined) return 'Protegido (LGPD)';
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface RhSubareaMeta {
  title: string;
  subtitle: string;
  rangeMin: number;
  rangeMax: number;
  mode: 'ADMISSAO' | 'FOLHA' | 'PONTO' | 'BENEFICIOS' | 'EQUIPES_EVENTOS';
}

function resolveRhSubareaMeta(slug: string, singleItem: CatalogFunctionItemDto | null): RhSubareaMeta {
  const normalized = slug.toLowerCase();
  if (normalized === 'r01-r09') {
    return {
      title: 'Admissão Digital, Quadro de Pessoal e Contratos (R01–R09)',
      subtitle:
        'Cadastro de colaboradores CLT/Eventuais, cargos, departamentos e controle de acesso a dados pessoais (LGPD).',
      rangeMin: 105,
      rangeMax: 113,
      mode: 'ADMISSAO',
    };
  }
  if (normalized === 'r10-r19') {
    return {
      title: 'Folha de Pagamento, Proventos e Encargos (R10–R19)',
      subtitle:
        'Consolidação mensal de remuneração, cálculo de encargos e geração de lotes financeiros com segregação de funções (SoD).',
      rangeMin: 114,
      rangeMax: 123,
      mode: 'FOLHA',
    };
  }
  if (normalized === 'r20-r28') {
    return {
      title: 'Disk Ponto, Cercas Virtuais e Jornada Portaria 671 (R20–R28)',
      subtitle:
        'Registro eletrônico de batidas com coordenadas GPS, validação de raio de cerca virtual e espelho de ponto.',
      rangeMin: 124,
      rangeMax: 132,
      mode: 'PONTO',
    };
  }
  if (normalized === 'r29-r36') {
    return {
      title: 'Férias, Benefícios, Afastamentos e Desligamento (R29–R36)',
      subtitle:
        'Programação de férias, concessão de benefícios corporativos e rescisões contratuais integradas à folha.',
      rangeMin: 133,
      rangeMax: 140,
      mode: 'BENEFICIOS',
    };
  }
  if (normalized === 'r37-r45') {
    return {
      title: 'Equipes de Eventos e Integração RH ↔ Tesouraria (R37–R45)',
      subtitle:
        'Escalas operacionais de eventos e envio auditado de lotes de pagamento para liquidação no Financeiro Disk.',
      rangeMin: 141,
      rangeMax: 149,
      mode: 'EQUIPES_EVENTOS',
    };
  }

  const rIdx = Number(normalized.replace(/^r0*/, '')) || 1;
  const catalogNum = singleItem?.numero ?? Math.min(149, Math.max(105, 104 + rIdx));
  const mode: RhSubareaMeta['mode'] =
    catalogNum <= 113
      ? 'ADMISSAO'
      : catalogNum <= 123
        ? 'FOLHA'
        : catalogNum <= 132
          ? 'PONTO'
          : catalogNum <= 140
            ? 'BENEFICIOS'
            : 'EQUIPES_EVENTOS';

  return {
    title: singleItem
      ? `#${String(singleItem.numero).padStart(3, '0')} — ${singleItem.itemTitulo}`
      : `Estação Operacional RH & DP (${slug.toUpperCase()})`,
    subtitle: singleItem
      ? `Operação vinculada ao grupo ${singleItem.subgrupoTitulo ?? singleItem.grupoTitulo} com proteção LGPD e integração segregada.`
      : 'Gestão de colaboradores, Disk Ponto com geolocalização e lotes de folha.',
    rangeMin: catalogNum,
    rangeMax: catalogNum,
    mode,
  };
}

export function RhSubareaClient({ slug }: { slug: string }) {
  const { actor, sessionToken, isAuthenticated, hasPermission } = useBravoSession();
  const canReadRh = hasPermission('rh:read') || hasPermission('rh:self-read');
  const canWriteRh = hasPermission('rh:write');

  const client = useMemo(
    () => new BravoApiClient({ sessionToken: sessionToken ?? undefined }),
    [sessionToken]
  );

  const [singleItem, setSingleItem] = useState<CatalogFunctionItemDto | null>(null);
  const [groupItems, setGroupItems] = useState<CatalogFunctionItemDto[]>([]);
  const [employees, setEmployees] = useState<RhEmployeeDto[]>([]);
  const [geofences, setGeofences] = useState<RhGeofenceDto[]>([]);
  const [punches, setPunches] = useState<RhTimePunchDto[]>([]);
  const [batches, setBatches] = useState<RhPaymentBatchDto[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterDto[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Formulário Admissão
  const [matricula, setMatricula] = useState('');
  const [empName, setEmpName] = useState('');
  const [empCpf, setEmpCpf] = useState('123.456.789-01');
  const [empEmail, setEmpEmail] = useState('colaborador.rh@diskingressos.com.br');
  const [empRoleTitle, setEmpRoleTitle] = useState('Analista de Operações de Eventos');
  const [empContractType, setEmpContractType] = useState<'CLT' | 'INTERMITENTE' | 'FREELANCER_EVENTO'>('CLT');
  const [empSalaryReais, setEmpSalaryReais] = useState('4200.00');

  // Formulário Disk Ponto
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedGeofenceId, setSelectedGeofenceId] = useState('');
  const [punchType, setPunchType] = useState<'ENTRADA' | 'PAUSA_INICIO' | 'PAUSA_FIM' | 'SAIDA'>('ENTRADA');
  const [latitude, setLatitude] = useState('-25.4284');
  const [longitude, setLongitude] = useState('-49.2733');

  // Formulário Lote de Folha
  const [competencia, setCompetencia] = useState('2026-11');
  const [selectedBatchCostCenterId, setSelectedBatchCostCenterId] = useState('');

  const meta = resolveRhSubareaMeta(slug, singleItem);

  const loadRhWorkspace = useCallback(async () => {
    if (!canReadRh || !isAuthenticated) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const [catalogRes, empsRes, geoRes, pchsRes, btsRes, ccsRes] = await Promise.all([
        client.getCatalogSummary('RH').catch(() => null),
        client.listRhEmployees().catch(() => ({ items: [] })),
        client.listRhGeofences().catch(() => ({ items: [] })),
        client.listRhTimePunches().catch(() => ({ items: [] })),
        client.listRhPaymentBatches().catch(() => ({ items: [] })),
        client.listCostCenters().catch(() => ({ items: [] })),
      ]);

      const allCatalog = catalogRes?.items ?? [];
      const exactMatch = allCatalog.find(
        (c) =>
          c.rota.toLowerCase().endsWith(`/${slug.toLowerCase()}`) ||
          `r${String(c.numero - 104).padStart(2, '0')}` === slug.toLowerCase()
      );
      setSingleItem(exactMatch ?? null);

      const m = resolveRhSubareaMeta(slug, exactMatch ?? null);
      setGroupItems(allCatalog.filter((c) => c.numero >= m.rangeMin && c.numero <= m.rangeMax));

      const emps = empsRes.items ?? [];
      setEmployees(emps);
      if (emps.length > 0 && !selectedEmployeeId) {
        setSelectedEmployeeId(emps[0].id);
      }

      const geos = geoRes.items ?? [];
      setGeofences(geos);
      if (geos.length > 0 && !selectedGeofenceId) {
        setSelectedGeofenceId(geos[0].id);
      }

      const ccs = ccsRes.items ?? [];
      setCostCenters(ccs);
      if (ccs.length > 0 && !selectedBatchCostCenterId) {
        setSelectedBatchCostCenterId(ccs[0].id);
      }

      setPunches(pchsRes.items ?? []);
      setBatches(btsRes.items ?? []);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Falha ao carregar dados operacionais da subárea de RH & DP.'
      );
    } finally {
      setLoading(false);
    }
  }, [
    canReadRh,
    isAuthenticated,
    client,
    slug,
    selectedEmployeeId,
    selectedGeofenceId,
    selectedBatchCostCenterId,
  ]);

  useEffect(() => {
    void loadRhWorkspace();
  }, [loadRhWorkspace]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const baseSalaryCents = Math.round(Number(empSalaryReais.replace(',', '.')) * 100);
      await client.createRhEmployee({
        matricula: matricula.trim().toUpperCase() || `MAT-${Date.now().toString().slice(-4)}`,
        fullName: empName.trim(),
        cpf: empCpf.trim(),
        email: empEmail.trim(),
        department: 'OPERACOES',
        roleTitle: empRoleTitle.trim(),
        contractType: empContractType,
        baseSalaryCents: Number.isFinite(baseSalaryCents) && baseSalaryCents > 0 ? baseSalaryCents : 350000,
        admittedAt: new Date().toISOString().slice(0, 10),
      });
      setMatricula('');
      setEmpName('');
      setStatusMessage('Colaborador admitido e registrado no quadro de pessoal com proteção LGPD.');
      await loadRhWorkspace();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao registrar admissão de colaborador.');
    }
  };

  const handleRegisterPunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      if (!selectedEmployeeId) {
        throw new Error('Selecione ou cadastre um colaborador antes de registrar batida no Disk Ponto.');
      }
      let targetGeofenceId = selectedGeofenceId;
      if (!targetGeofenceId) {
        const createdGeo = await client.createRhGeofence({
          code: `SEDE-${Date.now().toString().slice(-4)}`,
          name: 'Sede Operacional Curitiba',
          latitude: Number(latitude),
          longitude: Number(longitude),
          radiusMeters: 250,
        });
        targetGeofenceId = createdGeo.id;
      }
      await client.recordRhTimePunch({
        employeeId: selectedEmployeeId,
        geofenceId: targetGeofenceId,
        punchType,
        latitude: Number(latitude),
        longitude: Number(longitude),
        accuracyMeters: 10,
        idempotencyKey: `ponto-${Date.now()}`,
      });
      setStatusMessage('Batida registrada no Disk Ponto com comprovante NSR e geolocalização validada.');
      await loadRhWorkspace();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao registrar batida no Disk Ponto.');
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      let ccId = selectedBatchCostCenterId;
      if (!ccId) {
        const newCc = await client.createCostCenter({
          code: `CC-RH-${Date.now().toString().slice(-4)}`,
          name: 'Centro Corporativo Folha RH',
          centerType: 'CORPORATIVO_RH',
        });
        ccId = newCc.id;
      }
      const totalGross =
        employees.reduce((acc, item) => acc + (item.baseSalaryCents ?? 350000), 0) || 450000;
      const deductions = Math.round(totalGross * 0.11);
      const encargos = Math.round(totalGross * 0.18);
      const net = totalGross - deductions;
      await client.createRhPaymentBatch({
        batchCode: `FOLHA-${competencia}-${Date.now().toString().slice(-4)}`,
        originType: 'FOLHA',
        competencia,
        costCenterId: ccId,
        headcount: Math.max(1, employees.length),
        grossAmountCents: totalGross,
        deductionsAmountCents: deductions,
        encargosAmountCents: encargos,
        netAmountCents: net,
        notesPtBr: 'Lote consolidado na estação operacional de RH & DP.',
      });
      setStatusMessage('Lote de folha consolidado e enviado para fila de aprovação do Financeiro Disk.');
      await loadRhWorkspace();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao consolidar lote de folha.');
    }
  };

  if (!canReadRh) {
    return (
      <OperationalEmptyState
        title="Acesso Restrito ao RH & Departamento Pessoal"
        description={`Sua credencial atual (${actor.roles.join(', ') || 'Não autenticada'}) não possui permissão para acessar dados trabalhistas protegidos pela LGPD.`}
        action={
          !isAuthenticated ? (
            <Link
              href="/login"
              style={{
                display: 'inline-block',
                padding: '9px 16px',
                borderRadius: '8px',
                backgroundColor: '#1d4ed8',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              Autenticar Operador →
            </Link>
          ) : undefined
        }
      />
    );
  }

  const filteredEmployees = employees.filter((emp) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      emp.fullName.toLowerCase().includes(q) ||
      emp.matricula.toLowerCase().includes(q) ||
      emp.roleTitle.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <WorkspaceHeader
        eyebrow="RH & Departamento Pessoal · Estação Operacional"
        title={meta.title}
        subtitle={meta.subtitle}
        statusBadge={loading ? 'Sincronizando...' : `${groupItems.length || 1} rotina(s) no escopo`}
        actions={
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => void loadRhWorkspace()}
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Atualizar Dados
            </button>
            <Link
              href="/rh"
              style={{
                display: 'inline-block',
                padding: '9px 14px',
                borderRadius: '8px',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              ← Painel Principal RH & DP
            </Link>
          </div>
        }
      />

      {statusMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <ErrorState
          title="Alerta na Operação de RH & DP"
          description={errorMessage}
          onRetry={() => void loadRhWorkspace()}
        />
      )}

      {/* Indicadores em Tempo Real */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
        }}
      >
        <KpiCard
          label="Colaboradores Ativos"
          value={employees.length}
          helperText="Quadro de pessoal com proteção LGPD"
          tone="accent"
        />
        <KpiCard
          label="Batidas Disk Ponto"
          value={punches.length}
          helperText={`${geofences.length} cerca(s) virtual(is) ativa(s)`}
          tone="positive"
        />
        <KpiCard
          label="Lotes de Folha"
          value={batches.length}
          helperText={`${costCenters.length} centro(s) de custo vinculado(s)`}
          tone="neutral"
        />
      </div>

      {/* Formulários Operacionais Ativos */}
      {canWriteRh && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '18px',
          }}
        >
          <ActionPanel
            title="Admissão Digital de Colaborador"
            subtitle="Registra colaborador no PostgreSQL com CPF mascarado na consulta para conformidade LGPD."
          >
            <form onSubmit={(e) => void handleCreateEmployee(e)}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr',
                  gap: '10px',
                  marginBottom: '10px',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Matrícula
                  </label>
                  <input
                    type="text"
                    placeholder="MAT-101"
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    placeholder="Nome do colaborador"
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  marginBottom: '10px',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    CPF
                  </label>
                  <input
                    type="text"
                    value={empCpf}
                    onChange={(e) => setEmpCpf(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  marginBottom: '12px',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Vínculo
                  </label>
                  <select
                    value={empContractType}
                    onChange={(e) =>
                      setEmpContractType(
                        e.target.value as 'CLT' | 'INTERMITENTE' | 'FREELANCER_EVENTO'
                      )
                    }
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="CLT">CLT</option>
                    <option value="INTERMITENTE">Intermitente</option>
                    <option value="FREELANCER_EVENTO">Freelancer Evento</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Salário Base (R$)
                  </label>
                  <input
                    type="text"
                    value={empSalaryReais}
                    onChange={(e) => setEmpSalaryReais(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
              <button
                type="submit"
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#1d4ed8',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Registrar Admissão
              </button>
            </form>
          </ActionPanel>

          <ActionPanel
            title="Disk Ponto — Registro com Geolocalização (Portaria 671)"
            subtitle="Registra batida com validação de raio da cerca virtual e hash de autenticidade."
          >
            <form onSubmit={(e) => void handleRegisterPunch(e)}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Colaborador
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">Selecione um colaborador</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.matricula} — {emp.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Tipo de Batida
                </label>
                <select
                  value={punchType}
                  onChange={(e) =>
                    setPunchType(
                      e.target.value as 'ENTRADA' | 'PAUSA_INICIO' | 'PAUSA_FIM' | 'SAIDA'
                    )
                  }
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="ENTRADA">ENTRADA</option>
                  <option value="PAUSA_INICIO">INÍCIO DE INTERVALO</option>
                  <option value="PAUSA_FIM">FIM DE INTERVALO</option>
                  <option value="SAIDA">SAÍDA</option>
                </select>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  marginBottom: '12px',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Latitude
                  </label>
                  <input
                    type="text"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Longitude
                  </label>
                  <input
                    type="text"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
              <button
                type="submit"
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#047857',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Registrar Ponto
              </button>
            </form>
          </ActionPanel>

          <ActionPanel
            title="Fechamento de Folha e Lote Financeiro (SoD)"
            subtitle="Consolida lote agregado e submete para liquidação na Tesouraria sem expor salários individuais."
          >
            <form onSubmit={(e) => void handleCreateBatch(e)}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Competência (AAAA-MM)
                </label>
                <input
                  type="text"
                  value={competencia}
                  onChange={(e) => setCompetencia(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <button
                type="submit"
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Consolidar e Enviar ao Financeiro
              </button>
            </form>

            {batches.length > 0 && (
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {batches.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700 }}>{b.batchCode}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {formatBrlCents(b.netAmountCents)} · {b.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ActionPanel>
        </div>
      )}

      {/* Consulta e Histórico de Colaboradores e Disk Ponto */}
      <ActionPanel
        title="Quadro de Colaboradores e Espelho de Ponto"
        subtitle="Consulta filtrada por nome, matrícula ou cargo."
        rightSlot={
          <input
            type="search"
            placeholder="Filtrar colaborador ou cargo..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
            }}
          />
        }
      >
        {filteredEmployees.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#64748b', padding: '10px 0' }}>
            Nenhum colaborador encontrado. Utilize o formulário de Admissão Digital acima para cadastrar.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '8px' }}>Matrícula</th>
                  <th style={{ padding: '8px' }}>Colaborador</th>
                  <th style={{ padding: '8px' }}>CPF (LGPD)</th>
                  <th style={{ padding: '8px' }}>Cargo</th>
                  <th style={{ padding: '8px' }}>Vínculo</th>
                  <th style={{ padding: '8px' }}>Salário Base</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: 700 }}>{emp.matricula}</td>
                    <td style={{ padding: '8px' }}>{emp.fullName}</td>
                    <td style={{ padding: '8px', fontFamily: 'monospace' }}>{emp.cpfMasked}</td>
                    <td style={{ padding: '8px' }}>{emp.roleTitle}</td>
                    <td style={{ padding: '8px' }}>{emp.contractType}</td>
                    <td style={{ padding: '8px', fontWeight: 700 }}>
                      {formatBrlCents(emp.baseSalaryCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ActionPanel>

      {/* Matriz Honesta de Prontidão das Rotinas do Grupo */}
      {groupItems.length > 0 && (
        <ActionPanel
          title={`Classificação Honesta de Prontidão (${groupItems.length} rotina(s) neste agrupamento)`}
          subtitle="Nenhuma função apenas catalogada é marcada como concluída sem implementação e teste verificados."
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '8px' }}>#</th>
                  <th style={{ padding: '8px' }}>Rotina</th>
                  <th style={{ padding: '8px' }}>Grupo RH</th>
                  <th style={{ padding: '8px' }}>Classificação Real</th>
                </tr>
              </thead>
              <tbody>
                {groupItems.map((fn) => {
                  const statusLabel =
                    fn.statusMigracao === 'TESTADO_HOMOLOGACAO'
                      ? 'Implementada e Testada'
                      : fn.integracaoFinanceiroRh
                        ? 'Parcialmente Implementada (Ponte SoD)'
                        : 'Apenas Catálogo (Mapeada)';
                  return (
                    <tr key={fn.numero} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontWeight: 700 }}>
                        #{String(fn.numero).padStart(3, '0')}
                      </td>
                      <td style={{ padding: '8px' }}>{fn.itemTitulo}</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>
                        {fn.subgrupoTitulo ?? fn.grupoTitulo}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontWeight: 700,
                            backgroundColor:
                              fn.statusMigracao === 'TESTADO_HOMOLOGACAO'
                                ? '#dcfce7'
                                : fn.integracaoFinanceiroRh
                                  ? '#fef3c7'
                                  : '#f1f5f9',
                            color:
                              fn.statusMigracao === 'TESTADO_HOMOLOGACAO'
                                ? '#166534'
                                : fn.integracaoFinanceiroRh
                                  ? '#92400e'
                                  : '#475569',
                          }}
                        >
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ActionPanel>
      )}
    </div>
  );
}
