/** Segurança de rota e isolamento de tenant. Backend ainda é de homologação. */
import { Request, Response, NextFunction } from 'express';
import { ContextoRequisicao, PerfilUsuario } from '../types';

const DEMO_TOKENS: Record<string, ContextoRequisicao> = {
  'jwt_demo_produtor': { usuarioId:'usr-prod-01', perfil:'PRODUTOR', produtorId:'prod-abc', permissoes:[] },
  'jwt_demo_financeiro': { usuarioId:'usr-fin-01', perfil:'FINANCEIRO', produtorId:null, permissoes:[] },
  'jwt_demo_admin': { usuarioId:'usr-adm-01', perfil:'ADMINISTRADOR', produtorId:null, permissoes:[] }
};

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const contexto = DEMO_TOKENS[token];
  if (!contexto) return res.status(401).json({ erro: 'Não autenticado. Backend de homologação: use um token demo emitido pelo login.' });
  (req as any).user = contexto;
  next();
}

export class AuthMiddleware {
  static validarIsolamentoTenant(contexto: ContextoRequisicao, produtorAlvoId: string): void {
    if (contexto.perfil === 'PRODUTOR' && (!contexto.produtorId || contexto.produtorId !== produtorAlvoId)) {
      throw new Error(`403 — Acesso não autorizado ao Produtor ${produtorAlvoId}.`);
    }
  }
  static exigirPerfil(contexto: ContextoRequisicao, perfisAutorizados: PerfilUsuario[]): void {
    if (!perfisAutorizados.includes(contexto.perfil)) {
      throw new Error(`403 — Ação restrita aos perfis: [${perfisAutorizados.join(', ')}]. Perfil atual: ${contexto.perfil}.`);
    }
  }
}
