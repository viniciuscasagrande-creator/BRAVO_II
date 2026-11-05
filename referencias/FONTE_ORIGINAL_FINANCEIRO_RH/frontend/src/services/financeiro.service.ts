import { apiClient } from './api';
import { Produtor, Evento, SolicitacaoFinanceira, LedgerEntry } from '../types';

export const financeiroService = {
  async listarTodosProdutores(): Promise<Produtor[]> {
    try {
      const response = await apiClient.get<Produtor[]>('/financeiro/produtores');
      return response.data;
    } catch {
      return [];
    }
  },

  async listarTodosEventos(): Promise<Evento[]> {
    try {
      const response = await apiClient.get<Evento[]>('/financeiro/eventos');
      return response.data;
    } catch {
      return [];
    }
  },

  async listarFilaAprovacao(): Promise<SolicitacaoFinanceira[]> {
    try {
      const response = await apiClient.get<SolicitacaoFinanceira[]>('/financeiro/aprovacoes');
      return response.data;
    } catch {
      return [];
    }
  },

  async listarLedger(produtorId?: string | null, eventoId?: string | null): Promise<LedgerEntry[]> {
    try {
      const params = { produtorId, eventoId };
      const response = await apiClient.get<LedgerEntry[]>('/financeiro/ledger', { params });
      return response.data;
    } catch {
      return [];
    }
  }
};

export default financeiroService;
