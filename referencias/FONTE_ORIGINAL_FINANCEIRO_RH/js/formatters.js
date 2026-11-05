/**
 * Formatters e Utilitários para o Módulo Financeiro Disk Ingressos
 */

export const formatCurrency = (val) => {
  if (val === undefined || val === null || isNaN(val)) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val);
};

export const formatNumber = (val) => {
  if (val === undefined || val === null || isNaN(val)) return "0";
  return new Intl.NumberFormat('pt-BR').format(val);
};

export const formatPercent = (val) => {
  if (val === undefined || val === null || isNaN(val)) return "0,00%";
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2
  }).format(val / 100);
};

export const createStatusBadge = (status, customClass = '') => {
  let badgeClass = 'badge-neutral';
  const s = (status || '').toLowerCase();

  if (s.includes('pago') || s.includes('creditado') || s.includes('concluíd') || s.includes('ativ') || s.includes('liquidado')) {
    badgeClass = 'badge-success';
  } else if (s.includes('rejeitado') || s.includes('estornado') || s.includes('cancelado') || s.includes('disputa') || s.includes('bloqueado')) {
    badgeClass = 'badge-danger';
  } else if (s.includes('aguardando assinatura do financeiro') || s.includes('aguardando análise') || s.includes('em análise') || s.includes('pendente') || s.includes('solicitado')) {
    badgeClass = 'badge-warning';
  } else if (s.includes('aguardando assinatura do produtor')) {
    badgeClass = 'badge-purple';
  } else if (s.includes('documento assinado') || s.includes('programado') || s.includes('aprovado') || s.includes('receber') || s.includes('abertas')) {
    badgeClass = 'badge-info';
  } else if (s.includes('antecipação') || s.includes('purple')) {
    badgeClass = 'badge-purple';
  }

  return `<span class="badge ${badgeClass} ${customClass}">${status}</span>`;
};
