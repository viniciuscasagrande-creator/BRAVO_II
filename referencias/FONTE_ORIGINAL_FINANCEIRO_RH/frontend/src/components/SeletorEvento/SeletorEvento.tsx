import React, { useState } from 'react';
import { useFinanceiro } from '../../context/FinanceiroContext';

interface EventoOption {
  id: string;
  produtorId: string;
  nome: string;
}

const mockEventosLista: EventoOption[] = [
  { id: 'evt-curitiba-2026', produtorId: 'prod-abc', nome: 'Festival Curitiba 2026' },
  { id: 'evt-artista-a', produtorId: 'prod-abc', nome: 'Show Artista A - Turnê Especial' },
  { id: 'evt-tech-summit', produtorId: 'prod-abc', nome: 'Evento Corporativo Tech Summit' },
  { id: 'evt-xyz-carnaval', produtorId: 'prod-xyz', nome: 'Carnaval Eletrônico 2026' },
  { id: 'evt-xyz-rock', produtorId: 'prod-xyz', nome: 'Rock Arena Festival' },
  { id: 'evt-premium-gala', produtorId: 'prod-premium', nome: 'Gala Beneficente 2026' }
];

export const SeletorEvento: React.FC = () => {
  const { produtorId, eventoId, selecionarEvento } = useFinanceiro();
  const [isOpen, setIsOpen] = useState(false);

  const eventosDisponiveis = produtorId
    ? mockEventosLista.filter(e => e.produtorId === produtorId)
    : mockEventosLista;

  const selected = mockEventosLista.find(e => e.id === eventoId);

  return (
    <div className="dropdown position-relative">
      <button
        className="btn btn-sm btn-dark border border-white border-opacity-10 d-flex align-items-center gap-2 text-start"
        style={{ minWidth: '220px', background: '#1e222d' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <i className="ph-ticket text-warning"></i>
        <div className="flex-grow-1 text-truncate">
          <span className="d-block fs-xxs text-muted text-uppercase fw-bold">Contexto Evento</span>
          <strong className="fs-xs text-white text-truncate d-block">
            {selected ? selected.nome : 'Todos os Eventos'}
          </strong>
        </div>
        <i className="ph-caret-down fs-xxs text-muted"></i>
      </button>

      {isOpen && (
        <div
          className="dropdown-menu show shadow-lg border-0 p-2 position-absolute"
          style={{ width: '280px', top: '100%', left: 0, zIndex: 1050, background: '#1e222d', borderRadius: '8px' }}
        >
          <div className="px-2 py-1 text-muted fs-xxs fw-bold text-uppercase border-bottom border-secondary border-opacity-25 mb-1">
            Selecione o Evento
          </div>
          <button
            className={`dropdown-item fs-xs py-2 rounded text-white ${!eventoId ? 'bg-primary' : ''}`}
            onClick={() => { selecionarEvento(null); setIsOpen(false); }}
          >
            <strong>Todos os Eventos</strong>
          </button>
          {eventosDisponiveis.map(e => (
            <button
              key={e.id}
              className={`dropdown-item fs-xs py-2 rounded text-white ${eventoId === e.id ? 'bg-primary' : ''}`}
              onClick={() => { selecionarEvento(e.id); setIsOpen(false); }}
            >
              <strong className="d-block text-truncate">{e.nome}</strong>
              <span className="fs-xxs text-muted">ID: {e.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SeletorEvento;
