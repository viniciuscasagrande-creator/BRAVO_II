import { Request, Response } from 'express';

export const gatewaysController = {
  listarAdquirentes(_req: Request, res: Response) {
    res.json([
      { id: 'cielo', nome: 'Cielo', mdr: 2.15, spread: 1.22, status: 'OPERACIONAL' },
      { id: 'rede', nome: 'Rede', mdr: 2.10, spread: 1.25, status: 'OPERACIONAL' },
      { id: 'stone', nome: 'Stone', mdr: 1.95, spread: 1.15, status: 'OPERACIONAL' },
      { id: 'pagbank', nome: 'PagBank', mdr: 0.99, spread: 1.40, status: 'OPERACIONAL' }
    ]);
  }
};
