import { randomUUID, createHash } from 'node:crypto';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'cpf',
  'pan',
  'cvv',
  'cardtoken',
  'token',
  'authorization',
  'secret',
]);

export function maskSensitiveData<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }
  if (typeof input === 'string') {
    // Mascarar padrão de CPF 000.000.000-00 ou 11 dígitos se presente em string livre
    return input.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '***.***.***-**') as unknown as T;
  }
  if (Array.isArray(input)) {
    return input.map((item) => maskSensitiveData(item)) as unknown as T;
  }
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        out[key] = '[REDACTED_PII_OR_SECRET]';
      } else {
        out[key] = maskSensitiveData(value);
      }
    }
    return out as T;
  }
  return input;
}

export function ensureCorrelationId(existing?: string | string[]): string {
  if (typeof existing === 'string' && existing.trim().length > 0) {
    return existing.trim();
  }
  return randomUUID();
}

export function computeAuditIntegrityHash(payload: Record<string, unknown>): string {
  const canonicalJson = JSON.stringify(payload, Object.keys(payload).sort());
  return createHash('sha256').update(canonicalJson).digest('hex');
}

export interface StructuredLogEntry {
  level: 'INFO' | 'WARN' | 'ERROR';
  timestamp: string;
  correlationId: string;
  service: string;
  message: string;
  context?: Record<string, unknown>;
}

export class StructuredLogger {
  constructor(private readonly serviceName: string) {}

  info(message: string, correlationId: string, context?: Record<string, unknown>): void {
    this.emit('INFO', message, correlationId, context);
  }

  warn(message: string, correlationId: string, context?: Record<string, unknown>): void {
    this.emit('WARN', message, correlationId, context);
  }

  error(message: string, correlationId: string, context?: Record<string, unknown>): void {
    this.emit('ERROR', message, correlationId, context);
  }

  private emit(
    level: StructuredLogEntry['level'],
    message: string,
    correlationId: string,
    context?: Record<string, unknown>
  ): void {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    const entry: StructuredLogEntry = {
      level,
      timestamp: new Date().toISOString(),
      correlationId,
      service: this.serviceName,
      message,
      context: context ? maskSensitiveData(context) : undefined,
    };
    process.stdout.write(`${JSON.stringify(entry)}\n`);
  }
}
