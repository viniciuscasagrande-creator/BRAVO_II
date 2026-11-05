import { z } from 'zod';

// ============================================================================
// 1. Papéis Canônicos (RBAC) e Permissões (ABAC + Escopo) — docs/05-SEGURANCA-GOVERNANCA.md
// ============================================================================

export const ROLE_CODES = [
  'ADMIN_BRAVO',
  'COMERCIAL_DISK',
  'OPERACAO_EVENTOS',
  'FINANCEIRO_DISK',
  'RH_DP_DISK',
  'GESTOR_AREA',
  'COLABORADOR_DISK',
  'SAC_ATENDIMENTO',
  'MARKETING_DISK',
  'PRODUTOR_PDT',
  'PDV_CAIXA',
  'PORTARIA_CHECKIN',
  'AUDITOR_INTERNO',
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

export const PERMISSION_CODES = [
  'overview:read',
  'commercial:read',
  'commercial:write',
  'event-fee:read-internal',
  'event-fee:propose',
  'event-fee:approve',
  'event:read',
  'event:write',
  'event:approve',
  'event:publish',
  'order:read',
  'order:write',
  'ticket:read',
  'ticket:manage',
  'checkin:validate',
  'sac:read',
  'sac:act',
  'coupon:read',
  'coupon:write',
  'finance:read',
  'finance:approve-payout',
  'finance:approve-rh-payment',
  'finance:prepare-treasury',
  'finance:reconcile-rh-payment',
  'rh:read',
  'rh:write',
  'rh:request-payment',
  'rh:ponto-write',
  'rh:self-read',
  'refund:request',
  'refund:approve',
  'refund:execute',
  'marketing:read',
  'remarketing:read',
  'pdt:portal-read',
  'pdt:admin',
  'reports:read',
  'catalog:read',
  'governance:read',
  'audit:read',
] as const;

export type PermissionCode = (typeof PERMISSION_CODES)[number];

export interface RoleDefinition {
  code: RoleCode;
  namePtBr: string;
  descriptionPtBr: string;
  isInternal: boolean;
  permissions: PermissionCode[];
}

export const CANONICAL_ROLES: Record<RoleCode, RoleDefinition> = {
  ADMIN_BRAVO: {
    code: 'ADMIN_BRAVO',
    namePtBr: 'Administrador do BRAVO_II',
    descriptionPtBr: 'Gerencia perfis, parametrizações, catálogo, governança e consulta auditoria, sem executar liquidação financeira direta.',
    isInternal: true,
    permissions: [
      'overview:read',
      'commercial:read',
      'event:read',
      'order:read',
      'ticket:read',
      'sac:read',
      'coupon:read',
      'marketing:read',
      'remarketing:read',
      'pdt:admin',
      'reports:read',
      'catalog:read',
      'governance:read',
      'audit:read',
    ],
  },
  COMERCIAL_DISK: {
    code: 'COMERCIAL_DISK',
    namePtBr: 'Comercial Disk',
    descriptionPtBr: 'Cadastra produtores PJ, contatos, documentos, contratos e negocia/aprova Taxa Disk por evento.',
    isInternal: true,
    permissions: [
      'overview:read',
      'commercial:read',
      'commercial:write',
      'event-fee:read-internal',
      'event-fee:propose',
      'event-fee:approve',
      'event:read',
      'event:write',
      'coupon:read',
      'coupon:write',
      'pdt:admin',
      'reports:read',
      'catalog:read',
    ],
  },
  OPERACAO_EVENTOS: {
    code: 'OPERACAO_EVENTOS',
    namePtBr: 'Operação de Eventos',
    descriptionPtBr: 'Prepara eventos, sessões, mapas, modalidades, assentos, cupons/cortesias, portaria e publicação conforme aprovações.',
    isInternal: true,
    permissions: [
      'overview:read',
      'event:read',
      'event:write',
      'event:approve',
      'event:publish',
      'order:read',
      'order:write',
      'ticket:read',
      'ticket:manage',
      'checkin:validate',
      'coupon:read',
      'coupon:write',
      'catalog:read',
      'reports:read',
    ],
  },
  FINANCEIRO_DISK: {
    code: 'FINANCEIRO_DISK',
    namePtBr: 'Financeiro Disk',
    descriptionPtBr: 'Visualiza saldos autorizados, Taxa Disk interna por evento, ledger, conciliação e aprova estornos, repasses e lotes de pagamento RH sem ver dados médicos/individuais.',
    isInternal: true,
    permissions: [
      'overview:read',
      'commercial:read',
      'event-fee:read-internal',
      'event-fee:approve',
      'event:read',
      'order:read',
      'finance:read',
      'finance:approve-payout',
      'finance:approve-rh-payment',
      'finance:prepare-treasury',
      'finance:reconcile-rh-payment',
      'refund:approve',
      'refund:execute',
      'reports:read',
      'audit:read',
    ],
  },
  RH_DP_DISK: {
    code: 'RH_DP_DISK',
    namePtBr: 'RH & Departamento Pessoal Disk',
    descriptionPtBr: 'Gerencia colaboradores, folha, ponto (Disk Ponto), admissões, férias, benefícios e submete lotes agregados de pagamento à Tesouraria sem executar liquidação bancária.',
    isInternal: true,
    permissions: [
      'overview:read',
      'event:read',
      'rh:read',
      'rh:write',
      'rh:request-payment',
      'rh:ponto-write',
      'rh:self-read',
      'reports:read',
    ],
  },
  GESTOR_AREA: {
    code: 'GESTOR_AREA',
    namePtBr: 'Gestor de Equipe Disk',
    descriptionPtBr: 'Visualiza indicadores da própria equipe e aprova solicitações subordinadas de jornada/férias sem autoaprovação.',
    isInternal: true,
    permissions: [
      'overview:read',
      'event:read',
      'rh:read',
      'rh:self-read',
    ],
  },
  COLABORADOR_DISK: {
    code: 'COLABORADOR_DISK',
    namePtBr: 'Colaborador (Portal & Disk Ponto)',
    descriptionPtBr: 'Acessa exclusivamente seus próprios dados, holerites e marcações de ponto (Disk Ponto), sem visualizar colegas nem módulos financeiros.',
    isInternal: true,
    permissions: [
      'overview:read',
      'rh:ponto-write',
      'rh:self-read',
    ],
  },
  SAC_ATENDIMENTO: {
    code: 'SAC_ATENDIMENTO',
    namePtBr: 'SAC / Atendimento',
    descriptionPtBr: 'Consulta clientes, pedidos e ingressos, abre chamados SLA e solicita trocas ou estornos sem executar aprovação financeira nem ver Taxa Disk restrita.',
    isInternal: true,
    permissions: [
      'overview:read',
      'event:read',
      'order:read',
      'ticket:read',
      'sac:read',
      'sac:act',
      'refund:request',
      'catalog:read',
    ],
  },
  MARKETING_DISK: {
    code: 'MARKETING_DISK',
    namePtBr: 'Marketing e Remarketing',
    descriptionPtBr: 'Gerencia campanhas, UTMs, pixels e jornadas com consentimento LGPD.',
    isInternal: true,
    permissions: [
      'overview:read',
      'event:read',
      'coupon:read',
      'marketing:read',
      'remarketing:read',
      'reports:read',
    ],
  },
  PRODUTOR_PDT: {
    code: 'PRODUTOR_PDT',
    namePtBr: 'Produtor (Portal PDT)',
    descriptionPtBr: 'Acesso estritamente restrito aos eventos vinculados ao produtor; sem acesso à Taxa Disk contratual interna nem ferramentas financeiras da Disk.',
    isInternal: false,
    permissions: [
      'overview:read',
      'event:read',
      'pdt:portal-read',
      'reports:read',
    ],
  },
  PDV_CAIXA: {
    code: 'PDV_CAIXA',
    namePtBr: 'Operador de PDV / Caixa',
    descriptionPtBr: 'Realiza vendas presenciais nas sessões e terminais liberados e consulta fechamento de caixa.',
    isInternal: true,
    permissions: [
      'overview:read',
      'event:read',
      'order:read',
      'order:write',
      'ticket:read',
      'catalog:read',
    ],
  },
  PORTARIA_CHECKIN: {
    code: 'PORTARIA_CHECKIN',
    namePtBr: 'Portaria / Controle de Acesso',
    descriptionPtBr: 'Valida credenciais QR de ingressos na portaria.',
    isInternal: true,
    permissions: [
      'overview:read',
      'ticket:read',
      'checkin:validate',
    ],
  },
  AUDITOR_INTERNO: {
    code: 'AUDITOR_INTERNO',
    namePtBr: 'Auditor Interno e Governança',
    descriptionPtBr: 'Consulta trilhas de auditoria imutáveis e relatórios de conformidade.',
    isInternal: true,
    permissions: [
      'overview:read',
      'event:read',
      'reports:read',
      'governance:read',
      'audit:read',
    ],
  },
};

// ============================================================================
// 2. Catálogo de Navegação Lateral (15 Áreas de docs/02-MODULOS-E-MENUS.md)
// ============================================================================

export interface NavigationSubItem {
  id: string;
  labelPtBr: string;
  href: string;
  requiredPermission: PermissionCode;
}

export interface NavigationMenuItem {
  id: string;
  order: number;
  labelPtBr: string;
  href: string;
  moduleCode: string;
  packagePhase: string;
  requiredPermission: PermissionCode;
  descriptionPtBr: string;
  subItems: NavigationSubItem[];
}

export const CANONICAL_NAVIGATION_MENU: NavigationMenuItem[] = [
  {
    id: 'inicio',
    order: 1,
    labelPtBr: 'Início / Central Operacional',
    href: '/',
    moduleCode: 'CORE',
    packagePhase: 'Pacote 01 (Ativo)',
    requiredPermission: 'overview:read',
    descriptionPtBr: 'Indicadores reais do banco, fila de aprovações, alertas operacionais e escopo ativo.',
    subItems: [
      { id: 'inicio-painel', labelPtBr: 'Painel do Dia e Escopo', href: '/', requiredPermission: 'overview:read' },
    ],
  },
  {
    id: 'comercial',
    order: 2,
    labelPtBr: 'Comercial',
    href: '/comercial',
    moduleCode: 'CRM-B2B / FEE',
    packagePhase: 'Pacote 02 + Pacote 06 (Ativo)',
    requiredPermission: 'commercial:read',
    descriptionPtBr: 'Produtores PJ, responsáveis, propostas, contratos e Taxa Disk negociada por evento.',
    subItems: [
      { id: 'comercial-painel', labelPtBr: 'Painel Comercial e Contratos', href: '/comercial', requiredPermission: 'commercial:read' },
      { id: 'comercial-produtores', labelPtBr: 'Central de Produtores PJ (Pacote 06)', href: '/comercial/produtores', requiredPermission: 'commercial:read' },
      { id: 'comercial-produtor-novo', labelPtBr: 'Novo Produtor PJ (CNPJ / Alfanumérico 2026)', href: '/comercial/produtores/novo', requiredPermission: 'commercial:write' },
    ],
  },
  {
    id: 'eventos',
    order: 3,
    labelPtBr: 'Eventos',
    href: '/eventos',
    moduleCode: 'EVT / INV',
    packagePhase: 'Pacote 03 + Pacote 06 (Ativo)',
    requiredPermission: 'event:read',
    descriptionPtBr: 'Central de Eventos, Event Builder em 10 abas, sessões, setores, lotes, aprovação em 4 etapas e publicação.',
    subItems: [
      { id: 'eventos-central', labelPtBr: 'Central de Eventos e Event Builder', href: '/eventos', requiredPermission: 'event:read' },
      { id: 'eventos-novo', labelPtBr: 'Novo Evento (Event Builder Pacote 06)', href: '/eventos/novo', requiredPermission: 'event:write' },
    ],
  },
  {
    id: 'pedidos-vendas',
    order: 4,
    labelPtBr: 'Pedidos e Vendas',
    href: '/pedidos-vendas',
    moduleCode: 'ORD / POS / PAY',
    packagePhase: 'Pacote 04 / 05 (Ativo)',
    requiredPermission: 'order:read',
    descriptionPtBr: 'Pedidos online e PDV, reservas de inventário, transações de pagamento sandbox e fechamento por canal.',
    subItems: [
      { id: 'pedidos-lista', labelPtBr: 'Central de Pedidos, PDV e Checkout Sandbox', href: '/pedidos-vendas', requiredPermission: 'order:read' },
    ],
  },
  {
    id: 'ingressos-portaria',
    order: 5,
    labelPtBr: 'Ingressos e Portaria',
    href: '/ingressos-portaria',
    moduleCode: 'TKT / GATE',
    packagePhase: 'Pacote 04 / 05 (Ativo)',
    requiredPermission: 'ticket:read',
    descriptionPtBr: 'Busca por código público de 8 dígitos, credenciais QR independentes, retry de e-mail e check-in de portaria.',
    subItems: [
      { id: 'ingressos-central', labelPtBr: 'Central de Ingressos (8 Dígitos) e Portaria QR', href: '/ingressos-portaria', requiredPermission: 'ticket:read' },
    ],
  },
  {
    id: 'sac',
    order: 6,
    labelPtBr: 'SAC / Atendimento',
    href: '/sac',
    moduleCode: 'CS',
    packagePhase: 'Pacote 06',
    requiredPermission: 'sac:read',
    descriptionPtBr: 'Atendimento omnicanal, fila SLA/ITIL, trocas de sessão autorizadas e abertura de solicitações.',
    subItems: [
      { id: 'sac-fila', labelPtBr: 'Central de Casos e SLA', href: '/sac', requiredPermission: 'sac:read' },
    ],
  },
  {
    id: 'cupons-cortesias',
    order: 7,
    labelPtBr: 'Cupons e Cortesias',
    href: '/cupons-cortesias',
    moduleCode: 'CPN',
    packagePhase: 'Pacote 05 (Ativo)',
    requiredPermission: 'coupon:read',
    descriptionPtBr: 'Campanhas de desconto, códigos, limites por sessão/modalidade e quotas de cortesias auditadas.',
    subItems: [
      { id: 'cupons-campanhas', labelPtBr: 'Campanhas de Cupons e Quotas de Cortesia', href: '/cupons-cortesias', requiredPermission: 'coupon:read' },
    ],
  },
  {
    id: 'financeiro',
    order: 8,
    labelPtBr: 'Financeiro Disk',
    href: '/financeiro',
    moduleCode: 'FIN / FEE',
    packagePhase: 'Pacote Mestre Financeiro (104 Opções — Ativo)',
    requiredPermission: 'finance:read',
    descriptionPtBr: '16 grupos e 104 opções catalogadas: Ledger de partidas dobradas, centros de custo, liquidação da ponte RH→Financeiro, repasses, conciliação e controladoria.',
    subItems: [
      { id: 'financeiro-visao', labelPtBr: 'Central Financeira (104 Opções), Ledger e Ponte RH', href: '/financeiro', requiredPermission: 'finance:read' },
    ],
  },
  {
    id: 'rh-dp',
    order: 9,
    labelPtBr: 'Recursos Humanos (RH Disk)',
    href: '/rh',
    moduleCode: 'RH / DP / PONTO',
    packagePhase: 'Pacote Mestre RH & DP (45 Opções — Ativo)',
    requiredPermission: 'rh:self-read',
    descriptionPtBr: '8 subgrupos e 45 opções catalogadas: Pessoas, Departamento Pessoal, Disk Ponto (Geofence/Portaria 671), Folha, Equipes de Eventos e solicitação segregada ao Financeiro.',
    subItems: [
      { id: 'rh-central', labelPtBr: 'Central RH & DP (45 Opções), Disk Ponto e Folha', href: '/rh', requiredPermission: 'rh:self-read' },
    ],
  },
  {
    id: 'estornos',
    order: 10,
    labelPtBr: 'Estornos e Contestação',
    href: '/estornos',
    moduleCode: 'RFD',
    packagePhase: 'Pacote 06 / 07',
    requiredPermission: 'refund:request',
    descriptionPtBr: 'Fluxo segregado: SAC solicita, Financeiro aprova e conclusão aguarda callback comprovado do provedor.',
    subItems: [
      { id: 'estornos-fila', labelPtBr: 'Solicitações e Aprovação Financeira de Estornos', href: '/estornos', requiredPermission: 'refund:request' },
    ],
  },
  {
    id: 'marketing',
    order: 11,
    labelPtBr: 'Marketing',
    href: '/marketing',
    moduleCode: 'MKT',
    packagePhase: 'Pacote 08',
    requiredPermission: 'marketing:read',
    descriptionPtBr: 'Campanhas, UTMs, Meta/Google/TikTok/Spotify Ads e atribuição de vendas sem alterar ledger.',
    subItems: [
      { id: 'marketing-painel', labelPtBr: 'Painel de Campanhas e Atribuição UTM', href: '/marketing', requiredPermission: 'marketing:read' },
    ],
  },
  {
    id: 'remarketing',
    order: 12,
    labelPtBr: 'Remarketing e Pós-Evento',
    href: '/remarketing',
    moduleCode: 'MSG',
    packagePhase: 'Pacote 08',
    requiredPermission: 'remarketing:read',
    descriptionPtBr: 'Segmentos autorizados, verificação de consentimento LGPD, jornadas e disparos auditados.',
    subItems: [
      { id: 'remarketing-jornadas', labelPtBr: 'Segmentos, Consentimentos e Disparos', href: '/remarketing', requiredPermission: 'remarketing:read' },
    ],
  },
  {
    id: 'produtores-pdt',
    order: 13,
    labelPtBr: 'Produtores / PDT',
    href: '/produtores-pdt',
    moduleCode: 'PRT',
    packagePhase: 'Pacote 01 (Escopo) / Pacote 09',
    requiredPermission: 'pdt:portal-read',
    descriptionPtBr: 'Visão restrita do Portal do Produtor (borderô, mapa, cortesias e solicitações apenas de eventos vinculados).',
    subItems: [
      { id: 'pdt-escopo', labelPtBr: 'Eventos Vinculados e Borderô PDT', href: '/produtores-pdt', requiredPermission: 'pdt:portal-read' },
    ],
  },
  {
    id: 'relatorios',
    order: 14,
    labelPtBr: 'Relatórios e Inteligência',
    href: '/relatorios',
    moduleCode: 'REP',
    packagePhase: 'Pacote 10',
    requiredPermission: 'reports:read',
    descriptionPtBr: 'Catálogo de relatórios oficiais derivados do ledger e trilha de auditoria de exportações.',
    subItems: [
      { id: 'relatorios-catalogo', labelPtBr: 'Catálogo de Relatórios e Exportações Auditadas', href: '/relatorios', requiredPermission: 'reports:read' },
    ],
  },
  {
    id: 'cadastros',
    order: 15,
    labelPtBr: 'Cadastros e Operações',
    href: '/cadastros',
    moduleCode: 'CRM-B2C / EVT',
    packagePhase: 'Pacote 04 (Ativo)',
    requiredPermission: 'catalog:read',
    descriptionPtBr: 'Central de Clientes PF (com mascaramento de PII), locais, pontos de venda e documentos operacionais.',
    subItems: [
      { id: 'cadastros-clientes', labelPtBr: 'Central de Clientes PF, Locais e PDVs', href: '/cadastros', requiredPermission: 'catalog:read' },
    ],
  },
  {
    id: 'administracao',
    order: 16,
    labelPtBr: 'Administração e Governança',
    href: '/administracao',
    moduleCode: 'IAM / AUD',
    packagePhase: 'Pacote 01 (Ativo)',
    requiredPermission: 'audit:read',
    descriptionPtBr: 'Trilha de auditoria imutável, usuários, papéis RBAC, escopos de produtor/evento e saúde da plataforma.',
    subItems: [
      { id: 'admin-auditoria', labelPtBr: 'Trilha de Auditoria Imutável e Acessos', href: '/administracao', requiredPermission: 'audit:read' },
    ],
  },
];

export function filterNavigationByPermissions(userPermissions: readonly PermissionCode[]): NavigationMenuItem[] {
  const permSet = new Set<PermissionCode>(userPermissions);
  // Allow PDT admin to also see `/produtores-pdt`
  const effectiveCheck = (required: PermissionCode): boolean => {
    if (required === 'pdt:portal-read' && permSet.has('pdt:admin')) {
      return true;
    }
    if (required === 'refund:request' && (permSet.has('refund:approve') || permSet.has('refund:execute'))) {
      return true;
    }
    if (required === 'rh:self-read' && (permSet.has('rh:read') || permSet.has('rh:write'))) {
      return true;
    }
    return permSet.has(required);
  };

  return CANONICAL_NAVIGATION_MENU.filter((item) => effectiveCheck(item.requiredPermission)).map((item) => ({
    ...item,
    subItems: item.subItems.filter((sub) => effectiveCheck(sub.requiredPermission)),
  }));
}

// ============================================================================
// 3. Regras de Domínio: Taxa Disk por Evento e Ticket de 8 Dígitos
// ============================================================================

export const EventFeeAgreementSchema = z
  .object({
    eventId: z.string().uuid(),
    agreementVersion: z.number().int().min(1),
    calculationType: z.enum(['PERCENTAGE', 'FIXED']),
    percentageRate: z.number().min(0).max(100).nullable(),
    fixedAmountCents: z.number().int().min(0).nullable(),
    payer: z.enum(['CUSTOMER', 'PRODUCER', 'SPLIT']),
    visibility: z.literal('INTERNAL_DISK'),
    status: z.enum(['DRAFT', 'APPROVED', 'SUPERSEDED', 'REJECTED']),
  })
  .refine(
    (val) =>
      (val.calculationType === 'PERCENTAGE' && val.percentageRate !== null && val.fixedAmountCents === null) ||
      (val.calculationType === 'FIXED' && val.fixedAmountCents !== null && val.percentageRate === null),
    {
      message: 'A Taxa Disk do evento deve ser estritamente PERCENTAGE (com percentageRate) ou FIXED (com fixedAmountCents).',
    }
  );

export type EventFeeAgreementDto = z.infer<typeof EventFeeAgreementSchema>;

/**
 * Calcula a Taxa Disk em centavos inteiros para um item de ingresso, sem ponto flutuante.
 */
export function calculateEventDiskFeeCents(
  ticketNominalPriceCents: number,
  agreement: Pick<EventFeeAgreementDto, 'calculationType' | 'percentageRate' | 'fixedAmountCents'>
): number {
  if (!Number.isInteger(ticketNominalPriceCents) || ticketNominalPriceCents < 0) {
    throw new Error('O valor nominal do ingresso deve ser informado em centavos inteiros não negativos.');
  }

  if (agreement.calculationType === 'FIXED') {
    if (agreement.fixedAmountCents === null || !Number.isInteger(agreement.fixedAmountCents)) {
      throw new Error('Acordo FIXED exige fixedAmountCents inteiro.');
    }
    return agreement.fixedAmountCents;
  }

  if (agreement.percentageRate === null) {
    throw new Error('Acordo PERCENTAGE exige percentageRate definido.');
  }

  // Arredondamento bancário/comercial determinístico sobre base inteira em centavos
  const basisPoints = Math.round(agreement.percentageRate * 100);
  return Math.round((ticketNominalPriceCents * basisPoints) / 10000);
}

export const PUBLIC_TICKET_CODE_REGEX = /^[0-9]{8}$/;

export function isValidPublicTicketCode(code: string): boolean {
  return PUBLIC_TICKET_CODE_REGEX.test(code);
}

// ============================================================================
// 4. DTOs de API, Sessão, Eventos e Auditoria
// ============================================================================

export const LoginRequestSchema = z.object({
  email: z.string().email('Informe um e-mail corporativo válido.'),
  password: z.string().min(6, 'A senha deve possuir no mínimo 6 caracteres.'),
});

export type LoginRequestDto = z.infer<typeof LoginRequestSchema>;

export interface AuthenticatedActorDto {
  userId: string;
  email: string;
  fullName: string;
  roles: RoleCode[];
  permissions: PermissionCode[];
  producerScopeIds: string[];
  eventScopeIds: string[];
  sessionId: string;
}

export interface EventSummaryViewDto {
  id: string;
  code: string;
  title: string;
  venueName: string;
  city: string;
  stateUf: string;
  timezone: string;
  status: string;
  startsAt: string;
  producers: Array<{
    producerId: string;
    tradeName: string;
    relationshipRole: string;
  }>;
  /**
   * Presente SOMENTE para perfis internos com permissão `event-fee:read-internal`.
   * NUNCA enviado ao perfil PRODUTOR_PDT ou SAC_ATENDIMENTO.
   */
  internalDiskFeeAgreement?: {
    agreementVersion: number;
    calculationType: 'PERCENTAGE' | 'FIXED';
    percentageRate: number | null;
    fixedAmountCents: number | null;
    payer: string;
    status: string;
    approvalReference: string | null;
  };
}

export interface AuditRecordDto {
  id: string;
  occurredAt: string;
  actorUserId: string | null;
  actorRole: string;
  canonicalAction: string;
  resourceType: string;
  resourceId: string | null;
  producerId: string | null;
  eventId: string | null;
  outcome: 'SUCCESS' | 'DENIED' | 'FAILURE';
  justification: string | null;
  origin: string;
  correlationId: string;
}

export interface OperationalOverviewDto {
  generatedAt: string;
  actor: {
    fullName: string;
    roles: RoleCode[];
    scopedProducerCount: number;
    scopedEventCount: number;
  };
  counters: {
    visibleEventsCount: number;
    publishedEventsCount: number;
    pendingCommercialApprovalsCount: number;
    openServiceCasesCount: number;
    pendingRefundApprovalsCount: number;
    auditRecordsCount: number;
  };
  dataIntegrityNoticePtBr: string;
}

export interface StandardApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    correlationId: string;
    details: unknown[];
  };
}

// ============================================================================
// 5. Contratos da Fase 02 — Produtores PJ, Contatos, Documentos, Contratos e Taxa Disk por Evento
// ============================================================================

export const CreateProducerRequestSchema = z.object({
  cnpj: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z]{2}\.?[0-9A-Za-z]{3}\.?[0-9A-Za-z]{3}\/?[0-9A-Za-z]{4}-?\d{2}$/, 'Informe um CNPJ válido (14 caracteres numéricos ou alfanuméricos 2026).'),
  legalName: z.string().trim().min(3, 'A razão social deve ter ao menos 3 caracteres.'),
  tradeName: z.string().trim().min(2, 'O nome fantasia deve ter ao menos 2 caracteres.'),
});

export type CreateProducerRequestDto = z.infer<typeof CreateProducerRequestSchema>;

export const CreateProducerContactRequestSchema = z.object({
  fullName: z.string().trim().min(3, 'Informe o nome completo do responsável/contato.'),
  email: z.string().trim().email('Informe um e-mail válido para o responsável.'),
  phone: z.string().trim().min(8, 'Informe um telefone de contato válido.'),
  roleType: z.enum(['LEGAL_REPRESENTATIVE', 'FINANCIAL', 'OPERATIONAL', 'COMMERCIAL']),
  isPrimary: z.boolean().default(false),
});

export type CreateProducerContactRequestDto = z.infer<typeof CreateProducerContactRequestSchema>;

export const CreateProducerDocumentRequestSchema = z.object({
  documentType: z.enum([
    'CONTRATO_SOCIAL',
    'CARTAO_CNPJ',
    'DOCUMENTO_REPRESENTANTE',
    'COMPROVANTE_BANCARIO',
  ]),
  documentReference: z.string().trim().min(4, 'Informe a referência/hash do documento no repositório.'),
});

export type CreateProducerDocumentRequestDto = z.infer<typeof CreateProducerDocumentRequestSchema>;

export const CreateContractRequestSchema = z.object({
  contractNumber: z.string().trim().min(3, 'Informe o número identificador do contrato.'),
  title: z.string().trim().min(3, 'Informe o título/objeto do contrato.'),
  status: z.enum(['DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'TERMINATED']).default('ACTIVE'),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
});

export type CreateContractRequestDto = z.infer<typeof CreateContractRequestSchema>;

export const ProposeEventFeeAgreementRequestSchema = z
  .object({
    calculationType: z.enum(['PERCENTAGE', 'FIXED']),
    percentageRate: z.number().min(0).max(100).nullable().default(null),
    fixedAmountCents: z.number().int().min(0).nullable().default(null),
    payer: z.enum(['CUSTOMER', 'PRODUCER', 'SPLIT']).default('CUSTOMER'),
    approvalReference: z.string().trim().min(3).optional(),
  })
  .refine(
    (val) =>
      (val.calculationType === 'PERCENTAGE' && val.percentageRate !== null && val.fixedAmountCents === null) ||
      (val.calculationType === 'FIXED' && val.fixedAmountCents !== null && val.percentageRate === null),
    {
      message: 'Informe exclusivamente percentageRate (para PERCENTAGE) ou fixedAmountCents (para FIXED).',
    }
  );

export type ProposeEventFeeAgreementRequestDto = z.infer<typeof ProposeEventFeeAgreementRequestSchema>;

export const ApproveEventFeeAgreementRequestSchema = z.object({
  approvalReference: z.string().trim().min(3, 'Informe a referência de aprovação comercial.'),
});

export type ApproveEventFeeAgreementRequestDto = z.infer<typeof ApproveEventFeeAgreementRequestSchema>;

export const CreateFeeSnapshotRequestSchema = z.object({
  referenceType: z.enum(['ORDER_ITEM', 'PRICE_SIMULATION']).default('ORDER_ITEM'),
  referenceId: z.string().trim().min(3, 'Informe a referência única do item/transação.'),
  ticketNominalPriceCents: z.number().int().min(0, 'Informe o valor nominal em centavos inteiros.'),
});

export type CreateFeeSnapshotRequestDto = z.infer<typeof CreateFeeSnapshotRequestSchema>;

export interface ProducerContactDto {
  id: string;
  producerId: string;
  fullName: string;
  email: string;
  phone: string;
  roleType: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface ProducerDocumentDto {
  id: string;
  producerId: string;
  documentType: string;
  documentReference: string;
  verificationStatus: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

export interface ContractDto {
  id: string;
  producerId: string;
  contractNumber: string;
  title: string;
  status: string;
  validFrom: string;
  validUntil: string | null;
  signedAt: string | null;
  createdAt: string;
}

export interface ProducerDetailDto {
  id: string;
  cnpj: string;
  legalName: string;
  tradeName: string;
  verificationStatus: string;
  sourceSystem: string;
  createdAt: string;
  contacts: ProducerContactDto[];
  documents: ProducerDocumentDto[];
  contracts: ContractDto[];
}

export interface EventFeeSnapshotDto {
  id: string;
  eventId: string;
  feeAgreementId: string;
  agreementVersion: number;
  referenceType: string;
  referenceId: string;
  ticketNominalPriceCents: number;
  calculationType: 'PERCENTAGE' | 'FIXED';
  percentageRate: number | null;
  fixedAmountCents: number | null;
  calculatedDiskFeeCents: number;
  payer: string;
  capturedAt: string;
}

// ============================================================================
// 6. Contratos da Fase 03 — Event Builder, Sessões, Setores, Lotes, Canais, Aprovação e Publicação
// ============================================================================

export const CreateEventRequestSchema = z.object({
  code: z.string().trim().min(3, 'Informe um código único para o evento (ex.: EVT-2026-001).'),
  title: z.string().trim().min(3, 'Informe o título do evento.'),
  venueName: z.string().trim().min(2, 'Informe o nome do local/arena.'),
  city: z.string().trim().min(2, 'Informe a cidade do evento.'),
  stateUf: z.string().trim().length(2, 'Informe a UF com 2 letras (ex.: PR).'),
  timezone: z.string().trim().default('America/Sao_Paulo'),
  startsAt: z.string().datetime('Informe uma data/hora ISO-8601 válida para início do evento.'),
  primaryProducerId: z.string().uuid('Selecione um Produtor PJ principal válido.'),
  secondaryProducerIds: z.array(z.string().uuid()).default([]),
});

export type CreateEventRequestDto = z.infer<typeof CreateEventRequestSchema>;

export const CreateEventSessionRequestSchema = z.object({
  code: z.string().trim().min(2, 'Informe o código da sessão (ex.: SES-01).'),
  title: z.string().trim().min(3, 'Informe o título da sessão.'),
  startsAt: z.string().datetime('Informe a data/hora de início da sessão.'),
  endsAt: z.string().datetime('Informe a data/hora de término da sessão.'),
  doorsOpenAt: z.string().datetime().optional(),
  totalCapacity: z.number().int().positive('A capacidade total da sessão deve ser maior que zero.'),
});

export type CreateEventSessionRequestDto = z.infer<typeof CreateEventSessionRequestSchema>;

export const CreateEventSectorRequestSchema = z.object({
  sessionId: z.string().uuid('Informe a sessão à qual o setor pertence.'),
  code: z.string().trim().min(2, 'Informe o código do setor (ex.: PLATEIA-A).'),
  name: z.string().trim().min(2, 'Informe o nome do setor/área.'),
  areaType: z.enum(['SEATED', 'STANDING', 'BOX']).default('STANDING'),
  capacity: z.number().int().positive('A capacidade do setor deve ser maior que zero.'),
  blockedQuantity: z.number().int().min(0).default(0),
});

export type CreateEventSectorRequestDto = z.infer<typeof CreateEventSectorRequestSchema>;

export const CreateEventPriceLotRequestSchema = z.object({
  sessionId: z.string().uuid(),
  sectorId: z.string().uuid(),
  modalityName: z.string().trim().min(2, 'Informe o nome da modalidade (ex.: Inteira, Meia-Entrada).'),
  categoryType: z
    .enum(['INTEIRA', 'MEIA_ENTRADA', 'SOLIDARIO', 'PROMOCIONAL', 'CORTESIA'])
    .default('INTEIRA'),
  lotNumber: z.number().int().min(1).default(1),
  nominalPriceCents: z.number().int().min(0, 'O preço nominal deve ser informado em centavos inteiros.'),
  maxQuantity: z.number().int().positive('A quantidade máxima do lote deve ser positiva.'),
});

export type CreateEventPriceLotRequestDto = z.infer<typeof CreateEventPriceLotRequestSchema>;

export const CreateEventSalesChannelRequestSchema = z.object({
  channelType: z.enum(['SITE', 'PDV', 'BILHETERIA']),
  channelCode: z.string().trim().min(2),
  channelName: z.string().trim().min(2),
  allowedPaymentMethods: z.array(z.string()).default(['PIX', 'CREDIT_CARD']),
  channelServiceFeeCents: z.number().int().min(0).default(0),
  isEnabled: z.boolean().default(true),
});

export type CreateEventSalesChannelRequestDto = z.infer<typeof CreateEventSalesChannelRequestSchema>;

export interface EventSessionDto {
  id: string;
  eventId: string;
  code: string;
  title: string;
  startsAt: string;
  endsAt: string;
  doorsOpenAt: string | null;
  totalCapacity: number;
  status: string;
}

export interface EventSectorDto {
  id: string;
  eventId: string;
  sessionId: string;
  code: string;
  name: string;
  areaType: string;
  capacity: number;
  blockedQuantity: number;
}

export interface EventPriceLotDto {
  id: string;
  eventId: string;
  sessionId: string;
  sectorId: string;
  modalityName: string;
  categoryType: string;
  lotNumber: number;
  nominalPriceCents: number;
  maxQuantity: number;
  status: string;
}

export interface EventSalesChannelDto {
  id: string;
  eventId: string;
  channelType: string;
  channelCode: string;
  channelName: string;
  allowedPaymentMethods: string[];
  channelServiceFeeCents: number;
  isEnabled: boolean;
}

export interface EventApprovalDto {
  id: string;
  eventId: string;
  stage: string;
  decision: string;
  decidedBy: string;
  notes: string | null;
  decidedAt: string;
}

export interface EventBuilderFullViewDto extends EventSummaryViewDto {
  sessions: EventSessionDto[];
  sectors: EventSectorDto[];
  priceLots: EventPriceLotDto[];
  salesChannels: EventSalesChannelDto[];
  approvals: EventApprovalDto[];
  publicationReadiness: {
    hasVerifiedProducer: boolean;
    hasApprovedDiskFee: boolean;
    hasSessions: boolean;
    hasSectors: boolean;
    hasPriceLots: boolean;
    hasEnabledChannels: boolean;
    isReadyToApproveAndPublish: boolean;
    pendingReasonsPtBr: string[];
  };
  /**
   * Histórico de versões da Taxa Disk e snapshots — visível APENAS para perfis internos com `event-fee:read-internal`.
   */
  internalFeeHistory?: Array<{
    id: string;
    agreementVersion: number;
    calculationType: 'PERCENTAGE' | 'FIXED';
    percentageRate: number | null;
    fixedAmountCents: number | null;
    payer: string;
    status: string;
    approvalReference: string | null;
    approvedAt: string | null;
  }>;
  internalFeeSnapshots?: EventFeeSnapshotDto[];
}

// ============================================================================
// 7. Contratos das Fases 04 e 05 — Clientes PF, Inventário/Holds, Cupons/Cortesias,
// PDV/Caixa, Pedidos, Pagamentos Sandbox, Ingressos (8 Dígitos + QR) e Portaria
// ============================================================================

export const CreateCustomerRequestSchema = z.object({
  cpf: z
    .string()
    .trim()
    .regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'Informe um CPF válido (11 dígitos).'),
  fullName: z.string().trim().min(3, 'Informe o nome completo do cliente.'),
  email: z.string().trim().email('Informe um e-mail válido do cliente.'),
  phone: z.string().trim().min(8, 'Informe um telefone válido.'),
  marketingConsent: z.boolean().default(false),
});

export type CreateCustomerRequestDto = z.infer<typeof CreateCustomerRequestSchema>;

export interface CustomerDto {
  id: string;
  cpfMasked: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  marketingConsent: boolean;
  sourceSystem: string;
  createdAt: string;
}

export const CreateSeatsBatchRequestSchema = z.object({
  seatCodes: z.array(z.string().trim().min(1)).min(1, 'Informe ao menos um código de assento.'),
});

export type CreateSeatsBatchRequestDto = z.infer<typeof CreateSeatsBatchRequestSchema>;

export interface SeatDto {
  id: string;
  eventId: string;
  sessionId: string;
  sectorId: string;
  seatCode: string;
  status: 'AVAILABLE' | 'HELD' | 'SOLD' | 'BLOCKED';
  activeHoldId: string | null;
  activeTicketId: string | null;
}

export interface SessionAvailabilitySectorDto {
  sectorId: string;
  code: string;
  name: string;
  areaType: string;
  capacity: number;
  blockedQuantity: number;
  heldQuantity: number;
  soldQuantity: number;
  availableQuantity: number;
  seats: SeatDto[];
}

export interface SessionAvailabilityDto {
  eventId: string;
  sessionId: string;
  generatedAt: string;
  sectors: SessionAvailabilitySectorDto[];
}

export const CreateInventoryHoldRequestSchema = z.object({
  sectorId: z.string().uuid('Selecione um setor válido.'),
  seatId: z.string().uuid().optional().nullable(),
  channelType: z.enum(['SITE', 'PDV', 'CORTESIA']).default('SITE'),
  quantity: z.number().int().positive().default(1),
  idempotencyKey: z.string().trim().min(3, 'Informe uma chave de idempotência para a reserva.'),
  ttlSeconds: z.number().int().min(1).max(3600).default(900),
});

export type CreateInventoryHoldRequestDto = z.infer<typeof CreateInventoryHoldRequestSchema>;

export interface InventoryHoldDto {
  id: string;
  eventId: string;
  sessionId: string;
  sectorId: string;
  seatId: string | null;
  channelType: 'SITE' | 'PDV' | 'CORTESIA';
  quantity: number;
  status: 'ACTIVE' | 'CONSUMED' | 'EXPIRED' | 'RELEASED';
  idempotencyKey: string;
  expiresAt: string;
  createdAt: string;
}

export const CreateCouponCampaignRequestSchema = z
  .object({
    eventId: z.string().uuid('Selecione um evento válido.'),
    sessionId: z.string().uuid().optional().nullable(),
    code: z.string().trim().min(3, 'Informe o código promocional do cupom.'),
    title: z.string().trim().min(3, 'Informe o título da campanha de cupom.'),
    discountType: z.enum(['PERCENTAGE', 'FIXED']),
    percentageRate: z.number().min(0).max(100).nullable().default(null),
    fixedAmountCents: z.number().int().min(0).nullable().default(null),
    maxUses: z.number().int().positive('O limite de uso deve ser maior que zero.'),
    validUntil: z.string().datetime().optional().nullable(),
  })
  .refine(
    (val) =>
      (val.discountType === 'PERCENTAGE' && val.percentageRate !== null && val.fixedAmountCents === null) ||
      (val.discountType === 'FIXED' && val.fixedAmountCents !== null && val.percentageRate === null),
    {
      message: 'Informe exclusivamente percentageRate (para PERCENTAGE) ou fixedAmountCents (para FIXED).',
    }
  );

export type CreateCouponCampaignRequestDto = z.infer<typeof CreateCouponCampaignRequestSchema>;

export interface CouponCampaignDto {
  id: string;
  eventId: string;
  sessionId: string | null;
  code: string;
  title: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  percentageRate: number | null;
  fixedAmountCents: number | null;
  maxUses: number;
  usedCount: number;
  status: string;
  validUntil: string | null;
  createdAt: string;
}

export const CreateCourtesyQuotaRequestSchema = z.object({
  eventId: z.string().uuid('Selecione um evento válido.'),
  sessionId: z.string().uuid('Selecione uma sessão válida.'),
  sectorId: z.string().uuid('Selecione um setor válido.'),
  authorizedQuantity: z.number().int().positive('A quantidade autorizada de cortesias deve ser positiva.'),
});

export type CreateCourtesyQuotaRequestDto = z.infer<typeof CreateCourtesyQuotaRequestSchema>;

export interface CourtesyQuotaDto {
  id: string;
  eventId: string;
  sessionId: string;
  sectorId: string;
  authorizedQuantity: number;
  issuedQuantity: number;
  status: string;
  createdAt: string;
}

export const IssueCourtesyTicketRequestSchema = z.object({
  customerId: z.string().uuid('Selecione o cliente beneficiário da cortesia.'),
  priceLotId: z.string().uuid('Selecione a modalidade/lote correspondente.'),
  seatId: z.string().uuid().optional().nullable(),
  idempotencyKey: z.string().trim().min(3, 'Informe a chave de idempotência da emissão de cortesia.'),
});

export type IssueCourtesyTicketRequestDto = z.infer<typeof IssueCourtesyTicketRequestSchema>;

export const CreatePosTerminalRequestSchema = z.object({
  terminalCode: z.string().trim().min(2, 'Informe o código único do terminal PDV (ex.: PDV-SHOP-01).'),
  name: z.string().trim().min(3, 'Informe o nome do terminal PDV.'),
  locationDescription: z.string().trim().min(3, 'Informe a localização física do terminal.'),
});

export type CreatePosTerminalRequestDto = z.infer<typeof CreatePosTerminalRequestSchema>;

export interface PosTerminalDto {
  id: string;
  terminalCode: string;
  name: string;
  locationDescription: string;
  status: string;
  createdAt: string;
}

export const OpenPosCashSessionRequestSchema = z.object({
  terminalId: z.string().uuid('Selecione um terminal PDV cadastrado.'),
  openingBalanceCents: z.number().int().min(0).default(0),
});

export type OpenPosCashSessionRequestDto = z.infer<typeof OpenPosCashSessionRequestSchema>;

export interface PosCashSessionDto {
  id: string;
  terminalId: string;
  operatorUserId: string;
  status: 'OPEN' | 'CLOSED';
  openingBalanceCents: number;
  totalSalesCents: number;
  openedAt: string;
  closedAt: string | null;
}

export const CreateOrderRequestSchema = z.object({
  eventId: z.string().uuid(),
  sessionId: z.string().uuid(),
  customerId: z.string().uuid(),
  holdId: z.string().uuid(),
  priceLotId: z.string().uuid(),
  channelType: z.enum(['SITE', 'PDV', 'CORTESIA']).default('SITE'),
  posCashSessionId: z.string().uuid().optional().nullable(),
  couponCode: z.string().trim().optional().nullable(),
  idempotencyKey: z.string().trim().min(3, 'Informe a chave de idempotência do pedido.'),
});

export type CreateOrderRequestDto = z.infer<typeof CreateOrderRequestSchema>;

export interface OrderItemDto {
  id: string;
  orderId: string;
  eventId: string;
  sessionId: string;
  sectorId: string;
  seatId: string | null;
  priceLotId: string;
  nominalPriceCents: number;
  discountCents: number;
  diskFeeCents: number;
  feeSnapshotId: string | null;
}

export interface OrderDetailDto {
  id: string;
  orderNumber: string;
  eventId: string;
  sessionId: string;
  customerId: string;
  channelType: 'SITE' | 'PDV' | 'CORTESIA';
  posCashSessionId: string | null;
  holdId: string;
  couponCampaignId: string | null;
  status: string;
  subtotalNominalCents: number;
  discountCents: number;
  diskFeeCents: number;
  totalChargedCents: number;
  createdAt: string;
  items: OrderItemDto[];
  tickets: TicketDetailDto[];
}

export const CheckoutOrderRequestSchema = z.object({
  paymentMethod: z.enum(['PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'CORTESIA_ZERO']).default('PIX'),
  idempotencyKey: z.string().trim().min(3, 'Informe a chave de idempotência do checkout.'),
  simulateEmailFailure: z.boolean().default(false),
});

export type CheckoutOrderRequestDto = z.infer<typeof CheckoutOrderRequestSchema>;

export interface PaymentIntentDto {
  id: string;
  orderId: string;
  providerName: string;
  paymentMethod: string;
  amountCents: number;
  status: string;
  externalReference: string | null;
  createdAt: string;
}

export const PaymentWebhookRequestSchema = z.object({
  providerEventId: z.string().trim().min(3, 'Informe o ID único do evento do provedor.'),
  paymentIntentId: z.string().uuid('Informe o ID do payment_intent.'),
  eventType: z.enum(['PAYMENT_CAPTURED', 'PAYMENT_DECLINED']).default('PAYMENT_CAPTURED'),
  signature: z.string().trim().min(6, 'Informe a assinatura de verificação do webhook.'),
  simulateEmailFailure: z.boolean().default(false),
});

export type PaymentWebhookRequestDto = z.infer<typeof PaymentWebhookRequestSchema>;

export interface TicketDeliveryDto {
  id: string;
  ticketId: string;
  orderId: string;
  recipientEmail: string;
  channel: string;
  status: 'PENDING' | 'SENT' | 'FAILED_RETRYABLE' | 'EXHAUSTED';
  attemptCount: number;
  lastError: string | null;
  sentAt: string | null;
  updatedAt: string;
}

export interface TicketDetailDto {
  id: string;
  publicCode: string;
  orderId: string;
  orderItemId: string;
  customerId: string;
  eventId: string;
  sessionId: string;
  sectorId: string;
  seatId: string | null;
  validityStatus: 'RESERVADO' | 'EMITIDO' | 'BLOQUEADO' | 'TROCADO' | 'CANCELADO' | 'ESTORNADO';
  deliveryStatus: 'PENDENTE' | 'ENVIADO' | 'FALHA_ENVIO';
  checkinStatus: 'NAO_UTILIZADO' | 'VALIDADO';
  issuedAt: string;
  cancelledAt: string | null;
  qrCredential?: {
    tokenVersion: number;
    qrToken: string;
    signatureHmac: string;
    isActive: boolean;
  };
  delivery?: TicketDeliveryDto;
}

export const ValidateCheckinRequestSchema = z.object({
  eventId: z.string().uuid(),
  sessionId: z.string().uuid(),
  gateDeviceCode: z.string().trim().min(2, 'Informe o código do coletor/catraca de portaria.'),
  qrToken: z.string().trim().optional().nullable(),
  signatureHmac: z.string().trim().optional().nullable(),
  publicCodeOnly: z.string().trim().optional().nullable(),
});

export type ValidateCheckinRequestDto = z.infer<typeof ValidateCheckinRequestSchema>;

export interface CheckinValidationResultDto {
  checkinId: string;
  allowed: boolean;
  outcome:
    | 'ALLOWED'
    | 'DENIED_ALREADY_USED'
    | 'DENIED_INVALID_STATUS'
    | 'DENIED_INVALID_SIGNATURE'
    | 'DENIED_PUBLIC_CODE_ONLY';
  messagePtBr: string;
  ticket?: {
    id: string;
    publicCode: string;
    validityStatus: string;
    checkinStatus: string;
  };
  checkedInAt: string;
}

// ============================================================================
// 8. Contratos do Pacote Mestre Financeiro (104 opções) + RH & DP (45 opções) + Bridge RH-Financeiro
// ============================================================================

export type CatalogMigrationStatus =
  | 'PENDENTE'
  | 'IMPLEMENTADO_NAO_TESTADO'
  | 'TESTADO_HOMOLOGACAO'
  | 'APROVADO_PRODUCAO';

export interface CatalogFunctionItemDto {
  numero: number;
  dominio: 'FINANCEIRO' | 'RH';
  grupoId: string;
  grupoTitulo: string;
  subgrupoId: string | null;
  subgrupoTitulo: string | null;
  itemTitulo: string;
  slug: string;
  rota: string;
  modulo: string;
  criticidade: string;
  rbacMinimo: string;
  integracaoFinanceiroRh: boolean;
  statusMigracao: CatalogMigrationStatus;
  updatedAt: string;
}

export interface CatalogSummaryDto {
  totalCataloged: number;
  totalFinanceiro: number;
  totalRh: number;
  totalMainGroups: number;
  byStatus: Record<CatalogMigrationStatus, number>;
  items: CatalogFunctionItemDto[];
}

export const CreateCostCenterRequestSchema = z
  .object({
    code: z.string().trim().min(3, 'Informe o código único do centro de custo (ex.: CC-RH-CORP).'),
    name: z.string().trim().min(3, 'Informe o nome do centro de custo.'),
    centerType: z.enum(['CORPORATIVO_RH', 'EVENTO_STAFF', 'OPERACIONAL_GERAL']),
    eventId: z.string().uuid().optional().nullable(),
  })
  .refine(
    (val) =>
      (val.centerType === 'EVENTO_STAFF' && Boolean(val.eventId)) ||
      (val.centerType !== 'EVENTO_STAFF' && !val.eventId),
    {
      message:
        'Centros de custo EVENTO_STAFF exigem eventId vinculado; centros CORPORATIVO_RH não devem vincular eventId.',
    }
  );

export type CreateCostCenterRequestDto = z.infer<typeof CreateCostCenterRequestSchema>;

export interface CostCenterDto {
  id: string;
  code: string;
  name: string;
  centerType: 'CORPORATIVO_RH' | 'EVENTO_STAFF' | 'OPERACIONAL_GERAL';
  eventId: string | null;
  status: string;
  createdAt: string;
}

export const CreateRhEmployeeRequestSchema = z.object({
  matricula: z.string().trim().min(2, 'Informe a matrícula única do colaborador (ex.: MAT-1001).'),
  fullName: z.string().trim().min(3, 'Informe o nome completo do colaborador.'),
  cpf: z
    .string()
    .trim()
    .regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'Informe um CPF válido (11 dígitos).'),
  email: z.string().trim().email('Informe o e-mail corporativo do colaborador.'),
  contractType: z.enum(['CLT', 'INTERMITENTE', 'FREELANCER_EVENTO', 'PJ', 'ESTAGIO']),
  department: z.string().trim().min(2, 'Informe o departamento de lotação.'),
  roleTitle: z.string().trim().min(2, 'Informe o cargo/função.'),
  baseSalaryCents: z.number().int().min(0, 'Informe o salário base em centavos inteiros.'),
  defaultCostCenterId: z.string().uuid().optional().nullable(),
  admittedAt: z.string().trim().min(8, 'Informe a data de admissão (YYYY-MM-DD).'),
});

export type CreateRhEmployeeRequestDto = z.infer<typeof CreateRhEmployeeRequestSchema>;

export interface RhEmployeeDto {
  id: string;
  matricula: string;
  fullName: string;
  cpfMasked: string;
  email: string;
  contractType: 'CLT' | 'INTERMITENTE' | 'FREELANCER_EVENTO' | 'PJ' | 'ESTAGIO';
  department: string;
  roleTitle: string;
  /**
   * Salário individual somente visível para RH_DP_DISK ou SUPER_ADMIN_BRAVO.
   * Nunca exposto ao Financeiro individualmente sem permissão de RH.
   */
  baseSalaryCents: number | null;
  defaultCostCenterId: string | null;
  status: string;
  admittedAt: string;
  createdAt: string;
}

export const CreateRhGeofenceRequestSchema = z.object({
  code: z.string().trim().min(2, 'Informe o código da cerca geográfica (ex.: SEDE-CURITIBA).'),
  name: z.string().trim().min(3, 'Informe o nome do local/cerca geográfica.'),
  eventId: z.string().uuid().optional().nullable(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().int().min(10).max(10000).default(150),
});

export type CreateRhGeofenceRequestDto = z.infer<typeof CreateRhGeofenceRequestSchema>;

export interface RhGeofenceDto {
  id: string;
  code: string;
  name: string;
  eventId: string | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
  createdAt: string;
}

export const RecordTimePunchRequestSchema = z.object({
  employeeId: z.string().uuid('Selecione um colaborador válido.'),
  geofenceId: z.string().uuid('Selecione a cerca geográfica do registro.'),
  punchType: z.enum(['ENTRADA', 'PAUSA_INICIO', 'PAUSA_FIM', 'SAIDA']),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().min(0).default(10),
  idempotencyKey: z.string().trim().min(3, 'Informe a chave de idempotência do ponto (suporte offline).'),
});

export type RecordTimePunchRequestDto = z.infer<typeof RecordTimePunchRequestSchema>;

export interface RhTimePunchDto {
  id: string;
  nsr: number;
  employeeId: string;
  geofenceId: string | null;
  punchType: 'ENTRADA' | 'PAUSA_INICIO' | 'PAUSA_FIM' | 'SAIDA';
  recordedAt: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  distanceMeters: number;
  validationStatus: 'VALIDADA' | 'FORA_DA_AREA' | 'BAIXA_PRECISAO';
  authenticityHash: string;
  idempotencyKey: string;
  createdAt: string;
}

export const CreateRhPaymentBatchRequestSchema = z
  .object({
    batchCode: z.string().trim().min(3, 'Informe o código do lote (ex.: FOLHA-2026-11).'),
    originType: z.enum(['FOLHA', 'EQUIPE_EVENTO', 'REEMBOLSO_RH']),
    competencia: z
      .string()
      .trim()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Informe a competência no formato YYYY-MM.'),
    costCenterId: z.string().uuid('Selecione um centro de custo válido.'),
    eventId: z.string().uuid().optional().nullable(),
    headcount: z.number().int().positive('A quantidade de colaboradores do lote deve ser maior que zero.'),
    grossAmountCents: z.number().int().positive('O valor bruto em centavos deve ser inteiro e positivo.'),
    deductionsAmountCents: z.number().int().min(0).default(0),
    encargosAmountCents: z.number().int().min(0).default(0),
    netAmountCents: z.number().int().positive('O valor líquido a pagar em centavos deve ser inteiro e positivo.'),
    notesPtBr: z.string().trim().optional().nullable(),
  })
  .refine(
    (val) =>
      (val.originType === 'EQUIPE_EVENTO' && Boolean(val.eventId)) ||
      (val.originType !== 'EQUIPE_EVENTO' && !val.eventId),
    {
      message:
        'Lotes de EQUIPE_EVENTO exigem eventId vinculado; lotes de FOLHA corporativa não podem misturar eventId.',
    }
  );

export type CreateRhPaymentBatchRequestDto = z.infer<typeof CreateRhPaymentBatchRequestSchema>;

export const ReconcileRhPaymentBatchRequestSchema = z.object({
  externalConfirmationRef: z
    .string()
    .trim()
    .min(4, 'Informe o comprovante/referência de retorno bancário externo.'),
});

export type ReconcileRhPaymentBatchRequestDto = z.infer<typeof ReconcileRhPaymentBatchRequestSchema>;

export interface RhPaymentBatchDto {
  id: string;
  batchCode: string;
  originType: 'FOLHA' | 'EQUIPE_EVENTO' | 'REEMBOLSO_RH';
  competencia: string;
  costCenterId: string;
  costCenterCode?: string;
  eventId: string | null;
  headcount: number;
  grossAmountCents: number;
  deductionsAmountCents: number;
  encargosAmountCents: number;
  netAmountCents: number;
  status:
    | 'RASCUNHO_RH'
    | 'AGUARDANDO_FINANCEIRO'
    | 'APROVADO_FINANCEIRO'
    | 'REJEITADO_FINANCEIRO'
    | 'PENDENTE_INTEGRACAO_BANCARIA'
    | 'LIQUIDADO';
  requestedByUserId: string;
  approvedByFinanceUserId: string | null;
  treasuryPreparedByUserId: string | null;
  externalConfirmationRef: string | null;
  notesPtBr: string | null;
  createdAt: string;
  approvedAt: string | null;
  settledAt: string | null;
}

export const CreateFinanceLedgerEntryRequestSchema = z.object({
  entryGroupId: z.string().uuid('Informe um UUID agrupador da partida dobrada.'),
  eventId: z.string().uuid().optional().nullable(),
  producerId: z.string().uuid().optional().nullable(),
  costCenterId: z.string().uuid().optional().nullable(),
  rhPaymentBatchId: z.string().uuid().optional().nullable(),
  debitAccount: z.string().trim().min(3, 'Informe a conta contábil de débito.'),
  creditAccount: z.string().trim().min(3, 'Informe a conta contábil de crédito.'),
  amountCents: z.number().int().positive('O valor do lançamento contábil deve ser inteiro positivo em centavos.'),
  descriptionPtBr: z.string().trim().min(3, 'Informe o histórico contábil em pt-BR.'),
});

export type CreateFinanceLedgerEntryRequestDto = z.infer<typeof CreateFinanceLedgerEntryRequestSchema>;

export interface FinanceLedgerEntryDto {
  id: string;
  entryGroupId: string;
  eventId: string | null;
  producerId: string | null;
  costCenterId: string | null;
  rhPaymentBatchId: string | null;
  debitAccount: string;
  creditAccount: string;
  amountCents: number;
  descriptionPtBr: string;
  createdByUserId: string;
  occurredAt: string;
}



