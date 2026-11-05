import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import {
  CreateRhEmployeeRequestSchema,
  CreateRhGeofenceRequestSchema,
  CreateRhPaymentBatchRequestSchema,
  RecordTimePunchRequestSchema,
  type AuthenticatedActorDto,
  type CreateRhEmployeeRequestDto,
  type CreateRhGeofenceRequestDto,
  type CreateRhPaymentBatchRequestDto,
  type RecordTimePunchRequestDto,
  type RhEmployeeDto,
  type RhGeofenceDto,
  type RhPaymentBatchDto,
  type RhTimePunchDto,
} from '@bravo-ii/contracts';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../governance/audit.service';
import { FinanceService } from '../finance/finance.service';

@Injectable()
export class RhService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly financeService: FinanceService
  ) {}

  private normalizeCpfDigits(rawCpf: string): string {
    return rawCpf.replace(/\D/g, '');
  }

  private maskCpf(digits: string): string {
    return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
  }

  private hashCpf(digits: string): string {
    return createHash('sha256').update(`bravo-rh-cpf:${digits}`).digest('hex');
  }

  /**
   * Calcula distância Haversine em metros entre duas coordenadas GPS.
   */
  public calculateHaversineDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // raio médio da Terra em metros
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  private mapEmployeeRow(
    row: Record<string, unknown>,
    actor: AuthenticatedActorDto
  ): RhEmployeeDto {
    const canSeeIndividualSalary =
      actor.permissions.includes('rh:write') ||
      actor.roles.includes('ADMIN_BRAVO') ||
      actor.roles.includes('RH_DP_DISK');

    const rawContract = String(row.contract_type);
    const contractType: RhEmployeeDto['contractType'] =
      rawContract === 'TEMPORARIO_EVENTO'
        ? 'INTERMITENTE'
        : rawContract === 'FREELANCER'
          ? 'FREELANCER_EVENTO'
          : (rawContract as RhEmployeeDto['contractType']);

    const createdAtIso =
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at);

    return {
      id: String(row.id),
      matricula: String(row.matricula),
      fullName: String(row.full_name),
      cpfMasked: String(row.cpf_masked),
      email: String(row.email),
      contractType,
      department: String(row.department_name),
      roleTitle: String(row.role_title),
      baseSalaryCents: canSeeIndividualSalary ? Number(row.base_salary_cents) : null,
      defaultCostCenterId: null,
      status: String(row.status),
      admittedAt: createdAtIso.slice(0, 10),
      createdAt: createdAtIso,
    };
  }

  async listEmployees(actor: AuthenticatedActorDto): Promise<RhEmployeeDto[]> {
    const res = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM rh_employees ORDER BY created_at DESC`
    );
    return res.rows.map((r) => this.mapEmployeeRow(r, actor));
  }

  async createEmployee(
    actor: AuthenticatedActorDto,
    rawPayload: CreateRhEmployeeRequestDto,
    correlationId: string
  ): Promise<RhEmployeeDto> {
    const parsed = CreateRhEmployeeRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_RH_EMPLOYEE_PAYLOAD',
        message: parsed.error.issues[0]?.message ?? 'Dados de colaborador inválidos.',
        details: parsed.error.issues,
      });
    }

    const data = parsed.data;
    const cpfDigits = this.normalizeCpfDigits(data.cpf);
    if (cpfDigits.length !== 11) {
      throw new BadRequestException({
        code: 'INVALID_EMPLOYEE_CPF',
        message: 'O CPF do colaborador deve conter 11 dígitos.',
      });
    }

    const cpfHash = this.hashCpf(cpfDigits);
    const cpfMasked = this.maskCpf(cpfDigits);

    const existing = await this.db.query(
      `SELECT id FROM rh_employees WHERE matricula = $1 OR cpf_hash = $2`,
      [data.matricula.toUpperCase(), cpfHash]
    );
    if (existing.rows.length > 0) {
      throw new ConflictException({
        code: 'EMPLOYEE_ALREADY_EXISTS',
        message: 'Já existe colaborador cadastrado com esta matrícula ou CPF.',
      });
    }

    const dbContractType =
      data.contractType === 'INTERMITENTE'
        ? 'TEMPORARIO_EVENTO'
        : data.contractType === 'FREELANCER_EVENTO'
          ? 'FREELANCER'
          : data.contractType;

    const id = randomUUID();
    const res = await this.db.query<Record<string, unknown>>(
      `INSERT INTO rh_employees (
         id, matricula, cpf_hash, cpf_masked, full_name, email,
         contract_type, department_name, role_title, base_salary_cents,
         status, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE', $11)
       RETURNING *`,
      [
        id,
        data.matricula.toUpperCase(),
        cpfHash,
        cpfMasked,
        data.fullName,
        data.email.toLowerCase(),
        dbContractType,
        data.department,
        data.roleTitle,
        data.baseSalaryCents,
        actor.userId,
      ]
    );

    await this.audit.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      canonicalAction: 'rh.employee.created',
      resourceType: 'rh_employee',
      resourceId: id,
      outcome: 'SUCCESS',
      justification: `Colaborador ${data.matricula.toUpperCase()} (${data.contractType}) admitido no cadastro canônico RH (PII mascarada).`,
      correlationId,
    });

    return this.mapEmployeeRow(res.rows[0], actor);
  }

  private mapGeofenceRow(row: Record<string, unknown>): RhGeofenceDto {
    return {
      id: String(row.id),
      code: String(row.code),
      name: String(row.name),
      eventId: row.event_id ? String(row.event_id) : null,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      radiusMeters: Number(row.radius_meters),
      isActive: Boolean(row.is_active),
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
    };
  }

  async listGeofences(): Promise<RhGeofenceDto[]> {
    const res = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM rh_geofences ORDER BY code ASC`
    );
    return res.rows.map((r) => this.mapGeofenceRow(r));
  }

  async createGeofence(
    actor: AuthenticatedActorDto,
    rawPayload: CreateRhGeofenceRequestDto,
    correlationId: string
  ): Promise<RhGeofenceDto> {
    const parsed = CreateRhGeofenceRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_GEOFENCE_PAYLOAD',
        message: parsed.error.issues[0]?.message ?? 'Dados de cerca virtual inválidos.',
        details: parsed.error.issues,
      });
    }

    const data = parsed.data;
    const id = randomUUID();
    const res = await this.db.query<Record<string, unknown>>(
      `INSERT INTO rh_geofences (id, code, name, event_id, latitude, longitude, radius_meters, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
       RETURNING *`,
      [
        id,
        data.code.toUpperCase(),
        data.name,
        data.eventId ?? null,
        data.latitude,
        data.longitude,
        data.radiusMeters,
      ]
    );

    await this.audit.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      canonicalAction: 'rh.geofence.created',
      resourceType: 'rh_geofence',
      resourceId: id,
      eventId: data.eventId ?? null,
      outcome: 'SUCCESS',
      justification: `Cerca virtual Disk Ponto ${data.code.toUpperCase()} (${data.radiusMeters}m) configurada.`,
      correlationId,
    });

    return this.mapGeofenceRow(res.rows[0]);
  }

  private mapTimePunchRow(row: Record<string, unknown>): RhTimePunchDto {
    const rawPunchType = String(row.punch_type);
    const punchType: RhTimePunchDto['punchType'] =
      rawPunchType === 'INICIO_INTERVALO'
        ? 'PAUSA_INICIO'
        : rawPunchType === 'FIM_INTERVALO'
          ? 'PAUSA_FIM'
          : (rawPunchType as RhTimePunchDto['punchType']);

    const rawVal = String(row.validation_status);
    const validationStatus: RhTimePunchDto['validationStatus'] =
      rawVal === 'PENDENTE_ANALISE'
        ? 'BAIXA_PRECISAO'
        : rawVal === 'OFFLINE_SINCRONIZADA'
          ? 'VALIDADA'
          : (rawVal as RhTimePunchDto['validationStatus']);

    const recordedAtIso =
      row.recorded_at instanceof Date
        ? row.recorded_at.toISOString()
        : String(row.recorded_at);

    return {
      id: String(row.id),
      nsr: Number(row.nsr),
      employeeId: String(row.employee_id),
      geofenceId: row.geofence_id ? String(row.geofence_id) : null,
      punchType,
      recordedAt: recordedAtIso,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      accuracyMeters: 10,
      distanceMeters: Number(row.distance_meters),
      validationStatus,
      authenticityHash: String(row.authenticity_hash),
      idempotencyKey: String(row.idempotency_key),
      createdAt: recordedAtIso,
    };
  }

  async listTimePunches(): Promise<RhTimePunchDto[]> {
    const res = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM rh_time_punches ORDER BY nsr DESC`
    );
    return res.rows.map((r) => this.mapTimePunchRow(r));
  }

  async recordTimePunch(
    actor: AuthenticatedActorDto,
    rawPayload: RecordTimePunchRequestDto,
    correlationId: string
  ): Promise<RhTimePunchDto> {
    const parsed = RecordTimePunchRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_TIME_PUNCH_PAYLOAD',
        message: parsed.error.issues[0]?.message ?? 'Dados de marcação de ponto inválidos.',
        details: parsed.error.issues,
      });
    }

    const data = parsed.data;

    // Idempotência para sincronização da fila offline do app Disk Ponto
    const existingPunch = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM rh_time_punches WHERE idempotency_key = $1 LIMIT 1`,
      [data.idempotencyKey]
    );
    if (existingPunch.rows.length > 0) {
      return this.mapTimePunchRow(existingPunch.rows[0]);
    }

    const empRes = await this.db.query(`SELECT id FROM rh_employees WHERE id = $1`, [
      data.employeeId,
    ]);
    if (empRes.rows.length === 0) {
      throw new NotFoundException({
        code: 'RH_EMPLOYEE_NOT_FOUND',
        message: 'Colaborador não encontrado para registro de ponto.',
      });
    }

    const geoRes = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM rh_geofences WHERE id = $1`,
      [data.geofenceId]
    );
    if (geoRes.rows.length === 0) {
      throw new NotFoundException({
        code: 'RH_GEOFENCE_NOT_FOUND',
        message: 'Cerca virtual (Geofence) não encontrada.',
      });
    }

    const geofence = geoRes.rows[0];
    const distanceMeters = this.calculateHaversineDistanceMeters(
      data.latitude,
      data.longitude,
      Number(geofence.latitude),
      Number(geofence.longitude)
    );

    let dbValidationStatus: 'VALIDADA' | 'FORA_DA_AREA' | 'PENDENTE_ANALISE' = 'VALIDADA';
    if (data.accuracyMeters > 100) {
      dbValidationStatus = 'PENDENTE_ANALISE';
    } else if (distanceMeters > Number(geofence.radius_meters)) {
      dbValidationStatus = 'FORA_DA_AREA';
    }

    const dbPunchType =
      data.punchType === 'PAUSA_INICIO'
        ? 'INICIO_INTERVALO'
        : data.punchType === 'PAUSA_FIM'
          ? 'FIM_INTERVALO'
          : data.punchType;

    const recordedAt = new Date().toISOString();
    const authenticityHash = createHash('sha256')
      .update(
        `REP-P-671|${data.employeeId}|${dbPunchType}|${recordedAt}|${data.latitude}|${data.longitude}|${dbValidationStatus}`
      )
      .digest('hex');

    const id = randomUUID();
    const insertedRes = await this.db.query<Record<string, unknown>>(
      `INSERT INTO rh_time_punches (
         id, employee_id, geofence_id, punch_type, latitude, longitude,
         distance_meters, validation_status, idempotency_key, authenticity_hash, recorded_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        id,
        data.employeeId,
        data.geofenceId,
        dbPunchType,
        data.latitude,
        data.longitude,
        distanceMeters,
        dbValidationStatus,
        data.idempotencyKey,
        authenticityHash,
        recordedAt,
      ]
    );

    const mapped = this.mapTimePunchRow(insertedRes.rows[0]);

    await this.audit.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      canonicalAction: `rh.time_punch.recorded:${mapped.validationStatus.toLowerCase()}`,
      resourceType: 'rh_time_punch',
      resourceId: id,
      eventId: geofence.event_id ? String(geofence.event_id) : null,
      outcome: 'SUCCESS',
      justification: `Ponto NSR #${mapped.nsr} (${data.punchType}) registrado a ${distanceMeters}m da cerca ${String(geofence.code)} -> ${mapped.validationStatus}.`,
      correlationId,
    });

    return mapped;
  }

  async listPaymentBatches(): Promise<RhPaymentBatchDto[]> {
    return this.financeService.listRhPaymentBatchesForFinance();
  }

  async createPaymentBatch(
    actor: AuthenticatedActorDto,
    rawPayload: CreateRhPaymentBatchRequestDto,
    correlationId: string
  ): Promise<RhPaymentBatchDto> {
    const parsed = CreateRhPaymentBatchRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_RH_PAYMENT_BATCH_PAYLOAD',
        message: parsed.error.issues[0]?.message ?? 'Dados de lote de pagamento RH inválidos.',
        details: parsed.error.issues,
      });
    }

    const data = parsed.data;

    // Validar centro de custo e segregação Folha Corporativa vs Equipe de Evento
    const ccRes = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM finance_cost_centers WHERE id = $1`,
      [data.costCenterId]
    );
    if (ccRes.rows.length === 0) {
      throw new NotFoundException({
        code: 'COST_CENTER_NOT_FOUND',
        message: 'Centro de custo informado não existe no Financeiro.',
      });
    }

    const cc = ccRes.rows[0];
    if (data.originType === 'FOLHA' && String(cc.center_type) !== 'CORPORATIVO_RH') {
      throw new BadRequestException({
        code: 'INVALID_COST_CENTER_FOR_PAYROLL',
        message:
          'Folha corporativa (FOLHA) deve apropriar exclusivamente em centro de custo do tipo CORPORATIVO_RH, sem misturar custo de evento.',
      });
    }

    if (data.originType === 'EQUIPE_EVENTO' && String(cc.center_type) !== 'EVENTO_STAFF') {
      throw new BadRequestException({
        code: 'INVALID_COST_CENTER_FOR_EVENT_STAFF',
        message:
          'Lote de Equipe de Evento (EQUIPE_EVENTO) deve apropriar em centro de custo do tipo EVENTO_STAFF vinculado ao evento.',
      });
    }

    const existingBatch = await this.db.query(
      `SELECT id FROM rh_payment_batches WHERE batch_code = $1`,
      [data.batchCode.toUpperCase()]
    );
    if (existingBatch.rows.length > 0) {
      throw new ConflictException({
        code: 'RH_PAYMENT_BATCH_CODE_EXISTS',
        message: `Já existe um lote RH com o código ${data.batchCode.toUpperCase()}.`,
      });
    }

    const id = randomUUID();
    const totalizationHash = createHash('sha256')
      .update(
        `RH-BATCH|${data.batchCode.toUpperCase()}|${data.originType}|${data.competencia}|${data.costCenterId}|${data.headcount}|${data.netAmountCents}`
      )
      .digest('hex');

    const insertedRes = await this.db.query<Record<string, unknown>>(
      `INSERT INTO rh_payment_batches (
         id, company_code, batch_code, batch_type, competencia, cost_center_id, event_id,
         headcount, total_amount_cents, totalization_hash, idempotency_key,
         status, requested_by_user_id
       ) VALUES ($1, 'DISKINGRESSOS', $2, $3, $4, $5, $6, $7, $8, $9, $10, 'AGUARDANDO_FINANCEIRO', $11)
       RETURNING *`,
      [
        id,
        data.batchCode.toUpperCase(),
        data.originType,
        data.competencia,
        data.costCenterId,
        data.eventId ?? null,
        data.headcount,
        data.netAmountCents,
        totalizationHash,
        `rh-batch-${data.batchCode.toUpperCase()}`,
        actor.userId,
      ]
    );

    // Emitir evento canônico na outbox (rh.pagamento_aprovado.v1) SEM PII/CPF/dados médicos/salários individuais
    const outboxPayload = {
      eventVersion: 'v1',
      eventType: 'rh.pagamento_aprovado.v1',
      batchId: id,
      batchCode: data.batchCode.toUpperCase(),
      originType: data.originType,
      competencia: data.competencia,
      costCenterId: data.costCenterId,
      costCenterCode: String(cc.code),
      eventId: data.eventId ?? null,
      headcount: data.headcount,
      grossAmountCents: data.grossAmountCents,
      deductionsAmountCents: data.deductionsAmountCents,
      encargosAmountCents: data.encargosAmountCents,
      netAmountCents: data.netAmountCents,
      totalizationHash,
      requestedByUserId: actor.userId,
      containsIndividualSalaryPii: false,
    };

    await this.db.query(
      `INSERT INTO outbox_events (
         id, event_name, schema_version, aggregate_type, aggregate_id,
         correlation_id, event_id, payload, status
       ) VALUES ($1, 'rh.pagamento_aprovado.v1', 1, 'rh_payment_batch', $2, $3, $4, $5::jsonb, 'PENDING')`,
      [
        randomUUID(),
        id,
        correlationId,
        data.eventId ?? null,
        JSON.stringify(outboxPayload),
      ]
    );

    await this.audit.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      canonicalAction: 'rh.payment_batch.submitted_to_finance',
      resourceType: 'rh_payment_batch',
      resourceId: id,
      eventId: data.eventId ?? null,
      outcome: 'SUCCESS',
      justification: `Lote RH ${data.batchCode.toUpperCase()} (${data.originType} - Comp. ${data.competencia}) enviado à fila do Financeiro (AGUARDANDO_FINANCEIRO) via contrato rh.pagamento_aprovado.v1 sem PII.`,
      correlationId,
    });

    const mapped = this.financeService.mapRhPaymentBatchRow({
      ...insertedRes.rows[0],
      cost_center_code: cc.code,
    });
    return {
      ...mapped,
      grossAmountCents: data.grossAmountCents,
      deductionsAmountCents: data.deductionsAmountCents,
      encargosAmountCents: data.encargosAmountCents,
      netAmountCents: data.netAmountCents,
      notesPtBr: data.notesPtBr ?? null,
    };
  }
}
