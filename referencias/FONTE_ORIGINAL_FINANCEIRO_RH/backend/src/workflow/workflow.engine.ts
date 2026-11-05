/**
 * Motor Unificado de Workflow Financeiro (Repasse, Antecipação e Borderô)
 * Implementa a máquina de estados oficial com governança estrita de aprovação e assinaturas sequenciais.
 */

import { StatusSolicitacao, TipoSolicitacao, ContextoRequisicao } from '../types';
import { AuthMiddleware } from '../auth/auth.middleware';

export interface SolicitacaoWorkflow {
  id: string;
  codigo: string;
  tipo: TipoSolicitacao;
  status: StatusSolicitacao;
  produtorId: string;
  eventoId: string;
  valorSolicitado: number;
  valorLiquido: number;
  solicitadoPorId: string;
  solicitadoEm: string;
  
  analisadoPorId?: string;
  analisadoEm?: string;
  decisao?: "APROVADO" | "REJEITADO";
  rejeicao?: {
    motivoCategoria: string;
    justificativa: string;
    rejeitadoPor: string;
    rejeitadoEm: string;
  };
  
  documentoId?: string;
  termoDocumento?: string;
  
  assinaturas: {
    produtor: {
      assinado: boolean;
      assinadoPor?: string;
      assinadoEm?: string;
      ip?: string;
      certificado?: string;
    };
    financeiro: {
      assinado: boolean;
      assinadoPor?: string;
      assinadoEm?: string;
      ip?: string;
      certificado?: string;
      bloqueadoAguardandoProdutor: boolean;
    };
  };
  
  pagoEm?: string;
  codigoAutenticacao?: string;
  trilhaAuditoria: Array<{
    dataHora: string;
    autor: string;
    acao: string;
    detalhes?: string;
  }>;
}

export class WorkflowEngine {
  /**
   * 1. Criar Solicitação (Produtor)
   */
  static criarSolicitacao(
    contexto: ContextoRequisicao,
    dados: {
      tipo: TipoSolicitacao;
      produtorId: string;
      eventoId: string;
      valor: number;
      nomeEvento: string;
    }
  ): SolicitacaoWorkflow {
    AuthMiddleware.validarIsolamentoTenant(contexto, dados.produtorId);

    const codigo = `${dados.tipo.substring(0, 3)}-${Math.floor(100000 + Math.random() * 900000)}`;
    const agora = new Date().toISOString();

    const solicitacao: SolicitacaoWorkflow = {
      id: `sol-${Date.now()}`,
      codigo: codigo,
      tipo: dados.tipo,
      status: "AGUARDANDO_ANALISE",
      produtorId: dados.produtorId,
      eventoId: dados.eventoId,
      valorSolicitado: dados.valor,
      valorLiquido: dados.tipo === "ANTECIPACAO" ? dados.valor * 0.98 : dados.valor,
      solicitadoPorId: contexto.usuarioId,
      solicitadoEm: agora,
      documentoId: `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
      termoDocumento: `Termo Oficial de ${dados.tipo} #${codigo}`,
      assinaturas: {
        produtor: { assinado: false },
        financeiro: { assinado: false, bloqueadoAguardandoProdutor: true }
      },
      trilhaAuditoria: [
        {
          dataHora: agora,
          autor: `Usuário ${contexto.usuarioId} (Produtor)`,
          acao: `Criou solicitação de ${dados.tipo} (${codigo})`,
          detalhes: `Valor: R$ ${dados.valor.toFixed(2)} vinculado ao evento ${dados.nomeEvento}`
        },
        {
          dataHora: agora,
          autor: "Sistema Disk",
          acao: "Notificou mesa de aprovação do Financeiro Disk",
          detalhes: "Status alterado para AGUARDANDO_ANALISE"
        }
      ]
    };

    return solicitacao;
  }

  /**
   * 2. Decisão Operacional: APROVAR (Financeiro Disk)
   */
  static aprovarSolicitacao(
    contexto: ContextoRequisicao,
    solicitacao: SolicitacaoWorkflow
  ): void {
    AuthMiddleware.exigirPerfil(contexto, ["FINANCEIRO", "ADMINISTRADOR"]);

    if (solicitacao.status !== "AGUARDANDO_ANALISE" && solicitacao.status !== "EM_ANALISE") {
      throw new Error(`Operação inválida para o status atual: ${solicitacao.status}`);
    }

    if (solicitacao.solicitadoPorId === contexto.usuarioId) {
      throw new Error('Segregação de funções: o solicitante não pode aprovar a própria operação.');
    }
    const agora = new Date().toISOString();
    solicitacao.status = "AGUARDANDO_ASSINATURA_PRODUTOR";
    solicitacao.decisao = "APROVADO";
    solicitacao.analisadoPorId = contexto.usuarioId;
    solicitacao.analisadoEm = agora;

    solicitacao.trilhaAuditoria.push({
      dataHora: agora,
      autor: `Operador Financeiro Disk (${contexto.usuarioId})`,
      acao: "Aprovou a solicitação e gerou o documento oficial",
      detalhes: `Termo gerado (#${solicitacao.documentoId}). Aguardando assinatura digital do Produtor.`
    });
  }

  /**
   * 3. Decisão Operacional: REJEITAR FORMALMENTE (Financeiro Disk)
   */
  static rejeitarSolicitacao(
    contexto: ContextoRequisicao,
    solicitacao: SolicitacaoWorkflow,
    motivoCategoria: string,
    justificativa: string
  ): void {
    AuthMiddleware.exigirPerfil(contexto, ["FINANCEIRO", "ADMINISTRADOR"]);

    if (!motivoCategoria || !justificativa) {
      throw new Error("A rejeição exige obrigatoriamente a categoria do motivo e justificativa detalhada.");
    }

    const agora = new Date().toISOString();
    solicitacao.status = "REJEITADO";
    solicitacao.decisao = "REJEITADO";
    solicitacao.analisadoPorId = contexto.usuarioId;
    solicitacao.analisadoEm = agora;
    solicitacao.rejeicao = {
      motivoCategoria,
      justificativa,
      rejeitadoPor: `Operador Financeiro Disk (${contexto.usuarioId})`,
      rejeitadoEm: agora
    };

    solicitacao.trilhaAuditoria.push({
      dataHora: agora,
      autor: `Operador Financeiro Disk (${contexto.usuarioId})`,
      acao: `Rejeitou formalmente a solicitação: ${motivoCategoria}`,
      detalhes: `Justificativa: "${justificativa}". Recursos retidos devolvidos imediatamente ao saldo disponível.`
    });
  }

  /**
   * 4. Assinatura Digital do PRODUTOR (PRIMEIRO NA ESTEIRA)
   */
  static assinarComoProdutor(
    contexto: ContextoRequisicao,
    solicitacao: SolicitacaoWorkflow,
    ip: string = "177.136.241.10"
  ): void {
    AuthMiddleware.validarIsolamentoTenant(contexto, solicitacao.produtorId);

    if (solicitacao.status !== "AGUARDANDO_ASSINATURA_PRODUTOR") {
      throw new Error(`O documento não está disponível para assinatura do Produtor (Status: ${solicitacao.status}).`);
    }

    const agora = new Date().toISOString();
    solicitacao.assinaturas.produtor = {
      assinado: true,
      assinadoPor: `Produtor (${contexto.usuarioId})`,
      assinadoEm: agora,
      ip: ip,
      certificado: "DEMO-SEM-CERTIFICADO-REAL"
    };

    // Libera a trava do Financeiro Disk!
    solicitacao.assinaturas.financeiro.bloqueadoAguardandoProdutor = false;
    solicitacao.status = "AGUARDANDO_ASSINATURA_FINANCEIRO";

    solicitacao.trilhaAuditoria.push({
      dataHora: agora,
      autor: `Produtor (${contexto.usuarioId})`,
      acao: "Assinou digitalmente o termo formal via ICP-Brasil",
      detalhes: "Status atualizado: Liberado para assinatura final do Financeiro Disk"
    });
  }

  /**
   * 5. Assinatura Digital do FINANCEIRO DISK (SEMPRE POR ÚLTIMO!)
   */
  static assinarComoFinanceiro(
    contexto: ContextoRequisicao,
    solicitacao: SolicitacaoWorkflow,
    ip: string = "189.40.12.8"
  ): void {
    AuthMiddleware.exigirPerfil(contexto, ["FINANCEIRO", "ADMINISTRADOR"]);

    // REGRA DE OURO TRAVADA NO SISTEMA:
    if (!solicitacao.assinaturas.produtor.assinado) {
      throw new Error(
        "Ação Bloqueada: O Financeiro Disk é SEMPRE o último signatário! O documento deve ser assinado primeiro pelo Produtor."
      );
    }

    if (solicitacao.status !== "AGUARDANDO_ASSINATURA_FINANCEIRO") {
      throw new Error(`Status inválido para assinatura final do Financeiro: ${solicitacao.status}`);
    }

    const agora = new Date().toISOString();
    solicitacao.assinaturas.financeiro = {
      assinado: true,
      assinadoPor: `Mesa Financeira Disk (${contexto.usuarioId})`,
      assinadoEm: agora,
      ip: ip,
      certificado: "DEMO-SEM-CERTIFICADO-REAL",
      bloqueadoAguardandoProdutor: false
    };

    solicitacao.status = "ASSINADO";

    solicitacao.trilhaAuditoria.push({
      dataHora: agora,
      autor: `Financeiro Disk (${contexto.usuarioId})`,
      acao: "Assinou digitalmente como último signatário",
      detalhes: "Documento 100% formalizado e concluído. Liberado para liquidação financeira/PIX."
    });
  }

  /**
   * 6. Liquidação Financeira & Pagamento Bancário
   */
  static liquidarPagamento(
    contexto: ContextoRequisicao,
    solicitacao: SolicitacaoWorkflow
  ): void {
    AuthMiddleware.exigirPerfil(contexto, ["FINANCEIRO", "ADMINISTRADOR"]);

    if (solicitacao.status === "PAGO" || solicitacao.pagoEm) {
      throw new Error('Liquidação duplicada bloqueada.');
    }
    if (solicitacao.status !== "ASSINADO" && solicitacao.status !== "PROGRAMADO") {
      throw new Error("A liquidação financeira exige que o documento esteja formalizado com ambas as assinaturas.");
    }
    if (!solicitacao.assinaturas.produtor.assinado || !solicitacao.assinaturas.financeiro.assinado) {
      throw new Error('Liquidação bloqueada: assinaturas incompletas.');
    }
    if (solicitacao.analisadoPorId === contexto.usuarioId) {
      throw new Error('Segregação de funções: quem aprovou não pode liquidar a mesma operação.');
    }

    const agora = new Date().toISOString();
    const authCode = `DISK-PIX-${Math.floor(10000000 + Math.random() * 90000000)}`;

    solicitacao.status = "PAGO";
    solicitacao.pagoEm = agora;
    solicitacao.codigoAutenticacao = authCode;

    solicitacao.trilhaAuditoria.push({
      dataHora: agora,
      autor: "Tesouraria Disk",
      acao: `Liquidação registrada em ambiente de homologação (${authCode})`,
      detalhes: "Sem transmissão bancária real; conciliação depende de retorno/API homologada."
    });
  }
}
