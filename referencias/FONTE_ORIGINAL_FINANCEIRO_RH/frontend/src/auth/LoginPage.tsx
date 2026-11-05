import React, { useState } from 'react';
import { useAuth } from './AuthContext';

export const LoginPage: React.FC<{ onLoginSuccess?: () => void }> = ({ onLoginSuccess }) => {
  const { loginAs } = useAuth();
  const [email, setEmail] = useState<string>('financeiro@demo.disk');
  const [senha, setSenha] = useState<string>('demo123');
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'produtor@demo.disk') {
      loginAs('PRODUTOR', 'prod-abc');
      if (onLoginSuccess) onLoginSuccess();
    } else if (email === 'financeiro@demo.disk') {
      loginAs('FINANCEIRO');
      if (onLoginSuccess) onLoginSuccess();
    } else if (email === 'admin@demo.disk') {
      loginAs('ADMINISTRADOR');
      if (onLoginSuccess) onLoginSuccess();
    } else {
      setErro('Credenciais de demonstração inválidas. Utilize um dos usuários de teste abaixo.');
    }
  };

  const selecionarUsuarioDemo = (demoEmail: string, perfil: 'PRODUTOR' | 'FINANCEIRO' | 'ADMINISTRADOR', produtorId?: string) => {
    setEmail(demoEmail);
    setSenha('demo123');
    setErro(null);
    loginAs(perfil, produtorId);
    if (onLoginSuccess) onLoginSuccess();
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100" style={{ background: '#0b0f19' }}>
      <div className="card shadow-lg border-0" style={{ maxWidth: '440px', width: '100%', borderRadius: '12px', background: '#161922', color: '#f8fafc' }}>
        <div className="card-body p-4 p-md-5">
          {/* Logo Disk Ingressos */}
          <div className="text-center mb-4">
            <h2 className="fw-bold tracking-wider mb-1" style={{ letterSpacing: '1px' }}>
              DISK<span className="text-primary">INGRESSOS</span>
            </h2>
            <div className="badge bg-primary bg-opacity-25 text-primary px-3 py-1 fs-xxs fw-bold text-uppercase">
              Módulo Financeiro &bull; ERP / CRM
            </div>
            <p className="text-muted fs-xs mt-2 mb-0">
              Acesso Unificado ao Portal do Produtor e Backoffice Financeiro
            </p>
          </div>

          {erro && (
            <div className="alert alert-danger py-2 px-3 fs-xs rounded mb-3 border-0">
              <i className="ph-warning-circle me-1"></i> {erro}
            </div>
          )}

          {/* Formulário de Login */}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fs-xs text-muted text-uppercase fw-bold">E-mail ou Usuário</label>
              <input
                type="email"
                className="form-control form-control-sm bg-dark text-white border-secondary border-opacity-25"
                placeholder="seu.email@disk.com.br"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <div className="d-flex justify-content-between">
                <label className="form-label fs-xs text-muted text-uppercase fw-bold">Senha de Acesso</label>
                <span className="fs-xxs text-primary" style={{ cursor: 'pointer' }}>Esqueceu?</span>
              </div>
              <input
                type="password"
                className="form-control form-control-sm bg-dark text-white border-secondary border-opacity-25"
                placeholder="••••••••"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary w-100 fw-bold py-2 mb-4 shadow-sm">
              Entrar no Core Financeiro &rarr;
            </button>
          </form>

          {/* Cards Rápidos de Usuários de Demonstração */}
          <div className="border-top border-white border-opacity-10 pt-3">
            <span className="fs-xxs text-uppercase fw-bold text-muted d-block text-center mb-2">
              Acesso Rápido com Perfis de Demonstração
            </span>

            <div className="d-flex flex-column gap-2">
              <button
                type="button"
                className="btn btn-xs btn-outline-light text-start p-2 d-flex align-items-center justify-content-between border-opacity-25"
                onClick={() => selecionarUsuarioDemo('karine@diskingressos.com.br', 'FINANCEIRO')}
              >
                <div>
                  <strong className="d-block text-white fs-xs">Financeiro Disk (Karine)</strong>
                  <span className="fs-xxs text-muted">karine@diskingressos.com.br &bull; Adm do Financeiro</span>
                </div>
                <span className="badge bg-primary fs-xxs">FINANCEIRO</span>
              </button>

              <button
                type="button"
                className="btn btn-xs btn-outline-light text-start p-2 d-flex align-items-center justify-content-between border-opacity-25"
                onClick={() => selecionarUsuarioDemo('produtor@demo.disk', 'PRODUTOR', 'prod-abc')}
              >
                <div>
                  <strong className="d-block text-white fs-xs">Produtora ABC Ltda. (João Silva)</strong>
                  <span className="fs-xxs text-muted">produtor@demo.disk &bull; Isolamento Multi-Tenant</span>
                </div>
                <span className="badge bg-success fs-xxs">PRODUTOR</span>
              </button>

              <button
                type="button"
                className="btn btn-xs btn-outline-light text-start p-2 d-flex align-items-center justify-content-between border-opacity-25"
                onClick={() => selecionarUsuarioDemo('admin@demo.disk', 'ADMINISTRADOR')}
              >
                <div>
                  <strong className="d-block text-white fs-xs">Administrador Master (Vinicius)</strong>
                  <span className="fs-xxs text-muted">admin@demo.disk &bull; Auditoria e Parâmetros</span>
                </div>
                <span className="badge bg-warning text-dark fs-xxs">ADMIN</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
