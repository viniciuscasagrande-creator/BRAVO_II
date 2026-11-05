import React from 'react';
import { useAuth } from '../../auth/AuthContext';

export const DemoToolbar: React.FC = () => {
  const { perfil, loginAs } = useAuth();

  const isMaster = perfil === 'ADMINISTRADOR';
  const isDisk = perfil === 'FINANCEIRO';
  const isProducer = perfil === 'PRODUTOR';

  return (
    <div className="demo-floating-bar" id="demoFloatingBar">
      <span className="demo-badge-pill">🎮 MODO DEMONSTRAÇÃO</span>

      <div className="d-flex align-items-center gap-1 ms-1 me-2">
        <button
          className={`demo-role-btn ${isProducer ? 'active-produtor' : ''}`}
          onClick={() => loginAs('PRODUTOR', 'prod-abc')}
          title="Alternar para perfil Produtor"
        >
          <i className="ph-user"></i> <span>Produtor</span>
        </button>
        <button
          className={`demo-role-btn ${isDisk ? 'active-disk' : ''}`}
          onClick={() => loginAs('FINANCEIRO')}
          title="Alternar para Mesa Financeira Disk (Backoffice)"
        >
          <i className="ph-shield-check"></i> <span>Financeiro Disk</span>
        </button>
        <button
          className={`demo-role-btn ${isMaster ? 'active-admin' : ''}`}
          onClick={() => loginAs('ADMINISTRADOR')}
          title="Alternar para Administrador Master (Acesso Total)"
        >
          <i className="ph-crown"></i> <span>Admin Master</span>
        </button>
      </div>

      <span style={{ width: '1px', height: '22px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }}></span>

      <button
        className="demo-action-btn"
        onClick={() => alert('Venda de R$ 1.000 simulada no Cartão de Crédito')}
        title="Simula venda de R$ 1.000 no cartão via Cielo"
      >
        + Venda Cartão (R$ 1.000)
      </button>
      <button
        className="demo-action-btn"
        onClick={() => alert('Venda de R$ 350 simulada via PIX')}
        title="Simula venda de R$ 350 via PIX (liberação D+0)"
      >
        + Venda PIX (R$ 350)
      </button>
      <button
        className="demo-action-btn"
        onClick={() => alert('Chargeback de R$ 450 registrado com bloqueio cautelar')}
        title="Simula contestação com retenção cautelar"
      >
        + Chargeback (R$ 450)
      </button>
      <button
        className="demo-action-btn reset"
        onClick={() => window.location.reload()}
        title="Restaura os dados originais"
      >
        ↻ Reset Demo
      </button>
    </div>
  );
};
