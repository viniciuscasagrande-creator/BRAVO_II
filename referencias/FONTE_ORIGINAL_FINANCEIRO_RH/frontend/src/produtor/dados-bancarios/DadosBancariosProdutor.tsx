import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';

export interface ContaBancaria {
  id: string;
  banco: string;
  codigoBanco: string;
  agencia: string;
  conta: string;
  tipoConta: 'CORRENTE' | 'PAGAMENTO';
  chavePix: string;
  status: 'HOMOLOGADA' | 'EM_ANALISE' | 'REJEITADA';
  padrao: boolean;
}

const mockContas: ContaBancaria[] = [
  {
    id: 'cta-001',
    banco: 'Banco Itaú Unibanco S.A.',
    codigoBanco: '341',
    agencia: '0432',
    conta: '48291-0',
    tipoConta: 'CORRENTE',
    chavePix: '12.345.678/0001-90',
    status: 'HOMOLOGADA',
    padrao: true
  },
  {
    id: 'cta-002',
    banco: 'Banco Bradesco S.A.',
    codigoBanco: '237',
    agencia: '1290',
    conta: '98412-4',
    tipoConta: 'CORRENTE',
    chavePix: 'financeiro@produtoraabc.com.br',
    status: 'HOMOLOGADA',
    padrao: false
  },
  {
    id: 'cta-003',
    banco: 'Nu Pagamentos S.A. (Nubank)',
    codigoBanco: '260',
    agencia: '0001',
    conta: '7729103-9',
    tipoConta: 'PAGAMENTO',
    chavePix: '+5541999998888',
    status: 'EM_ANALISE',
    padrao: false
  }
];

export const DadosBancariosProdutor: React.FC = () => {
  const { produtorAtivo } = useAuth();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [bancoNovo, setBancoNovo] = useState<string>('341');
  const [agenciaNova, setAgenciaNova] = useState<string>('');
  const [contaNova, setContaNova] = useState<string>('');
  const [pixNovo, setPixNovo] = useState<string>('');
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSucessoMsg('Solicitação de homologação de conta enviada ao Financeiro Disk com sucesso! Protocolo #ALT-BANC-0091');
    setShowModal(false);
  };

  return (
    <div className="p-3">
      {/* Cabeçalho */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold mb-1">Dados Bancários Homologados</h4>
          <p className="text-muted fs-xs mb-0">
            Contas bancárias cadastradas e verificadas para recebimento de repasses de {produtorAtivo?.razaoSocial}.
          </p>
        </div>
        <button
          className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm"
          onClick={() => setShowModal(true)}
        >
          <i className="ph-plus-circle"></i> Cadastrar Nova Conta
        </button>
      </div>

      {sucessoMsg && (
        <div className="alert alert-success alert-dismissible fade show fs-xs mb-3 shadow-sm" role="alert">
          <i className="ph-check-circle me-1"></i> {sucessoMsg}
          <button type="button" className="btn-close" onClick={() => setSucessoMsg(null)}></button>
        </div>
      )}

      {/* Alerta de Conformidade BACEN */}
      <div className="alert alert-info py-2 px-3 mb-4 d-flex align-items-center gap-2 fs-xs border-0 rounded shadow-sm">
        <i className="ph-shield-check text-primary fs-5"></i>
        <div>
          <strong>Regra de Segurança Disk:</strong> Repasses e antecipações são transferidos exclusivamente para contas bancárias vinculadas ao CNPJ titular <strong>{produtorAtivo?.cnpj}</strong> devidamente homologadas pela mesa do Financeiro.
        </div>
      </div>

      {/* Grid de Contas */}
      <div className="row g-3">
        {mockContas.map(conta => (
          <div key={conta.id} className="col-md-6 col-lg-4">
            <div className={`card h-100 shadow-sm border ${conta.padrao ? 'border-primary' : ''} bg-white`}>
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <span className="badge bg-light text-muted fs-xxs border">Banco {conta.codigoBanco}</span>
                    {conta.padrao && <span className="badge bg-primary ms-1 fs-xxs">Conta Padrão</span>}
                  </div>
                  <span className={`badge ${
                    conta.status === 'HOMOLOGADA' ? 'bg-success' :
                    conta.status === 'EM_ANALISE' ? 'bg-warning text-dark' : 'bg-danger'
                  }`}>
                    {conta.status === 'HOMOLOGADA' ? 'Homologada' :
                     conta.status === 'EM_ANALISE' ? 'Em Análise Disk' : 'Rejeitada'}
                  </span>
                </div>

                <h6 className="fw-bold text-dark mb-1">{conta.banco}</h6>
                <div className="fs-xs text-muted mb-2">Tipo: Conta {conta.tipoConta === 'CORRENTE' ? 'Corrente' : 'de Pagamento'}</div>

                <div className="p-2 rounded bg-light fs-xs mb-2">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Agência:</span>
                    <strong className="text-dark">{conta.agencia}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Conta:</span>
                    <strong className="text-dark">{conta.conta}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Chave PIX:</span>
                    <strong className="text-dark text-truncate" style={{ maxWidth: '160px' }}>{conta.chavePix}</strong>
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-1 mt-3">
                  {!conta.padrao && conta.status === 'HOMOLOGADA' && (
                    <button className="btn btn-xs btn-outline-primary">Definir como Padrão</button>
                  )}
                  <button className="btn btn-xs btn-light border text-muted">Histórico</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Nova Conta */}
      {showModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fs-sm fw-bold">Cadastrar Nova Conta para Homologação</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body p-3 fs-xs">
                  <div className="mb-2">
                    <label className="form-label fw-bold">Instituição Financeira</label>
                    <select
                      className="form-select form-select-sm"
                      value={bancoNovo}
                      onChange={(e) => setBancoNovo(e.target.value)}
                    >
                      <option value="341">341 - Banco Itaú Unibanco S.A.</option>
                      <option value="237">237 - Banco Bradesco S.A.</option>
                      <option value="001">001 - Banco do Brasil S.A.</option>
                      <option value="033">033 - Banco Santander (Brasil) S.A.</option>
                      <option value="104">104 - Caixa Econômica Federal</option>
                      <option value="260">260 - Nu Pagamentos S.A. (Nubank)</option>
                      <option value="077">077 - Banco Inter S.A.</option>
                    </select>
                  </div>
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <label className="form-label fw-bold">Agência (com dígito)</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Ex: 0432"
                        required
                        value={agenciaNova}
                        onChange={(e) => setAgenciaNova(e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-bold">Conta (com dígito)</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Ex: 12345-6"
                        required
                        value={contaNova}
                        onChange={(e) => setContaNova(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Chave PIX Associada</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Ex: CNPJ, Email ou Chave Aleatória"
                      value={pixNovo}
                      onChange={(e) => setPixNovo(e.target.value)}
                    />
                  </div>
                  <div className="alert alert-warning py-1 px-2 fs-xxs mb-0">
                    A aprovação será auditada pela mesa de tesouraria antes da liberação de qualquer ordem bancária.
                  </div>
                </div>
                <div className="modal-footer bg-light p-2">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-sm btn-primary fw-bold">Enviar para Homologação</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
