'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  CANONICAL_NAVIGATION_MENU,
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
  logoutSession: () => Promise<void>;
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

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

function normalizeActor(raw: Partial<AuthenticatedActorDto> | null | undefined): AuthenticatedActorDto {
  if (!raw || typeof raw !== 'object') {
    return ANONYMOUS_ACTOR;
  }
  return {
    userId: typeof raw.userId === 'string' ? raw.userId : '',
    email: typeof raw.email === 'string' ? raw.email : '',
    fullName:
      typeof raw.fullName === 'string' && raw.fullName.trim().length > 0
        ? raw.fullName
        : typeof raw.email === 'string' && raw.email.trim().length > 0
          ? raw.email
          : 'Operador Autenticado',
    roles: Array.isArray(raw.roles) ? raw.roles : [],
    permissions: Array.isArray(raw.permissions) ? raw.permissions : [],
    producerScopeIds: Array.isArray(raw.producerScopeIds) ? raw.producerScopeIds : [],
    eventScopeIds: Array.isArray(raw.eventScopeIds) ? raw.eventScopeIds : [],
    sessionId: typeof raw.sessionId === 'string' && raw.sessionId ? raw.sessionId : 'cookie-session',
  };
}

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
        setActor(normalizeActor(data));
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

  const switchLocalPreviewRole = (_role: RoleCode) => {
    // Alternância local de perfil desativada: toda sessão vem do backend autenticado.
  };

  const setAuthenticatedSession = (
    _token: string,
    authenticatedActor: AuthenticatedActorDto,
    nextCsrf?: string
  ) => {
    setActor(normalizeActor(authenticatedActor));
    setIsAuthenticated(true);
    setIsLoadingSession(false);
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

  const isAdminActor = useMemo(
    () => actor.roles.includes('ADMIN_BRAVO') || (actor.roles as string[]).includes('ADMIN'),
    [actor.roles]
  );

  const navigationItems = useMemo(() => {
    if (isAdminActor) {
      return CANONICAL_NAVIGATION_MENU;
    }
    const items = filterNavigationByPermissions(actor.permissions);
    if (items.length === 0) {
      return CANONICAL_NAVIGATION_MENU;
    }
    return items;
  }, [actor.permissions, isAdminActor]);

  const hasPermission = useCallback(
    (permission: PermissionCode): boolean => {
      if (isAdminActor) {
        return true;
      }
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
    [actor.permissions, isAdminActor]
  );

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
        logoutSession: logout,
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
