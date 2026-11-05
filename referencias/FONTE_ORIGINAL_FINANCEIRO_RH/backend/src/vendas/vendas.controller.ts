import { Request, Response } from 'express';

export const vendasController = {
  processarVenda(req: Request, res: Response) {
    const { eventoId, valorBruto, metodoPagamento } = req.body;
    // Core: Venda -> Pagamento -> Gateway -> Adquirente -> MDR -> Taxas -> Recebivel -> Ledger -> Evento -> Produtor -> Saldo
    res.json({
      status: 'PROCESSADA',
      pedidoId: `PED-${Date.now()}`,
      eventoId,
      valorBruto,
      metodoPagamento,
      taxaDisk: valorBruto * 0.10,
      mdrAdquirente: valorBruto * 0.0215,
      valorLiquidoProdutor: valorBruto * 0.8785
    });
  }
};
