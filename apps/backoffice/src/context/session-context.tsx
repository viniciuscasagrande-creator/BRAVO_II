'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
  isAuthenticated: boolean;
  isLoadingSession: boolean;
  sessionError: string | null;
  csrfToken: string | null;
  sessionToken: string | null;
  navigationItems: NavigationMenuItem[];
  switchLocalPreviewRole: (role: RoleCode) => void;
  setAuthenticatedSession: (token: string, actor: AuthenticatedActorDto, csrfToken?: string) => void;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  logoutFromServer: () => Promise<void>;
  hasPermission: (permission: PermissionCode) => boolean;
}

const ANONYMOUS_ACTOR: AuthenticatedActorDto = {
  userId: '',
  email: '',
  fullName: 'Sessão não autenticada',
  roles: [],
  permissions: [],
  producerScopeIds: [],
  eventScopeIds: [],
  sessionId: '',
};

const DEV_PREVIEW_ACTORS: Record<string, AuthenticatedActorDto> = {
  COMERCIAL_DISK: {
    userId: '00000000-0000-4000-8000-000000000104',
    email: 'comercial.local@diskingressos.com.br',
    fullName: 'Operador Comercial Disk',
    roles: ['COMERCIAL_DISK'],
    permissions: [...CANONICAL_ROLES.COMERCIAL_DISK.permissions],
    producerScopeIds: [],
    eventScopeIds: [],
    sessionId: 'dev-session-comercial',
  },
  OPERACAO_EVENTOS: {
    userId: '00000000-0000-4000-8000-000000000105',
    email: 'operacao.local@diskingressos.com.br',
    fullName: 'Operador de Eventos Disk',
    roles: ['OPERACAO_EVENTOS'],
    permissions: [...CANONICAL_ROLES.OPERACAO_EVENTOS.permissions],
    producerScopeIds: [],
    eventScopeIds: [],
    sessionId: 'dev-session-operacao',
  },
  FINANCEIRO_DISK: {
    userId: '00000000-0000-4000-8000-000000000101',
    email: 'financeiro.local@diskingressos.com.br',
    fullName: 'Operador Financeiro Disk',
    roles: ['FINANCEIRO_DISK'],
    permissions: [...CANONICAL_ROLES.FINANCEIRO_DISK.permissions],
    producerScopeIds: [],
    eventScopeIds: [],
    sessionId: 'dev-session-financeiro',
  },
  RH_DP_DISK: {
    userId: '00000000-0000-4000-8000-000000000108',
    email: 'rh.local@diskingressos.com.br',
    fullName: 'Gestor RH & DP Disk',
    roles: ['RH_DP_DISK'],
    permissions: [...CANONICAL_ROLES.RH_DP_DISK.permissions],
    producerScopeIds: [],
    eventScopeIds: [],
    sessionId: 'dev-session-rh',
  },
  SAC_ATENDIMENTO: {
    userId: '00000000-0000-4000-8000-000000000102',
    email: 'sac.local@diskingressos.com.br',
    fullName: 'Operador SAC Disk',
    roles: ['SAC_ATENDIMENTO'],
    permissions: [...CANONICAL_ROLES.SAC_ATENDIMENTO.permissions],
    producerScopeIds: [],
    eventScopeIds: [],
    sessionId: 'dev-session-sac',
  },
  PRODUTOR_PDT: {
    userId: '00000000-0000-4000-8000-000000000103',
    email: 'produtor.local@pdt.diskingressos.com.br',
    fullName: 'Produtor Parceiro (Portal PDT)',
    roles: ['PRODUTOR_PDT'],
    permissions: [...CANONICAL_ROLES.PRODUTOR_PDT.permissions],
    producerScopeIds: ['20000000-0000-4000-8000-000000000001'],
    eventScopeIds: ['30000000-0000-4000-8000-000000000001'],
    sessionId: 'dev-session-produtor',
  },
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [actor, setActor] = useState<AuthenticatedActorDto>(ANONYMOUS_ACTOR);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    setIsLoadingSession(true);
    setSessionError(null);
    try {
      const res = await fetch('/v1/auth/me', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (res.ok) {
        const data = (await res.json()) as AuthenticatedActorDto & { csrfToken?: string };
        setActor({
          userId: data.userId,
          email: data.email,
          fullName: data.fullName,
          roles: data.roles ?? [],
          permissions: data.permissions ?? [],
          producerScopeIds: data.producerScopeIds ?? [],
          eventScopeIds: data.eventScopeIds ?? [],
          sessionId: data.sessionId ?? 'cookie-session',
        });
        setCsrfToken(data.csrfToken ?? null);
        setIsAuthenticated(true);
      } else if (res.status === 401 || res.status === 403) {
        setActor(ANONYMOUS_ACTOR);
        setCsrfToken(null);
        setIsAuthenticated(false);
      } else {
        setSessionError(`Serviço de autenticação respondeu com status ${res.status}.`);
      }
    } catch {
      setSessionError('Não foi possível conectar ao servidor de autenticação.');
    } finally {
      setIsLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const switchLocalPreviewRole = (role: RoleCode) => {
    if (process.env.NODE_ENV === 'production') {
      return;
    }
    const preset = DEV_PREVIEW_ACTORS[role];
    if (preset) {
      setActor(preset);
    }
  };

  const setAuthenticatedSession = (
    _token: string,
    authenticatedActor: AuthenticatedActorDto,
    nextCsrf?: string
  ) => {
    setActor(authenticatedActor);
    setIsAuthenticated(true);
    setSessionError(null);
    if (nextCsrf) {
      setCsrfToken(nextCsrf);
    } else {
      void refreshSession();
    }
  };

  const logout = async () => {
    try {
      const headers: Record<string, string> = {};
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
      await fetch('/v1/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers,
      });
    } catch {
      // Ignora erro de rede ao deslogar
    } finally {
      setActor(ANONYMOUS_ACTOR);
      setCsrfToken(null);
      setIsAuthenticated(false);
    }
  };

  const navigationItems = useMemo(() => {
    const items = filterNavigationByPermissions(actor.permissions);
    if (items.length === 0) {
      return filterNavigationByPermissions(['overview:read']);
    }
    return items;
  }, [actor.permissions]);

  const hasPermission = useCallback(
    (permission: PermissionCode): boolean => {
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
    },
    [actor.permissions]
  );

  // Para compatibilidade com páginas existentes que checam `if (!sessionToken)`:
  // quando autenticado via cookie HttpOnly, expomos o marcador CSRF (`csrf:<token>`) sem armazenar token em localStorage
  const sessionToken = isAuthenticated ? (csrfToken ? `csrf:${csrfToken}` : 'cookie-session') : null;

  return (
    <SessionContext.Provider
      value={{
        actor,
        isAuthenticated,
        isLoadingSession,
        sessionError,
        csrfToken,
        sessionToken,
        navigationItems,
        switchLocalPreviewRole,
        setAuthenticatedSession,
        refreshSession,
        logout,
        logoutFromServer: logout,
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
