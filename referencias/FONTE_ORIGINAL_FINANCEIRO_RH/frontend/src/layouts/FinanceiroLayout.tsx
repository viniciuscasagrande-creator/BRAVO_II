/**
 * Layout do Financeiro Disk (Backoffice Enterprise)
 * Gerencia a navegação pelos 10 domínios, a busca global e a Central de Aprovações
 */

import React, { useState } from 'react';
import { HeaderFinanceiro } from '../components/Header/HeaderFinanceiro';
import { menuFinanceiro } from '../financeiro/menuFinanceiro';
import { useAuth } from '../auth/AuthContext';

interface FinanceiroLayoutProps {
  children?: React.ReactNode;
  activeRoute?: string;
  onNavigate?: (route: string) => void;
}

export const FinanceiroLayout: React.FC<FinanceiroLayoutProps> = ({ children, activeRoute = "/financeiro/dashboard", onNavigate }) => {
  const { contextoFinanceiro } = useAuth();
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    'fin-aprovacoes': true,
    'fin-produtores': true
  });

  const toggleSubmenu = (id: string) => {
    setOpenSubmenus(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="d-flex flex-column min-vh-100" style={{ background: '#f8fafc' }}>
      {/* Header Global com Busca e Contexto de Produtor/Evento */}
      <HeaderFinanceiro />

      {/* Layout com Sidebar e Viewport */}
      <div className="d-flex flex-row flex-grow-1" style={{ marginTop: '64px' }}>
        
        {/* Sidebar do Financeiro Disk */}
        <aside className="sidebar sidebar-dark sidebar-main" style={{ width: '270px', background: '#181b22', flexShrink: 0, minHeight: 'calc(100vh - 64px)' }}>
          <div className="p-3 border-bottom border-white border-opacity-10 d-flex align-items-center justify-content-between">
            <span className="fs-xxs text-uppercase fw-bold text-muted" style={{ letterSpacing: '0.5px' }}>
              Módulos Backoffice
            </span>
            <span className="badge bg-danger rounded-pill fs-xxs">17 Pendentes</span>
          </div>

          {/* Lista de Navegação do Menu Financeiro */}
          <ul className="nav nav-sidebar flex-column gap-1 p-2" style={{ listStyle: 'none' }}>
            {menuFinanceiro.map(item => {
              const hasSub = item.subitens && item.subitens.length > 0;
              const isOpen = openSubmenus[item.id];
              const isActive = activeRoute === item.rota;

              return (
                <li key={item.id} className="nav-item">
                  <a
                    href="#"
                    className={`nav-link d-flex align-items-center gap-2 p-2 rounded text-decoration-none ${isActive ? 'bg-primary text-white fw-bold' : 'text-secondary'}`}
                    style={{ fontSize: '13px' }}
                    onClick={(e) => {
                      e.preventDefault();
                      if (hasSub) {
                        toggleSubmenu(item.id);
                      } else if (onNavigate) {
                        onNavigate(item.rota);
                      }
                    }}
                  >
                    <i className={`${item.icone} fs-5`}></i>
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className={`badge bg-${item.badgeCor || 'primary'} rounded-pill ms-auto fs-xxs`}>
                        {item.badge}
                      </span>
                    )}
                    {hasSub && (
                      <i className={`ph-caret-right ms-auto fs-xxs transition-transform ${isOpen ? 'rotate-90' : ''}`}></i>
                    )}
                  </a>

                  {hasSub && isOpen && (
                    <ul className="nav-group-sub ps-3 mt-1" style={{ listStyle: 'none' }}>
                      {item.subitens!.map(sub => (
                        <li key={sub.id} className="nav-item">
                          <a
                            href="#"
                            className={`nav-link py-1 px-2 rounded text-decoration-none d-flex align-items-center justify-content-between ${activeRoute === sub.rota ? 'text-white fw-bold' : 'text-muted'}`}
                            style={{ fontSize: '12px' }}
                            onClick={(e) => {
                              e.preventDefault();
                              if (onNavigate) onNavigate(sub.rota);
                            }}
                          >
                            <span><i className={`${sub.icone} me-1`}></i> {sub.label}</span>
                            {sub.badge && (
                              <span className={`badge bg-${sub.badgeCor || 'secondary'} rounded-pill fs-xxs`}>
                                {sub.badge}
                              </span>
                            )}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Viewport Principal */}
        <main className="flex-grow-1 p-4" style={{ minWidth: 0 }}>
          {/* Barra de Contexto Ativo */}
          {contextoFinanceiro.produtorId && (
            <div className="alert alert-info py-2 px-3 mb-3 d-flex align-items-center justify-content-between fs-xs border-0 rounded shadow-sm">
              <div>
                <i className="ph-info me-1"></i>
                <strong>Filtrando por Produtor:</strong> {contextoFinanceiro.produtorId}
                {contextoFinanceiro.eventoId && (
                  <span> &bull; <strong>Evento:</strong> {contextoFinanceiro.eventoId}</span>
                )}
              </div>
              <button
                className="btn btn-xs btn-outline-primary py-0"
                onClick={() => onNavigate && onNavigate('/financeiro/dashboard')}
              >
                Limpar Filtro
              </button>
            </div>
          )}

          {children}
        </main>

      </div>
    </div>
  );
};
