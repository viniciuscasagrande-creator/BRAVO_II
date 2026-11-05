import { Request, Response } from 'express';
import { workflowEngine } from '../app';

export const aprovacoesController = {
  listarFila(_req: Request, res: Response) {
    const pendentes = workflowEngine.obterSolicitacoes().filter(s =>
      ['AGUARDANDO_ANALISE', 'EM_ANALISE'].includes(s.status)
    );
    res.json(pendentes);
  }
};
