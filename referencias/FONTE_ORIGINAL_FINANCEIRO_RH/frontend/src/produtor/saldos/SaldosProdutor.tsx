import React from 'react';
import { useAuth } from '../../auth/AuthContext';

export interface EventoSaldoItem {
  id: string;
  nome: string;
  data: string;
  vendasBrutas: number;
  taxasDeducoes: number;
  saldoTotal: number;
  disponivel: number;
  aReceber: number;
  bloqueado: number;
  status: 'Vendas Abertas' | 'Últimos Ingressos' | 'Encerrado';
}

const mockEventosSaldo: EventoSaldoItem[] = [
  {
    id: 'evt-curitiba-2026',
    nome: 'Festival Curitiba 2026',
    data: '15/11/2026',
    vendasBrutas: 500000,
    taxasDeducoes: 50000,
    saldoTotal: 300000,
    disponivel: 200000,
    aReceber: 80000,
    bloqueado: 20000,
    status: 'Vendas Abertas'
  },
  {
    id: 'evt-artista-a',
    nome: 'Show Artista A - Turnê Especial',
    data: '22/10/2026',
    vendasBrutas: 280000,
    taxasDeducoes: 30000,
    saldoTotal: 155000,
    disponivel: 95000,
    aReceber: 60000,
    bloqueado: 0,
    status: 'Últimos Ingressos'
  },
  {
    id: 'evt-tech-summit',
    nome: 'Evento Corporativo Tech Summit 2026',
    data: '05/08/2026',
    vendasBrutas: 147520,
    taxasDeducoes: 12520,
    saldoTotal: 15000,
    disponivel: 15000,
    aReceber: 0,
    bloqueado: 0,
    status: 'Encerrado'
  }
];

export const SaldosProdutor: React.FC<{ onSolicitarRepasse?: (eventoId: string) => void }> = ({ onSolicitarRepasse }) => {
  const { produtorAtivo } = useAuth();

  const totalConsolidado = mockEventosSaldo.reduce((acc, curr) => acc + curr.saldoTotal, 0);
  const totalDisponivel = mockEventosSaldo.reduce((acc, curr) => acc + curr.disponivel, 0);
  const totalAReceber = mockEventosSaldo.reduce((acc, curr) => acc + curr.aReceber, 0);
  const totalBloqueado = mockEventosSaldo.reduce((acc, curr) => acc + curr.bloqueado, 0);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="p-3">
      {/* Cabeçalho */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold mb-1">Saldos por Evento</h4>
          <p className="text-muted fs-xs mb-0">
            Acompanhe individualmente o saldo bruto, disponível, a receber e eventuais reservas de cada produção de {produtorAtivo?.razaoSocial}.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1">
            <i className="ph-file-arrow-down"></i> Exportar Extrato Excel
          </button>
        </div>
      </div>

      {/* Cards de Saldo Consolidado */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card shadow-sm border-0 p-3 bg-white border-start border-primary border-4">
            <span className="fs-xxs text-uppercase fw-bold text-muted">Saldo Geral Acumulado</span>
            <h3 className="fw-bold text-dark mt-1 mb-0">{formatBRL(totalConsolidado)}</h3>
            <span className="fs-xxs text-muted mt-1 d-block">Soma dos saldos de todos os eventos</span>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 p-3 bg-white border-start border-success border-4">
            <span className="fs-xxs text-uppercase fw-bold text-muted">Disponível para Repasse</span>
            <h3 className="fw-bold text-success mt-1 mb-0">{formatBRL(totalDisponivel)}</h3>
            <span className="fs-xxs text-success fw-bold mt-1 d-block">Liberado para transferência imediata</span>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 p-3 bg-white border-start border-warning border-4">
            <span className="fs-xxs text-uppercase fw-bold text-muted">A Receber Futuro (D+X)</span>
            <h3 className="fw-bold text-warning mt-1 mb-0">{formatBRL(totalAReceber)}</h3>
            <span className="fs-xxs text-muted mt-1 d-block">Vendas cartão em compensação</span>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 p-3 bg-white border-start border-danger border-4">
            <span className="fs-xxs text-uppercase fw-bold text-muted">Reserva / Bloqueado</span>
            <h3 className="fw-bold text-danger mt-1 mb-0">{formatBRL(totalBloqueado)}</h3>
            <span className="fs-xxs text-danger mt-1 d-block">Garantia operacional (chargebacks)</span>
          </div>
        </div>
      </div>

      {/* Tabela de Segregação por Evento */}
      <div className="card shadow-sm border-0 mb-4 bg-white">
        <div className="card-header bg-transparent p-3 border-bottom d-flex justify-content-between align-items-center">
          <span className="fw-bold fs-xs text-uppercase">Detalhamento dos Eventos Ativos</span>
          <span className="badge bg-light text-dark fs-xxs border">{mockEventosSaldo.length} Eventos Listados</span>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light fs-xxs text-uppercase text-muted">
              <tr>
                <th>Evento</th>
                <th className="text-end">Vendas Brutas</th>
                <th className="text-end">Taxas Disk</th>
                <th className="text-end">Saldo Total</th>
                <th className="text-end">Disponível</th>
                <th className="text-end">A Receber</th>
                <th className="text-end">Reserva</th>
                <th className="text-center">Status</th>
                <th className="text-end">Ação</th>
              </tr>
            </thead>
            <tbody className="fs-xs">
              {mockEventosSaldo.map(evt => (
                <tr key={evt.id}>
                  <td>
                    <strong className="d-block text-dark">{evt.nome}</strong>
                    <span className="text-muted fs-xxs">Realização: {evt.data}</span>
                  </td>
                  <td className="text-end fw-semibold">{formatBRL(evt.vendasBrutas)}</td>
                  <td className="text-end text-muted">{formatBRL(evt.taxasDeducoes)}</td>
                  <td className="text-end fw-bold text-dark">{formatBRL(evt.saldoTotal)}</td>
                  <td className="text-end fw-bold text-success">{formatBRL(evt.disponivel)}</td>
                  <td className="text-end text-warning fw-semibold">{formatBRL(evt.aReceber)}</td>
                  <td className="text-end text-danger">{formatBRL(evt.bloqueado)}</td>
                  <td className="text-center">
                    <span className={`badge ${
                      evt.status === 'Vendas Abertas' ? 'bg-success' :
                      evt.status === 'Últimos Ingressos' ? 'bg-warning text-dark' : 'bg-secondary'
                    }`}>
                      {evt.status}
                    </span>
                  </td>
                  <td className="text-end">
                    <button
                      className="btn btn-xs btn-primary d-inline-flex align-items-center gap-1"
                      onClick={() => onSolicitarRepasse && onSolicitarRepasse(evt.id)}
                      disabled={evt.disponivel <= 0}
                    >
                      <i className="ph-hand-coins"></i> Repasse
                    </button>
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
