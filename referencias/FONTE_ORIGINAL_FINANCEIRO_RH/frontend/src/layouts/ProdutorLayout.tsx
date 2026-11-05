/**
 * Layout do Portal do Produtor
 * Implementa o menu canônico reduzido de 8 itens e o isolamento de tenant
 */

import React from 'react';
import { menuProdutor } from '../produtor/menuProdutor';
import { useAuth } from '../auth/AuthContext';

interface ProdutorLayoutProps {
  children?: React.ReactNode;
  activeRoute?: string;
  onNavigate?: (route: string) => void;
  onOpenSolicitarRepasse?: () => void;
}

export const ProdutorLayout: React.FC<ProdutorLayoutProps> = ({
  children,
  activeRoute = "/produtor/dashboard",
  onNavigate,
  onOpenSolicitarRepasse
}) => {
  const { usuario, produtorAtivo, loginAs } = useAuth();

  return (
    <div className="d-flex flex-column min-vh-100" style={{ background: '#f8fafc' }}>
      
      {/* Top Navbar do Produtor */}
      <header className="navbar navbar-dark navbar-expand-lg border-bottom border-bottom-white border-opacity-10 fixed-top" style={{ background: '#16191f', minHeight: '64px', zIndex: 1020 }}>
        <div className="container-fluid px-3 d-flex align-items-center justify-content-between">
          
          <div className="d-flex align-items-center gap-3">
            <span className="fw-bold fs-5 tracking-wider text-white">DISK<span className="text-primary">INGRESSOS</span></span>
            <span className="badge bg-primary text-white fw-bold fs-xxs ms-1 px-2 py-1">PORTAL DO PRODUTOR</span>
          </div>

          {/* Indicador de Produtor & Saldo Disponível */}
          <div className="d-flex align-items-center gap-3">
            <div className="d-none d-md-flex flex-column text-end">
              <span className="fs-xxs text-uppercase text-muted fw-bold">Saldo Disponível Imediato</span>
              <span className="fw-bold text-success fs-base">R$ 310.000,00</span>
            </div>

            <button
              className="btn btn-sm btn-success d-flex align-items-center gap-1 shadow-sm fw-bold"
              onClick={onOpenSolicitarRepasse}
            >
              <i className="ph-hand-coins"></i> <span>Solicitar Repasse</span>
            </button>

            {/* Alternador de Perfil Demo */}
            <div className="dropdown">
              <button className="btn btn-xs rounded-pill d-flex align-items-center gap-1 border-0 text-white" style={{ background: 'rgba(255,255,255,0.12)', padding: '6px 12px', fontSize: '12px' }} data-bs-toggle="dropdown">
                <i className="ph-user text-primary"></i>
                <span>{produtorAtivo?.razaoSocial || 'Produtora ABC'} ({usuario?.nome})</span>
                <i className="ph-caret-down fs-xxs ms-1 opacity-50"></i>
              </button>
              <div className="dropdown-menu dropdown-menu-end shadow border-0" style={{ borderRadius: '8px', minWidth: '220px' }}>
                <div className="px-3 py-2 text-muted fs-xxs fw-bold text-uppercase border-bottom">Alternar Perfil Demo</div>
                <a href="#" className="dropdown-item py-2 fs-xs" onClick={() => loginAs("PRODUTOR", "prod-abc")}>
                  <i className="ph-user text-primary me-2"></i> Produtora ABC (João Silva)
                </a>
                <a href="#" className="dropdown-item py-2 fs-xs" onClick={() => loginAs("FINANCEIRO")}>
                  <i className="ph-shield-check text-success me-2"></i> Financeiro Disk (Karine)
                </a>
                <a href="#" className="dropdown-item py-2 fs-xs" onClick={() => loginAs("ADMINISTRADOR")}>
                  <i className="ph-crown text-warning me-2"></i> Adm Financeiro (Karine)
                </a>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* Layout com Sidebar e Viewport */}
      <div className="d-flex flex-row flex-grow-1" style={{ marginTop: '64px' }}>
        
        {/* Sidebar do Produtor (Menu Canônico Reduzido) */}
        <aside className="sidebar sidebar-dark sidebar-main" style={{ width: '270px', background: '#181b22', flexShrink: 0, minHeight: 'calc(100vh - 64px)' }}>
          {/* Card de Identificação do Produtor */}
          <div className="p-3 border-bottom border-white border-opacity-10 d-flex align-items-center gap-2">
            <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white fs-xs" style={{ width: '36px', height: '36px', background: '#2563eb' }}>
              ABC
            </div>
            <div className="text-truncate">
              <div className="fw-bold text-white fs-xs text-truncate">{produtorAtivo?.razaoSocial}</div>
              <div className="text-muted fs-xxs">{produtorAtivo?.cnpj}</div>
            </div>
          </div>

          {/* Lista do Menu Canônico do Produtor */}
          <ul className="nav nav-sidebar flex-column gap-1 p-2" style={{ listStyle: 'none' }}>
            {menuProdutor.map(item => {
              const isActive = activeRoute.startsWith(item.rota);
              const hasSub = item.subitens && item.subitens.length > 0;

              return (
                <li key={item.id} className="nav-item">
                  <a
                    href="#"
                    className={`nav-link d-flex align-items-center gap-2 p-2 rounded text-decoration-none ${isActive ? 'bg-primary text-white fw-bold' : 'text-secondary'}`}
                    style={{ fontSize: '13px' }}
                    onClick={(e) => {
                      e.preventDefault();
                      if (onNavigate) onNavigate(item.rota);
                    }}
                  >
                    <i className={`${item.icone} fs-5`}></i>
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className={`badge bg-${item.badgeCor || 'primary'} rounded-pill ms-auto fs-xxs`}>
                        {item.badge}
                      </span>
                    )}
                  </a>

                  {hasSub && (
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
          {children}
        </main>

      </div>
    </div>
  );
};
