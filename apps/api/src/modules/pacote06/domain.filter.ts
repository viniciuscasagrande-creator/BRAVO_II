import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { DomainError } from '@bravo-ii/domain-p06';
import { ensureCorrelationId } from '@bravo-ii/telemetry';

@Catch(DomainError)
export class P06DomainErrorFilter implements ExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();
    const correlationId = ensureCorrelationId(req?.headers?.['x-correlation-id']);

    const forbiddenCodes = new Set(['PAPEL_TAXA', 'PAPEL_APROVACAO', 'AUTOAPROVACAO']);
    const conflictCodes = new Set(['EDICAO_BLOQUEADA', 'ESTADO_PUBLICACAO', 'ETAPA_FORA_ORDEM']);

    const status = forbiddenCodes.has(error.code)
      ? HttpStatus.FORBIDDEN
      : conflictCodes.has(error.code)
        ? HttpStatus.CONFLICT
        : HttpStatus.BAD_REQUEST;

    res.status(status).json({
      code: error.code,
      message: error.message,
      correlationId,
      error: {
        code: error.code,
        message: error.message,
        correlationId,
        details: [],
      },
    });
  }
}
