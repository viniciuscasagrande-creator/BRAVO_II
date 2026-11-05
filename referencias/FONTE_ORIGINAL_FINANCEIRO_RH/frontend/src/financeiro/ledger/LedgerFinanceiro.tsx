import React, { useState } from 'react';

export interface LedgerEntryView {
  id: string;
  dataHora: string;
  historico: string;
  contaDebito: string;
  contaCredito: string;
  valor: number;
  referenciaOperacao: string;
}

const mockLedger: LedgerEntryView[] = [
  {
    id: 'LED-9901',
    dataHora: '28/09/2026 14:30:11',
    historico: 'Liquidação de Repasse Bancário via PIX #REP-000128',
    contaDebito: '2.1.01 - Obrigações com Produtores (Passivo)',
    contaCredito: '1.1.01 - Banco Itaú Conta Movimento (Ativo)',
    valor: 50000.00,
    referenciaOperacao: 'REP-000128'
  },
  {
    id: 'LED-9902',
    dataHora: '28/09/2026 12:15:00',
    historico: 'Apropriação de Receita de Serviço Disk Ingressos (10%)',
    contaDebito: '2.1.01 - Obrigações com Produtores (Passivo)',
    contaCredito: '3.1.01 - Receita Bruta de Serviços (Resultado)',
    valor: 5000.00,
    referenciaOperacao: 'VEN-90812'
  },
  {
    id: 'LED-9903',
    dataHora: '27/09/2026 17:45:22',
    historico: 'Entrada de Vendas Cartão de Crédito Cielo (Festival Curitiba)',
    contaDebito: '1.1.03 - Adquirentes a Receber Cielo (Ativo)',
    contaCredito: '2.1.01 - Obrigações com Produtores (Passivo)',
    valor: 15400.00,
    referenciaOperacao: 'BATCH-CIELO-44'
  },
  {
    id: 'LED-9904',
    dataHora: '26/09/2026 09:10:05',
    historico: 'Estorno de Chargeback Débito Produtor #CHG-0021',
    contaDebito: '2.1.01 - Obrigações com Produtores (Passivo)',
    contaCredito: '1.1.03 - Adquirentes a Receber Stone (Ativo)',
    valor: 450.00,
    referenciaOperacao: 'CHG-0021'
  }
];

export const LedgerFinanceiro: React.FC = () => {
  const [busca, setBusca] = useState<string>('');

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const totalDebitos = mockLedger.reduce((acc, curr) => acc + curr.valor, 0);
  const totalCreditos = totalDebitos; // Contabilidade estrita por partidas dobradas

  const filtrados = mockLedger.filter(l =>
    l.historico.toLowerCase().includes(busca.toLowerCase()) ||
    l.referenciaOperacao.toLowerCase().includes(busca.toLowerCase()) ||
    l.id.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div>
      {/* Cabeçalho */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold mb-1">Ledger Imutável (Partidas Dobradas)</h4>
          <p className="text-muted fs-xs mb-0">
            Trilha contábil com débitos e créditos rigorosamente balanceados e auditáveis em tempo real.
          </p>
        </div>
        <div className="d-flex gap-2">
          <span className="badge bg-success py-2 px-3 fs-xs d-flex align-items-center gap-1">
            <i className="ph-check-circle"></i> Livro Razão 100% Equilibrado
          </span>
        </div>
      </div>

      {/* Cards de Balanço */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card shadow-sm border-0 p-3 bg-white border-start border-primary border-4">
            <span className="fs-xxs text-uppercase fw-bold text-muted">Total de Lançamentos a Débito</span>
            <h3 className="fw-bold text-primary mt-1 mb-0">{formatBRL(totalDebitos)}</h3>
            <span className="fs-xxs text-muted mt-1 d-block">Contas devedoras movimentadas</span>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm border-0 p-3 bg-white border-start border-success border-4">
            <span className="fs-xxs text-uppercase fw-bold text-muted">Total de Lançamentos a Crédito</span>
            <h3 className="fw-bold text-success mt-1 mb-0">{formatBRL(totalCreditos)}</h3>
            <span className="fs-xxs text-muted mt-1 d-block">Contas credoras movimentadas</span>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm border-0 p-3 bg-white border-start border-secondary border-4">
            <span className="fs-xxs text-uppercase fw-bold text-muted">Divergência Contábil</span>
            <h3 className="fw-bold text-dark mt-1 mb-0">R$ 0,00</h3>
            <span className="fs-xxs text-success fw-bold mt-1 d-block">Partidas rigorosamente nulas</span>
          </div>
        </div>
      </div>

      {/* Filtro */}
      <div className="card shadow-sm border-0 mb-3 p-3 bg-white">
        <div className="input-group input-group-sm">
          <span className="input-group-text bg-light border-end-0">
            <i className="ph-magnifying-glass text-muted"></i>
          </span>
          <input
            type="text"
            className="form-control border-start-0"
            placeholder="Buscar por lançamento, histórico ou código da operação..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      {/* Tabela do Livro Razão */}
      <div className="card shadow-sm border-0 bg-white">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light fs-xxs text-uppercase text-muted">
              <tr>
                <th>Lançamento</th>
                <th>Data / Hora</th>
                <th>Histórico Operacional</th>
                <th>Conta Débito (Origem)</th>
                <th>Conta Crédito (Destino)</th>
                <th className="text-end">Valor Lançado</th>
                <th className="text-center">Ref. Operação</th>
              </tr>
            </thead>
            <tbody className="fs-xs">
              {filtrados.map(entry => (
                <tr key={entry.id}>
                  <td><span className="font-monospace fw-bold text-muted">{entry.id}</span></td>
                  <td className="text-muted font-monospace fs-xxs">{entry.dataHora}</td>
                  <td><strong>{entry.historico}</strong></td>
                  <td><span className="badge bg-light text-primary border">{entry.contaDebito}</span></td>
                  <td><span className="badge bg-light text-success border">{entry.contaCredito}</span></td>
                  <td className="text-end fw-bold text-dark">{formatBRL(entry.valor)}</td>
                  <td className="text-center">
                    <span className="badge bg-secondary font-monospace">{entry.referenciaOperacao}</span>
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
