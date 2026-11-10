import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { canExecuteInternalOperation, hasAnyRole, normalizeRoleForPolicy } from '@bravo-ii/core-policy';
import type { AuthenticatedActorDto } from '@bravo-ii/contracts';

export type Actor = AuthenticatedActorDto;

export function requireInternal(actor: Actor | undefined, ...allowed: string[]): void {
  if (!actor) {
    throw new ForbiddenException({ code: 'ACESSO_NEGADO', message: 'Ator não autenticado.' });
  }
  const normalizedRoles = actor.roles.map(normalizeRoleForPolicy);
  const isProducerOnly = normalizedRoles.length > 0 && normalizedRoles.every((r) => r === 'PRODUTOR');
  if (isProducerOnly || !canExecuteInternalOperation(actor.roles, allowed) || !hasAnyRole(actor.roles, allowed)) {
    throw new ForbiddenException({
      code: 'PERMISSAO_INSUFICIENTE_P10',
      message: 'Perfil sem alçada para executar esta operação.',
    });
  }
}

export function uid(v: unknown): string {
  if (
    typeof v !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  ) {
    throw new BadRequestException({ code: 'UUID_INVALIDO', message: 'UUID inválido' });
  }
  return v;
}

export function val(v: unknown, min = 5, max = 4000): string {
  if (typeof v !== 'string' || v.trim().length < min || v.trim().length > max) {
    throw new BadRequestException({
      code: 'TEXTO_INVALIDO',
      message: `Texto deve conter ${min} a ${max} caracteres`,
    });
  }
  return v.trim();
}

export function choice(v: unknown, choices: readonly string[]): string {
  if (typeof v !== 'string' || !choices.includes(v)) {
    throw new BadRequestException({ code: 'OPCAO_INVALIDA', message: 'Opção inválida' });
  }
  return v;
}

export function sacWrite(a: Actor) {
  requireInternal(a, 'SAC', 'OPERACOES', 'ADMIN');
}

export function sacRead(a: Actor) {
  requireInternal(a, 'SAC', 'OPERACOES', 'ADMIN', 'AUDITOR', 'FINANCEIRO_DISK');
}

export function financeWrite(a: Actor) {
  requireInternal(a, 'FINANCEIRO_DISK');
}

export function asConflict(fn: () => void) {
  try {
    fn();
  } catch (e) {
    throw new ConflictException({ code: 'CONFLITO_DOMINIO_P10', message: (e as Error).message });
  }
}

export const CATEGORIES = [
  'INFORMACAO',
  'ALTERACAO',
  'CANCELAMENTO',
  'PAGAMENTO',
  'ACESSO',
  'RECLAMACAO',
  'INCIDENTE',
] as const;

export const PRIORITIES = ['BAIXA', 'NORMAL', 'ALTA', 'CRITICA'] as const;

export const CHANNELS = ['TELEFONE', 'CHAT', 'EMAIL', 'WHATSAPP', 'INTERNO'] as const;
