const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

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

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cleanPath = path.replace(/^\/+/, '');
  const token =
    typeof window !== 'undefined' ? window.localStorage.getItem('bravo_ii_session_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/v1/p06/${cleanPath}`, {
    credentials: 'include',
    cache: 'no-store',
    ...options,
    headers,
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new ApiFailure(
      res.status,
      detail?.error?.code || detail?.code || 'API',
      detail?.error?.message || detail?.message || `Falha HTTP ${res.status}`
    );
  }
  return (await res.json()) as T;
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
  lots: { id: string; name: string; faceValueCents: number; capacity: number }[];
  channels: { channel: string; enabled: boolean }[];
  approvals: { step: string; decision: string; actorId: string }[];
};
