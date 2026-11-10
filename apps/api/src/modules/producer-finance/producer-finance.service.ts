import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedActorDto } from '@bravo-ii/contracts';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../governance/audit.service';

const publicTypes = ['VENDA_INGRESSO_BRUTA', 'OBRIGACAO_PRODUTOR', 'REPASSE_PRODUTOR', 'RESERVA_ESTORNO'];
const labels: Record<string, string> = {
  VENDA_INGRESSO_BRUTA: 'Venda bruta registrada', OBRIGACAO_PRODUTOR: 'Obrigação com produtor registrada',
  REPASSE_PRODUTOR: 'Repasse registrado', RESERVA_ESTORNO: 'Reserva para estorno registrada',
};
interface LedgerRow { id: string; entry_type: string; amount_cents: string; occurred_at: Date | string }
@Injectable()
export class ProducerFinanceService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}
  async statement(actor: AuthenticatedActorDto, eventId: string, correlationId: string, offset = 0) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)) {
      throw new BadRequestException('Identificador do evento inválido.');
    }
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) throw new BadRequestException('Página inválida.');
    const producerIds = actor.producerScopeIds;
    const permitted = actor.roles.includes('PRODUTOR_PDT') && actor.permissions.includes('pdt:portal-read') && producerIds.length > 0;
    const allowed = permitted ? await this.db.query<{ id: string }>(
      `SELECT e.id FROM events e WHERE e.id = $1 AND EXISTS (
        SELECT 1 FROM event_producers ep WHERE ep.event_id=e.id AND ep.producer_id=ANY($2::uuid[])
      )`, [eventId, producerIds]) : { rows: [] };
    if (!allowed.rows.length) {
      await this.audit.record({actorUserId:actor.userId, actorRole:actor.roles.join(','), sessionId:actor.sessionId,
        canonicalAction:'producer.finance.read', resourceType:'producer_finance', outcome:'DENIED', origin:'PDT', correlationId});
      throw new ForbiddenException('Consulta financeira não autorizada para este evento.');
    }
    // Apenas lançamentos do próprio produtor vinculado ao evento. Nenhum SELECT * nem descrição livre.
    // NULL producer_id não é atribuído por suposição. Uma linha de outro coprodutor nunca é incluída.
    const filter = `FROM finance_ledger_entries l WHERE l.event_id=$1 AND l.producer_id=ANY($2::uuid[])
      AND l.entry_type=ANY($3::varchar[]) AND EXISTS (
        SELECT 1 FROM event_producers ep WHERE ep.event_id=l.event_id AND ep.producer_id=l.producer_id)`;
    const result = await this.db.withTransaction(async tx => {
      await tx.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      const totals = await tx.query<{ entry_type:string; amount_cents:string; count:string }>(
        `SELECT l.entry_type, SUM(l.amount_cents)::text AS amount_cents, COUNT(*)::text AS count ${filter} GROUP BY l.entry_type`,
        [eventId, producerIds, publicTypes]);
      const entries = await tx.query<LedgerRow>(
        `SELECT l.id, l.entry_type, l.amount_cents::text AS amount_cents, l.occurred_at ${filter}
         ORDER BY l.occurred_at DESC, l.id DESC LIMIT 51 OFFSET $4`, [eventId, producerIds, publicTypes, offset]);
      const amounts = Object.fromEntries(totals.rows.map(row=>[row.entry_type,row.amount_cents]));
      return {
        eventId, currency:'BRL' as const, source:'finance_ledger_entries' as const,
        coverage:'REGISTROS_ATRIBUIDOS_AO_PRODUTOR' as const,
        recordedGrossCents:amounts.VENDA_INGRESSO_BRUTA ?? null,
        recordedObligationCents:amounts.OBRIGACAO_PRODUTOR ?? null,
        recordedPayoutsCents:amounts.REPASSE_PRODUTOR ?? null,
        recordedRefundReservesCents:amounts.RESERVA_ESTORNO ?? null,
        receivedCents:null, availableCents:null,
        balanceStatus:'NAO_APURADO' as const, payoutRequestsEnabled:false as const,
        items:entries.rows.slice(0,50).map(row=>({id:row.id,label:labels[row.entry_type],amountCents:row.amount_cents,
          occurredAt:row.occurred_at instanceof Date ? row.occurred_at.toISOString() : row.occurred_at})),
        nextOffset:entries.rows.length>50 ? offset+50 : null,
      };
    });
    await this.audit.record({actorUserId:actor.userId,actorRole:actor.roles.join(','),sessionId:actor.sessionId,
      canonicalAction:'producer.finance.read',resourceType:'producer_finance',eventId,resourceId:eventId,
      outcome:'SUCCESS',origin:'PDT',correlationId});
    return result;
  }
}
