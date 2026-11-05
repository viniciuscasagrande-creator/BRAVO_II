import { apiClient } from './api';
import { SolicitacaoFinanceira } from '../types';

export interface SimulacaoAntecipacao {
  recebiveisFuturosTotais: number;
  valorSolicitado: number;
  taxaAntecipacaoPercent: number;
  custoAntecipacao: number;
  valorLiquidoReceber: number;
}

export const antecipacaoService = {
  simular(recebiveisDisponiveis: number, valorDesejado: number, taxaPercent: number = 2.0): SimulacaoAntecipacao {
    const valorSolicitado = Math.min(valorDesejado, recebiveisDisponiveis);
    const custoAntecipacao = valorSolicitado * (taxaPercent / 100);
    const valorLiquidoReceber = valorSolicitado - custoAntecipacao;

    return {
      recebiveisFuturosTotais: recebiveisDisponiveis,
      valorSolicitado,
      taxaAntecipacaoPercent: taxaPercent,
      custoAntecipacao,
      valorLiquidoReceber
    };
  },

  async solicitarAntecipacao(dados: {
    produtorId: string;
    produtorNome: string;
    eventoId: string;
    eventoNome: string;
    simulacao: SimulacaoAntecipacao;
    dadosBancarios: {
      banco: string;
      agencia: string;
      conta: string;
      chavePix?: string;
    };
  }): Promise<SolicitacaoFinanceira> {
    try {
      const response = await apiClient.post<SolicitacaoFinanceira>('/solicitacoes/antecipacao', dados);
      return response.data;
    } catch {
      const nova: SolicitacaoFinanceira = {
        id: `ANT-${Math.floor(100000 + Math.random() * 900000)}`,
        protocolo: `PROT-ANT-${Date.now()}`,
        produtorId: dados.produtorId,
        produtorNome: dados.produtorNome,
        eventoId: dados.eventoId,
        eventoNome: dados.eventoNome,
        tipo: 'ANTECIPACAO',
        status: 'AGUARDANDO_ANALISE',
        dataCriacao: new Date().toLocaleString('pt-BR'),
        valorBruto: dados.simulacao.valorSolicitado,
        taxaDesconto: dados.simulacao.custoAntecipacao,
        valorLiquido: dados.simulacao.valorLiquidoReceber,
        dadosBancarios: dados.dadosBancarios,
        assinaturas: {
          documentoId: `DOC-ANT-${Date.now()}`,
          produtor: { assinado: false },
          financeiroDisk: { assinado: false }
        }
      };
      return nova;
    }
  }
};

export default antecipacaoService;
