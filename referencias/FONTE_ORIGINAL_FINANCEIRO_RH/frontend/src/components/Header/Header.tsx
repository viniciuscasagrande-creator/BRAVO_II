import React from 'react';
import { useAuth } from '../../auth/AuthContext';
import { mockSeedData } from '../../../../database/seed';

interface HeaderProps {
  onSearchChange?: (term: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearchChange }) => {
  const { usuario, perfil, contextoFinanceiro, setContextoFinanceiro, logout } = useAuth();

  const isMaster = perfil === 'ADMINISTRADOR';
  const isDisk = perfil === 'FINANCEIRO';

  const roleBadgeLabel = isMaster
    ? 'ADMINISTRADOR MASTER'
    : (isDisk ? 'FINANCEIRO DISK (BACKOFFICE)' : 'PORTAL DO PRODUTOR');

  const roleBadgeColor = isMaster
    ? 'bg-warning text-dark'
    : (isDisk ? 'bg-success text-white' : 'bg-primary text-white');

  return (
    <header className="app-header navbar navbar-dark" id="appHeader">
      <div className="d-flex align-items-center gap-2">
        <span className={`badge ${roleBadgeColor} fw-bold fs-xxs px-2 py-1`}>
          {roleBadgeLabel}
        </span>
      </div>

      {/* Global Search Box */}
      <div className="flex-grow-1 mx-3" style={{ maxWidth: '480px' }}>
        <div className="position-relative">
          <input
            type="text"
            className="form-control bg-transparent rounded-pill text-white ps-5"
            style={{ border: '1px solid rgba(255,255,255,0.2)', fontSize: '13px' }}
            placeholder="Pesquisa global (eventos, produtores, pedidos, repasses...)"
            value={contextoFinanceiro.termoBusca || ''}
            onChange={(e) => {
              setContextoFinanceiro({ termoBusca: e.target.value });
              if (onSearchChange) onSearchChange(e.target.value);
            }}
          />
          <div
            className="position-absolute"
            style={{
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: 'rgba(255,255,255,0.5)'
            }}
          >
            <i className="ph-magnifying-glass fs-5"></i>
          </div>
        </div>
      </div>

      {/* Right Header Items: Idioma, Notificações e Usuário */}
      <div className="d-flex align-items-center gap-2 ms-auto">
        
        {/* Idioma */}
        <div className="d-none d-sm-flex align-items-center text-white-50 fs-xs gap-1 px-2">
          <span>🇧🇷</span>
          <span className="fw-semibold">Português (BR)</span>
        </div>

        {/* Notificações */}
        <div className="position-relative p-1 text-white">
          <div
            className="d-flex align-items-center justify-content-center"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'white'
            }}
          >
            <i className="ph-bell fs-5"></i>
          </div>
          <span
            className="position-absolute badge rounded-pill bg-danger"
            style={{ fontSize: '9px', padding: '2px 5px', top: '-2px', right: '-2px' }}
          >
            17
          </span>
        </div>

        {/* Usuário autenticado */}
        <div className="d-flex align-items-center gap-2 ms-2">
          <div className="status-indicator-container position-relative">
            <div
              className="avatar-circle"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: isMaster ? '#e11d48' : (isDisk ? '#10b981' : '#2563eb'),
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '13px',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            >
              {isMaster ? 'ADM' : (isDisk ? 'MV' : 'ABC')}
            </div>
            <span
              className="status-indicator bg-success"
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '8px',
                height: '8px',
                border: '2px solid #16191f',
                borderRadius: '50%'
              }}
            ></span>
          </div>
          <div className="d-none d-lg-flex flex-column text-start">
            <span className="fs-xs fw-bold text-white leading-tight">{usuario?.nome || 'Usuário'}</span>
            <span className="fs-xxs text-white-50">{usuario?.email}</span>
          </div>
        </div>

      </div>
    </header>
  );
};
