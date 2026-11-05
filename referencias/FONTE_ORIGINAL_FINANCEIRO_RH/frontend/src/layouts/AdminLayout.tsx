import React, { ReactNode } from 'react';
import { FinanceiroLayout } from './FinanceiroLayout';

export const AdminLayout: React.FC<{
  activeRoute: string;
  onNavigate: (route: string) => void;
  children: ReactNode;
}> = ({ activeRoute, onNavigate, children }) => {
  return (
    <FinanceiroLayout activeRoute={activeRoute} onNavigate={onNavigate}>
      <div className="alert alert-warning py-2 px-3 mb-3 d-flex align-items-center justify-content-between fs-xs border-0 rounded shadow-sm">
        <div>
          <i className="ph-crown me-1 text-warning"></i>
          <strong>Modo Administrador Master Ativo:</strong> Acesso irrestrito a configurações fiscais, conciliação e reversões no Ledger.
        </div>
        <span className="badge bg-warning text-dark">MASTER ADMIN</span>
      </div>
      {children}
    </FinanceiroLayout>
  );
};

export default AdminLayout;
