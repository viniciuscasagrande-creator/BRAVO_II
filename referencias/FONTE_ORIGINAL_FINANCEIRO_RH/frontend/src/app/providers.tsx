import React, { ReactNode } from 'react';
import { AuthProvider } from '../auth/AuthContext';
import { FinanceiroProvider } from '../context/FinanceiroContext';
import { NotificacaoProvider } from '../context/NotificacaoContext';

interface ProvidersProps {
  children: ReactNode;
}

export const AppProviders: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <AuthProvider>
      <FinanceiroProvider>
        <NotificacaoProvider>
          {children}
        </NotificacaoProvider>
      </FinanceiroProvider>
    </AuthProvider>
  );
};

export default AppProviders;
