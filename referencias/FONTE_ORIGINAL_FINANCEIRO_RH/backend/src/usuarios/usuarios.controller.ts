import { Request, Response } from 'express';

export const usuariosController = {
  getPerfilAtual(req: Request, res: Response) {
    const user = (req as any).user;
    res.json(user);
  }
};
