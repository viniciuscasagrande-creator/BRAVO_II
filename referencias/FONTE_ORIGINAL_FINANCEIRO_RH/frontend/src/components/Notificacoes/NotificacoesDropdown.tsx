import React, { useState } from 'react';
import { useNotificacoes } from '../../context/NotificacaoContext';

export const NotificacoesDropdown: React.FC<{ onNavigateToApproval?: () => void }> = ({ onNavigateToApproval }) => {
  const { notificacoes, naoLidasCount, marcarComoLida, limparTodas } = useNotificacoes();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="dropdown position-relative">
      <button
        className="btn btn-sm btn-icon btn-dark border-0 position-relative text-white"
        style={{ width: '38px', height: '38px', background: 'rgba(255,255,255,0.08)', borderRadius: '8px' }}
        onClick={() => setIsOpen(!isOpen)}
        title="Notificações Financeiras"
      >
        <i className="ph-bell fs-5"></i>
        {naoLidasCount > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-dark" style={{ fontSize: '10px' }}>
            {naoLidasCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="dropdown-menu show shadow-lg border-0 p-0 position-absolute end-0"
          style={{ width: '360px', top: '100%', zIndex: 1060, background: '#1e222d', borderRadius: '10px', color: '#fff' }}
        >
          <div className="p-3 border-bottom border-secondary border-opacity-25 d-flex justify-content-between align-items-center">
            <span className="fs-xs fw-bold text-uppercase">Central de Alertas &amp; Notificações</span>
            {naoLidasCount > 0 && (
              <button className="btn btn-link btn-xs text-primary p-0 text-decoration-none" onClick={limparTodas}>
                Marcar lidas
              </button>
            )}
          </div>

          <div className="p-2 d-flex flex-column gap-1" style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {notificacoes.length === 0 ? (
              <div className="p-4 text-center text-muted fs-xs">
                Nenhuma notificação no momento.
              </div>
            ) : (
              notificacoes.map(n => (
                <div
                  key={n.id}
                  className={`p-2 rounded cursor-pointer transition-all ${n.lida ? 'opacity-75 bg-transparent' : 'bg-dark bg-opacity-50'}`}
                  style={{ borderLeft: n.lida ? '3px solid transparent' : '3px solid #3b82f6' }}
                  onClick={() => {
                    marcarComoLida(n.id);
                    if (n.linkAcao && onNavigateToApproval) {
                      onNavigateToApproval();
                      setIsOpen(false);
                    }
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <strong className="fs-xxs text-primary text-uppercase">{n.titulo}</strong>
                    <span className="fs-xxs text-muted">{n.dataHora}</span>
                  </div>
                  <div className="fs-xs text-light mt-1" dangerouslySetInnerHTML={{ __html: n.mensagem }}></div>
                </div>
              ))
            )}
          </div>

          <div className="p-2 border-top border-secondary border-opacity-25 text-center">
            <button
              className="btn btn-xs btn-outline-primary w-100"
              onClick={() => {
                if (onNavigateToApproval) onNavigateToApproval();
                setIsOpen(false);
              }}
            >
              Ver Central de Aprovações &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificacoesDropdown;
