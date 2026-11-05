import React, { useState } from 'react';
import { useFinanceiro } from '../../context/FinanceiroContext';

interface ProdutorOption {
  id: string;
  nome: string;
  cnpj: string;
}

const mockProdutoresLista: ProdutorOption[] = [
  { id: 'prod-abc', nome: 'Produtora ABC Ltda.', cnpj: '12.345.678/0001-90' },
  { id: 'prod-xyz', nome: 'XYZ Live Eventos S.A.', cnpj: '98.765.432/0001-10' },
  { id: 'prod-premium', nome: 'Grupo Premium Shows', cnpj: '45.123.890/0001-55' }
];

export const BuscaProdutor: React.FC = () => {
  const { produtorId, selecionarProdutor } = useFinanceiro();
  const [isOpen, setIsOpen] = useState(false);

  const selected = mockProdutoresLista.find(p => p.id === produtorId);

  return (
    <div className="dropdown position-relative">
      <button
        className="btn btn-sm btn-dark border border-white border-opacity-10 d-flex align-items-center gap-2 text-start"
        style={{ minWidth: '220px', background: '#1e222d' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <i className="ph-buildings text-primary"></i>
        <div className="flex-grow-1 text-truncate">
          <span className="d-block fs-xxs text-muted text-uppercase fw-bold">Contexto Produtor</span>
          <strong className="fs-xs text-white text-truncate d-block">
            {selected ? selected.nome : 'Todos os Produtores'}
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
            Selecione o Produtor
          </div>
          <button
            className={`dropdown-item fs-xs py-2 rounded text-white ${!produtorId ? 'bg-primary' : ''}`}
            onClick={() => { selecionarProdutor(null); setIsOpen(false); }}
          >
            <strong>Todos os Produtores (Visão Global)</strong>
          </button>
          {mockProdutoresLista.map(p => (
            <button
              key={p.id}
              className={`dropdown-item fs-xs py-2 rounded text-white ${produtorId === p.id ? 'bg-primary' : ''}`}
              onClick={() => { selecionarProdutor(p.id); setIsOpen(false); }}
            >
              <strong className="d-block text-truncate">{p.nome}</strong>
              <span className="fs-xxs text-muted">{p.cnpj}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default BuscaProdutor;
