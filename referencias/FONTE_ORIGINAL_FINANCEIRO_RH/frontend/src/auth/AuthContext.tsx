/**
 * Contexto de Autenticação & Contexto Financeiro Global (Single Core)
 * Gerencia a sessão do usuário e o escopo de busca Produtor -> Evento
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { PerfilUsuario, ContextoFinanceiroGlobal } from '../../../backend/src/types';
import { mockSeedData } from '../../../database/seed';

interface AuthContextType {
  usuario: typeof mockSeedData.usuarios[0] | null;
  perfil: PerfilUsuario;
  produtorId: string | null;
  produtorAtivo: typeof mockSeedData.produtores[0] | null;
  contextoFinanceiro: ContextoFinanceiroGlobal;
  setContextoFinanceiro: (ctx: Partial<ContextoFinanceiroGlobal>) => void;
  loginAs: (perfil: PerfilUsuario, produtorId?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Inicializa como Produtora ABC para demonstração imediata
  const [usuario, setUsuario] = useState<any>(mockSeedData.usuarios[0]);
  const [perfil, setPerfil] = useState<PerfilUsuario>("PRODUTOR");
  const [produtorId, setProdutorId] = useState<string | null>("prod-abc");

  // Contexto de Busca Global do Financeiro Disk (Header)
  const [contextoFinanceiro, setContextoFinanceiroState] = useState<ContextoFinanceiroGlobal>({
    produtorId: null,
    eventoId: null,
    termoBusca: ""
  });

  const setContextoFinanceiro = (ctx: Partial<ContextoFinanceiroGlobal>) => {
    setContextoFinanceiroState(prev => ({ ...prev, ...ctx }));
  };

  const loginAs = (novoPerfil: PerfilUsuario, targetProdutorId?: string) => {
    setPerfil(novoPerfil);

    if (novoPerfil === "PRODUTOR") {
      const pId = targetProdutorId || "prod-abc";
      const u = mockSeedData.usuarios.find(u => u.perfil === "PRODUTOR") || mockSeedData.usuarios[0];
      setUsuario({ ...u, produtorId: pId });
      setProdutorId(pId);
      // No login do produtor, trava o contexto estritamente no seu produtorId
      setContextoFinanceiroState({ produtorId: pId, eventoId: null, termoBusca: "" });
    } else if (novoPerfil === "FINANCEIRO") {
      const u = mockSeedData.usuarios.find(u => u.perfil === "FINANCEIRO") || mockSeedData.usuarios[1];
      setUsuario(u);
      setProdutorId(null);
      // No financeiro, visão transversal de todos os produtores inicialmente
      setContextoFinanceiroState({ produtorId: null, eventoId: null, termoBusca: "" });
    } else {
      const u = mockSeedData.usuarios.find(u => u.perfil === "ADMINISTRADOR") || mockSeedData.usuarios[2];
      setUsuario(u);
      setProdutorId(null);
      setContextoFinanceiroState({ produtorId: null, eventoId: null, termoBusca: "" });
    }
  };

  const logout = () => {
    setUsuario(null);
  };

  const produtorAtivo = mockSeedData.produtores.find(p => p.id === (produtorId || contextoFinanceiro.produtorId)) || mockSeedData.produtores[0];

  return (
    <AuthContext.Provider
      value={{
        usuario,
        perfil,
        produtorId,
        produtorAtivo,
        contextoFinanceiro,
        setContextoFinanceiro,
        loginAs,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
  }
  return context;
};
