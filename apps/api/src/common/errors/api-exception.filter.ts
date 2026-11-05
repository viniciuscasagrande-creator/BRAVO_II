import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ensureCorrelationId } from '@bravo-ii/telemetry';
import type { StandardApiErrorEnvelope } from '@bravo-ii/contracts';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = ensureCorrelationId(request.headers['x-correlation-id']);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'Ocorreu um erro interno ao processar a solicitação.';
    let details: unknown[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resBody = exception.getResponse();
      if (typeof resBody === 'object' && resBody !== null) {
        const record = resBody as Record<string, unknown>;
        if (typeof record.code === 'string') {
          code = record.code;
        } else if (status === HttpStatus.UNAUTHORIZED) {
          code = 'UNAUTHORIZED';
        } else if (status === HttpStatus.FORBIDDEN) {
          code = 'FORBIDDEN';
        } else if (status === HttpStatus.NOT_FOUND) {
          code = 'RESOURCE_NOT_FOUND';
        } else if (status === HttpStatus.BAD_REQUEST) {
          code = 'BAD_REQUEST';
        }

        if (typeof record.message === 'string') {
          message = record.message;
        } else if (Array.isArray(record.message)) {
          message = record.message.join('; ');
          details = record.message;
        }

        if (Array.isArray(record.details)) {
          details = record.details;
        }
      } else if (typeof resBody === 'string') {
        message = resBody;
      }
    }

    const envelope: StandardApiErrorEnvelope = {
      error: {
        code,
        message,
        correlationId,
        details,
      },
    };

    response.setHeader('X-Correlation-Id', correlationId);
    response.status(status).json(envelope);
  }
}
