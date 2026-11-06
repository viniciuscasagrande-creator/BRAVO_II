import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import { normalizeRoleForPolicy } from '@bravo-ii/core-policy';
import { SAC_FLOW, type SacStatus, calculateSla, checkTransition } from '@bravo-ii/domain-p10';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../governance/audit.service';
import {
  type Actor,
  asConflict,
  CATEGORIES,
  CHANNELS,
  choice,
  PRIORITIES,
  requireInternal,
  sacRead,
  sacWrite,
  uid,
  val,
} from './common';

export type SupportCreate = {
  customerId?: string;
  orderId?: string;
  queueId?: string;
  subject: string;
  description: string;
  category: string;
  channel: string;
  priority: string;
};

@Injectable()
export class BravoSacService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditService: AuditService
  ) {}

  async create(body: SupportCreate, actor: Actor, correlationId?: string) {
    sacWrite(actor);
    const subject = val(body?.subject, 5, 180);
    const description = val(body?.description, 10, 4000);
    const category = choice(body?.category, CATEGORIES);
    const channel = choice(body?.channel, CHANNELS);
    const priority = choice(body?.priority, PRIORITIES);
    const customerId = body?.customerId ? uid(body.customerId) : null;
    const orderId = body?.orderId ? uid(body.orderId) : null;
    const queueId = body?.queueId ? uid(body.queueId) : null;

    const [orderRes, customerRes, queueRes, policyRes] = await Promise.all([
      orderId
        ? this.db.query<{ customer_id: string }>(
            `SELECT customer_id FROM p08_sale_orders WHERE id = $1`,
            [orderId]
          )
        : Promise.resolve({ rows: [] as { customer_id: string }[] }),
      customerId
        ? this.db.query<{ id: string }>(`SELECT id FROM customers WHERE id = $1`, [customerId])
        : Promise.resolve({ rows: [] as { id: string }[] }),
      queueId
        ? this.db.query<{ active: boolean }>(
            `SELECT active FROM p10_support_queues WHERE id = $1`,
            [queueId]
          )
        : Promise.resolve({ rows: [] as { active: boolean }[] }),
      this.db.query<{
        id: string;
        response_minutes: number;
        resolution_minutes: number;
      }>(
        `SELECT id, response_minutes, resolution_minutes
         FROM p10_sla_policies
         WHERE category = $1 AND priority = $2 AND active = TRUE
         ORDER BY version DESC
         LIMIT 1`,
        [category, priority]
      ),
    ]);

    const order = orderRes.rows[0] ?? null;
    const customer = customerRes.rows[0] ?? null;
    const queue = queueRes.rows[0] ?? null;
    const policy = policyRes.rows[0] ?? null;

    if (orderId && !order) {
      throw new NotFoundException({ code: 'PEDIDO_NAO_ENCONTRADO', message: 'Pedido não encontrado' });
    }
    if (customerId && !customer) {
      throw new NotFoundException({ code: 'CLIENTE_NAO_ENCONTRADO', message: 'Cliente não encontrado' });
    }
    if (order && customerId && order.customer_id !== customerId) {
      throw new ConflictException({
        code: 'CLIENTE_PEDIDO_DIVERGENTE',
        message: 'Cliente informado não pertence ao pedido',
      });
    }
    if (queueId && !queue?.active) {
      throw new ConflictException({
        code: 'FILA_INATIVA',
        message: 'Fila inexistente ou inativa',
      });
    }
    if (!policy) {
      throw new ConflictException({
        code: 'SLA_NAO_CONFIGURADO',
        message: 'Configure uma política SLA para esta categoria e prioridade',
      });
    }

    const due = calculateSla(new Date(), Number(policy.response_minutes), Number(policy.resolution_minutes));
    const caseId = randomUUID();
    const protocol = `SAC-${randomBytes(9).toString('hex').toUpperCase()}`;
    const resolvedCustomerId = customerId ?? order?.customer_id ?? null;

    const created = await this.db.withTransaction(async (tx) => {
      const res = await tx.query<{
        id: string;
        protocol: string;
        customer_id: string | null;
        order_id: string | null;
        queue_id: string | null;
        policy_id: string | null;
        subject: string;
        description: string;
        category: string;
        channel: string;
        priority: string;
        status: string;
        assigned_to: string | null;
        created_by: string;
        first_response_due_at: string | Date;
        resolution_due_at: string | Date;
        first_response_at: string | Date | null;
        resolved_at: string | Date | null;
        closed_at: string | Date | null;
        version: number;
        created_at: string | Date;
        updated_at: string | Date;
      }>(
        `INSERT INTO p10_support_cases (
           id, protocol, customer_id, order_id, queue_id, policy_id,
           subject, description, category, channel, priority, status,
           created_by, first_response_due_at, resolution_due_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ABERTO', $12, $13::timestamptz, $14::timestamptz)
         RETURNING *`,
        [
          caseId,
          protocol,
          resolvedCustomerId,
          orderId,
          queueId,
          policy.id,
          subject,
          description,
          category,
          channel,
          priority,
          actor.userId,
          due.firstResponseDueAt.toISOString(),
          due.resolutionDueAt.toISOString(),
        ]
      );
      return res.rows[0];
    });

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'SAC_ABERTO',
      resourceType: 'CHAMADO',
      resourceId: created.id,
      outcome: 'SUCCESS',
      correlationId: correlationId ?? `p10-sac-${created.id}`,
      afterState: { protocol: created.protocol, category, priority, orderId },
    });

    return this.mapCase(created);
  }

  async list(actor: Actor, filters: { status?: string; search?: string } = {}) {
    sacRead(actor);
    const status = filters.status ? choice(filters.status, Object.keys(SAC_FLOW)) : undefined;
    const search = filters.search?.trim().slice(0, 80);

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (search && search.length > 0) {
      params.push(`%${search}%`);
      conditions.push(`(protocol ILIKE $${params.length} OR subject ILIKE $${params.length})`);
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await this.db.query<{
      id: string;
      protocol: string;
      customer_id: string | null;
      order_id: string | null;
      queue_id: string | null;
      policy_id: string | null;
      subject: string;
      description: string;
      category: string;
      channel: string;
      priority: string;
      status: string;
      assigned_to: string | null;
      created_by: string;
      first_response_due_at: string | Date | null;
      resolution_due_at: string | Date | null;
      first_response_at: string | Date | null;
      resolved_at: string | Date | null;
      closed_at: string | Date | null;
      version: number;
      created_at: string | Date;
      updated_at: string | Date;
    }>(
      `SELECT * FROM p10_support_cases
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT 100`,
      params
    );

    return { items: res.rows.map((r) => this.mapCase(r)) };
  }

  async get(caseId: string, actor: Actor) {
    sacRead(actor);
    const id = uid(caseId);
    const [caseRes, interactionsRes, incidentRes] = await Promise.all([
      this.db.query<any>(`SELECT * FROM p10_support_cases WHERE id = $1`, [id]),
      this.db.query<{
        id: string;
        case_id: string;
        kind: string;
        body: string;
        author_id: string;
        created_at: string | Date;
      }>(
        `SELECT * FROM p10_support_interactions WHERE case_id = $1 ORDER BY created_at ASC LIMIT 150`,
        [id]
      ),
      this.db.query<{
        id: string;
        case_id: string;
        severity: string;
        is_major: boolean;
        service_name: string;
        status: string;
        problem_id: string | null;
        created_at: string | Date;
      }>(`SELECT * FROM p10_support_incidents WHERE case_id = $1 LIMIT 1`, [id]),
    ]);

    if (caseRes.rows.length === 0) {
      throw new NotFoundException({ code: 'CHAMADO_NAO_ENCONTRADO', message: 'Chamado não encontrado' });
    }

    const base = this.mapCase(caseRes.rows[0]);
    const inc = incidentRes.rows[0];

    return {
      ...base,
      interactions: interactionsRes.rows.map((i) => ({
        id: i.id,
        caseId: i.case_id,
        kind: i.kind,
        body: i.body,
        authorId: i.author_id,
        createdAt: i.created_at,
      })),
      incident: inc
        ? {
            id: inc.id,
            caseId: inc.case_id,
            severity: inc.severity,
            isMajor: Boolean(inc.is_major),
            serviceName: inc.service_name,
            status: inc.status,
            problemId: inc.problem_id,
            createdAt: inc.created_at,
          }
        : null,
    };
  }

  async addInteraction(
    caseId: string,
    body: { kind: string; body: string },
    actor: Actor,
    correlationId?: string
  ) {
    sacWrite(actor);
    const id = uid(caseId);
    const kind = choice(body?.kind, ['NOTA_INTERNA', 'RESPOSTA_CLIENTE']);
    const content = val(body?.body, 5, 4000);
    const interactionId = randomUUID();

    const created = await this.db.withTransaction(async (tx) => {
      const currentRes = await tx.query<{
        id: string;
        status: string;
        first_response_at: string | Date | null;
      }>(`SELECT id, status, first_response_at FROM p10_support_cases WHERE id = $1 FOR UPDATE`, [
        id,
      ]);
      const current = currentRes.rows[0];
      if (!current) {
        throw new NotFoundException({ code: 'CHAMADO_NAO_ENCONTRADO', message: 'Chamado não encontrado' });
      }
      if (current.status === 'FECHADO') {
        throw new ConflictException({ code: 'CHAMADO_FECHADO', message: 'Chamado fechado' });
      }

      const itRes = await tx.query<{
        id: string;
        case_id: string;
        kind: string;
        body: string;
        author_id: string;
        created_at: string | Date;
      }>(
        `INSERT INTO p10_support_interactions (id, case_id, kind, body, author_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [interactionId, current.id, kind, content, actor.userId]
      );

      if (kind === 'RESPOSTA_CLIENTE' && !current.first_response_at) {
        await tx.query(
          `UPDATE p10_support_cases SET first_response_at = NOW(), updated_at = NOW() WHERE id = $1`,
          [current.id]
        );
      }

      return itRes.rows[0];
    });

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'SAC_INTERACAO',
      resourceType: 'CHAMADO',
      resourceId: id,
      outcome: 'SUCCESS',
      correlationId: correlationId ?? `p10-sac-int-${created.id}`,
      afterState: { interactionId: created.id, kind },
    });

    return {
      id: created.id,
      caseId: created.case_id,
      kind: created.kind,
      body: created.body,
      authorId: created.author_id,
      createdAt: created.created_at,
    };
  }

  async transition(
    caseId: string,
    body: { status: string; reason: string },
    actor: Actor,
    correlationId?: string
  ) {
    sacWrite(actor);
    const id = uid(caseId);
    const next = choice(body?.status, Object.keys(SAC_FLOW)) as SacStatus;
    const reason = val(body?.reason, 5, 1000);

    const priorStatus = await this.db.withTransaction(async (tx) => {
      // $queryRaw FOR UPDATE equivalence
      const rows = await tx.query<{ id: string; status: string }>(
        `SELECT id, status FROM p10_support_cases WHERE id = $1 FOR UPDATE`,
        [id]
      );
      const prior = rows.rows[0];
      if (!prior) {
        throw new NotFoundException({ code: 'CHAMADO_NAO_ENCONTRADO', message: 'Chamado não encontrado' });
      }
      asConflict(() => checkTransition(SAC_FLOW, prior.status as SacStatus, next));

      if (next === 'RESOLVIDO') {
        await tx.query(
          `UPDATE p10_support_cases
           SET status = $1, version = version + 1, resolved_at = NOW(), updated_at = NOW()
           WHERE id = $2`,
          [next, prior.id]
        );
      } else if (next === 'FECHADO') {
        await tx.query(
          `UPDATE p10_support_cases
           SET status = $1, version = version + 1, closed_at = NOW(), updated_at = NOW()
           WHERE id = $2`,
          [next, prior.id]
        );
      } else if (prior.status === 'RESOLVIDO' && next === 'EM_ATENDIMENTO') {
        await tx.query(
          `UPDATE p10_support_cases
           SET status = $1, version = version + 1, resolved_at = NULL, updated_at = NOW()
           WHERE id = $2`,
          [next, prior.id]
        );
      } else {
        await tx.query(
          `UPDATE p10_support_cases
           SET status = $1, version = version + 1, updated_at = NOW()
           WHERE id = $2`,
          [next, prior.id]
        );
      }

      return prior.status;
    });

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'SAC_STATUS',
      resourceType: 'CHAMADO',
      resourceId: id,
      outcome: 'SUCCESS',
      justification: reason,
      correlationId: correlationId ?? `p10-sac-st-${id}`,
      beforeState: { status: priorStatus },
      afterState: { status: next },
    });

    return { id, status: next };
  }

  async assign(
    caseId: string,
    body: { assigneeId: string; queueId?: string },
    actor: Actor,
    correlationId?: string
  ) {
    requireInternal(actor, 'ADMIN', 'OPERACOES');
    const id = uid(caseId);
    const assigneeId = uid(body?.assigneeId);
    const queueId = body?.queueId ? uid(body.queueId) : undefined;

    const userRes = await this.db.query<{ id: string; status: string }>(
      `SELECT id, status FROM users WHERE id = $1`,
      [assigneeId]
    );
    const rolesRes = await this.db.query<{ role_code: string }>(
      `SELECT role_code FROM user_role_grants WHERE user_id = $1`,
      [assigneeId]
    );
    const user = userRes.rows[0];
    const normalizedRoles = rolesRes.rows.map((r) => normalizeRoleForPolicy(r.role_code));
    const isActive = user && ['ACTIVE', 'ATIVO'].includes(user.status);
    if (!isActive || !normalizedRoles.some((r) => ['SAC', 'OPERACOES'].includes(r))) {
      throw new ConflictException({ code: 'AGENTE_NAO_ELEGIVEL', message: 'Agente não elegível' });
    }

    if (queueId) {
      const qRes = await this.db.query<{ id: string; active: boolean; team_id: string | null }>(
        `SELECT id, active, team_id FROM p10_support_queues WHERE id = $1`,
        [queueId]
      );
      const q = qRes.rows[0];
      if (!q?.active) {
        throw new ConflictException({ code: 'FILA_INATIVA', message: 'Fila inativa' });
      }
      if (q.team_id) {
        const mRes = await this.db.query<{ id: string }>(
          `SELECT id FROM p10_support_team_members
           WHERE team_id = $1 AND user_id = $2 AND active = TRUE`,
          [q.team_id, assigneeId]
        );
        if (mRes.rows.length === 0) {
          throw new ConflictException({
            code: 'AGENTE_FORA_DA_EQUIPE',
            message: 'Agente não pertence à equipe da fila',
          });
        }
      }
    }

    await this.db.withTransaction(async (tx) => {
      const checkRes = await tx.query<{ id: string }>(
        `SELECT id FROM p10_support_cases WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (checkRes.rows.length === 0) {
        throw new NotFoundException({ code: 'CHAMADO_NAO_ENCONTRADO', message: 'Chamado não encontrado' });
      }
      if (queueId) {
        await tx.query(
          `UPDATE p10_support_cases SET assigned_to = $1, queue_id = $2, updated_at = NOW() WHERE id = $3`,
          [assigneeId, queueId, id]
        );
      } else {
        await tx.query(
          `UPDATE p10_support_cases SET assigned_to = $1, updated_at = NOW() WHERE id = $2`,
          [assigneeId, id]
        );
      }
    });

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'SAC_ATRIBUIDO',
      resourceType: 'CHAMADO',
      resourceId: id,
      outcome: 'SUCCESS',
      correlationId: correlationId ?? `p10-sac-asg-${id}`,
      afterState: { assignedTo: assigneeId, queueId },
    });

    return { id, assignedTo: assigneeId };
  }

  async policies(actor: Actor) {
    sacRead(actor);
    const res = await this.db.query<{
      id: string;
      category: string;
      priority: string;
      response_minutes: number;
      resolution_minutes: number;
      active: boolean;
      version: number;
      created_at: string | Date;
    }>(`SELECT * FROM p10_sla_policies ORDER BY version DESC, created_at DESC LIMIT 200`);
    return {
      items: res.rows.map((p) => ({
        id: p.id,
        category: p.category,
        priority: p.priority,
        responseMinutes: Number(p.response_minutes),
        resolutionMinutes: Number(p.resolution_minutes),
        active: Boolean(p.active),
        version: Number(p.version),
        createdAt: p.created_at,
      })),
    };
  }

  async newPolicy(
    body: {
      category: string;
      priority: string;
      responseMinutes: number;
      resolutionMinutes: number;
    },
    actor: Actor,
    correlationId?: string
  ) {
    requireInternal(actor, 'ADMIN');
    const category = choice(body?.category, CATEGORIES);
    const priority = choice(body?.priority, PRIORITIES);
    const responseMinutes = Number(body?.responseMinutes);
    const resolutionMinutes = Number(body?.resolutionMinutes);
    asConflict(() => calculateSla(new Date(), responseMinutes, resolutionMinutes));

    const id = randomUUID();
    const row = await this.db.withTransaction(async (tx) => {
      const prevRes = await tx.query<{ version: number }>(
        `SELECT version FROM p10_sla_policies
         WHERE category = $1 AND priority = $2
         ORDER BY version DESC LIMIT 1`,
        [category, priority]
      );
      const nextVersion = (prevRes.rows[0]?.version ? Number(prevRes.rows[0].version) : 0) + 1;
      await tx.query(
        `UPDATE p10_sla_policies SET active = FALSE WHERE category = $1 AND priority = $2 AND active = TRUE`,
        [category, priority]
      );
      const insRes = await tx.query<{
        id: string;
        category: string;
        priority: string;
        response_minutes: number;
        resolution_minutes: number;
        active: boolean;
        version: number;
        created_at: string | Date;
      }>(
        `INSERT INTO p10_sla_policies (
           id, category, priority, response_minutes, resolution_minutes, active, version
         ) VALUES ($1, $2, $3, $4, $5, TRUE, $6)
         RETURNING *`,
        [id, category, priority, responseMinutes, resolutionMinutes, nextVersion]
      );
      return insRes.rows[0];
    });

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'SLA_POLITICA',
      resourceType: 'SLA',
      resourceId: row.id,
      outcome: 'SUCCESS',
      correlationId: correlationId ?? `p10-sla-${row.id}`,
      afterState: { category, priority, version: Number(row.version), responseMinutes, resolutionMinutes },
    });

    return {
      id: row.id,
      category: row.category,
      priority: row.priority,
      responseMinutes: Number(row.response_minutes),
      resolutionMinutes: Number(row.resolution_minutes),
      active: Boolean(row.active),
      version: Number(row.version),
      createdAt: row.created_at,
    };
  }

  async teams(actor: Actor) {
    sacRead(actor);
    const [teamsRes, queuesRes] = await Promise.all([
      this.db.query<{
        id: string;
        name: string;
        active: boolean;
        created_at: string | Date;
      }>(`SELECT * FROM p10_support_teams ORDER BY created_at DESC LIMIT 100`),
      this.db.query<{
        id: string;
        name: string;
        team_id: string | null;
        active: boolean;
      }>(`SELECT * FROM p10_support_queues ORDER BY name ASC`),
    ]);

    return {
      items: teamsRes.rows.map((t) => ({
        id: t.id,
        name: t.name,
        active: Boolean(t.active),
        createdAt: t.created_at,
        queues: queuesRes.rows
          .filter((q) => q.team_id === t.id)
          .map((q) => ({
            id: q.id,
            name: q.name,
            teamId: q.team_id,
            active: Boolean(q.active),
          })),
      })),
    };
  }

  async newTeam(body: { name: string }, actor: Actor, correlationId?: string) {
    requireInternal(actor, 'ADMIN', 'OPERACOES');
    const name = val(body?.name, 3, 120);
    const id = randomUUID();

    const row = await this.db.withTransaction(async (tx) => {
      const dup = await tx.query<{ id: string }>(
        `SELECT id FROM p10_support_teams WHERE name = $1`,
        [name]
      );
      if (dup.rows.length > 0) {
        throw new ConflictException({ code: 'EQUIPE_JA_EXISTE', message: 'Equipe já cadastrada' });
      }
      const res = await tx.query<{
        id: string;
        name: string;
        active: boolean;
        created_at: string | Date;
      }>(
        `INSERT INTO p10_support_teams (id, name, active) VALUES ($1, $2, TRUE) RETURNING *`,
        [id, name]
      );
      return res.rows[0];
    });

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'SAC_EQUIPE_CRIADA',
      resourceType: 'EQUIPE',
      resourceId: row.id,
      outcome: 'SUCCESS',
      correlationId: correlationId ?? `p10-team-${row.id}`,
      afterState: { name: row.name },
    });

    return {
      id: row.id,
      name: row.name,
      active: Boolean(row.active),
      createdAt: row.created_at,
    };
  }

  async newQueue(body: { name: string; teamId?: string }, actor: Actor, correlationId?: string) {
    requireInternal(actor, 'ADMIN', 'OPERACOES');
    const name = val(body?.name, 3, 120);
    const teamId = body?.teamId ? uid(body.teamId) : null;
    const id = randomUUID();

    const row = await this.db.withTransaction(async (tx) => {
      if (teamId) {
        const teamRes = await tx.query<{ id: string }>(
          `SELECT id FROM p10_support_teams WHERE id = $1`,
          [teamId]
        );
        if (teamRes.rows.length === 0) {
          throw new NotFoundException({ code: 'EQUIPE_NAO_ENCONTRADA', message: 'Equipe não encontrada' });
        }
      }
      const dup = await tx.query<{ id: string }>(
        `SELECT id FROM p10_support_queues WHERE name = $1`,
        [name]
      );
      if (dup.rows.length > 0) {
        throw new ConflictException({ code: 'FILA_JA_EXISTE', message: 'Fila já cadastrada' });
      }
      const res = await tx.query<{
        id: string;
        name: string;
        team_id: string | null;
        active: boolean;
      }>(
        `INSERT INTO p10_support_queues (id, name, team_id, active)
         VALUES ($1, $2, $3, TRUE) RETURNING *`,
        [id, name, teamId]
      );
      return res.rows[0];
    });

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'SAC_FILA_CRIADA',
      resourceType: 'FILA',
      resourceId: row.id,
      outcome: 'SUCCESS',
      correlationId: correlationId ?? `p10-queue-${row.id}`,
      afterState: { name: row.name, teamId: row.team_id },
    });

    return {
      id: row.id,
      name: row.name,
      teamId: row.team_id,
      active: Boolean(row.active),
    };
  }

  async addMember(
    teamId: string,
    body: { userId: string },
    actor: Actor,
    correlationId?: string
  ) {
    requireInternal(actor, 'ADMIN', 'OPERACOES');
    const userId = uid(body?.userId);
    const team = uid(teamId);

    const userRes = await this.db.query<{ id: string; status: string }>(
      `SELECT id, status FROM users WHERE id = $1`,
      [userId]
    );
    const rolesRes = await this.db.query<{ role_code: string }>(
      `SELECT role_code FROM user_role_grants WHERE user_id = $1`,
      [userId]
    );
    const user = userRes.rows[0];
    const normalizedRoles = rolesRes.rows.map((r) => normalizeRoleForPolicy(r.role_code));
    const isActive = user && ['ACTIVE', 'ATIVO'].includes(user.status);
    if (!isActive || !normalizedRoles.includes('SAC')) {
      throw new ConflictException({
        code: 'USUARIO_NAO_SAC_ATIVO',
        message: 'Usuário deve ser SAC ativo',
      });
    }

    const row = await this.db.withTransaction(async (tx) => {
      const teamRes = await tx.query<{ id: string }>(
        `SELECT id FROM p10_support_teams WHERE id = $1`,
        [team]
      );
      if (teamRes.rows.length === 0) {
        throw new NotFoundException({ code: 'EQUIPE_NAO_ENCONTRADA', message: 'Equipe não encontrada' });
      }
      const memberId = randomUUID();
      const res = await tx.query<{
        id: string;
        team_id: string;
        user_id: string;
        active: boolean;
      }>(
        `INSERT INTO p10_support_team_members (id, team_id, user_id, active)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (team_id, user_id) DO UPDATE SET active = TRUE
         RETURNING *`,
        [memberId, team, userId]
      );
      return res.rows[0];
    });

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'SAC_EQUIPE_MEMBRO',
      resourceType: 'EQUIPE',
      resourceId: team,
      outcome: 'SUCCESS',
      correlationId: correlationId ?? `p10-member-${row.id}`,
      afterState: { userId },
    });

    return {
      id: row.id,
      teamId: row.team_id,
      userId: row.user_id,
      active: Boolean(row.active),
    };
  }

  async incident(
    caseId: string,
    body: { severity: string; serviceName: string; isMajor: boolean },
    actor: Actor,
    correlationId?: string
  ) {
    sacWrite(actor);
    const id = uid(caseId);
    const severity = choice(body?.severity, ['SEV1', 'SEV2', 'SEV3', 'SEV4']);
    const serviceName = val(body?.serviceName, 3, 140);
    if (typeof body?.isMajor !== 'boolean') {
      throw new BadRequestException({ code: 'IS_MAJOR_INVALIDO', message: 'isMajor inválido' });
    }

    const incidentId = randomUUID();
    const row = await this.db.withTransaction(async (tx) => {
      const cRes = await tx.query<{ id: string }>(
        `SELECT id FROM p10_support_cases WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (cRes.rows.length === 0) {
        throw new NotFoundException({ code: 'CHAMADO_NAO_ENCONTRADO', message: 'Chamado não encontrado' });
      }
      const existing = await tx.query<{ id: string }>(
        `SELECT id FROM p10_support_incidents WHERE case_id = $1`,
        [id]
      );
      if (existing.rows.length > 0) {
        throw new ConflictException({
          code: 'INCIDENTE_JA_EXISTE',
          message: 'Já existe incidente ITIL vinculado a este chamado',
        });
      }
      const res = await tx.query<{
        id: string;
        case_id: string;
        severity: string;
        is_major: boolean;
        service_name: string;
        status: string;
        problem_id: string | null;
        created_at: string | Date;
      }>(
        `INSERT INTO p10_support_incidents (id, case_id, severity, is_major, service_name, status)
         VALUES ($1, $2, $3, $4, $5, 'ABERTO')
         RETURNING *`,
        [incidentId, id, severity, body.isMajor, serviceName]
      );
      return res.rows[0];
    });

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'SAC_INCIDENTE',
      resourceType: 'INCIDENTE',
      resourceId: row.id,
      outcome: 'SUCCESS',
      correlationId: correlationId ?? `p10-inc-${row.id}`,
      afterState: { caseId: id, severity, isMajor: body.isMajor, serviceName },
    });

    return {
      id: row.id,
      caseId: row.case_id,
      severity: row.severity,
      isMajor: Boolean(row.is_major),
      serviceName: row.service_name,
      status: row.status,
      problemId: row.problem_id,
      createdAt: row.created_at,
    };
  }

  async problem(
    body: { title: string; rootCause?: string; workaround?: string },
    actor: Actor,
    correlationId?: string
  ) {
    requireInternal(actor, 'OPERACOES', 'ADMIN');
    const title = val(body?.title, 5, 180);
    const rootCause = body?.rootCause ? val(body.rootCause) : null;
    const workaround = body?.workaround ? val(body.workaround) : null;
    const id = randomUUID();

    const row = await this.db.withTransaction(async (tx) => {
      const res = await tx.query<{
        id: string;
        title: string;
        root_cause: string | null;
        workaround: string | null;
        status: string;
        created_by: string;
        created_at: string | Date;
      }>(
        `INSERT INTO p10_support_problems (id, title, root_cause, workaround, status, created_by)
         VALUES ($1, $2, $3, $4, 'INVESTIGACAO', $5)
         RETURNING *`,
        [id, title, rootCause, workaround, actor.userId]
      );
      return res.rows[0];
    });

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'SAC_PROBLEMA_CRIADO',
      resourceType: 'PROBLEMA',
      resourceId: row.id,
      outcome: 'SUCCESS',
      correlationId: correlationId ?? `p10-prob-${row.id}`,
      afterState: { title: row.title, status: row.status },
    });

    return {
      id: row.id,
      title: row.title,
      rootCause: row.root_cause,
      workaround: row.workaround,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
    };
  }

  async knowledge(actor: Actor) {
    sacRead(actor);
    const res = await this.db.query<{
      id: string;
      title: string;
      content: string;
      category: string;
      status: string;
      author_id: string;
      created_at: string | Date;
      updated_at: string | Date;
    }>(`SELECT * FROM p10_knowledge_articles ORDER BY created_at DESC LIMIT 100`);

    return {
      items: res.rows.map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        category: a.category,
        status: a.status,
        authorId: a.author_id,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      })),
    };
  }

  async newArticle(
    body: { title: string; content: string; category: string },
    actor: Actor,
    correlationId?: string
  ) {
    sacWrite(actor);
    const title = val(body?.title, 5, 180);
    const content = val(body?.content, 30, 12000);
    const category = val(body?.category, 3, 80);
    const id = randomUUID();

    const row = await this.db.withTransaction(async (tx) => {
      const res = await tx.query<{
        id: string;
        title: string;
        content: string;
        category: string;
        status: string;
        author_id: string;
        created_at: string | Date;
        updated_at: string | Date;
      }>(
        `INSERT INTO p10_knowledge_articles (id, title, content, category, status, author_id)
         VALUES ($1, $2, $3, $4, 'RASCUNHO', $5)
         RETURNING *`,
        [id, title, content, category, actor.userId]
      );
      return res.rows[0];
    });

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'SAC_ARTIGO_CRIADO',
      resourceType: 'ARTIGO',
      resourceId: row.id,
      outcome: 'SUCCESS',
      correlationId: correlationId ?? `p10-art-${row.id}`,
      afterState: { title: row.title, category: row.category, status: row.status },
    });

    return {
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      status: row.status,
      authorId: row.author_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async publishArticle(artId: string, actor: Actor, correlationId?: string) {
    requireInternal(actor, 'OPERACOES', 'ADMIN');
    const id = uid(artId);

    const row = await this.db.withTransaction(async (tx) => {
      const res = await tx.query<{
        id: string;
        title: string;
        content: string;
        category: string;
        status: string;
        author_id: string;
        created_at: string | Date;
        updated_at: string | Date;
      }>(
        `UPDATE p10_knowledge_articles
         SET status = 'PUBLICADO', updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );
      if (res.rows.length === 0) {
        throw new NotFoundException({ code: 'ARTIGO_NAO_ENCONTRADO', message: 'Artigo não encontrado' });
      }
      return res.rows[0];
    });

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'SAC_ARTIGO_PUBLICADO',
      resourceType: 'ARTIGO',
      resourceId: row.id,
      outcome: 'SUCCESS',
      correlationId: correlationId ?? `p10-art-pub-${row.id}`,
      afterState: { status: 'PUBLICADO' },
    });

    return {
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      status: row.status,
      authorId: row.author_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async csat(
    caseId: string,
    body: { score: number; comment?: string },
    actor: Actor,
    correlationId?: string
  ) {
    sacWrite(actor);
    const id = uid(caseId);
    if (!Number.isInteger(body?.score) || body.score < 1 || body.score > 5) {
      throw new BadRequestException({ code: 'CSAT_INVALIDO', message: 'CSAT de 1 a 5' });
    }
    const comment = body.comment ? val(body.comment, 5, 1000) : null;
    const csatId = randomUUID();

    const feedback = await this.db.withTransaction(async (tx) => {
      const rowRes = await tx.query<{ id: string; status: string }>(
        `SELECT id, status FROM p10_support_cases WHERE id = $1 FOR UPDATE`,
        [id]
      );
      const row = rowRes.rows[0];
      if (!row || row.status !== 'FECHADO') {
        throw new ConflictException({
          code: 'CSAT_SOMENTE_FECHADO',
          message: 'Avaliação somente para chamado fechado',
        });
      }
      const existing = await tx.query<{ id: string }>(
        `SELECT id FROM p10_support_satisfactions WHERE case_id = $1`,
        [id]
      );
      if (existing.rows.length > 0) {
        throw new ConflictException({
          code: 'CSAT_JA_REGISTRADO',
          message: 'Avaliação CSAT já registrada para este chamado',
        });
      }
      const res = await tx.query<{
        id: string;
        case_id: string;
        score: number;
        comment: string | null;
        created_at: string | Date;
      }>(
        `INSERT INTO p10_support_satisfactions (id, case_id, score, comment)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [csatId, row.id, body.score, comment]
      );
      return res.rows[0];
    });

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'SAC_CSAT_REGISTRADA',
      resourceType: 'CHAMADO',
      resourceId: id,
      outcome: 'SUCCESS',
      correlationId: correlationId ?? `p10-csat-${feedback.id}`,
      afterState: { score: Number(feedback.score) },
    });

    return {
      id: feedback.id,
      caseId: feedback.case_id,
      score: Number(feedback.score),
      comment: feedback.comment,
      createdAt: feedback.created_at,
    };
  }

  async incidents(actor: Actor) {
    sacRead(actor);
    const res = await this.db.query<{
      id: string;
      case_id: string;
      severity: string;
      is_major: boolean;
      service_name: string;
      status: string;
      problem_id: string | null;
      created_at: string | Date;
      protocol: string;
      subject: string;
    }>(
      `SELECT i.*, c.protocol, c.subject
       FROM p10_support_incidents i
       INNER JOIN p10_support_cases c ON c.id = i.case_id
       ORDER BY i.created_at DESC
       LIMIT 100`
    );

    return {
      items: res.rows.map((i) => ({
        id: i.id,
        caseId: i.case_id,
        severity: i.severity,
        isMajor: Boolean(i.is_major),
        serviceName: i.service_name,
        status: i.status,
        problemId: i.problem_id,
        createdAt: i.created_at,
        case: { protocol: i.protocol, subject: i.subject },
      })),
    };
  }

  async problems(actor: Actor) {
    sacRead(actor);
    const res = await this.db.query<{
      id: string;
      title: string;
      root_cause: string | null;
      workaround: string | null;
      status: string;
      created_by: string;
      created_at: string | Date;
    }>(`SELECT * FROM p10_support_problems ORDER BY created_at DESC LIMIT 100`);

    return {
      items: res.rows.map((p) => ({
        id: p.id,
        title: p.title,
        rootCause: p.root_cause,
        workaround: p.workaround,
        status: p.status,
        createdBy: p.created_by,
        createdAt: p.created_at,
      })),
    };
  }

  async incidentStatus(
    incidentId: string,
    body: { status: string; reason: string },
    actor: Actor,
    correlationId?: string
  ) {
    requireInternal(actor, 'OPERACOES', 'ADMIN');
    const id = uid(incidentId);
    const status = choice(body?.status, ['ABERTO', 'EM_TRATAMENTO', 'MONITORANDO', 'RESOLVIDO']);
    const reason = val(body?.reason, 5, 1000);

    const row = await this.db.withTransaction(async (tx) => {
      const res = await tx.query<{
        id: string;
        case_id: string;
        severity: string;
        is_major: boolean;
        service_name: string;
        status: string;
        problem_id: string | null;
        created_at: string | Date;
      }>(`UPDATE p10_support_incidents SET status = $1 WHERE id = $2 RETURNING *`, [status, id]);
      if (res.rows.length === 0) {
        throw new NotFoundException({
          code: 'INCIDENTE_NAO_ENCONTRADO',
          message: 'Incidente não encontrado',
        });
      }
      return res.rows[0];
    });

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'INCIDENTE_STATUS',
      resourceType: 'INCIDENTE',
      resourceId: row.id,
      outcome: 'SUCCESS',
      justification: reason,
      correlationId: correlationId ?? `p10-inc-st-${row.id}`,
      afterState: { status },
    });

    return {
      id: row.id,
      caseId: row.case_id,
      severity: row.severity,
      isMajor: Boolean(row.is_major),
      serviceName: row.service_name,
      status: row.status,
      problemId: row.problem_id,
      createdAt: row.created_at,
    };
  }

  async problemStatus(
    problemId: string,
    body: { status: string; reason: string },
    actor: Actor,
    correlationId?: string
  ) {
    requireInternal(actor, 'OPERACOES', 'ADMIN');
    const id = uid(problemId);
    const status = choice(body?.status, ['INVESTIGACAO', 'CAUSA_IDENTIFICADA', 'RESOLVIDO']);
    const reason = val(body?.reason, 5, 1000);

    const row = await this.db.withTransaction(async (tx) => {
      const res = await tx.query<{
        id: string;
        title: string;
        root_cause: string | null;
        workaround: string | null;
        status: string;
        created_by: string;
        created_at: string | Date;
      }>(`UPDATE p10_support_problems SET status = $1 WHERE id = $2 RETURNING *`, [status, id]);
      if (res.rows.length === 0) {
        throw new NotFoundException({
          code: 'PROBLEMA_NAO_ENCONTRADO',
          message: 'Problema não encontrado',
        });
      }
      return res.rows[0];
    });

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'PROBLEMA_STATUS',
      resourceType: 'PROBLEMA',
      resourceId: row.id,
      outcome: 'SUCCESS',
      justification: reason,
      correlationId: correlationId ?? `p10-prob-st-${row.id}`,
      afterState: { status },
    });

    return {
      id: row.id,
      title: row.title,
      rootCause: row.root_cause,
      workaround: row.workaround,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
    };
  }

  async metrics(actor: Actor) {
    sacRead(actor);
    const [openRes, overdueRes, closedRes, majorRes] = await Promise.all([
      this.db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM p10_support_cases WHERE status NOT IN ('RESOLVIDO', 'FECHADO')`
      ),
      this.db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM p10_support_cases
         WHERE status NOT IN ('RESOLVIDO', 'FECHADO') AND resolution_due_at < NOW()`
      ),
      this.db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM p10_support_cases WHERE status = 'FECHADO'`
      ),
      this.db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM p10_support_incidents WHERE is_major = TRUE AND status = 'ABERTO'`
      ),
    ]);

    return {
      open: Number(openRes.rows[0]?.count ?? 0),
      overdue: Number(overdueRes.rows[0]?.count ?? 0),
      closed: Number(closedRes.rows[0]?.count ?? 0),
      major: Number(majorRes.rows[0]?.count ?? 0),
      source: 'postgresql',
      clock: 'MINUTOS_CORRIDOS',
    };
  }

  private mapCase(r: any) {
    return {
      id: r.id,
      protocol: r.protocol,
      customerId: r.customer_id ?? null,
      orderId: r.order_id ?? null,
      queueId: r.queue_id ?? null,
      policyId: r.policy_id ?? null,
      subject: r.subject,
      description: r.description,
      category: r.category,
      channel: r.channel,
      priority: r.priority,
      status: r.status,
      assignedTo: r.assigned_to ?? null,
      createdBy: r.created_by,
      firstResponseDueAt: r.first_response_due_at ?? null,
      resolutionDueAt: r.resolution_due_at ?? null,
      firstResponseAt: r.first_response_at ?? null,
      resolvedAt: r.resolved_at ?? null,
      closedAt: r.closed_at ?? null,
      version: Number(r.version ?? 1),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
}
