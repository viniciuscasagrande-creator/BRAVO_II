import { Request, Response } from 'express';

export const borderosController = {
  obterPorEvento(req: Request, res: Response) {
    res.json({
      id: 'BOR-2026-001',
      eventoId: req.params.eventoId,
      ingressosVendidos: 4200,
      cortesias: 150,
      receitaBruta: 500000,
      taxaDisk: 50000,
      receitaLiquida: 450000,
      repassesRealizados: 250000,
      saldoFinalResidual: 200000,
      status: 'EM_ABERTO'
    });
  }
};
