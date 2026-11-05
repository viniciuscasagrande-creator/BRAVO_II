import { Request, Response } from 'express';

export const saldosController = {
  obterSaldosGerais(_req: Request, res: Response) {
    res.json({
      saldoTotalConsolidado: 2440000,
      obrigacoesProdutores: 1580000,
      disponivelRepasse: 490000,
      recebiveisFuturos: 980000,
      bloqueadoGarantia: 110000
    });
  }
};
