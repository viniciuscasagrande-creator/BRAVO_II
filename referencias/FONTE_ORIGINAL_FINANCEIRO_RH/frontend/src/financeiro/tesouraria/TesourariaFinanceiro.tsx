import React from 'react';

export interface ContaTesouraria {
  banco: string;
  codigo: string;
  agencia: string;
  conta: string;
  saldoAtual: number;
  saldoBloqueado: number;
  finalidade: string;
}

const mockContasDisk: ContaTesouraria[] = [
  {
    banco: 'Banco Itaú Unibanco S.A.',
    codigo: '341',
    agencia: '0432',
    conta: '10928-1',
    saldoAtual: 840500.00,
    saldoBloqueado: 0.00,
    finalidade: 'Conta Principal de Repasses e Operações PIX'
  },
  {
    banco: 'Banco Bradesco S.A.',
    codigo: '237',
    agencia: '3310',
    conta: '55420-9',
    saldoAtual: 395000.00,
    saldoBloqueado: 50000.00,
    finalidade: 'Arrecadação de Boletos e Compensação'
  },
  {
    banco: 'Banco Santander (Brasil) S.A.',
    codigo: '033',
    agencia: '2214',
    conta: '88712-3',
    saldoAtual: 1200000.00,
    saldoBloqueado: 0.00,
    finalidade: 'Conta Reserva / Aplicação Automática CDI'
  }
];

export const TesourariaFinanceiro: React.FC = () => {
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const totalDisponivel = mockContasDisk.reduce((acc, curr) => acc + curr.saldoAtual, 0);

  return (
    <div>
      {/* Cabeçalho */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold mb-1">Tesouraria &amp; Caixa Corporativo</h4>
          <p className="text-muted fs-xs mb-0">
            Saldos bancários da Disk Ingressos, liquidez imediata e controle de lotes de pagamento CNAB 240 / PIX.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm">
            <i className="ph-file-arrow-up"></i> Transmitir Lote CNAB
          </button>
        </div>
      </div>

      {/* Cards de Saldo */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card shadow-sm border-0 p-3 bg-white border-start border-success border-4">
            <span className="fs-xxs text-uppercase fw-bold text-muted">Saldo Consolidado Disponível</span>
            <h3 className="fw-bold text-success mt-1 mb-0">{formatBRL(totalDisponivel)}</h3>
            <span className="fs-xxs text-muted mt-1 d-block">Soma dos saldos em 3 bancos</span>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm border-0 p-3 bg-white border-start border-warning border-4">
            <span className="fs-xxs text-uppercase fw-bold text-muted">Obrigações Exigíveis Hoje (D+0)</span>
            <h3 className="fw-bold text-warning mt-1 mb-0">{formatBRL(80000)}</h3>
            <span className="fs-xxs text-muted mt-1 d-block">1 solicitação pronta para pagamento</span>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm border-0 p-3 bg-white border-start border-primary border-4">
            <span className="fs-xxs text-uppercase fw-bold text-muted">Liquidez Líquida Disk</span>
            <h3 className="fw-bold text-primary mt-1 mb-0">{formatBRL(totalDisponivel - 80000)}</h3>
            <span className="fs-xxs text-success fw-bold mt-1 d-block">Posição confortável de solvência</span>
          </div>
        </div>
      </div>

      {/* Grid de Contas Bancárias Disk */}
      <h6 className="fw-bold text-dark mb-2 fs-xs text-uppercase">Contas Bancárias de Movimento Disk</h6>
      <div className="row g-3 mb-4">
        {mockContasDisk.map((cta, idx) => (
          <div key={idx} className="col-md-4">
            <div className="card h-100 shadow-sm border-0 p-3 bg-white">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="badge bg-light text-dark border">Banco {cta.codigo}</span>
                <span className="badge bg-success fs-xxs">Conectado via API</span>
              </div>
              <h6 className="fw-bold text-dark mb-1">{cta.banco}</h6>
              <div className="fs-xs text-muted mb-2">{cta.finalidade}</div>
              <div className="p-2 bg-light rounded fs-xs mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Agência / Conta:</span>
                  <strong>{cta.agencia} / {cta.conta}</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Saldo em Conta:</span>
                  <strong className="text-success fs-6">{formatBRL(cta.saldoAtual)}</strong>
                </div>
              </div>
              <button className="btn btn-xs btn-outline-secondary w-100">Consultar Extrato OFX</button>
            </div>
          </div>
        ))}
      </div>

      {/* Lotes de Remessa CNAB / PIX */}
      <div className="card shadow-sm border-0 bg-white">
        <div className="card-header bg-transparent p-3 border-bottom d-flex justify-content-between align-items-center">
          <span className="fw-bold fs-xs text-uppercase">Fila de Remessas Bancárias (CNAB 240 / Lote PIX)</span>
          <span className="badge bg-primary fs-xxs">Automático D+0</span>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 fs-xs">
            <thead className="table-light fs-xxs text-uppercase text-muted">
              <tr>
                <th>Lote</th>
                <th>Data Criação</th>
                <th>Banco Destino</th>
                <th>Qtd. Transações</th>
                <th className="text-end">Valor Total</th>
                <th className="text-center">Status</th>
                <th className="text-end">Ação</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="font-monospace fw-bold text-dark">REM-20260928-01</span></td>
                <td>28/09/2026 10:30</td>
                <td>Banco Itaú (341)</td>
                <td>1 transação (REP-000128)</td>
                <td className="text-end fw-bold text-dark">{formatBRL(50000)}</td>
                <td className="text-center"><span className="badge bg-success">Liquidado com Sucesso</span></td>
                <td className="text-end"><button className="btn btn-xs btn-light border text-muted">Comprovante</button></td>
              </tr>
              <tr>
                <td><span className="font-monospace fw-bold text-primary">REM-20260929-01</span></td>
                <td>29/09/2026 09:00</td>
                <td>Banco Itaú (341)</td>
                <td>1 transação (REP-000129)</td>
                <td className="text-end fw-bold text-primary">{formatBRL(80000)}</td>
                <td className="text-center"><span className="badge bg-warning text-dark">Aguardando Assinaturas</span></td>
                <td className="text-end"><button className="btn btn-xs btn-primary">Processar</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
