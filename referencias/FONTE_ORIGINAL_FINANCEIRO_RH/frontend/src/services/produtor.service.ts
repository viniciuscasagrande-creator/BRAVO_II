import { apiClient } from './api';
import { Produtor, Evento, SaldoEvento } from '../types';

export const produtorService = {
  async obterMeusDados(produtorId: string): Promise<Produtor | null> {
    try {
      const response = await apiClient.get<Produtor>(`/produtores/${produtorId}`);
      return response.data;
    } catch {
      return null;
    }
  },

  async listarEventos(produtorId: string): Promise<Evento[]> {
    try {
      const response = await apiClient.get<Evento[]>(`/produtores/${produtorId}/eventos`);
      return response.data;
    } catch {
      return [];
    }
  },

  async obterSaldos(produtorId: string): Promise<SaldoEvento[]> {
    try {
      const response = await apiClient.get<SaldoEvento[]>(`/produtores/${produtorId}/saldos`);
      return response.data;
    } catch {
      return [];
    }
  }
};

export default produtorService;
