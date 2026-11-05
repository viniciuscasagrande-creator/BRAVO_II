import { Request, Response } from 'express';

export const produtoresController = {
  listar(req: Request, res: Response) {
    res.json([
      { id: 'prod-abc', razaoSocial: 'Produtora ABC Ltda.', cnpj: '12.345.678/0001-90', saldoDisponivel: 310000 },
      { id: 'prod-xyz', razaoSocial: 'XYZ Live Eventos S.A.', cnpj: '98.765.432/0001-10', saldoDisponivel: 180000 },
      { id: 'prod-premium', razaoSocial: 'Grupo Premium Shows', cnpj: '45.123.890/0001-55', saldoDisponivel: 45000 }
    ]);
  }
};
