import { Request, Response } from 'express';

export const eventosController = {
  listar(req: Request, res: Response) {
    res.json([
      { id: 'evt-curitiba-2026', nome: 'Festival Curitiba 2026', produtorId: 'prod-abc', status: 'ABERTO' },
      { id: 'evt-artista-a', nome: 'Show Artista A', produtorId: 'prod-abc', status: 'ABERTO' },
      { id: 'evt-tech-summit', nome: 'Tech Summit 2026', produtorId: 'prod-abc', status: 'ENCERRADO' }
    ]);
  }
};
