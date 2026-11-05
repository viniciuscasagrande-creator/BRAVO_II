import { Request, Response } from 'express';

export const taxasController = {
  listarTaxas(_req: Request, res: Response) {
    res.json({
      taxaComissaoDiskPadrao: 10.0,
      taxaConvenienciaCliente: 15.0,
      spreadAdquirenteMedio: 1.22,
      mdrMedio: 2.15
    });
  }
};
