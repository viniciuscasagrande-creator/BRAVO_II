/**
 * Header Global do Financeiro Disk (Backoffice Enterprise)
 * Implementa a busca global transversal e a seleção contextual de Produtor e Evento
 */

import React from 'react';
import { useAuth } from '../../auth/AuthContext';
import { mockSeedData } from '../../../../database/seed';

export const HeaderFinanceiro: React.FC = () => {
  const { usuario, perfil, contextoFinanceiro, setContextoFinanceiro, loginAs } = useAuth();

  // Filtra eventos de acordo com o produtor selecionado
  const eventosDisponiveis = contextoFinanceiro.produtorId
    ? mockSeedData.eventos.filter(e => e.produtorId === contextoFinanceiro.produtorId)
    : mockSeedData.eventos;

  const handleProdutorChange = (pId: string) => {
    const novoProdutorId = pId === "ALL" ? null : pId;
    // Ao trocar o produtor, reseta o evento para que não haja divergência de contexto
    setContextoFinanceiro({ produtorId: novoProdutorId, eventoId: null });
  };

  const handleEventoChange = (eId: string) => {
    const novoEventoId = eId === "ALL" ? null : eId;
    setContextoFinanceiro({ eventoId: novoEventoId });
  };

  return (
    <header className="navbar navbar-dark navbar-expand-lg border-bottom border-bottom-white border-opacity-10 fixed-top" style={{ background: '#16191f', minHeight: '64px', zIndex: 1020 }}>
      <div className="container-fluid px-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
        
        {/* Logo e Identificação do Ambiente */}
        <div className="d-flex align-items-center gap-3">
          <a href="#" className="d-inline-flex align-items-center text-white text-decoration-none">
            <span className="fw-bold fs-5 tracking-wider text-white">DISK<span className="text-primary">INGRESSOS</span></span>
            <span className="badge bg-warning text-dark fw-bold fs-xxs ms-2 px-2 py-1">FINANCEIRO DISK</span>
          </a>
        </div>

        {/* 🔎 Barra de Busca Global Transversal (Produtor, CNPJ, Evento, CPF...) */}
        <div className="flex-grow-1 mx-lg-3" style={{ maxWidth: '420px' }}>
          <div className="position-relative">
            <input
              type="text"
              className="form-control bg-transparent rounded-pill text-white ps-5"
              style={{ border: '1px solid rgba(255,255,255,0.2)', fontSize: '13px' }}
              placeholder="🔎 Buscar produtor, CNPJ, evento, CPF, pedido..."
              value={contextoFinanceiro.termoBusca || ''}
              onChange={(e) => setContextoFinanceiro({ termoBusca: e.target.value })}
            />
            <div className="position-absolute" style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(255,255,255,0.5)' }}>
              <i className="ph-magnifying-glass"></i>
            </div>
          </div>
        </div>

        {/* Seletores de Contexto Operacional: Produtor e Evento */}
        <div className="d-flex align-items-center gap-2">
          {/* Seletor de Produtor */}
          <div className="d-flex align-items-center gap-1 bg-dark bg-opacity-50 px-2 py-1 rounded border border-secondary border-opacity-25">
            <span className="fs-xxs text-uppercase fw-bold text-muted">Produtor:</span>
            <select
              className="form-select form-select-sm bg-transparent text-white border-0 py-0 fw-semibold"
              style={{ fontSize: '12px', minWidth: '150px' }}
              value={contextoFinanceiro.produtorId || "ALL"}
              onChange={(e) => handleProdutorChange(e.target.value)}
            >
              <option value="ALL" className="text-dark">Todos os Produtores</option>
              {mockSeedData.produtores.map(p => (
                <option key={p.id} value={p.id} className="text-dark">
                  {p.razaoSocial}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Evento */}
          <div className="d-flex align-items-center gap-1 bg-dark bg-opacity-50 px-2 py-1 rounded border border-secondary border-opacity-25">
            <span className="fs-xxs text-uppercase fw-bold text-muted">Evento:</span>
            <select
              className="form-select form-select-sm bg-transparent text-white border-0 py-0 fw-semibold"
              style={{ fontSize: '12px', minWidth: '160px' }}
              value={contextoFinanceiro.eventoId || "ALL"}
              onChange={(e) => handleEventoChange(e.target.value)}
            >
              <option value="ALL" className="text-dark">Todos os Eventos</option>
              {eventosDisponiveis.map(e => (
                <option key={e.id} value={e.id} className="text-dark">
                  {e.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Alternador Rápido de Perfil para a Demonstração */}
        <div className="d-flex align-items-center gap-2 ms-auto">
          <div className="dropdown">
            <button className="btn btn-xs rounded-pill d-flex align-items-center gap-1 border-0 text-white" style={{ background: 'rgba(255,255,255,0.12)', padding: '6px 12px', fontSize: '12px' }} data-bs-toggle="dropdown">
              <i className="ph-shield-check text-success"></i>
              <span>{usuario?.nome} ({usuario?.cargo})</span>
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
  );
};
