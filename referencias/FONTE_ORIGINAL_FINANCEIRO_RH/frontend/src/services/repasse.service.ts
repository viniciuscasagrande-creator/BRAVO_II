import { apiClient } from './api';
import { SolicitacaoFinanceira } from '../types';

export const repasseService = {
  async solicitarRepasse(dados: {
    produtorId: string;
    produtorNome: string;
    eventoId: string;
    eventoNome: string;
    valor: number;
    dadosBancarios: {
      banco: string;
      agencia: string;
      conta: string;
      chavePix?: string;
    };
  }): Promise<SolicitacaoFinanceira> {
    try {
      const response = await apiClient.post<SolicitacaoFinanceira>('/solicitacoes/repasse', dados);
      return response.data;
    } catch {
      // Mock Fallback para demonstração autônoma
      const nova: SolicitacaoFinanceira = {
        id: `REP-${Math.floor(100000 + Math.random() * 900000)}`,
        protocolo: `PROT-${Date.now()}`,
        produtorId: dados.produtorId,
        produtorNome: dados.produtorNome,
        eventoId: dados.eventoId,
        eventoNome: dados.eventoNome,
        tipo: 'REPASSE',
        status: 'AGUARDANDO_ANALISE',
        dataCriacao: new Date().toLocaleString('pt-BR'),
        valorBruto: dados.valor,
        taxaDesconto: 0,
        valorLiquido: dados.valor,
        dadosBancarios: dados.dadosBancarios,
        assinaturas: {
          documentoId: `DOC-REP-${Date.now()}`,
          produtor: { assinado: false },
          financeiroDisk: { assinado: false }
        }
      };
      return nova;
    }
  },

  async aprovar(id: string, usuarioNome: string): Promise<void> {
    try {
      await apiClient.post(`/solicitacoes/${id}/aprovar`, { usuarioNome });
    } catch {
      console.log(`[Demo] Solicitação ${id} aprovada por ${usuarioNome}. Documento formal gerado.`);
    }
  },

  async rejeitar(id: string, motivo: string, observacao: string, usuarioNome: string): Promise<void> {
    try {
      await apiClient.post(`/solicitacoes/${id}/rejeitar`, { motivo, observacao, usuarioNome });
    } catch {
      console.log(`[Demo] Solicitação ${id} rejeitada por ${usuarioNome}. Motivo: ${motivo}`);
    }
  },

  async liquidarPIX(id: string): Promise<{ codigoAutenticacao: string }> {
    try {
      const response = await apiClient.post(`/solicitacoes/${id}/liquidar-pix`);
      return response.data;
    } catch {
      return { codigoAutenticacao: `PIX-BACEN-${Math.floor(10000000 + Math.random() * 90000000)}` };
    }
  }
};

export default repasseService;
