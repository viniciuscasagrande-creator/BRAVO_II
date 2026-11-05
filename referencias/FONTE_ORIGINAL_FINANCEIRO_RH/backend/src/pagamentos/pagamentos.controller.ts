import { Request, Response } from 'express';

export const pagamentosController = {
  liquidarPix(req: Request, res: Response) {
    res.json({ status: 'LIQUIDADO', dataHora: new Date().toISOString() });
  }
};
