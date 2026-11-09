import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../common/database/database.service';
import { computeAuditIntegrityHash, maskSensitiveData } from '@bravo-ii/telemetry';
import type { AuditRecordDto } from '@bravo-ii/contracts';

export interface RecordAuditParams {
  actorUserId: string | null;
  actorRole: string;
  sessionId?: string | null;
  ipAddress?: string | null;
  canonicalAction: string;
  resourceType: string;
  resourceId?: string | null;
  producerId?: string | null;
  eventId?: string | null;
  outcome: 'SUCCESS' | 'DENIED' | 'FAILURE';
  justification?: string | null;
  origin?: 'API' | 'BACKOFFICE' | 'PDT' | 'PDV' | 'WORKER';
  correlationId: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  async record(params: RecordAuditParams): Promise<string> {
    const id = randomUUID();
    const occurredAt = new Date().toISOString();
    const safeBefore = params.beforeState ? maskSensitiveData(params.beforeState) : null;
    const safeAfter = params.afterState ? maskSensitiveData(params.afterState) : null;
    const actorRole = params.actorRole.includes('ADMIN_BRAVO')
      ? 'ADMIN_BRAVO'
      : (params.actorRole || 'UNKNOWN').slice(0, 64);

    const integrityHash = computeAuditIntegrityHash({
      id,
      occurredAt,
      actorUserId: params.actorUserId,
      actorRole,
      canonicalAction: params.canonicalAction,
      resourceType: params.resourceType,
      resourceId: params.resourceId ?? null,
      producerId: params.producerId ?? null,
      eventId: params.eventId ?? null,
      outcome: params.outcome,
      correlationId: params.correlationId,
    });

    await this.db.query(
      `INSERT INTO audit_records (
        id, occurred_at, actor_user_id, actor_role, session_id, ip_address,
        canonical_action, resource_type, resource_id, producer_id, event_id,
        outcome, justification, origin, correlation_id, before_state, after_state, integrity_hash
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17, $18
      )`,
      [
        id,
        occurredAt,
        params.actorUserId,
        actorRole,
        params.sessionId ?? null,
        params.ipAddress ?? null,
        params.canonicalAction,
        params.resourceType,
        params.resourceId ?? null,
        params.producerId ?? null,
        params.eventId ?? null,
        params.outcome,
        params.justification ?? null,
        params.origin ?? 'API',
        params.correlationId,
        safeBefore ? JSON.stringify(safeBefore) : null,
        safeAfter ? JSON.stringify(safeAfter) : null,
        integrityHash,
      ]
    );

    return id;
  }

  async listRecords(limit = 100): Promise<AuditRecordDto[]> {
    const res = await this.db.query<{
      id: string;
      occurred_at: string | Date;
      actor_user_id: string | null;
      actor_role: string;
      canonical_action: string;
      resource_type: string;
      resource_id: string | null;
      producer_id: string | null;
      event_id: string | null;
      outcome: 'SUCCESS' | 'DENIED' | 'FAILURE';
      justification: string | null;
      origin: string;
      correlation_id: string;
    }>(
      `SELECT
        id, occurred_at, actor_user_id, actor_role, canonical_action,
        resource_type, resource_id, producer_id, event_id,
        outcome, justification, origin, correlation_id
       FROM audit_records
       ORDER BY occurred_at DESC
       LIMIT $1`,
      [limit]
    );

    return res.rows.map((row) => ({
      id: row.id,
      occurredAt: row.occurred_at instanceof Date ? row.occurred_at.toISOString() : String(row.occurred_at),
      actorUserId: row.actor_user_id,
      actorRole: row.actor_role,
      canonicalAction: row.canonical_action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      producerId: row.producer_id,
      eventId: row.event_id,
      outcome: row.outcome,
      justification: row.justification,
      origin: row.origin,
      correlationId: row.correlation_id,
    }));
  }
}
