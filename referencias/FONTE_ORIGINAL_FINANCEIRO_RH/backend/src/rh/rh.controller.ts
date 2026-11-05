import { Request, Response } from 'express';
import { RHService } from './rh.service';

export class RHController {
  public static listarColaboradores(req: Request, res: Response) {
    try {
      const colaboradores = RHService.listarColaboradores();
      res.json(colaboradores);
    } catch (e: any) {
      res.status(500).json({ erro: e.message });
    }
  }

  public static obterColaborador(req: Request, res: Response) {
    try {
      const colab = RHService.obterColaborador(req.params.id);
      if (!colab) return res.status(404).json({ erro: 'Colaborador não encontrado' });
      res.json(colab);
    } catch (e: any) {
      res.status(500).json({ erro: e.message });
    }
  }

  public static cadastrarColaborador(req: Request, res: Response) {
    try {
      const colab = RHService.cadastrarColaborador(req.body);
      res.status(201).json(colab);
    } catch (e: any) {
      res.status(400).json({ erro: e.message });
    }
  }

  public static listarGeofences(req: Request, res: Response) {
    try {
      const geofences = RHService.listarGeofences();
      res.json(geofences);
    } catch (e: any) {
      res.status(500).json({ erro: e.message });
    }
  }

  public static cadastrarGeofence(req: Request, res: Response) {
    try {
      const geo = RHService.cadastrarGeofence(req.body);
      res.status(201).json(geo);
    } catch (e: any) {
      res.status(400).json({ erro: e.message });
    }
  }

  public static registrarPonto(req: Request, res: Response) {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const registro = RHService.registrarPonto({
        ...req.body,
        ipOrigem: ip
      });
      res.status(201).json(registro);
    } catch (e: any) {
      res.status(400).json({ erro: e.message });
    }
  }

  public static sincronizarOffline(req: Request, res: Response) {
    try {
      const pontos = req.body.pontos || [];
      const resultado = RHService.sincronizarPontosOffline(pontos);
      res.json(resultado);
    } catch (e: any) {
      res.status(400).json({ erro: e.message });
    }
  }

  public static obterEspelhoPonto(req: Request, res: Response) {
    try {
      const mesAno = req.query.mesAno as string;
      const espelho = RHService.obterEspelhoPonto(req.params.colaboradorId, mesAno);
      res.json(espelho);
    } catch (e: any) {
      res.status(400).json({ erro: e.message });
    }
  }

  public static solicitarAjustePonto(req: Request, res: Response) {
    try {
      const ajuste = RHService.solicitarAjustePonto(req.body);
      res.status(201).json(ajuste);
    } catch (e: any) {
      res.status(400).json({ erro: e.message });
    }
  }

  public static aprovarAjustePonto(req: Request, res: Response) {
    try {
      const usuario = (req as any).user || { id: 'usr-admin', perfil: 'ADMINISTRADOR' };
      const { parecer } = req.body;
      const ajuste = RHService.aprovarAjustePonto(req.params.id, usuario, parecer || 'Aprovado pelo RH');
      res.json(ajuste);
    } catch (e: any) {
      res.status(400).json({ erro: e.message });
    }
  }

  public static obterCustosEvento(req: Request, res: Response) {
    try {
      const custos = RHService.consolidarCustosMaoDeObraEvento(req.params.eventoId);
      res.json(custos);
    } catch (e: any) {
      res.status(400).json({ erro: e.message });
    }
  }

  public static alocarEquipeEvento(req: Request, res: Response) {
    try {
      const { colaboradorId, cargoFuncao, tipoContratacao, valorDiaria, auxAlimentacao, auxTransporte } = req.body;
      const custo = RHService.alocarEquipeEvento(
        req.params.eventoId,
        colaboradorId,
        cargoFuncao,
        tipoContratacao,
        Number(valorDiaria),
        Number(auxAlimentacao || 40),
        Number(auxTransporte || 30)
      );
      res.status(201).json(custo);
    } catch (e: any) {
      res.status(400).json({ erro: e.message });
    }
  }

  public static enviarPagamentosEquipe(req: Request, res: Response) {
    try {
      const usuario = (req as any).user || { id: 'usr-fin', perfil: 'FINANCEIRO' };
      const resultado = RHService.enviarPagamentosEquipeParaTesouraria(req.params.eventoId, usuario);
      res.json(resultado);
    } catch (e: any) {
      res.status(400).json({ erro: e.message });
    }
  }

  public static listarAuditoria(req: Request, res: Response) {
    try {
      const logs = RHService.listarAuditLogs();
      res.json(logs);
    } catch (e: any) {
      res.status(500).json({ erro: e.message });
    }
  }
}
