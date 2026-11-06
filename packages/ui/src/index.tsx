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
  moduleCode?: string;
  packageBadge?: string;
  categoryLabel?: string;
  statusLabel?: string;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  categoryLabel,
  statusLabel,
  actions,
}: PageHeaderProps) {
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
        {(categoryLabel || statusLabel) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            {categoryLabel && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #bfdbfe',
                }}
              >
                {categoryLabel}
              </span>
            )}
            {statusLabel && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#f8fafc',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                }}
              >
                {statusLabel}
              </span>
            )}
          </div>
        )}
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#475569', maxWidth: '860px', lineHeight: 1.55 }}>
          {subtitle}
        </p>
      </div>
      {actions ? <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>{actions}</div> : null}
    </header>
  );
}

export interface WorkspaceHeaderProps {
  department?: string;
  eyebrow?: string;
  title: string;
  subtitle: string;
  statusBadge?: string;
  actions?: React.ReactNode;
}

export function WorkspaceHeader({
  department,
  eyebrow,
  title,
  subtitle,
  statusBadge,
  actions,
}: WorkspaceHeaderProps) {
  return (
    <PageHeader
      categoryLabel={eyebrow ?? department}
      statusLabel={statusBadge}
      title={title}
      subtitle={subtitle}
      actions={actions}
    />
  );
}

export interface HonestEmptyStateProps {
  title: string;
  description: string;
  governanceNote?: string;
  action?: React.ReactNode;
}

export function HonestEmptyState({ title, description, governanceNote, action }: HonestEmptyStateProps) {
  return (
    <section
      aria-live="polite"
      style={{
        padding: '28px',
        borderRadius: '14px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)',
        marginTop: '16px',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: '#0f766e',
          backgroundColor: '#f0fdfa',
          border: '1px solid #99f6e4',
          borderRadius: '6px',
          padding: '4px 10px',
          marginBottom: '12px',
        }}
      >
        Sem Registros no Momento
      </div>
      <h2 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>{title}</h2>
      <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>{description}</p>
      {action ? <div style={{ marginTop: '16px' }}>{action}</div> : null}
      {governanceNote ? (
        <p
          style={{
            marginTop: '14px',
            marginBottom: 0,
            paddingTop: '12px',
            borderTop: '1px solid #f1f5f9',
            fontSize: '12px',
            color: '#64748b',
          }}
        >
          <strong>Diretriz operacional:</strong> {governanceNote}
        </p>
      ) : null}
    </section>
  );
}

export const OperationalEmptyState = HonestEmptyState;

export interface ErrorStateProps {
  title: string;
  description: string;
  onRetry?: () => void;
  action?: React.ReactNode;
}

export function ErrorState({ title, description, onRetry, action }: ErrorStateProps) {
  return (
    <section
      role="alert"
      style={{
        padding: '24px 28px',
        borderRadius: '14px',
        backgroundColor: '#fff1f2',
        border: '1px solid #fecdd3',
        color: '#881337',
        marginTop: '16px',
      }}
    >
      <div
        style={{
          display: 'inline-block',
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          padding: '4px 10px',
          borderRadius: '6px',
          backgroundColor: '#ffe4e6',
          color: '#be123c',
          marginBottom: '10px',
        }}
      >
        Serviço Indisponível ou Sessão Necessária
      </div>
      <h2 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 700, color: '#881337' }}>{title}</h2>
      <p style={{ margin: 0, fontSize: '14px', color: '#9f1239', lineHeight: 1.6 }}>{description}</p>
      {(onRetry || action) && (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #f43f5e',
                backgroundColor: '#be123c',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Tentar Novamente
            </button>
          )}
          {action}
        </div>
      )}
    </section>
  );
}

export interface MetricSummaryCardProps {
  label: string;
  value: string | number;
  helperText: string;
  tone?: 'default' | 'positive' | 'warning' | 'accent' | 'neutral';
}

export function MetricSummaryCard({ label, value, helperText, tone = 'default' }: MetricSummaryCardProps) {
  const accentColor =
    tone === 'positive'
      ? '#059669'
      : tone === 'warning'
        ? '#d97706'
        : tone === 'accent'
          ? '#2563eb'
          : '#0f172a';
  return (
    <div
      style={{
        padding: '20px',
        borderRadius: '14px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 14px rgba(15, 23, 42, 0.035)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
        {label}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 800, color: accentColor, margin: '10px 0 6px 0', letterSpacing: '-0.02em' }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.45 }}>{helperText}</div>
    </div>
  );
}

export const KpiCard = MetricSummaryCard;

export interface ActionPanelProps {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: React.ReactNode;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}

export function ActionPanel({ title, subtitle, badge, actions, rightSlot, children }: ActionPanelProps) {
  const headerActions = actions ?? rightSlot;
  return (
    <section
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '22px',
        boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '16px',
          paddingBottom: '14px',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{title}</h2>
            {badge && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                }}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>{subtitle}</p>
          )}
        </div>
        {headerActions ? <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{headerActions}</div> : null}
      </div>
      {children}
    </section>
  );
}
