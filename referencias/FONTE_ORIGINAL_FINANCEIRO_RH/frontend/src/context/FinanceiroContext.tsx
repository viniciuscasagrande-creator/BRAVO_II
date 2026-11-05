import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface FinanceiroContextType {
  produtorId: string | null;
  eventoId: string | null;
  termoBusca: string;
  selecionarProdutor: (id: string | null) => void;
  selecionarEvento: (id: string | null) => void;
  setTermoBusca: (termo: string) => void;
  limparFiltro: () => void;
}

const FinanceiroContext = createContext<FinanceiroContextType | undefined>(undefined);

export const FinanceiroProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [produtorId, setProdutorId] = useState<string | null>(null);
  const [eventoId, setEventoId] = useState<string | null>(null);
  const [termoBusca, setTermoBusca] = useState<string>('');

  const selecionarProdutor = (id: string | null) => {
    setProdutorId(id);
    setEventoId(null); // Reseta o evento ao trocar o produtor
  };

  const selecionarEvento = (id: string | null) => {
    setEventoId(id);
  };

  const limparFiltro = () => {
    setProdutorId(null);
    setEventoId(null);
    setTermoBusca('');
  };

  return (
    <FinanceiroContext.Provider
      value={{
        produtorId,
        eventoId,
        termoBusca,
        selecionarProdutor,
        selecionarEvento,
        setTermoBusca,
        limparFiltro
      }}
    >
      {children}
    </FinanceiroContext.Provider>
  );
};

export const useFinanceiro = (): FinanceiroContextType => {
  const context = useContext(FinanceiroContext);
  if (!context) {
    throw new Error('useFinanceiro deve ser utilizado dentro de FinanceiroProvider');
  }
  return context;
};
