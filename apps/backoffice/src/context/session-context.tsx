'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  CANONICAL_ROLES,
  filterNavigationByPermissions,
  type AuthenticatedActorDto,
  type NavigationMenuItem,
  type PermissionCode,
  type RoleCode,
} from '@bravo-ii/contracts';

interface SessionContextValue {
  actor: AuthenticatedActorDto;
  sessionToken: string | null;
  navigationItems: NavigationMenuItem[];
  switchLocalPreviewRole: (role: RoleCode) => void;
  setAuthenticatedSession: (token: string, actor: AuthenticatedActorDto) => void;
  logout: () => void;
  hasPermission: (permission: PermissionCode) => boolean;
}

const DEFAULT_ACTORS: Record<string, AuthenticatedActorDto> = {
  COMERCIAL_DISK: {
    userId: '00000000-0000-4000-8000-000000000104',
    email: 'comercial.local@diskingressos.com.br',
    fullName: 'Operador Comercial Disk (Sessão Ativa)',
    roles: ['COMERCIAL_DISK'],
    permissions: [...CANONICAL_ROLES.COMERCIAL_DISK.permissions],
    producerScopeIds: [],
    eventScopeIds: [],
    sessionId: 'local-session-comercial',
  },
  OPERACAO_EVENTOS: {
    userId: '00000000-0000-4000-8000-000000000105',
    email: 'operacao.local@diskingressos.com.br',
    fullName: 'Operador de Eventos Disk (Sessão Ativa)',
    roles: ['OPERACAO_EVENTOS'],
    permissions: [...CANONICAL_ROLES.OPERACAO_EVENTOS.permissions],
    producerScopeIds: [],
    eventScopeIds: [],
    sessionId: 'local-session-operacao',
  },
  FINANCEIRO_DISK: {
    userId: '00000000-0000-4000-8000-000000000101',
    email: 'financeiro.local@diskingressos.com.br',
    fullName: 'Operador Financeiro Disk (Sessão Ativa)',
    roles: ['FINANCEIRO_DISK'],
    permissions: [...CANONICAL_ROLES.FINANCEIRO_DISK.permissions],
    producerScopeIds: [],
    eventScopeIds: [],
    sessionId: 'local-session-financeiro',
  },
  RH_DP_DISK: {
    userId: '00000000-0000-4000-8000-000000000108',
    email: 'rh.local@diskingressos.com.br',
    fullName: 'Gestor RH & DP Disk (Sessão Ativa)',
    roles: ['RH_DP_DISK'],
    permissions: [...CANONICAL_ROLES.RH_DP_DISK.permissions],
    producerScopeIds: [],
    eventScopeIds: [],
    sessionId: 'local-session-rh',
  },
  SAC_ATENDIMENTO: {
    userId: '00000000-0000-4000-8000-000000000102',
    email: 'sac.local@diskingressos.com.br',
    fullName: 'Operador SAC Disk (Sessão Ativa)',
    roles: ['SAC_ATENDIMENTO'],
    permissions: [...CANONICAL_ROLES.SAC_ATENDIMENTO.permissions],
    producerScopeIds: [],
    eventScopeIds: [],
    sessionId: 'local-session-sac',
  },
  PRODUTOR_PDT: {
    userId: '00000000-0000-4000-8000-000000000103',
    email: 'produtor.local@pdt.diskingressos.com.br',
    fullName: 'Operador Produtor PDT (Escopo Restrito)',
    roles: ['PRODUTOR_PDT'],
    permissions: [...CANONICAL_ROLES.PRODUTOR_PDT.permissions],
    producerScopeIds: ['20000000-0000-4000-8000-000000000001'],
    eventScopeIds: ['30000000-0000-4000-8000-000000000001'],
    sessionId: 'local-session-produtor',
  },
};

const STORAGE_KEY_ACTOR = 'bravo_ii_active_actor';
const STORAGE_KEY_TOKEN = 'bravo_ii_session_token';

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [actor, setActor] = useState<AuthenticatedActorDto>(DEFAULT_ACTORS.COMERCIAL_DISK);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedActor = window.localStorage.getItem(STORAGE_KEY_ACTOR);
      const savedToken = window.localStorage.getItem(STORAGE_KEY_TOKEN);
      if (savedActor) {
        setActor(JSON.parse(savedActor) as AuthenticatedActorDto);
      }
      if (savedToken) {
        setSessionToken(savedToken);
      }
    } catch {
      // Ignorar falhas de leitura do storage local
    }
  }, []);

  const switchLocalPreviewRole = (role: RoleCode) => {
    const preset = DEFAULT_ACTORS[role] ?? DEFAULT_ACTORS.FINANCEIRO_DISK;
    setActor(preset);
    try {
      window.localStorage.setItem(STORAGE_KEY_ACTOR, JSON.stringify(preset));
    } catch {
      // Ignorar
    }
  };

  const setAuthenticatedSession = (token: string, authenticatedActor: AuthenticatedActorDto) => {
    setSessionToken(token);
    setActor(authenticatedActor);
    try {
      window.localStorage.setItem(STORAGE_KEY_TOKEN, token);
      window.localStorage.setItem(STORAGE_KEY_ACTOR, JSON.stringify(authenticatedActor));
    } catch {
      // Ignorar
    }
  };

  const logout = () => {
    setSessionToken(null);
    setActor(DEFAULT_ACTORS.COMERCIAL_DISK);
    try {
      window.localStorage.removeItem(STORAGE_KEY_TOKEN);
      window.localStorage.removeItem(STORAGE_KEY_ACTOR);
    } catch {
      // Ignorar
    }
  };

  const navigationItems = useMemo(() => {
    return filterNavigationByPermissions(actor.permissions);
  }, [actor.permissions]);

  const hasPermission = (permission: PermissionCode): boolean => {
    if (permission === 'pdt:portal-read' && actor.permissions.includes('pdt:admin')) {
      return true;
    }
    if (
      permission === 'refund:request' &&
      (actor.permissions.includes('refund:approve') || actor.permissions.includes('refund:execute'))
    ) {
      return true;
    }
    if (
      permission === 'rh:self-read' &&
      (actor.permissions.includes('rh:read') || actor.permissions.includes('rh:write'))
    ) {
      return true;
    }
    return actor.permissions.includes(permission);
  };

  return (
    <SessionContext.Provider
      value={{
        actor,
        sessionToken,
        navigationItems,
        switchLocalPreviewRole,
        setAuthenticatedSession,
        logout,
        hasPermission,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useBravoSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useBravoSession deve ser usado dentro de um SessionProvider.');
  }
  return ctx;
}
