import { Request, Response } from 'express';

export const recebiveisController = {
  listarRecebiveis(_req: Request, res: Response) {
    res.json([
      { id: 'REC-001', adquirente: 'Cielo', valorBruto: 620000, mdr: 13330, liquido: 606670, dataVencimento: '2026-10-15', status: 'AGUARDANDO_COMPENSACAO' },
      { id: 'REC-002', adquirente: 'Rede', valorBruto: 360000, mdr: 7560, liquido: 352440, dataVencimento: '2026-10-20', status: 'AGUARDANDO_COMPENSACAO' }
    ]);
  }
};
