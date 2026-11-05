import { apiClient } from './api';

export interface BorderoFechamento {
  id: string;
  eventoId: string;
  eventoNome: string;
  produtorId: string;
  ingressosVendidos: number;
  ingressosCancelados: number;
  cortesias: number;
  receitaBruta: number;
  taxasDisk: number;
  estornosChargebacks: number;
  receitaLiquida: number;
  repassesRealizados: number;
  saldoFinalResidual: number;
  statusFechamento: 'EM_ABERTO' | 'AGUARDANDO_ASSINATURA' | 'FECHADO_ASSINADO';
  assinadoProdutor: boolean;
  assinadoDisk: boolean;
}

export const borderoService = {
  async obterBordero(eventoId: string): Promise<BorderoFechamento | null> {
    try {
      const response = await apiClient.get<BorderoFechamento>(`/borderos/${eventoId}`);
      return response.data;
    } catch {
      return null;
    }
  }
};

export default borderoService;
