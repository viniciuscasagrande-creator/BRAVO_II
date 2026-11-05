import { Request, Response } from 'express';
import { workflowEngine } from '../app';

export const repassesController = {
  listarRepasses(_req: Request, res: Response) {
    const todos = workflowEngine.obterSolicitacoes();
    res.json(todos.filter(s => s.tipo === 'REPASSE'));
  }
};
