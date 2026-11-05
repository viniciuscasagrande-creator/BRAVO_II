import { Request, Response } from 'express';

export const relatoriosController = {
  gerarDRE(_req: Request, res: Response) {
    res.json({
      periodo: 'Setembro/2026',
      receitaBrutaIngressos: 2440000,
      receitaServicoDisk: 244000,
      custoMdrAdquirente: 52460,
      margemContribuicao: 191540
    });
  }
};
