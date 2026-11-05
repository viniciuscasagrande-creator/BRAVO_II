import type { EventSummaryViewDto } from '@bravo-ii/contracts';
import { BravoApiClient } from '@bravo-ii/sdk';

export interface PdtSafeEventProjection {
  id: string;
  code: string;
  title: string;
  venueName: string;
  city: string;
  stateUf: string;
  timezone: string;
  status: string;
  startsAt: string;
}

/**
 * Adaptador BFF para o Portal do Produtor (PDT).
 * Garante em camada dupla que nenhuma propriedade de Taxa Disk contratual interna seja serializada para o PDT.
 */
export function sanitizeEventForPdt(event: EventSummaryViewDto): PdtSafeEventProjection {
  return {
    id: event.id,
    code: event.code,
    title: event.title,
    venueName: event.venueName,
    city: event.city,
    stateUf: event.stateUf,
    timezone: event.timezone,
    status: event.status,
    startsAt: event.startsAt,
  };
}

export class PdtPortalAdapter {
  private readonly client: BravoApiClient;

  constructor(baseUrl: string, producerSessionToken: string) {
    this.client = new BravoApiClient({ baseUrl, sessionToken: producerSessionToken });
  }

  async listScopedProducerEvents(): Promise<PdtSafeEventProjection[]> {
    const response = await this.client.listAuthorizedEvents();
    return response.items.map(sanitizeEventForPdt);
  }
}
