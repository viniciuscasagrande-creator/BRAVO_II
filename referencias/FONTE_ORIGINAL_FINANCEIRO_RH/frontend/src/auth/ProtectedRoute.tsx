import React, { ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { usuario } = useAuth();

  if (!usuario) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
        <div className="card shadow-sm border-0 p-4 text-center" style={{ maxWidth: '400px' }}>
          <h5 className="fw-bold text-danger mb-2">Sessão Expirada ou Não Autenticado</h5>
          <p className="text-muted fs-xs mb-3">Por favor, faça login com suas credenciais para acessar o módulo financeiro.</p>
          <a href="/" className="btn btn-primary btn-sm fw-bold">Ir para Login</a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
