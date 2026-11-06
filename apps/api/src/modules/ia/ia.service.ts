import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedActorDto } from '@bravo-ii/contracts';
import {
  AI_LIMIT_DAY,
  AI_LIMIT_MINUTE,
  aiSystemInstruction,
  validateAiEnvironment,
  validateAiQuestion,
  type AiArea,
} from '@bravo-ii/domain-ia';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../governance/audit.service';

const GOOGLE_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/';

@Injectable()
export class BravoIaService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditService: AuditService
  ) {}

  private resolvedApiKey(): string {
    return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  }

  private resolvedEnv(): Record<string, string | undefined> {
    return {
      ...process.env,
      GEMINI_API_KEY: this.resolvedApiKey(),
    };
  }

  isReady(): boolean {
    return (
      process.env.BRAVO_GEMINI_ENABLED === 'true' &&
      validateAiEnvironment(this.resolvedEnv()).length === 0
    );
  }

  private async consumeQuota(actorId: string, now: Date): Promise<void> {
    // Contagem atômica no banco compartilhado (bravoAiQuotaWindow / p12_ai_quota_windows):
    // nenhum rate limiter apenas em memória de Functions.
    const minute = new Date(now);
    minute.setUTCSeconds(0, 0);
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    await this.db.withTransaction(async (tx) => {
      const minRes = await tx.query<{ requests: number }>(
        `INSERT INTO p12_ai_quota_windows (actor_id, bucket, window_start, requests)
         VALUES ($1, 'MINUTO', $2, 1)
         ON CONFLICT (actor_id, bucket, window_start)
         DO UPDATE SET requests = p12_ai_quota_windows.requests + 1
         RETURNING requests`,
        [actorId, minute.toISOString()]
      );

      const dayRes = await tx.query<{ requests: number }>(
        `INSERT INTO p12_ai_quota_windows (actor_id, bucket, window_start, requests)
         VALUES ($1, 'DIA', $2, 1)
         ON CONFLICT (actor_id, bucket, window_start)
         DO UPDATE SET requests = p12_ai_quota_windows.requests + 1
         RETURNING requests`,
        [actorId, day.toISOString()]
      );

      if (
        Number(minRes.rows[0]?.requests ?? 0) > AI_LIMIT_MINUTE ||
        Number(dayRes.rows[0]?.requests ?? 0) > AI_LIMIT_DAY
      ) {
        throw new HttpException(
          'Limite de consultas atingido. Tente novamente mais tarde.',
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
    });
  }

  async answer(actor: AuthenticatedActorDto, area: AiArea, rawQuestion: unknown, correlationId?: string) {
    if (!this.isReady()) {
      throw new ServiceUnavailableException('IA de homologação indisponível');
    }

    let question: string;
    try {
      question = validateAiQuestion(rawQuestion);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    await this.consumeQuota(actor.userId, new Date());

    const reqId = correlationId || randomUUID();
    const model = process.env.GEMINI_MODEL!;
    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'IA_CONSULTA',
      resourceType: 'IA',
      resourceId: reqId,
      outcome: 'SUCCESS',
      correlationId: reqId,
      afterState: {
        area,
        modelo: model,
        caracteres: question.length,
        status: 'SOLICITADA',
      },
    });

    try {
      const result = await fetch(`${GOOGLE_ENDPOINT}${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.resolvedApiKey(),
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: aiSystemInstruction(area) }] },
          contents: [{ role: 'user', parts: [{ text: question }] }],
          generationConfig: { maxOutputTokens: 700 },
        }),
        signal: AbortSignal.timeout(20000),
        cache: 'no-store',
      });

      if (result.status === 429) {
        throw new HttpException(
          'Gemini está com limite de utilização. Tente novamente mais tarde.',
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
      if (!result.ok) {
        throw new BadGatewayException(
          'O serviço de IA não respondeu. Verifique a API Google no ambiente Preview.'
        );
      }

      const payload = (await result.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const answer = (payload.candidates?.[0]?.content?.parts || [])
        .map((x) => x.text || '')
        .join('')
        .trim();
      if (!answer) {
        throw new BadGatewayException('Gemini não retornou resposta de texto.');
      }

      await this.auditService.record({
        actorUserId: actor.userId,
        actorRole: actor.roles.join(','),
        sessionId: actor.sessionId,
        canonicalAction: 'IA_RESPOSTA',
        resourceType: 'IA',
        resourceId: reqId,
        outcome: 'SUCCESS',
        correlationId: reqId,
        afterState: {
          status: 'CONCLUIDA',
          caracteres: answer.length,
        },
      });

      return {
        resposta: answer,
        area,
        modelo: model,
        aviso: 'Resposta de apoio. Não autoriza nem executa operações no ERP.',
      };
    } catch (error) {
      await this.auditService
        .record({
          actorUserId: actor.userId,
          actorRole: actor.roles.join(','),
          sessionId: actor.sessionId,
          canonicalAction: 'IA_FALHA',
          resourceType: 'IA',
          resourceId: reqId,
          outcome: 'FAILURE',
          correlationId: reqId,
          afterState: { status: 'FALHA' },
        })
        .catch(() => {});

      if (
        (error instanceof HttpException && error.getStatus() === 429) ||
        error instanceof BadGatewayException
      ) {
        throw error;
      }
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new GatewayTimeoutException('Tempo limite do serviço Gemini.');
      }
      throw new BadGatewayException('Não foi possível consultar a IA neste momento.');
    }
  }
}
