import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';

export interface ProdutorItem {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  eventosAtivos: number;
  totalVendas: number;
  saldoDisponivel: number;
  obrigacaoRepasse: number;
  taxaMedia: number;
  status: 'ATIVO' | 'BLOQUEADO' | 'PENDENCIA_CADASTRAL';
  limiteAntecipacao: number;
}

const mockProdutores: ProdutorItem[] = [
  {
    id: 'prod-abc',
    razaoSocial: 'Produtora ABC Entretenimento Ltda.',
    nomeFantasia: 'Produtora ABC',
    cnpj: '12.345.678/0001-90',
    eventosAtivos: 3,
    totalVendas: 927520.00,
    saldoDisponivel: 310000.00,
    obrigacaoRepasse: 410000.00,
    taxaMedia: 10.0,
    status: 'ATIVO',
    limiteAntecipacao: 150000.00
  },
  {
    id: 'prod-xyz',
    razaoSocial: 'XYZ Live Eventos e Produções S.A.',
    nomeFantasia: 'XYZ Live',
    cnpj: '98.765.432/0001-10',
    eventosAtivos: 2,
    totalVendas: 650000.00,
    saldoDisponivel: 180000.00,
    obrigacaoRepasse: 220000.00,
    taxaMedia: 9.5,
    status: 'ATIVO',
    limiteAntecipacao: 80000.00
  },
  {
    id: 'prod-premium',
    razaoSocial: 'Grupo Premium Shows & Eventos Ltda.',
    nomeFantasia: 'Premium Shows',
    cnpj: '45.123.890/0001-55',
    eventosAtivos: 1,
    totalVendas: 230000.00,
    saldoDisponivel: 45000.00,
    obrigacaoRepasse: 70000.00,
    taxaMedia: 11.0,
    status: 'PENDENCIA_CADASTRAL',
    limiteAntecipacao: 0.00
  }
];

export const ProdutoresFinanceiro: React.FC<{ onSelectProdutor?: (id: string) => void }> = ({ onSelectProdutor }) => {
  const { setContextoFinanceiro } = useAuth();
  const [busca, setBusca] = useState<string>('');

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const produtoresFiltrados = mockProdutores.filter(p =>
    p.razaoSocial.toLowerCase().includes(busca.toLowerCase()) ||
    p.cnpj.includes(busca) ||
    p.id.toLowerCase().includes(busca.toLowerCase())
  );

  const selecionarContexto = (prod: ProdutorItem) => {
    setContextoFinanceiro(prev => ({ ...prev, produtorId: prod.id, eventoId: null }));
    if (onSelectProdutor) onSelectProdutor(prod.id);
  };

  return (
    <div>
      {/* Cabeçalho */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold mb-1">Gestão de Produtores</h4>
          <p className="text-muted fs-xs mb-0">
            Visão transversal das contas financeiras de produtores, taxas contratuais e passivo de repasses.
          </p>
        </div>
        <button className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm">
          <i className="ph-user-plus"></i> Novo Produtor
        </button>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="card shadow-sm border-0 mb-3 p-3 bg-white">
        <div className="input-group input-group-sm">
          <span className="input-group-text bg-light border-end-0">
            <i className="ph-magnifying-glass text-muted"></i>
          </span>
          <input
            type="text"
            className="form-control border-start-0"
            placeholder="Buscar por razão social, CNPJ ou identificador..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      {/* Tabela de Produtores */}
      <div className="card shadow-sm border-0 bg-white">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light fs-xxs text-uppercase text-muted">
              <tr>
                <th>Produtor / Razão Social</th>
                <th>CNPJ</th>
                <th className="text-center">Eventos</th>
                <th className="text-end">Volume Vendas</th>
                <th className="text-end">Saldo Disponível</th>
                <th className="text-end">Obrigação Repasse</th>
                <th className="text-center">Taxa Média</th>
                <th className="text-center">Status</th>
                <th className="text-end">Ações Operacionais</th>
              </tr>
            </thead>
            <tbody className="fs-xs">
              {produtoresFiltrados.map(prod => (
                <tr key={prod.id}>
                  <td>
                    <strong className="text-dark d-block">{prod.razaoSocial}</strong>
                    <span className="text-muted fs-xxs">ID: {prod.id} &bull; {prod.nomeFantasia}</span>
                  </td>
                  <td className="font-monospace text-muted">{prod.cnpj}</td>
                  <td className="text-center fw-bold">{prod.eventosAtivos}</td>
                  <td className="text-end fw-semibold text-dark">{formatBRL(prod.totalVendas)}</td>
                  <td className="text-end fw-bold text-success">{formatBRL(prod.saldoDisponivel)}</td>
                  <td className="text-end text-danger fw-semibold">{formatBRL(prod.obrigacaoRepasse)}</td>
                  <td className="text-center">
                    <span className="badge bg-light text-dark border">{prod.taxaMedia}%</span>
                  </td>
                  <td className="text-center">
                    <span className={`badge ${
                      prod.status === 'ATIVO' ? 'bg-success' :
                      prod.status === 'BLOQUEADO' ? 'bg-danger' : 'bg-warning text-dark'
                    }`}>
                      {prod.status}
                    </span>
                  </td>
                  <td className="text-end">
                    <div className="btn-group btn-group-xs">
                      <button
                        className="btn btn-outline-primary btn-xs"
                        onClick={() => selecionarContexto(prod)}
                        title="Filtrar todo o painel por este produtor"
                      >
                        Filtrar Painel
                      </button>
                      <button className="btn btn-light btn-xs border text-muted" title="Ver conta corrente">
                        Extrato
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
