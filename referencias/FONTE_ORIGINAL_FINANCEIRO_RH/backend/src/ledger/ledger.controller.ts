import { Request, Response } from 'express';
import { workflowEngine } from '../app';

export const ledgerController = {
  obterLivroRazao(req: Request, res: Response) {
    res.json(workflowEngine.obterLedger());
  }
};
