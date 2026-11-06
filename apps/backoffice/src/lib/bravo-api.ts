/** Chamadas same-origin (/v1/*), sessão em cookie HttpOnly (bravo_session) ou Bearer e X-CSRF-Token em métodos mutáveis. */
export class ApiFailure extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiFailure';
  }
}

export type SignedInUser = {
  id: string;
  email: string;
  roles: string[];
  forcePasswordChange: boolean;
};

export type SessionInfo = {
  user: SignedInUser;
  csrfToken: string;
};

export type MenuItem = {
  id: string;
  label: string;
  href: string;
  status: 'ATIVO' | 'EM_IMPLANTACAO';
  group: string;
};

async function parseError(res: Response): Promise<never> {
  const body = await res.json().catch(() => ({}));
  const message =
    typeof body?.message === 'string'
      ? body.message
      : typeof body?.error?.message === 'string'
        ? body.error.message
        : `Falha HTTP ${res.status}`;
  throw new ApiFailure(res.status, body?.error?.code || body?.code || 'API', message);
}

export async function currentSession(): Promise<SessionInfo> {
  const response = await fetch('/v1/auth/me', {
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!response.ok) return parseError(response);
  return response.json() as Promise<SessionInfo>;
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  const headers = new Headers(options.headers);
  if (mutating) {
    const session = await currentSession().catch(() => ({ csrfToken: '' }));
    if (session.csrfToken) {
      headers.set('X-CSRF-Token', session.csrfToken);
    }
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`/v1/${path.replace(/^\/+/, '')}`, {
    ...options,
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers,
  });
  if (!res.ok) return parseError(res);
  return res.json() as Promise<T>;
}

export const get = <T>(path: string) => request<T>(path);
export const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
export const patch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });

export type ProducerSummary = {
  id: string;
  legalName: string;
  tradeName?: string;
  cnpj: string;
  status: string;
  createdAt: string;
};

export type EventSummary = {
  id: string;
  name: string;
  status: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  producers: { producer: { legalName: string }; role: string }[];
};

export type EventFull = {
  id: string;
  name: string;
  status: string;
  revision: number;
  startsAt: string;
  endsAt: string;
  salesStartAt?: string;
  producers: { producer: { id: string; legalName: string; status: string }; role: string }[];
  sessions: { id: string; name: string; startsAt: string; endsAt: string; capacity: number }[];
  areas: { id: string; label: string; capacity: number; isNumbered: boolean }[];
  ticketCategories: { id: string; name: string }[];
  lots: {
    id: string;
    name: string;
    sessionId: string;
    faceValueCents: number;
    capacity: number;
    status: string;
    areaId?: string | null;
  }[];
  channels: { channel: string; enabled: boolean }[];
  approvals: { step: string; decision: string; actorId: string }[];
};
