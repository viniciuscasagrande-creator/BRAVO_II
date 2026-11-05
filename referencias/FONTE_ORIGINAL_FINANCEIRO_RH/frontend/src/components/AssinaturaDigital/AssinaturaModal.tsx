import React, { useState } from 'react';
import { SolicitacaoFinanceira } from '../../types';
import { formatCurrencyBRL } from '../../utils/formatters';

interface AssinaturaModalProps {
  solicitacao: SolicitacaoFinanceira;
  isFinanceiro: boolean;
  onClose: () => void;
  onAssinarProdutor: (id: string) => void;
  onAssinarDisk: (id: string) => void;
}

export const AssinaturaModal: React.FC<AssinaturaModalProps> = ({
  solicitacao,
  isFinanceiro,
  onClose,
  onAssinarProdutor,
  onAssinarDisk
}) => {
  const prodAssinado = solicitacao.assinaturas.produtor.assinado;
  const diskAssinado = solicitacao.assinaturas.financeiroDisk.assinado;

  const [simulando, setSimulando] = useState(false);

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content shadow-lg border-0" style={{ background: '#ffffff', borderRadius: '12px', overflow: 'hidden' }}>
          
          {/* Header */}
          <div className="modal-header d-flex justify-content-between align-items-center" style={{ background: '#161922', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div>
              <span className="fs-xxs text-uppercase fw-bold text-primary" style={{ letterSpacing: '0.05em' }}>
                ESTEIRA OFICIAL DE FORMALIZAÇÃO JURÍDICO-FINANCEIRA
              </span>
              <h5 className="modal-title fs-sm fw-bold text-white mt-1">
                TERMO DIGITAL #{solicitacao.assinaturas.documentoId} &bull; {solicitacao.tipo}
              </h5>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          {/* Body */}
          <div className="modal-body p-4 fs-xs">
            
            {/* Resumo da Operação */}
            <div className="row g-3 p-3 rounded mb-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div className="col-sm-6">
                <span className="fs-xxs text-uppercase text-muted fw-bold d-block">Produtor Titular</span>
                <strong className="fs-sm text-dark">{solicitacao.produtorNome}</strong>
                <span className="d-block text-muted fs-xxs">Evento: {solicitacao.eventoNome}</span>
              </div>
              <div className="col-sm-6 text-sm-end">
                <span className="fs-xxs text-uppercase text-muted fw-bold d-block">Valor Líquido da Liberação</span>
                <strong className="fs-5 text-primary fw-bold">{formatCurrencyBRL(solicitacao.valorLiquido)}</strong>
                <span className="d-block text-muted fs-xxs">Conta: {solicitacao.dadosBancarios.banco} Ag. {solicitacao.dadosBancarios.agencia} C/C {solicitacao.dadosBancarios.conta}</span>
              </div>
            </div>

            {/* Regra de Trava Obrigatória */}
            <div className="alert alert-warning py-2 px-3 mb-4 d-flex align-items-center gap-2 border-0 rounded">
              <i className="ph-shield-warning text-warning fs-4"></i>
              <div>
                <strong>Regra Constitucional do Core Financeiro Disk:</strong>
                <div className="fs-xxs text-dark">
                  1. O <strong>Produtor assina primeiro</strong> reconhecendo os valores e quitação parcial.<br/>
                  2. A <strong>Diretoria Financeira da Disk assina SEMPRE POR ÚLTIMO</strong> liberando a liquidação bancária.
                </div>
              </div>
            </div>

            {/* Esteira de Assinaturas */}
            <div className="card p-3 shadow-sm border mb-3">
              <h6 className="fw-bold fs-xs text-uppercase text-muted mb-3 d-flex align-items-center gap-1">
                <i className="ph-signature text-primary"></i> Signatários Obrigatórios do Documento
              </h6>

              {/* 1. Assinatura do Produtor */}
              <div className="p-3 rounded mb-2 border" style={{ background: prodAssinado ? '#f0fdf4' : '#fffbeb' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong className="d-block text-dark">1. Assinatura do Produtor (Primeiro Signatário)</strong>
                    {prodAssinado ? (
                      <span className="text-success fs-xxs">
                        ✓ Assinado por <strong>{solicitacao.assinaturas.produtor.assinadoPor}</strong> em {solicitacao.assinaturas.produtor.dataHora}
                        <br />Hash ICP: <code className="text-muted">{solicitacao.assinaturas.produtor.hashAssinatura || 'SHA256:d8a7f1...e90c'}</code>
                      </span>
                    ) : (
                      <span className="text-muted fs-xxs">
                        ○ Aguardando assinatura digital do produtor no portal ou aplicativo.
                      </span>
                    )}
                  </div>
                  <span className={`badge ${prodAssinado ? 'bg-success' : 'bg-warning text-dark'}`}>
                    {prodAssinado ? 'Assinado' : 'Pendente Produtor'}
                  </span>
                </div>
              </div>

              {/* 2. Assinatura do Financeiro Disk (SEMPRE POR ÚLTIMO) */}
              <div className="p-3 rounded border" style={{ background: diskAssinado ? '#f0fdf4' : (!prodAssinado ? '#f1f5f9' : '#eff6ff') }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong className="d-block text-dark">2. Assinatura Financeiro Disk (SEMPRE POR ÚLTIMO)</strong>
                    {diskAssinado ? (
                      <span className="text-success fs-xxs">
                        ✓ Homologado por <strong>{solicitacao.assinaturas.financeiroDisk.assinadoPor}</strong> em {solicitacao.assinaturas.financeiroDisk.dataHora}
                        <br />Hash ICP: <code className="text-muted">{solicitacao.assinaturas.financeiroDisk.hashAssinatura || 'SHA256:f4e3c2...b18a'}</code>
                      </span>
                    ) : !prodAssinado ? (
                      <span className="text-danger fs-xxs fw-semibold">
                        🔒 Assinatura bloqueada pelo sistema. Aguardando assinatura prévia do Produtor.
                      </span>
                    ) : (
                      <span className="text-primary fs-xxs fw-semibold">
                        ✓ Liberado para assinatura final da Mesa de Operações Disk Ingressos.
                      </span>
                    )}
                  </div>
                  <span className={`badge ${diskAssinado ? 'bg-success' : (!prodAssinado ? 'bg-secondary' : 'bg-primary')}`}>
                    {diskAssinado ? 'Assinado por Último' : (!prodAssinado ? 'Bloqueado' : 'Liberado')}
                  </span>
                </div>
              </div>

            </div>

          </div>

          {/* Footer de Ações */}
          <div className="modal-footer bg-light p-3 d-flex justify-content-between align-items-center">
            <button type="button" className="btn btn-sm btn-secondary" onClick={onClose}>Fechar</button>

            <div className="d-flex gap-2">
              {/* Botão para o Produtor assinar */}
              {!prodAssinado && (
                <button
                  type="button"
                  className="btn btn-sm btn-success fw-bold d-flex align-items-center gap-1 shadow-sm"
                  onClick={() => onAssinarProdutor(solicitacao.id)}
                >
                  <i className="ph-pen-nib"></i> Assinar Digitalmente como Produtor
                </button>
              )}

              {/* Botão para o Financeiro assinar */}
              {isFinanceiro && !diskAssinado && (
                <button
                  type="button"
                  className={`btn btn-sm fw-bold d-flex align-items-center gap-1 shadow-sm ${!prodAssinado ? 'btn-secondary text-muted disabled' : 'btn-primary'}`}
                  disabled={!prodAssinado}
                  onClick={() => onAssinarDisk(solicitacao.id)}
                  title={!prodAssinado ? 'Assinatura travada: o Produtor deve assinar primeiro' : 'Concluir assinatura final'}
                >
                  <i className={!prodAssinado ? "ph-lock" : "ph-signature"}></i>
                  {!prodAssinado ? '🔒 Assinatura Disk Bloqueada' : 'Assinar por Último (Financeiro Disk)'}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AssinaturaModal;
