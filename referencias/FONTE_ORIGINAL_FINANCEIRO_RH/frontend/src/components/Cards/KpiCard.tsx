import React from 'react';

interface KpiCardProps {
  titulo: string;
  valor: string;
  subtexto?: string;
  variacao?: string;
  isPositivo?: boolean;
  corBorda?: 'primary' | 'success' | 'warning' | 'danger' | 'secondary';
  icone?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  titulo,
  valor,
  subtexto,
  variacao,
  isPositivo = true,
  corBorda = 'primary',
  icone
}) => {
  return (
    <div className={`card shadow-sm border-0 p-3 bg-white border-start border-${corBorda} border-4 h-100`}>
      <div className="d-flex justify-content-between align-items-start">
        <span className="fs-xxs text-uppercase fw-bold text-muted">{titulo}</span>
        {icone && <i className={`${icone} text-${corBorda} fs-5`}></i>}
      </div>
      <h3 className="fw-bold text-dark mt-1 mb-0">{valor}</h3>
      {variacao && (
        <span className={`fs-xxs fw-bold mt-1 d-block ${isPositivo ? 'text-success' : 'text-danger'}`}>
          {isPositivo ? '↑' : '↓'} {variacao}
        </span>
      )}
      {subtexto && <span className="fs-xxs text-muted mt-1 d-block">{subtexto}</span>}
    </div>
  );
};

export default KpiCard;
