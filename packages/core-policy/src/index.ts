/** Fonte única de permissões de menu. API sempre valida as permissões nas operações. */
export const ROLES = [
  'ADMIN',
  'COMERCIAL',
  'CADASTRO',
  'OPERACOES',
  'PUBLICACAO',
  'FINANCEIRO_DISK',
  'AUDITOR',
  'RH',
  'PRODUTOR',
  'SAC',
  'PDV',
] as const;

export type Role = (typeof ROLES)[number];

export type MenuItem = {
  id: string;
  label: string;
  href: string;
  roles: readonly Role[];
  status: 'ATIVO' | 'EM_IMPLANTACAO';
  group: string;
};

export const MENU: readonly MenuItem[] = [
  {id:'home',label:'Painel inicial',href:'/',roles:['ADMIN','COMERCIAL','CADASTRO','OPERACOES','PUBLICACAO','FINANCEIRO_DISK','AUDITOR','RH'],status:'ATIVO',group:'Geral'},
  {id:'produtores',label:'Central de Produtores',href:'/comercial/produtores',roles:['ADMIN','COMERCIAL','CADASTRO','OPERACOES','FINANCEIRO_DISK','AUDITOR'],status:'ATIVO',group:'Comercial'},
  {id:'eventos',label:'Gestão de Eventos',href:'/eventos',roles:['ADMIN','COMERCIAL','CADASTRO','OPERACOES','PUBLICACAO','FINANCEIRO_DISK','AUDITOR'],status:'ATIVO',group:'Eventos'},
  {id:'taxas',label:'Taxa Disk por evento',href:'/comercial',roles:['ADMIN','COMERCIAL','FINANCEIRO_DISK','AUDITOR'],status:'ATIVO',group:'Comercial'},
  {id:'clientes',label:'Central de Clientes',href:'/clientes',roles:['ADMIN','OPERACOES','SAC','AUDITOR'],status:'ATIVO',group:'Vendas e SAC'},
  {id:'pedidos',label:'Pedidos e Reservas',href:'/pedidos',roles:['ADMIN','OPERACOES','SAC','FINANCEIRO_DISK','AUDITOR'],status:'ATIVO',group:'Vendas e SAC'},
  {id:'ingressos',label:'Consulta de Ingressos',href:'/ingressos',roles:['ADMIN','OPERACOES','SAC','AUDITOR'],status:'ATIVO',group:'Vendas e SAC'},
  {id:'checkout',label:'Checkout · Homologação',href:'/checkout',roles:['ADMIN','OPERACOES','FINANCEIRO_DISK','AUDITOR'],status:'ATIVO',group:'Vendas e SAC'},
  {id:'pdv',label:'PDV · Configuração',href:'/pdv',roles:['ADMIN','OPERACOES','PDV'],status:'ATIVO',group:'Vendas e SAC'},
  {id:'sac',label:'Painel SAC',href:'/sac',roles:['ADMIN','SAC','OPERACOES','AUDITOR'],status:'ATIVO',group:'Atendimento SAC'},
  {id:'sac-chamados',label:'Central de Chamados',href:'/sac/chamados',roles:['ADMIN','SAC','OPERACOES','AUDITOR'],status:'ATIVO',group:'Atendimento SAC'},
  {id:'sac-sla',label:'SLA, equipes e filas',href:'/sac/gestao',roles:['ADMIN','SAC','OPERACOES','AUDITOR'],status:'ATIVO',group:'Atendimento SAC'},
  {id:'sac-itil',label:'Incidentes e Problemas ITIL',href:'/sac/itil',roles:['ADMIN','SAC','OPERACOES','AUDITOR'],status:'ATIVO',group:'Atendimento SAC'},
  {id:'sac-conhecimento',label:'Base de Conhecimento',href:'/sac/conhecimento',roles:['ADMIN','SAC','OPERACOES','AUDITOR'],status:'ATIVO',group:'Atendimento SAC'},
  {id:'pos-venda',label:'Alterações de Pedidos',href:'/pos-venda/trocas',roles:['ADMIN','SAC','OPERACOES','AUDITOR'],status:'ATIVO',group:'Pós-Venda'},
  {id:'cancelamentos',label:'Cancelamentos',href:'/pos-venda/cancelamentos',roles:['ADMIN','SAC','OPERACOES','AUDITOR'],status:'ATIVO',group:'Pós-Venda'},
  {id:'estornos',label:'Solicitações de Estorno',href:'/estornos',roles:['ADMIN','SAC','OPERACOES','FINANCEIRO_DISK','AUDITOR'],status:'ATIVO',group:'Pós-Venda'},
  {id:'aprovar-estornos',label:'Aprovações de Estorno',href:'/financeiro/estornos',roles:['FINANCEIRO_DISK','AUDITOR','ADMIN'],status:'ATIVO',group:'Financeiro'},
  {id:'financeiro',label:'Financeiro Disk — 104 funções',href:'/financeiro',roles:['ADMIN','FINANCEIRO_DISK','AUDITOR'],status:'EM_IMPLANTACAO',group:'Financeiro'},
  {id:'ia',label:'Assistente Gemini · Homologação',href:'/ia',roles:['ADMIN','COMERCIAL','OPERACOES','SAC','FINANCEIRO_DISK','RH','AUDITOR','CADASTRO','PUBLICACAO'],status:'ATIVO',group:'Inteligência'},
  {id:'rh',label:'RH e Departamento Pessoal — 45 funções',href:'/rh',roles:['ADMIN','RH','AUDITOR'],status:'EM_IMPLANTACAO',group:'Pessoas'},
];

export function normalizeRoleForPolicy(role: string): string {
  switch (role) {
    case 'ADMIN_BRAVO':
      return 'ADMIN';
    case 'COMERCIAL_DISK':
      return 'COMERCIAL';
    case 'OPERACAO_EVENTOS':
      return 'OPERACOES';
    case 'RH_DP_DISK':
      return 'RH';
    case 'AUDITOR_INTERNO':
      return 'AUDITOR';
    case 'PRODUTOR_PDT':
      return 'PRODUTOR';
    case 'SAC_ATENDIMENTO':
      return 'SAC';
    case 'OPERADOR_PDV':
    case 'PDV_CAIXA':
      return 'PDV';
    default:
      return role;
  }
}

export function hasAnyRole(actorRoles: readonly string[], permitted: readonly string[]): boolean {
  const normalized = actorRoles.map(normalizeRoleForPolicy);
  return normalized.some((role) => permitted.includes(role)) || actorRoles.some((role) => permitted.includes(role));
}

export function menuForRoles(actorRoles: readonly string[]): MenuItem[] {
  if (!Array.isArray(actorRoles)) return [];
  return MENU.filter((item) => hasAnyRole(actorRoles, item.roles)).map((x) => ({ ...x }));
}

export function isPermittedNav(actorRoles: readonly string[], href: string): boolean {
  return MENU.some((m) => m.href === href && m.status === 'ATIVO' && hasAnyRole(actorRoles, m.roles));
}

export function originAllowed(origin: string | undefined, accepted: string): boolean {
  try {
    const parsed = new URL(origin || '');
    const target = new URL(accepted);
    return parsed.origin === target.origin && ['https:', 'http:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function isMutating(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

export function assertCookieToken(cookieHeader: string | undefined, key = 'bravo_session'): string | undefined {
  const found = (cookieHeader || '')
    .split(';')
    .map((v) => v.trim())
    .filter((v) => v.startsWith(key + '='));
  if (found.length !== 1) return undefined;
  const value = found[0].slice(key.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined;
}

/** Bloqueio temporário: ao terminar o prazo, a contagem recomeça. */
export function isLoginLocked(lockedUntil: Date | null | undefined, now: Date): boolean {
  return !!lockedUntil && lockedUntil.getTime() > now.getTime();
}

export function nextFailedLogin(failedLogins: number, lockedUntil: Date | null | undefined, now: Date) {
  const previous = lockedUntil && lockedUntil.getTime() <= now.getTime() ? 0 : Math.max(0, failedLogins);
  const attempts = previous + 1;
  return {
    failedLogins: attempts,
    lockedUntil: attempts >= 5 ? new Date(now.getTime() + 30 * 60 * 1000) : null,
  };
}

/** Invariantes para evitar usar banco ou credenciais de produção por engano. */
export function validateHomologationEnv(env: Record<string, string | undefined>): string[] {
  const errors: string[] = [];
  if (env.BRAVO_ENV !== 'HOMOLOGACAO') errors.push('BRAVO_ENV precisa ser HOMOLOGACAO');
  for (const flag of ['ENABLE_EXTERNAL_PUBLICATION', 'ENABLE_REAL_PAYMENTS', 'ENABLE_REAL_REFUNDS']) {
    if (env[flag] !== 'false') errors.push(`${flag} deve ser false`);
  }
  const pepper = env.CPF_HASH_PEPPER || '';
  if (pepper.length < 32 || /SUBSTITUA|EXEMPLO|PLACEHOLDER/i.test(pepper)) {
    errors.push('CPF_HASH_PEPPER deve conter 32+ caracteres aleatórios reais e não pode ser valor de exemplo');
  }
  let db: URL | undefined;
  try {
    db = new URL(env.DATABASE_URL || '');
  } catch {
    errors.push('DATABASE_URL inválida');
  }
  if (db) {
    if (!['postgresql:', 'postgres:'].includes(db.protocol)) errors.push('DATABASE_URL deve usar PostgreSQL');
    if (!/(hml|homolog|preview)/i.test(decodeURIComponent(db.pathname))) {
      errors.push('Banco deve ter identificador exclusivo hml/homolog/preview no nome');
    }
  }
  let appOrigin: URL | undefined;
  try {
    appOrigin = new URL(env.APP_ORIGIN || '');
  } catch {
    errors.push('APP_ORIGIN inválida');
  }
  if (appOrigin) {
    if (
      !['http:', 'https:'].includes(appOrigin.protocol) ||
      appOrigin.username ||
      appOrigin.password ||
      appOrigin.pathname !== '/' ||
      appOrigin.search ||
      appOrigin.hash
    ) {
      errors.push('APP_ORIGIN deve ser uma origem HTTP(S) sem caminho/credenciais');
    }
    if (['diskingressos.com.br', 'www.diskingressos.com.br'].includes(appOrigin.hostname.toLowerCase())) {
      errors.push('Proibido usar domínio público de vendas como origem de homologação');
    }
  }
  if (env.NODE_ENV === 'production') {
    if (env.COOKIE_SECURE !== 'true') errors.push('Preview exige COOKIE_SECURE=true');
    if (appOrigin?.protocol !== 'https:') errors.push('Preview exige APP_ORIGIN https');
  }
  const port = Number(env.PORT || 4100);
  if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push('PORT inválida');
  return errors;
}
