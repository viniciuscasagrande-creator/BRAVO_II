import express, { Request, Response } from 'express';
import cors from 'cors';
import { authMiddleware } from './auth/auth.middleware';
import { WorkflowEngine, SolicitacaoWorkflow } from './workflow/workflow.engine';
import { ContextoRequisicao } from './types';

export const app = express();
app.use(cors({ origin: false })); // produção deve declarar origens explicitamente
app.use(express.json());
const solicitacoes = new Map<string, SolicitacaoWorkflow>();
const ctx = (req: Request) => (req as any).user as ContextoRequisicao;

export const workflowEngine = {
  obterSolicitacoes(): SolicitacaoWorkflow[] {
    return Array.from(solicitacoes.values());
  },
  obterLedger(): any[] {
    return [];
  },
  assinarComoProdutor(id: string, signatario: string, ip: string): SolicitacaoWorkflow {
    const sol = solicitacoes.get(id);
    if (!sol) throw new Error('Solicitação não encontrada.');
    WorkflowEngine.assinarComoProdutor(
      { usuarioId: signatario, perfil: 'PRODUTOR', produtorId: sol.produtorId, permissoes: [] },
      sol,
      ip
    );
    return sol;
  },
  assinarComoDisk(id: string, signatario: string, ip: string): SolicitacaoWorkflow {
    const sol = solicitacoes.get(id);
    if (!sol) throw new Error('Solicitação não encontrada.');
    WorkflowEngine.assinarComoFinanceiro(
      { usuarioId: signatario, perfil: 'FINANCEIRO', permissoes: [] },
      sol,
      ip
    );
    return sol;
  }
};

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, senha } = req.body || {};
  if (senha !== 'demo') return res.status(401).json({ erro:'Credenciais inválidas. Ambiente de homologação.' });
  const users: Record<string, any> = {
    'produtor@demo.disk': { id:'usr-prod-01', nome:'João Silva', perfil:'PRODUTOR', produtorId:'prod-abc', token:'jwt_demo_produtor' },
    'financeiro@demo.disk': { id:'usr-fin-01', nome:'Maria Valente', perfil:'FINANCEIRO', token:'jwt_demo_financeiro' },
    'admin@demo.disk': { id:'usr-adm-01', nome:'Vinicius Master', perfil:'ADMINISTRADOR', token:'jwt_demo_admin' }
  };
  const user = users[String(email || '').toLowerCase()];
  if (!user) return res.status(401).json({ erro:'Credenciais inválidas.' });
  res.json({ ...user, email });
});

app.post('/api/solicitacoes/repasse', authMiddleware, (req: Request, res: Response) => {
  try {
    const c=ctx(req); const { produtorId, eventoId, valor, nomeEvento='Evento' }=req.body;
    if (c.perfil !== 'PRODUTOR') return res.status(403).json({erro:'Somente Produtor cria repasse neste fluxo.'});
    const sol=WorkflowEngine.criarSolicitacao(c,{tipo:'REPASSE',produtorId,eventoId,valor:Number(valor),nomeEvento});
    solicitacoes.set(sol.id,sol); res.status(201).json(sol);
  } catch(e:any){ res.status(400).json({erro:e.message}); }
});

app.post('/api/solicitacoes/:id/aprovar', authMiddleware, (req,res)=>{
  try { const sol=solicitacoes.get(req.params.id); if(!sol) return res.status(404).json({erro:'Não encontrada'}); WorkflowEngine.aprovarSolicitacao(ctx(req),sol); res.json(sol); }
  catch(e:any){res.status(400).json({erro:e.message});}
});
app.post('/api/solicitacoes/:id/rejeitar', authMiddleware, (req,res)=>{
  try { const sol=solicitacoes.get(req.params.id); if(!sol) return res.status(404).json({erro:'Não encontrada'}); WorkflowEngine.rejeitarSolicitacao(ctx(req),sol,req.body.motivo,req.body.observacao); res.json(sol); }
  catch(e:any){res.status(400).json({erro:e.message});}
});
app.post('/api/assinaturas/:id/produtor', authMiddleware, (req,res)=>{
  try { const sol=solicitacoes.get(req.params.id); if(!sol) return res.status(404).json({erro:'Não encontrada'}); WorkflowEngine.assinarComoProdutor(ctx(req),sol,req.ip); res.json(sol); }
  catch(e:any){res.status(400).json({erro:e.message});}
});
app.post('/api/assinaturas/:id/financeiro', authMiddleware, (req,res)=>{
  try { const sol=solicitacoes.get(req.params.id); if(!sol) return res.status(404).json({erro:'Não encontrada'}); WorkflowEngine.assinarComoFinanceiro(ctx(req),sol,req.ip); res.json(sol); }
  catch(e:any){res.status(400).json({erro:e.message});}
});
app.post('/api/solicitacoes/:id/liquidar-pix', authMiddleware, (req,res)=>{
  try { const sol=solicitacoes.get(req.params.id); if(!sol) return res.status(404).json({erro:'Não encontrada'}); WorkflowEngine.liquidarPagamento(ctx(req),sol); res.json({ ...sol, aviso:'Homologação: não houve transmissão bancária real.' }); }
  catch(e:any){res.status(400).json({erro:e.message});}
});
app.get('/api/solicitacoes/:id', authMiddleware, (req,res)=>{ const sol=solicitacoes.get(req.params.id); if(!sol) return res.status(404).json({erro:'Não encontrada'}); res.json(sol); });

import { rhRouter } from './rh/rh.routes';
app.use('/api/rh', rhRouter);

export default app;
