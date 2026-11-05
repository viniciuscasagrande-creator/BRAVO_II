import React from 'react';

export function formatCurrencyPtBrFromCents(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export function formatDateTimePtBr(isoString: string, timeZone = 'America/Sao_Paulo'): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone,
  }).format(date);
}

export interface PageHeaderProps {
  title: string;
  subtitle: string;
  moduleCode: string;
  packageBadge: string;
}

export function PageHeader({ title, subtitle, moduleCode, packageBadge }: PageHeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '16px',
        paddingBottom: '20px',
        marginBottom: '24px',
        borderBottom: '1px solid #e2e8f0',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              padding: '3px 8px',
              borderRadius: '4px',
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
            }}
          >
            Domínio: {moduleCode}
          </span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: '4px',
              backgroundColor: '#f8fafc',
              color: '#334155',
              border: '1px solid #cbd5e1',
            }}
          >
            {packageBadge}
          </span>
        </div>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>{title}</h1>
        <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#475569', maxWidth: '820px' }}>{subtitle}</p>
      </div>
    </header>
  );
}

export interface HonestEmptyStateProps {
  title: string;
  description: string;
  governanceNote?: string;
}

export function HonestEmptyState({ title, description, governanceNote }: HonestEmptyStateProps) {
  return (
    <section
      aria-live="polite"
      style={{
        padding: '28px',
        borderRadius: '10px',
        backgroundColor: '#ffffff',
        border: '1px dashed #cbd5e1',
        marginTop: '16px',
      }}
    >
      <div
        style={{
          display: 'inline-block',
          fontSize: '12px',
          fontWeight: 700,
          color: '#0f766e',
          backgroundColor: '#f0fdfa',
          border: '1px solid #99f6e4',
          borderRadius: '4px',
          padding: '4px 10px',
          marginBottom: '12px',
        }}
      >
        ESTADO VAZIO REAL — SEM DADOS SINTÉTICOS
      </div>
      <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>{title}</h2>
      <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>{description}</p>
      {governanceNote ? (
        <p
          style={{
            marginTop: '14px',
            marginBottom: 0,
            paddingTop: '12px',
            borderTop: '1px solid #f1f5f9',
            fontSize: '13px',
            color: '#64748b',
          }}
        >
          <strong>Governança BRAVO_II:</strong> {governanceNote}
        </p>
      ) : null}
    </section>
  );
}

export interface MetricSummaryCardProps {
  label: string;
  value: string | number;
  helperText: string;
}

export function MetricSummaryCard({ label, value, helperText }: MetricSummaryCardProps) {
  return (
    <div
      style={{
        padding: '18px',
        borderRadius: '10px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: '8px 0 4px 0' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#64748b' }}>{helperText}</div>
    </div>
  );
}
