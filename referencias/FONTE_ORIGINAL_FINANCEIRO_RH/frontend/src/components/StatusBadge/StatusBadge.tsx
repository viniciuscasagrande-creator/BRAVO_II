import React from 'react';
import { StatusSolicitacao } from '../../types';
import { getStatusLabel, getStatusBadgeClass } from '../../utils/formatters';

interface StatusBadgeProps {
  status: StatusSolicitacao;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const label = getStatusLabel(status);
  const badgeClass = getStatusBadgeClass(status);

  return (
    <span className={`badge rounded-pill px-2 py-1 fs-xxs fw-semibold ${badgeClass} ${className}`}>
      {label}
    </span>
  );
};

export default StatusBadge;
