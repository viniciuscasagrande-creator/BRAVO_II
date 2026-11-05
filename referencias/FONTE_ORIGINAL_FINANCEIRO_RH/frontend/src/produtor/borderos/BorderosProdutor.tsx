import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';

export interface BorderoItem {
  id: string;
  evento: string;
  dataEvento: string;
  ingressosVendidos: number;
  cortesias: number;
  receitaBruta: number;
  taxaDisk: number;
  impostosEcad: number;
  receitaLiquida: number;
  repassesRealizados: number;
  saldoFinal: number;
  statusFechamento: 'EM_ABERTO' | 'AGUARDANDO_ASSINATURA' | 'FECHADO_ASSINADO';
  assinadoProdutor: boolean;
  assinadoDisk: boolean;
}

const mockBorderos: BorderoItem[] = [
  {
    id: 'BOR-2026-001',
    evento: 'Festival Curitiba 2026',
    dataEvento: '15/11/2026',
    ingressosVendidos: 4200,
    cortesias: 150,
    receitaBruta: 500000.00,
    taxaDisk: 50000.00,
    impostosEcad: 25000.00,
    receitaLiquida: 425000.00,
    repassesRealizados: 225000.00,
    saldoFinal: 200000.00,
    statusFechamento: 'EM_ABERTO',
    assinadoProdutor: false,
    assinadoDisk: false
  },
  {
    id: 'BOR-2026-002',
    evento: 'Show Artista A - Turnê Especial',
    dataEvento: '22/10/2026',
    ingressosVendidos: 2100,
    cortesias: 80,
    receitaBruta: 280000.00,
    taxaDisk: 30000.00,
    impostosEcad: 14000.00,
    receitaLiquida: 236000.00,
    repassesRealizados: 141000.00,
    saldoFinal: 95000.00,
    statusFechamento: 'AGUARDANDO_ASSINATURA',
    assinadoProdutor: true,
    assinadoDisk: false
  },
  {
    id: 'BOR-2026-003',
    evento: 'Evento Corporativo Tech Summit 2026',
    dataEvento: '05/08/2026',
    ingressosVendidos: 980,
    cortesias: 20,
    receitaBruta: 147520.00,
    taxaDisk: 12520.00,
    impostosEcad: 0.00,
    receitaLiquida: 135000.00,
    repassesRealizados: 120000.00,
    saldoFinal: 15000.00,
    statusFechamento: 'FECHADO_ASSINADO',
    assinadoProdutor: true,
    assinadoDisk: true
  }
];

export const BorderosProdutor: React.FC = () => {
  const { produtorAtivo } = useAuth();
  const [selectedBordero, setSelectedBordero] = useState<BorderoItem | null>(null);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="p-3">
      {/* Cabeçalho */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold mb-1">Borderô &amp; Fechamento Oficial</h4>
          <p className="text-muted fs-xs mb-0">
            Prestação de contas contábil por evento com apuração de bilheteria e fluxo de assinaturas de {produtorAtivo?.razaoSocial}.
          </p>
        </div>
      </div>

      {/* Regra de Assinatura */}
      <div className="alert alert-warning py-2 px-3 mb-3 d-flex align-items-center gap-2 fs-xs border-0 rounded shadow-sm">
        <i className="ph-signature text-warning fs-5"></i>
        <div>
          <strong>Fluxo de Formalização do Borderô:</strong> Após a apuração dos números pela Disk, o <strong>Produtor assina digitalmente primeiro</strong>. Em seguida, a <strong>Diretoria Financeira da Disk assina por último</strong> para encerrar o evento e liberar o saldo residual final.
        </div>
      </div>

      {/* Tabela de Borderôs */}
      <div className="card shadow-sm border-0 bg-white mb-4">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light fs-xxs text-uppercase text-muted">
              <tr>
                <th>Borderô</th>
                <th>Evento</th>
                <th className="text-center">Ingressos</th>
                <th className="text-end">Receita Bruta</th>
                <th className="text-end">Taxas &amp; Deduções</th>
                <th className="text-end">Saldo Residual</th>
                <th className="text-center">Assinatura Produtor</th>
                <th className="text-center">Assinatura Disk</th>
                <th className="text-center">Status</th>
                <th className="text-end">Ação</th>
              </tr>
            </thead>
            <tbody className="fs-xs">
              {mockBorderos.map(b => (
                <tr key={b.id}>
                  <td><span className="font-monospace fw-bold text-primary">{b.id}</span></td>
                  <td>
                    <strong>{b.evento}</strong>
                    <div className="text-muted fs-xxs">Data: {b.dataEvento}</div>
                  </td>
                  <td className="text-center">
                    <span className="fw-bold">{b.ingressosVendidos}</span>
                    <span className="text-muted fs-xxs d-block">+{b.cortesias} cortesias</span>
                  </td>
                  <td className="text-end fw-semibold">{formatBRL(b.receitaBruta)}</td>
                  <td className="text-end text-muted">{formatBRL(b.taxaDisk + b.impostosEcad)}</td>
                  <td className="text-end fw-bold text-success">{formatBRL(b.saldoFinal)}</td>
                  <td className="text-center">
                    {b.assinadoProdutor ? (
                      <span className="badge bg-success fs-xxs"><i className="ph-check"></i> Assinado</span>
                    ) : (
                      <span className="badge bg-warning text-dark fs-xxs"><i className="ph-pencil"></i> Pendente</span>
                    )}
                  </td>
                  <td className="text-center">
                    {b.assinadoDisk ? (
                      <span className="badge bg-success fs-xxs"><i className="ph-check"></i> Assinado</span>
                    ) : (
                      <span className="badge bg-secondary fs-xxs"><i className="ph-lock"></i> Aguardando</span>
                    )}
                  </td>
                  <td className="text-center">
                    <span className={`badge ${
                      b.statusFechamento === 'FECHADO_ASSINADO' ? 'bg-success' :
                      b.statusFechamento === 'AGUARDANDO_ASSINATURA' ? 'bg-warning text-dark' : 'bg-primary'
                    }`}>
                      {b.statusFechamento === 'FECHADO_ASSINADO' ? 'Fechado' :
                       b.statusFechamento === 'AGUARDANDO_ASSINATURA' ? 'Em Assinatura' : 'Em Aberto'}
                    </span>
                  </td>
                  <td className="text-end">
                    <button
                      className="btn btn-xs btn-outline-primary"
                      onClick={() => setSelectedBordero(b)}
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhes do Borderô */}
      {selectedBordero && (
        <div className="modal show d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-dark text-white">
                <div>
                  <span className="fs-xxs text-uppercase text-primary fw-bold">Borderô Oficial de Bilheteria</span>
                  <h5 className="modal-title fs-sm fw-bold text-white mb-0">{selectedBordero.id} &bull; {selectedBordero.evento}</h5>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedBordero(null)}></button>
              </div>
              <div className="modal-body p-4 fs-xs">
                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <div className="p-2 border rounded bg-light">
                      <span className="text-muted d-block fs-xxs">Ingressos Pagos</span>
                      <strong className="fs-6 text-dark">{selectedBordero.ingressosVendidos} un.</strong>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="p-2 border rounded bg-light">
                      <span className="text-muted d-block fs-xxs">Vendas Brutas Totais</span>
                      <strong className="fs-6 text-dark">{formatBRL(selectedBordero.receitaBruta)}</strong>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="p-2 border rounded bg-light">
                      <span className="text-muted d-block fs-xxs">Saldo Residual do Evento</span>
                      <strong className="fs-6 text-success">{formatBRL(selectedBordero.saldoFinal)}</strong>
                    </div>
                  </div>
                </div>

                <div className="p-3 border rounded mb-3 bg-white">
                  <div className="fw-bold mb-2">Composição de Deduções Contratuais</div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Taxa de Serviço Disk Ingressos (10%):</span>
                    <strong>{formatBRL(selectedBordero.taxaDisk)}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Retenções Legais / ECAD:</span>
                    <strong>{formatBRL(selectedBordero.impostosEcad)}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Repasses Realizados Antecipadamente:</span>
                    <strong>{formatBRL(selectedBordero.repassesRealizados)}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-2 fw-bold text-success fs-sm">
                    <span>Líquido Disponível para Quitação Final:</span>
                    <span>{formatBRL(selectedBordero.saldoFinal)}</span>
                  </div>
                </div>

                <div className="p-3 border rounded bg-light">
                  <div className="fw-bold mb-2 d-flex align-items-center gap-1">
                    <i className="ph-signature text-primary"></i> Assinaturas Digitais do Borderô
                  </div>
                  <div className="row g-2">
                    <div className="col-6">
                      <div className="p-2 bg-white rounded border">
                        <span className="d-block fs-xxs text-muted fw-bold">1. ASSINATURA PRODUTOR</span>
                        {selectedBordero.assinadoProdutor ? (
                          <span className="text-success fw-bold fs-xs"><i className="ph-check-circle"></i> Assinado com Sucesso</span>
                        ) : (
                          <button className="btn btn-xs btn-primary mt-1 w-100 fw-bold">Assinar Digitalmente Agora</button>
                        )}
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="p-2 bg-white rounded border">
                        <span className="d-block fs-xxs text-muted fw-bold">2. ASSINATURA FINANCEIRO DISK (FINAL)</span>
                        {selectedBordero.assinadoDisk ? (
                          <span className="text-success fw-bold fs-xs"><i className="ph-check-circle"></i> Homologado pelo Financeiro</span>
                        ) : (
                          <span className="text-muted fs-xs d-block mt-1">
                            <i className="ph-lock"></i> {selectedBordero.assinadoProdutor ? 'Aguardando validação Disk' : 'Bloqueado até assinatura do Produtor'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer bg-light p-2">
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => setSelectedBordero(null)}>Fechar</button>
                <button type="button" className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1">
                  <i className="ph-printer"></i> Imprimir Borderô
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
