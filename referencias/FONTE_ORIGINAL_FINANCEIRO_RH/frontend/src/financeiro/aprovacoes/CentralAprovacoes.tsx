/**
 * Central Unificada de Aprovações Financeiras (Financeiro Disk)
 * Ficha Completa de Análise, Decisão Obrigatória, Assinaturas Sequenciais e Liquidação
 */

import React, { useState } from 'react';
import { mockSeedData } from '../../../../database/seed';

export const CentralAprovacoes: React.FC = () => {
  const [solicitacoes, setSolicitacoes] = useState(mockSeedData.solicitacoes);
  const [solicitacaoAtiva, setSolicitacaoAtiva] = useState<any>(mockSeedData.solicitacoes[0]);
  const [abaFiltro, setAbaFiltro] = useState<string>("TODAS");
  const [modalRejeicaoAberto, setModalRejeicaoAberto] = useState<boolean>(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState<string>("Inconsistência de valores");
  const [justificativa, setJustificativa] = useState<string>("");

  // Ficha de Posição Financeira do Evento
  const auditoriaEvento = {
    vendasBrutas: 500000.00,
    liquidoApurado: 450000.00,
    disponivelAntes: 200000.00,
    solicitado: solicitacaoAtiva?.valorSolicitado || 80000.00,
    disponivelDepois: 120000.00
  };

  const handleAprovar = () => {
    const agora = new Date().toLocaleString('pt-BR');
    const atualizada = {
      ...solicitacaoAtiva,
      status: "AGUARDANDO_ASSINATURA_PRODUTOR",
      decisao: "APROVADO",
      analisadoPor: "Karine (Financeiro Disk)",
      analisadoEm: agora
    };
    atualizarSolicitacao(atualizada);
  };

  const handleConfirmarRejeicao = (e: React.FormEvent) => {
    e.preventDefault();
    const agora = new Date().toLocaleString('pt-BR');
    const atualizada = {
      ...solicitacaoAtiva,
      status: "REJEITADO",
      decisao: "REJEITADO",
      analisadoPor: "Karine (Financeiro Disk)",
      analisadoEm: agora,
      rejeicao: {
        motivoCategoria: motivoRejeicao,
        justificativa: justificativa,
        rejeitadoPor: "Karine (Financeiro Disk)",
        rejeitadoEm: agora
      }
    };
    atualizarSolicitacao(atualizada);
    setModalRejeicaoAberto(false);
  };

  const handleSimularAssinaturaProdutor = () => {
    const agora = new Date().toLocaleString('pt-BR');
    const atualizada = {
      ...solicitacaoAtiva,
      status: "AGUARDANDO_ASSINATURA_FINANCEIRO",
      assinaturaProdutor: {
        assinado: true,
        assinadoPor: "João Silva (Produtora ABC)",
        assinadoEm: agora,
        certificado: "ICP-Brasil A1"
      }
    };
    atualizarSolicitacao(atualizada);
  };

  const handleAssinarFinanceiro = () => {
    // REGRA DE OURO TRAVADA NO SISTEMA:
    if (!solicitacaoAtiva.assinaturaProdutor?.assinado) {
      alert("Ação Bloqueada: O Financeiro Disk é SEMPRE o último signatário! O Produtor deve assinar primeiro.");
      return;
    }

    const agora = new Date().toLocaleString('pt-BR');
    const atualizada = {
      ...solicitacaoAtiva,
      status: "ASSINADO",
      assinaturaFinanceiro: {
        assinado: true,
        assinadoPor: "Karine (Financeiro Disk)",
        assinadoEm: agora,
        certificado: "DISK-AUTH-E-CNPJ"
      }
    };
    atualizarSolicitacao(atualizada);
  };

  const handleLiquidarPagamento = () => {
    const agora = new Date().toLocaleString('pt-BR');
    const authCode = `DISK-PIX-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const atualizada = {
      ...solicitacaoAtiva,
      status: "PAGO",
      pagoEm: agora,
      codigoAutenticacao: authCode
    };
    atualizarSolicitacao(atualizada);
    alert(`Transferência PIX de R$ ${solicitacaoAtiva.valorSolicitado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} liquidada com sucesso! Autenticação: ${authCode}`);
  };

  const atualizarSolicitacao = (atualizada: any) => {
    setSolicitacoes(prev => prev.map(s => s.id === atualizada.id ? atualizada : s));
    setSolicitacaoAtiva(atualizada);
  };

  const isApproved = solicitacaoAtiva.decisao === "APROVADO";
  const isRejected = solicitacaoAtiva.status === "REJEITADO";
  const prodSigned = solicitacaoAtiva.assinaturaProdutor?.assinado;
  const diskSigned = solicitacaoAtiva.assinaturaFinanceiro?.assinado;
  const isPaid = solicitacaoAtiva.status === "PAGO";

  return (
    <div className="container-fluid px-0">
      
      {/* Cabeçalho do Módulo */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
            <i className="ph-scales text-warning"></i>
            <span>Central Unificada de Aprovações Financeiras</span>
          </h4>
          <span className="text-muted fs-xs">
            Governança Maker/Checker &bull; Decisão Obrigatória &bull; Assinaturas Sequenciais Estritas
          </span>
        </div>
        <span className="badge bg-danger rounded-pill px-3 py-2 fs-xxs fw-bold">
          17 Solicitações Pendentes
        </span>
      </div>

      {/* Grid com Fila e Ficha de Detalhe */}
      <div className="row g-3">
        
        {/* Fila de Solicitações (Lado Esquerdo) */}
        <div className="col-lg-5">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-transparent border-bottom p-2 d-flex gap-1">
              {["TODAS", "REPASSE", "ANTECIPACAO", "BORDERO"].map(tab => (
                <button
                  key={tab}
                  className={`btn btn-xs rounded-pill ${abaFiltro === tab ? 'btn-primary' : 'btn-light text-muted'}`}
                  onClick={() => setAbaFiltro(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="list-group list-group-flush" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {solicitacoes
                .filter(s => abaFiltro === "TODAS" || s.tipo === abaFiltro)
                .map(item => {
                  const isSelected = solicitacaoAtiva?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`list-group-item list-group-item-action p-3 ${isSelected ? 'bg-primary bg-opacity-10 border-start border-primary border-4' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSolicitacaoAtiva(item)}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-bold fs-xs text-primary">{item.codigo}</span>
                        <span className={`badge fs-xxs ${item.status === 'PAGO' ? 'bg-success' : item.status === 'REJEITADO' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="fw-bold fs-sm text-dark">R$ {item.valorSolicitado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      <div className="fs-xxs text-muted mt-1">
                        Produtora ABC &bull; Festival Curitiba 2026
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Ficha de Análise e Decisão (Lado Direito) */}
        <div className="col-lg-7">
          {solicitacaoAtiva ? (
            <div className="card shadow-sm border-0">
              <div className="card-header bg-dark text-white p-3 d-flex justify-content-between align-items-center">
                <div>
                  <span className="fs-xxs text-uppercase fw-bold text-primary">ANÁLISE DE SOLICITAÇÃO</span>
                  <h5 className="fw-bold mb-0 text-white mt-1">
                    {solicitacaoAtiva.tipo} #{solicitacaoAtiva.codigo}
                  </h5>
                </div>
                <span className="badge bg-primary text-white fs-xxs px-2 py-1">
                  Termo #{solicitacaoAtiva.documentoId}
                </span>
              </div>

              <div className="card-body p-4">
                
                {/* Bloco de Rejeição (se aplicável) */}
                {isRejected && (
                  <div className="alert alert-danger mb-3 p-3 border-danger rounded">
                    <strong className="d-block fs-xs text-uppercase"><i className="ph-x-circle me-1"></i> SOLICITAÇÃO REJEITADA FORMALMENTE</strong>
                    <div className="fs-sm mt-1"><strong>Motivo:</strong> {solicitacaoAtiva.rejeicao?.motivoCategoria}</div>
                    <div className="fs-xs bg-white p-2 rounded border border-danger border-opacity-25 mt-1">
                      {solicitacaoAtiva.rejeicao?.justificativa}
                    </div>
                  </div>
                )}

                {/* Posição Financeira do Evento */}
                <div className="p-3 bg-light rounded border mb-3">
                  <div className="fs-xxs text-uppercase fw-bold text-muted mb-2">POSIÇÃO FINANCEIRA DO EVENTO</div>
                  <div className="d-flex justify-content-between fs-sm py-1 border-bottom">
                    <span className="text-muted">Vendas Brutas Apuradas:</span>
                    <strong>R$ {auditoriaEvento.vendasBrutas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="d-flex justify-content-between fs-sm py-1 border-bottom">
                    <span className="text-muted">Líquido Acumulado:</span>
                    <strong>R$ {auditoriaEvento.liquidoApurado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="d-flex justify-content-between fs-sm py-1 border-bottom bg-success bg-opacity-10 px-2 rounded">
                    <span className="fw-bold text-success">Saldo Disponível no Momento:</span>
                    <strong className="text-success fs-base">R$ {auditoriaEvento.disponivelAntes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="d-flex justify-content-between fs-sm py-2 border-bottom bg-primary bg-opacity-10 px-2 rounded mt-1">
                    <span className="fw-bold text-primary">Valor Solicitado:</span>
                    <strong className="text-primary fs-5">R$ {auditoriaEvento.solicitado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="d-flex justify-content-between fs-sm py-1 pt-2">
                    <span className="text-muted">Saldo Residual após Operação:</span>
                    <strong className="text-success">R$ {auditoriaEvento.disponivelDepois.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  </div>
                </div>

                {/* Esteira Oficial de Assinaturas Sequenciais */}
                <div className="card p-3 border mb-3">
                  <div className="fs-xxs text-uppercase fw-bold text-muted mb-2">ESTEIRA OFICIAL DE FORMALIZAÇÃO</div>
                  
                  {/* 1. Decisão Operacional */}
                  <div className="d-flex justify-content-between align-items-center fs-sm py-1 border-bottom">
                    <div>
                      <strong>1. Decisão do Financeiro Disk:</strong>
                      <div className="fs-xxs text-muted">
                        {isApproved ? `✓ Aprovado por ${solicitacaoAtiva.analisadoPor}` : isRejected ? "✕ Rejeitado" : "Aguardando análise"}
                      </div>
                    </div>
                    <span className={`badge ${isApproved ? 'bg-success' : isRejected ? 'bg-danger' : 'bg-warning text-dark'}`}>
                      {isApproved ? 'Aprovado' : isRejected ? 'Rejeitado' : 'Pendente'}
                    </span>
                  </div>

                  {/* 2. Assinatura do Produtor (PRIMEIRO) */}
                  <div className="d-flex justify-content-between align-items-center fs-sm py-2 border-bottom">
                    <div>
                      <strong>2. Assinatura do Produtor (PRIMEIRO):</strong>
                      <div className="fs-xxs text-muted">
                        {prodSigned ? `✓ Assinado por João Silva em ${solicitacaoAtiva.assinaturaProdutor?.assinadoEm}` : "○ Aguardando assinatura do Produtor"}
                      </div>
                    </div>
                    <span className={`badge ${prodSigned ? 'bg-success' : 'bg-warning text-dark'}`}>
                      {prodSigned ? '✓ Assinado' : 'Aguardando'}
                    </span>
                  </div>

                  {/* 3. Assinatura do Financeiro Disk (SEMPRE POR ÚLTIMO) */}
                  <div className="d-flex justify-content-between align-items-center fs-sm py-2 border-bottom">
                    <div>
                      <strong>3. Assinatura Financeiro Disk (SEMPRE POR ÚLTIMO):</strong>
                      <div className="fs-xxs text-muted">
                        {diskSigned ? `✓ Assinado por Karine` : !prodSigned ? "🔒 Bloqueado: O Financeiro assina após o Produtor" : "○ Liberado para assinatura final"}
                      </div>
                    </div>
                    <span className={`badge ${diskSigned ? 'bg-success' : !prodSigned ? 'bg-secondary' : 'bg-primary'}`}>
                      {diskSigned ? '✓ Assinado por Último' : !prodSigned ? '🔒 Bloqueado' : 'Liberado'}
                    </span>
                  </div>

                  {/* 4. Liquidação Financeira */}
                  <div className="d-flex justify-content-between align-items-center fs-sm py-1 pt-2">
                    <div>
                      <strong>4. Transferência &amp; Liquidação:</strong>
                      <div className="fs-xxs text-muted">
                        {isPaid ? `✓ Transferido via PIX (${solicitacaoAtiva.codigoAutenticacao})` : "Aguardando formalização completa"}
                      </div>
                    </div>
                    <span className={`badge ${isPaid ? 'bg-success' : 'bg-light text-muted'}`}>
                      {isPaid ? 'Pago' : 'Aguardando'}
                    </span>
                  </div>
                </div>

                {/* Ações Operacionais Conforme o Estado */}
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2 border-top">
                  <div>
                    {!isApproved && !isRejected && (
                      <button className="btn btn-outline-danger btn-sm" onClick={() => setModalRejeicaoAberto(true)}>
                        ✕ Rejeitar Solicitação
                      </button>
                    )}
                  </div>

                  <div className="d-flex gap-2">
                    {!isApproved && !isRejected && (
                      <button className="btn btn-primary" onClick={handleAprovar}>
                        ✓ Aprovar &amp; Gerar Termo
                      </button>
                    )}

                    {isApproved && !prodSigned && (
                      <>
                        <button className="btn btn-secondary text-muted" disabled title="O Produtor deve assinar primeiro no login dele.">
                          🔒 Assinatura Disk Bloqueada (Aguardando Produtor)
                        </button>
                        <button className="btn btn-outline-primary btn-sm" onClick={handleSimularAssinaturaProdutor}>
                          ⚡ Simular Assinatura do Produtor
                        </button>
                      </>
                    )}

                    {isApproved && prodSigned && !diskSigned && (
                      <button className="btn btn-primary fw-bold" onClick={handleAssinarFinanceiro}>
                        ✍️ Assinar Documento Agora (Financeiro Disk)
                      </button>
                    )}

                    {diskSigned && !isPaid && (
                      <button className="btn btn-success fw-bold" onClick={handleLiquidarPagamento}>
                        💰 Executar Pagamento / Transferência (PIX)
                      </button>
                    )}

                    {isPaid && (
                      <span className="badge bg-success p-2 fs-xs">
                        ✓ Operação 100% Concluída e Liquidada
                      </span>
                    )}
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-muted">Selecione uma solicitação na fila ao lado.</div>
          )}
        </div>

      </div>

      {/* Modal de Rejeição Formal Obrigatória */}
      {modalRejeicaoAberto && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title fs-sm fw-bold">Rejeitar Solicitação #{solicitacaoAtiva?.codigo}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setModalRejeicaoAberto(false)}></button>
              </div>
              <form onSubmit={handleConfirmarRejeicao}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fs-xs fw-bold text-uppercase text-muted">Motivo Oficial da Rejeição *</label>
                    <select
                      className="form-select form-select-sm"
                      value={motivoRejeicao}
                      onChange={(e) => setMotivoRejeicao(e.target.value)}
                      required
                    >
                      <option value="Inconsistência de valores">Inconsistência de valores</option>
                      <option value="Divergência bancária">Divergência bancária</option>
                      <option value="Documentação pendente">Documentação pendente</option>
                      <option value="Saldo insuficiente">Saldo insuficiente</option>
                      <option value="Bloqueio financeiro ativo no contrato">Bloqueio financeiro ativo no contrato</option>
                      <option value="Divergência no borderô de vendas">Divergência no borderô de vendas</option>
                      <option value="Outros">Outros motivos contratuais</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fs-xs fw-bold text-uppercase text-muted">Justificativa Detalhada Obrigatória *</label>
                    <textarea
                      className="form-control fs-sm"
                      rows={4}
                      placeholder="Descreva o motivo detalhado para exibição formal ao Produtor..."
                      value={justificativa}
                      onChange={(e) => setJustificativa(e.target.value)}
                      required
                    />
                  </div>

                  <div className="fs-xxs text-muted bg-light p-2 rounded">
                    ℹ️ Ao confirmar a rejeição, o saldo reservado será estornado imediatamente para o saldo disponível do Produtor.
                  </div>
                </div>

                <div className="modal-footer p-2">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setModalRejeicaoAberto(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-danger btn-sm">Confirmar Rejeição Formal</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
