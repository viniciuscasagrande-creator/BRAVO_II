import { Request, Response } from 'express';

export const notificacoesController = {
  listarPendentes(_req: Request, res: Response) {
    res.json([
      {
        id: 'notif-001',
        titulo: 'NOVA SOLICITAÇÃO DE REPASSE',
        mensagem: 'Produtora ABC Ltda. &bull; Festival Curitiba 2026 &bull; R$ 80.000,00',
        tipo: 'SOLICITACAO',
        dataHora: '29/09/2026 09:28',
        lida: false
      }
    ]);
  }
};
