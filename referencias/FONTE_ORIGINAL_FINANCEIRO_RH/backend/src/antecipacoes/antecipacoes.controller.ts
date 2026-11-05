import { Request, Response } from 'express';

export const antecipacoesController = {
  simular(req: Request, res: Response) {
    const { valorDesejado, taxaPercent = 2.0 } = req.body;
    const custo = valorDesejado * (taxaPercent / 100);
    res.json({
      valorSolicitado: valorDesejado,
      taxaPercent,
      custoAntecipacao: custo,
      valorLiquido: valorDesejado - custo
    });
  }
};
