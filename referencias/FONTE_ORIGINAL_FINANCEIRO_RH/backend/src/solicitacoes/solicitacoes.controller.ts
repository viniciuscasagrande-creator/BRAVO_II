import { Request, Response } from 'express';
import { workflowEngine } from '../app';

export const solicitacoesController = {
  listarTodas(_req: Request, res: Response) {
    res.json(workflowEngine.obterSolicitacoes());
  }
};
