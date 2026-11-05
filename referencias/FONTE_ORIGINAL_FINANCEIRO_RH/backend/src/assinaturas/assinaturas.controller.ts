import { Request, Response } from 'express';
import { workflowEngine } from '../app';

export const assinaturasController = {
  assinarProdutor(req: Request, res: Response) {
    const { id } = req.params;
    const { signatario } = req.body;
    try {
      const doc = workflowEngine.assinarComoProdutor(id, signatario || 'Produtor Titular', req.ip || '127.0.0.1');
      res.json(doc);
    } catch (err: any) {
      res.status(400).json({ erro: err.message });
    }
  },

  assinarDisk(req: Request, res: Response) {
    const { id } = req.params;
    const { signatario } = req.body;
    try {
      const doc = workflowEngine.assinarComoDisk(id, signatario || 'Diretoria Financeira Disk', req.ip || '127.0.0.1');
      res.json(doc);
    } catch (err: any) {
      // Regra bloqueante: Financeiro não assina antes do produtor
      res.status(400).json({ erro: err.message });
    }
  }
};
