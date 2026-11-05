import { StatusSolicitacao } from '../types';

export const formatCurrencyBRL = (value: number = 0): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value);
};

export const formatPercent = (value: number = 0): string => {
  return `${value.toFixed(2).replace('.', ',')}%`;
};

export const formatDateTimeBR = (isoString?: string): string => {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
};

export const getStatusLabel = (status: StatusSolicitacao): string => {
  const map: Record<StatusSolicitacao, string> = {
    RASCUNHO: 'Rascunho',
    ENVIADO: 'Enviado',
    AGUARDANDO_ANALISE: 'Aguardando Análise',
    EM_ANALISE: 'Em Análise Disk',
    APROVADO: 'Aprovado',
    REJEITADO: 'Rejeitado',
    AGUARDANDO_ASSINATURA_PRODUTOR: 'Aguardando Assinatura do Produtor',
    AGUARDANDO_ASSINATURA_FINANCEIRO: 'Aguardando Assinatura Financeiro Disk',
    ASSINADO: 'Documento Assinado',
    PROGRAMADO: 'Programado',
    PROCESSANDO: 'Processando Bancário',
    PAGO: 'Pago (Liquidado)',
    CONCLUIDO: 'Concluído',
    CANCELADO: 'Cancelado'
  };
  return map[status] || status;
};

export const getStatusBadgeClass = (status: StatusSolicitacao): string => {
  switch (status) {
    case 'PAGO':
    case 'CONCLUIDO':
    case 'ASSINADO':
      return 'bg-success text-white';
    case 'APROVADO':
    case 'PROGRAMADO':
      return 'bg-info text-dark';
    case 'AGUARDANDO_ANALISE':
    case 'EM_ANALISE':
    case 'AGUARDANDO_ASSINATURA_PRODUTOR':
    case 'AGUARDANDO_ASSINATURA_FINANCEIRO':
      return 'bg-warning text-dark';
    case 'REJEITADO':
    case 'CANCELADO':
      return 'bg-danger text-white';
    case 'RASCUNHO':
    case 'ENVIADO':
    default:
      return 'bg-secondary text-white';
  }
};
