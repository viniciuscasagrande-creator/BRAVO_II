import React, { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { PerfilUsuario } from '../types';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { usuario } = useAuth();

  if (!usuario) {
    return (
      <div className="alert alert-danger m-4">
        Acesso restrito. Faça login para continuar.
      </div>
    );
  }

  return <>{children}</>;
};

interface RoleRouteProps {
  allowedRoles: PerfilUsuario[];
  children: ReactNode;
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles, children }) => {
  const { usuario, perfil } = useAuth();

  if (!usuario) {
    return (
      <div className="alert alert-danger m-4">
        Acesso restrito. Faça login para continuar.
      </div>
    );
  }

  if (!allowedRoles.includes(perfil)) {
    return (
      <div className="container py-5 text-center">
        <div className="card shadow-sm border-0 p-5 mx-auto" style={{ maxWidth: '500px' }}>
          <h4 className="text-danger fw-bold mb-2">403 — Acesso Não Autorizado</h4>
          <p className="text-muted fs-sm">
            Seu perfil atual (<strong>{perfil}</strong>) não possui permissão para acessar este módulo.
          </p>
          <div className="alert alert-warning fs-xs text-start">
            <strong>Isolamento Multi-Tenant Ativo:</strong> Produtores têm acesso restrito aos seus próprios eventos e saldos. O Financeiro Disk possui visão transversal.
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
