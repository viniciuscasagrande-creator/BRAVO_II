import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';

export interface ExtratoEntry {
  id: string;
  dataHora: string;
  evento: string;
  descricao: string;
  tipo: 'VENDA' | 'REPASSE' | 'TAXA' | 'ESTORNO' | 'ANTECIPACAO';
  valorBruto: number;
  taxa: number;
  valorLiquido: number;
  saldoApos: number;
}

const mockExtrato: ExtratoEntry[] = [
  {
    id: 'EXT-1049',
    dataHora: '28/09/2026 18:40',
    evento: 'Festival Curitiba 2026',
    descricao: 'Venda de Ingressos Lote 2 (PIX)',
    tipo: 'VENDA',
    valorBruto: 4500.00,
    taxa: -450.00,
    valorLiquido: 4050.00,
    saldoApos: 200000.00
  },
  {
    id: 'EXT-1048',
    dataHora: '27/09/2026 14:15',
    evento: 'Festival Curitiba 2026',
    descricao: 'Repasse Bancário Programado #REP-000128',
    tipo: 'REPASSE',
    valorBruto: -50000.00,
    taxa: 0.00,
    valorLiquido: -50000.00,
    saldoApos: 195950.00
  },
  {
    id: 'EXT-1047',
    dataHora: '26/09/2026 11:20',
    evento: 'Show Artista A - Turnê Especial',
    descricao: 'Venda de Ingressos VIP (Cartão Crédito 3x)',
    tipo: 'VENDA',
    valorBruto: 3200.00,
    taxa: -320.00,
    valorLiquido: 2880.00,
    saldoApos: 95000.00
  },
  {
    id: 'EXT-1046',
    dataHora: '25/09/2026 09:30',
    evento: 'Festival Curitiba 2026',
    descricao: 'Cancelamento / Estorno Pedido #PED-9941',
    tipo: 'ESTORNO',
    valorBruto: -400.00,
    taxa: 40.00,
    valorLiquido: -360.00,
    saldoApos: 92120.00
  },
  {
    id: 'EXT-1045',
    dataHora: '22/09/2026 16:50',
    evento: 'Show Artista A - Turnê Especial',
    descricao: 'Antecipação Aprovada & Liquidada #ANT-000045',
    tipo: 'ANTECIPACAO',
    valorBruto: 30000.00,
    taxa: -750.00,
    valorLiquido: 29250.00,
    saldoApos: 92480.00
  }
];

export const ExtratoProdutor: React.FC = () => {
  const { produtorAtivo } = useAuth();
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [busca, setBusca] = useState<string>('');

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const itensFiltrados = mockExtrato.filter(item => {
    const matchTipo = filtroTipo === 'TODOS' || item.tipo === filtroTipo;
    const matchBusca = busca === '' ||
      item.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      item.evento.toLowerCase().includes(busca.toLowerCase()) ||
      item.id.toLowerCase().includes(busca.toLowerCase());
    return matchTipo && matchBusca;
  });

  return (
    <div className="p-3">
      {/* Cabeçalho */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold mb-1">Extrato de Movimentações</h4>
          <p className="text-muted fs-xs mb-0">
            Livro-caixa unificado de lançamentos: vendas, repasses, antecipações, estornos e taxas para {produtorAtivo?.razaoSocial}.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1">
            <i className="ph-download-simple"></i> Download PDF
          </button>
          <button className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1">
            <i className="ph-file-xls"></i> Exportar CSV/Excel
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="card shadow-sm border-0 mb-3 p-3 bg-white">
        <div className="row g-2 align-items-center">
          <div className="col-md-5">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light border-end-0">
                <i className="ph-magnifying-glass text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Buscar por descrição, código ou evento..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-7 d-flex gap-1 justify-content-md-end flex-wrap">
            {['TODOS', 'VENDA', 'REPASSE', 'ANTECIPACAO', 'ESTORNO'].map(tipo => (
              <button
                key={tipo}
                className={`btn btn-xs ${filtroTipo === tipo ? 'btn-primary' : 'btn-light border text-muted'}`}
                onClick={() => setFiltroTipo(tipo)}
              >
                {tipo === 'TODOS' ? 'Todos os Lançamentos' : tipo}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela de Lançamentos */}
      <div className="card shadow-sm border-0 bg-white">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light fs-xxs text-uppercase text-muted">
              <tr>
                <th>Lançamento</th>
                <th>Data/Hora</th>
                <th>Evento</th>
                <th>Descrição</th>
                <th className="text-end">Bruto</th>
                <th className="text-end">Taxa</th>
                <th className="text-end">Líquido</th>
                <th className="text-end">Saldo Acumulado</th>
              </tr>
            </thead>
            <tbody className="fs-xs">
              {itensFiltrados.map(item => {
                const isPositive = item.valorLiquido > 0;
                return (
                  <tr key={item.id}>
                    <td>
                      <span className="font-monospace fw-bold text-muted">{item.id}</span>
                      <span className={`badge ms-2 ${
                        item.tipo === 'VENDA' ? 'bg-success' :
                        item.tipo === 'REPASSE' ? 'bg-primary' :
                        item.tipo === 'ANTECIPACAO' ? 'bg-info text-dark' : 'bg-danger'
                      }`}>
                        {item.tipo}
                      </span>
                    </td>
                    <td className="text-muted">{item.dataHora}</td>
                    <td><strong className="text-dark">{item.evento}</strong></td>
                    <td className="text-truncate" style={{ maxWidth: '240px' }}>{item.descricao}</td>
                    <td className="text-end fw-semibold">{formatBRL(item.valorBruto)}</td>
                    <td className="text-end text-muted">{formatBRL(item.taxa)}</td>
                    <td className={`text-end fw-bold ${isPositive ? 'text-success' : 'text-danger'}`}>
                      {formatBRL(item.valorLiquido)}
                    </td>
                    <td className="text-end fw-bold text-dark">{formatBRL(item.saldoApos)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
