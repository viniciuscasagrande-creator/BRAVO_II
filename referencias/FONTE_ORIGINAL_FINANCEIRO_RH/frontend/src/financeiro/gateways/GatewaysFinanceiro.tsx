import React from 'react';

export interface GatewayInfo {
  id: string;
  nome: string;
  tipo: string;
  volumeMes: number;
  mdrPraticado: number;
  mdrContratado: number;
  spreadLiquido: number;
  divergenciaConciliacao: number;
  prazoMedio: string;
  status: 'OPERACIONAL' | 'INSTABILIDADE' | 'MANUTENCAO';
}

const mockGateways: GatewayInfo[] = [
  {
    id: 'gtw-cielo',
    nome: 'Cielo S.A.',
    tipo: 'Crédito / Débito',
    volumeMes: 1250000.00,
    mdrPraticado: 2.15,
    mdrContratado: 2.15,
    spreadLiquido: 1.22,
    divergenciaConciliacao: 0.00,
    prazoMedio: 'D+30',
    status: 'OPERACIONAL'
  },
  {
    id: 'gtw-rede',
    nome: 'Rede (Itaú)',
    tipo: 'Crédito / Débito',
    volumeMes: 640000.00,
    mdrPraticado: 2.10,
    mdrContratado: 2.10,
    spreadLiquido: 1.25,
    divergenciaConciliacao: 0.00,
    prazoMedio: 'D+30',
    status: 'OPERACIONAL'
  },
  {
    id: 'gtw-stone',
    nome: 'Stone Pagamentos',
    tipo: 'Crédito / PIX',
    volumeMes: 410000.00,
    mdrPraticado: 1.95,
    mdrContratado: 1.95,
    spreadLiquido: 1.15,
    divergenciaConciliacao: 140.00,
    prazoMedio: 'D+14 / D+0',
    status: 'OPERACIONAL'
  },
  {
    id: 'gtw-pagbank',
    nome: 'PagBank (UOL)',
    tipo: 'PIX Direto / Boleto',
    volumeMes: 140000.00,
    mdrPraticado: 0.99,
    mdrContratado: 0.99,
    spreadLiquido: 1.40,
    divergenciaConciliacao: 0.00,
    prazoMedio: 'D+0',
    status: 'OPERACIONAL'
  }
];

export const GatewaysFinanceiro: React.FC = () => {
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const totalVolume = mockGateways.reduce((acc, curr) => acc + curr.volumeMes, 0);
  const spreadMedio = 1.22;

  return (
    <div>
      {/* Cabeçalho */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold mb-1">Gateways de Pagamento &amp; MDR</h4>
          <p className="text-muted fs-xs mb-0">
            Monitoramento de adquirentes, taxas contratuais MDR, spread financeiro Disk e conciliação de recebíveis.
          </p>
        </div>
        <button className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1 shadow-sm">
          <i className="ph-arrows-clockwise"></i> Conciliar Lote D-1
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card shadow-sm border-0 p-3 bg-white border-start border-primary border-4">
            <span className="fs-xxs text-uppercase fw-bold text-muted">Volume Total Adquirentes</span>
            <h3 className="fw-bold text-dark mt-1 mb-0">{formatBRL(totalVolume)}</h3>
            <span className="fs-xxs text-success fw-bold mt-1 d-block">4 Gateways Conectados</span>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 p-3 bg-white border-start border-success border-4">
            <span className="fs-xxs text-uppercase fw-bold text-muted">Spread Médio Disk</span>
            <h3 className="fw-bold text-success mt-1 mb-0">{spreadMedio}%</h3>
            <span className="fs-xxs text-muted mt-1 d-block">Ganho bruto sobre transacionado</span>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 p-3 bg-white border-start border-warning border-4">
            <span className="fs-xxs text-uppercase fw-bold text-muted">Recebíveis D+30 em Aberto</span>
            <h3 className="fw-bold text-warning mt-1 mb-0">{formatBRL(980000)}</h3>
            <span className="fs-xxs text-muted mt-1 d-block">Aguardando liquidação na CIP</span>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 p-3 bg-white border-start border-danger border-4">
            <span className="fs-xxs text-uppercase fw-bold text-muted">Divergência de Taxas</span>
            <h3 className="fw-bold text-danger mt-1 mb-0">{formatBRL(140)}</h3>
            <span className="fs-xxs text-danger fw-bold mt-1 d-block">1 contestação aberta (Stone)</span>
          </div>
        </div>
      </div>

      {/* Tabela de Adquirentes */}
      <div className="card shadow-sm border-0 bg-white">
        <div className="card-header bg-transparent p-3 border-bottom d-flex justify-content-between align-items-center">
          <span className="fw-bold fs-xs text-uppercase">Parâmetros das Adquirentes Homologadas</span>
          <span className="badge bg-success fs-xxs">100% Conciliado</span>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light fs-xxs text-uppercase text-muted">
              <tr>
                <th>Adquirente / Gateway</th>
                <th>Modalidade</th>
                <th className="text-end">Volume Mensal</th>
                <th className="text-center">MDR Praticado</th>
                <th className="text-center">MDR Contratado</th>
                <th className="text-center">Spread Disk</th>
                <th className="text-center">Prazo Médio</th>
                <th className="text-end">Divergência</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody className="fs-xs">
              {mockGateways.map(g => (
                <tr key={g.id}>
                  <td>
                    <strong className="text-dark d-block">{g.nome}</strong>
                    <span className="text-muted fs-xxs">ID: {g.id}</span>
                  </td>
                  <td><span className="badge bg-light text-dark border">{g.tipo}</span></td>
                  <td className="text-end fw-semibold">{formatBRL(g.volumeMes)}</td>
                  <td className="text-center font-monospace">{g.mdrPraticado}%</td>
                  <td className="text-center font-monospace text-muted">{g.mdrContratado}%</td>
                  <td className="text-center fw-bold text-success font-monospace">+{g.spreadLiquido}%</td>
                  <td className="text-center">{g.prazoMedio}</td>
                  <td className="text-end">
                    {g.divergenciaConciliacao > 0 ? (
                      <span className="text-danger fw-bold">{formatBRL(g.divergenciaConciliacao)}</span>
                    ) : (
                      <span className="text-muted">R$ 0,00</span>
                    )}
                  </td>
                  <td className="text-center">
                    <span className="badge bg-success">{g.status}</span>
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
