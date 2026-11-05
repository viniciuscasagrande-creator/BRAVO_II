import React, { createContext, useContext, useState, ReactNode } from 'react';
import { NotificacaoOperacional } from '../types';

interface NotificacaoContextType {
  notificacoes: NotificacaoOperacional[];
  naoLidasCount: number;
  adicionarNotificacao: (notif: Omit<NotificacaoOperacional, 'id' | 'dataHora' | 'lida'>) => void;
  marcarComoLida: (id: string) => void;
  limparTodas: () => void;
}

const mockNotificacoesIniciais: NotificacaoOperacional[] = [
  {
    id: 'notif-001',
    titulo: 'NOVA SOLICITAÇÃO DE REPASSE',
    mensagem: 'Produtora ABC Ltda. &bull; Festival Curitiba 2026 &bull; R$ 80.000,00',
    tipo: 'SOLICITACAO',
    dataHora: '29/09/2026 09:28',
    lida: false,
    linkAcao: '/financeiro/aprovacoes'
  },
  {
    id: 'notif-002',
    titulo: 'DOCUMENTO AGUARDANDO ASSINATURA',
    mensagem: 'Termo de Repasse #REP-000128 assinado pelo Produtor. Aguarda última assinatura Disk.',
    tipo: 'ASSINATURA',
    dataHora: '28/09/2026 14:10',
    lida: false,
    linkAcao: '/financeiro/aprovacoes'
  },
  {
    id: 'notif-003',
    titulo: 'REPASSE LIQUIDADO COM SUCESSO',
    mensagem: 'Lote de PIX #REM-20260928 processado para XYZ Live. R$ 50.000,00.',
    tipo: 'PAGAMENTO',
    dataHora: '28/09/2026 11:30',
    lida: true
  }
];

const NotificacaoContext = createContext<NotificacaoContextType | undefined>(undefined);

export const NotificacaoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notificacoes, setNotificacoes] = useState<NotificacaoOperacional[]>(mockNotificacoesIniciais);

  const naoLidasCount = notificacoes.filter(n => !n.lida).length;

  const adicionarNotificacao = (notif: Omit<NotificacaoOperacional, 'id' | 'dataHora' | 'lida'>) => {
    const nova: NotificacaoOperacional = {
      ...notif,
      id: `notif-${Date.now()}`,
      dataHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      lida: false
    };
    setNotificacoes(prev => [nova, ...prev]);
  };

  const marcarComoLida = (id: string) => {
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
  };

  const limparTodas = () => {
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
  };

  return (
    <NotificacaoContext.Provider
      value={{
        notificacoes,
        naoLidasCount,
        adicionarNotificacao,
        marcarComoLida,
        limparTodas
      }}
    >
      {children}
    </NotificacaoContext.Provider>
  );
};

export const useNotificacoes = (): NotificacaoContextType => {
  const context = useContext(NotificacaoContext);
  if (!context) {
    throw new Error('useNotificacoes deve ser utilizado dentro de NotificacaoProvider');
  }
  return context;
};
