import React, { useState } from 'react';
import { MenuItem } from '../../produtor/menuProdutor';

interface SidebarProps {
  menu: MenuItem[];
  activeRoute: string;
  onNavigate: (route: string) => void;
  perfil: 'PRODUTOR' | 'FINANCEIRO' | 'ADMINISTRADOR';
  produtorAtivo?: any;
  usuario?: any;
  pendingCount?: number;
  onOpenSolicitarRepasse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  menu,
  activeRoute,
  onNavigate,
  perfil,
  produtorAtivo,
  usuario,
  pendingCount = 17,
  onOpenSolicitarRepasse
}) => {
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    'repasses': true,
    'antecipacoes': false,
    'borderos': false,
    'fin-produtores': true,
    'fin-eventos': false,
    'fin-solicitacoes': false,
    'fin-aprovacoes': true
  });

  const toggleSubmenu = (id: string) => {
    setOpenSubmenus(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const isMaster = perfil === 'ADMINISTRADOR';
  const isDisk = perfil === 'FINANCEIRO';

  return (
    <aside className="app-sidebar sidebar sidebar-dark sidebar-main" id="appSidebar">
      <div className="sidebar-content d-flex flex-column h-100">
        
        {/* Brand Header */}
        <div className="sidebar-brand-header p-3 d-flex align-items-center justify-content-between border-bottom border-white border-opacity-10">
          <div className="d-flex align-items-center gap-2">
            <span className="fw-bold fs-5 tracking-wider text-white">DISK<span className="text-primary">INGRESSOS</span></span>
          </div>
        </div>

        {/* Identification Context Card */}
        <div className="px-3 py-2 border-bottom border-white border-opacity-10" id="sidebar-producer-card">
          <div className="d-flex align-items-center gap-2 p-2 rounded" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div
              className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white fs-xs"
              style={{
                width: '32px',
                height: '32px',
                background: isMaster ? '#e11d48' : (isDisk ? '#10b981' : '#2563eb')
              }}
            >
              {isMaster ? 'ADM' : (isDisk ? 'DI' : 'ABC')}
            </div>
            <div className="text-truncate">
              <div className="fw-bold text-white fs-xs text-truncate">
                {isMaster ? 'Disk Ingressos (Master)' : (isDisk ? 'Disk Ingressos (Matriz)' : (produtorAtivo?.razaoSocial || 'Produtora ABC Ltda.'))}
              </div>
              <div className="text-muted fs-xxs">
                {isMaster ? 'Governança & Risco Total' : (isDisk ? 'Mesa Financeira & Tesouraria' : 'Produtor Homologado')}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Navigation Accordion Area (Scroll Interno Independente) */}
        <div className="sidebar-navigation-scroll-area flex-grow-1 overflow-y-auto" id="sidebar-nav-scroll-area">
          <ul className="nav nav-sidebar flex-column gap-1 p-2" style={{ listStyle: 'none' }}>
            {menu.map(item => {
              const hasSub = item.subitens && item.subitens.length > 0;
              const isOpen = !!openSubmenus[item.id];
              const isActive = activeRoute === item.rota || (hasSub && activeRoute.startsWith(item.rota));

              return (
                <li key={item.id} className="nav-item">
                  <a
                    href="#"
                    className={`nav-link d-flex align-items-center gap-2 p-2 rounded text-decoration-none ${
                      isActive ? 'bg-primary text-white fw-bold' : 'text-secondary'
                    }`}
                    style={{ fontSize: '13px' }}
                    onClick={(e) => {
                      e.preventDefault();
                      if (hasSub) {
                        toggleSubmenu(item.id);
                      } else {
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
                            className={`nav-link py-1 px-2 rounded text-decoration-none d-flex align-items-center justify-content-between ${
                              activeRoute === sub.rota ? 'text-white fw-bold' : 'text-muted'
                            }`}
                            style={{ fontSize: '12px' }}
                            onClick={(e) => {
                              e.preventDefault();
                              onNavigate(sub.rota);
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
        </div>

        {/* Quick Actions Sidebar Footer */}
        <div className="sidebar-footer border-top border-white border-opacity-10 py-3 px-3 mt-auto">
          <div className="d-flex flex-column gap-2">
            {!isDisk && !isMaster ? (
              <>
                <button
                  className="btn btn-warning w-100 btn-sm text-black fw-bold d-flex align-items-center justify-content-center gap-1"
                  onClick={() => alert('Assistente de Criação de Eventos')}
                >
                  <i className="ph-calendar-plus"></i> <span>Criar Evento</span>
                </button>
                <button
                  className="btn btn-success w-100 btn-sm fw-bold d-flex align-items-center justify-content-center gap-1"
                  onClick={onOpenSolicitarRepasse}
                >
                  <i className="ph-hand-coins"></i> <span>Solicitar Repasse</span>
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn btn-warning w-100 btn-sm text-dark fw-bold d-flex align-items-center justify-content-center gap-1"
                  onClick={() => onNavigate('/financeiro/aprovacoes')}
                >
                  <i className="ph-scales"></i> <span>Mesa de Aprovações</span>
                </button>
                <button
                  className="btn btn-success w-100 btn-sm fw-bold d-flex align-items-center justify-content-center gap-1"
                  onClick={() => onNavigate('/financeiro/tesouraria')}
                >
                  <i className="ph-vault"></i> <span>Lote CNAB 240</span>
                </button>
              </>
            )}
          </div>
          <div className="text-center text-muted fs-xxs mt-2 opacity-50">Disk Financeiro Enterprise v1</div>
        </div>

      </div>
    </aside>
  );
};
