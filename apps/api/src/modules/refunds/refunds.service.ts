import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../governance/audit.service';
import type { AuthenticatedActorDto } from '@bravo-ii/contracts';

@Injectable()
export class RefundsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditService: AuditService
  ) {}

  async approveRefundRequest(
    refundId: string,
    actor: AuthenticatedActorDto,
    correlationId: string
  ) {
    const res = await this.db.query<{
      id: string;
      event_id: string;
      requested_by: string;
      status: string;
      amount_cents: string | number;
    }>(
      `SELECT id, event_id, requested_by, status, amount_cents
       FROM refund_requests
       WHERE id = $1`,
      [refundId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundException({
        code: 'REFUND_REQUEST_NOT_FOUND',
        message: 'Solicitação de estorno não encontrada.',
      });
    }

    const row = res.rows[0];

    if (row.requested_by === actor.userId) {
      await this.auditService.record({
        actorUserId: actor.userId,
        actorRole: actor.roles.join(','),
        sessionId: actor.sessionId,
        canonicalAction: 'refund.approval.denied_self_approval',
        resourceType: 'RefundRequest',
        resourceId: refundId,
        eventId: row.event_id,
        outcome: 'DENIED',
        justification: 'Segregação de funções: o solicitante não pode aprovar o próprio pedido de estorno.',
        correlationId,
      });

      throw new ForbiddenException({
        code: 'SELF_APPROVAL_FORBIDDEN',
        message: 'Segregação de funções: você não pode aprovar uma solicitação de estorno aberta pelo seu próprio usuário.',
      });
    }

    if (!['SOLICITADO', 'AGUARDANDO_APROVACAO_FINANCEIRA'].includes(row.status)) {
      throw new BadRequestException({
        code: 'INVALID_REFUND_STATE_TRANSITION',
        message: `Não é possível aprovar solicitação no estado '${row.status}'.`,
      });
    }

    // Regra irrenunciável (docs/06-ESTADOS-EXCECOES.md):
    // Nunca marcar CONCLUIDO ao clicar em "Aprovar"; transiciona para APROVADO aguardando envio/callback do provedor.
    await this.db.query(
      `UPDATE refund_requests
       SET status = 'APROVADO', approved_by = $2, updated_at = NOW()
       WHERE id = $1`,
      [refundId, actor.userId]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'refund.request.approved_by_finance',
      resourceType: 'RefundRequest',
      resourceId: refundId,
      eventId: row.event_id,
      outcome: 'SUCCESS',
      justification: 'Aprovação financeira registrada; conclusão depende de confirmação externa do provedor.',
      correlationId,
      beforeState: { status: row.status },
      afterState: { status: 'APROVADO', approvedBy: actor.userId },
    });

    return {
      id: refundId,
      eventId: row.event_id,
      amountCents: Number(row.amount_cents),
      status: 'APROVADO',
      providerConfirmed: false,
      noticePtBr:
        'Aprovado pelo Financeiro Disk. O estorno NÃO está concluído até a confirmação comprovada do provedor de pagamento.',
    };
  }
}
