import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ensureCorrelationId } from '@bravo-ii/telemetry';
import { AI_AREAS, canUseAiArea } from '@bravo-ii/domain-ia';
import { AuthGuard, type AuthenticatedRequest } from '../../common/auth/auth.guard';
import { BravoIaService } from './ia.service';

@Controller('v1/ia')
@UseGuards(AuthGuard)
export class BravoIaController {
  constructor(private readonly ia: BravoIaService) {}

  @Get('status')
  status(@Req() req: AuthenticatedRequest) {
    const actor = req.actor!;
    const areas = AI_AREAS.filter((a) => canUseAiArea(actor.roles, a));
    return {
      habilitada: this.ia.isReady(),
      areas,
      modo: 'ASSISTENTE_SOMENTE_LEITURA',
      dadosReais: false,
    };
  }

  @Post('consultar')
  async consultar(
    @Req() req: AuthenticatedRequest,
    @Body() body: { area?: unknown; pergunta?: unknown }
  ) {
    const actor = req.actor!;
    if (!body || !canUseAiArea(actor.roles, body.area)) {
      throw new ForbiddenException('Área de inteligência artificial não autorizada');
    }
    if (!this.ia.isReady()) {
      throw new ServiceUnavailableException('IA ainda não configurada em homologação');
    }
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.ia.answer(actor, body.area, body.pergunta, correlationId);
  }
}
