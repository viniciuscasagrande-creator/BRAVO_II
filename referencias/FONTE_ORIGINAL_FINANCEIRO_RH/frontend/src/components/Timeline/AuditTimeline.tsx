import React from 'react';

export interface AuditEventItem {
  id: string;
  dataHora: string;
  usuario: string;
  perfil: string;
  acao: string;
  detalhe?: string;
}

interface AuditTimelineProps {
  eventos: AuditEventItem[];
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ eventos }) => {
  return (
    <div className="audit-timeline py-2">
      <div className="d-flex flex-column gap-3">
        {eventos.map((evt, idx) => (
          <div key={evt.id || idx} className="d-flex gap-3 position-relative">
            <div className="d-flex flex-column align-items-center" style={{ width: '28px' }}>
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-white shadow-sm"
                style={{ width: '24px', height: '24px', background: '#3b82f6', fontSize: '11px', flexShrink: 0 }}
              >
                <i className="ph-check"></i>
              </div>
              {idx < eventos.length - 1 && (
                <div className="flex-grow-1 border-start border-2 border-primary border-opacity-25 my-1" style={{ width: '2px' }}></div>
              )}
            </div>
            <div className="flex-grow-1 pb-2">
              <div className="d-flex justify-content-between align-items-baseline">
                <strong className="fs-xs text-dark">{evt.acao}</strong>
                <span className="fs-xxs text-muted font-monospace">{evt.dataHora}</span>
              </div>
              <div className="fs-xxs text-muted">
                Por <strong>{evt.usuario}</strong> ({evt.perfil})
              </div>
              {evt.detalhe && (
                <div className="p-2 rounded bg-light border mt-1 fs-xxs text-dark">
                  {evt.detalhe}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AuditTimeline;
