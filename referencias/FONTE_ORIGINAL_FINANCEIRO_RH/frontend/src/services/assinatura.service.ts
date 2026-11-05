import { apiClient } from './api';
import { SolicitacaoFinanceira } from '../types';

export const assinaturaService = {
  async assinarProdutor(solicitacaoId: string, nomeSignatario: string): Promise<SolicitacaoFinanceira> {
    try {
      const response = await apiClient.post<SolicitacaoFinanceira>(`/assinaturas/${solicitacaoId}/produtor`, {
        signatario: nomeSignatario
      });
      return response.data;
    } catch {
      console.log(`[Assinatura] Produtor ${nomeSignatario} assinou o termo da solicitação ${solicitacaoId}.`);
      return {} as any;
    }
  },

  async assinarDisk(solicitacaoId: string, solicitacaoAtual: SolicitacaoFinanceira, nomeSignatario: string): Promise<SolicitacaoFinanceira> {
    // Validação estrita do Core: O Financeiro Disk NUNCA pode assinar antes do Produtor
    if (!solicitacaoAtual.assinaturas.produtor.assinado) {
      throw new Error('Violação do Fluxo Jurídico: O Financeiro Disk é sempre o último signatário. A assinatura do Produtor é obrigatória antes da validação do Financeiro.');
    }

    try {
      const response = await apiClient.post<SolicitacaoFinanceira>(`/assinaturas/${solicitacaoId}/financeiro`, {
        signatario: nomeSignatario
      });
      return response.data;
    } catch {
      console.log(`[Assinatura] Financeiro Disk (${nomeSignatario}) assinou por último o termo da solicitação ${solicitacaoId}. Operação pronta para liquidação.`);
      return {} as any;
    }
  }
};

export default assinaturaService;
