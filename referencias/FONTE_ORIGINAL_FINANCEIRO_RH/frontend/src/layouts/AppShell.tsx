/**
 * Layout Principal do Financeiro Disk (ERP / CRM)
 * Estrutura visual canônica: AppShell > Sidebar + AppArea (Header + MainContent) + DemoToolbar
 */

import React from 'react';
import { Sidebar } from '../components/Sidebar/Sidebar';
import { Header } from '../components/Header/Header';
import { DemoToolbar } from '../components/DemoToolbar/DemoToolbar';
import { menuProdutor, MenuItem } from '../produtor/menuProdutor';
import { menuFinanceiro } from '../financeiro/menuFinanceiro';
import { useAuth } from '../auth/AuthContext';

interface AppShellProps {
  children: React.ReactNode;
  activeRoute: string;
  onNavigate: (route: string) => void;
  onOpenSolicitarRepasse?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeRoute,
  onNavigate,
  onOpenSolicitarRepasse
}) => {
  const { usuario, perfil, produtorAtivo } = useAuth();

  // Mapeamento oficial de menu por perfil autenticado
  const menuPorPerfil: Record<string, MenuItem[]> = {
    'PRODUTOR': menuProdutor,
    'FINANCEIRO': menuFinanceiro,
    'ADMINISTRADOR': menuFinanceiro
  };

  const menuAtivo = menuPorPerfil[perfil] || menuProdutor;

  return (
    <div className="app-shell" id="appShell">
      {/* 1. SIDEBAR ÚNICA: 100vh, scroll interno independente, muda de acordo com o perfil */}
      <Sidebar
        menu={menuAtivo}
        activeRoute={activeRoute}
        onNavigate={onNavigate}
        perfil={perfil}
        produtorAtivo={produtorAtivo}
        usuario={usuario}
        onOpenSolicitarRepasse={onOpenSolicitarRepasse}
      />

      {/* 2. ÁREA DA APLICAÇÃO: Ocupa toda a largura restante */}
      <div className="app-area" id="appArea">
        {/* HEADER: Topo da área principal, inicia depois da Sidebar */}
        <Header />

        {/* CONTEÚDO PRINCIPAL: Scroll independente */}
        <main className="app-main-content" id="appMainContent">
          {children}
        </main>
      </div>

      {/* 3. TOOLBAR FLUTUANTE DE DEMONSTRAÇÃO: Isolada da navegação oficial */}
      <DemoToolbar />
    </div>
  );
};

export default AppShell;
