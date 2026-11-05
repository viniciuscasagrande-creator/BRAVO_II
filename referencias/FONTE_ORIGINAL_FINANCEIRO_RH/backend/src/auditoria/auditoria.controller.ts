import { Request, Response } from 'express';
import { workflowEngine } from '../app';

export const auditoriaController = {
  obterTrilhaImutavel(req: Request, res: Response) {
    const { id } = req.params;
    const solicitacao = workflowEngine.obterSolicitacoes().find(s => s.id === id);
    if (!solicitacao) {
      return res.status(404).json({ erro: 'Solicitação não encontrada' });
    }
    res.json((solicitacao as any).historicoAuditoria || []);
  }
};
