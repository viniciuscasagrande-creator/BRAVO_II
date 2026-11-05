import { BravoApiClient } from '@bravo-ii/sdk';

export interface PdvTerminalContext {
  terminalId: string;
  pointOfSaleCode: string;
  operatorToken: string;
}

/**
 * Cliente base do terminal de Ponto de Venda (PDV / Caixa).
 * Consome o mesmo estoque transacional da API central (Pacote 05).
 */
export class PdvTerminalRuntime {
  private readonly client: BravoApiClient;

  constructor(apiBaseUrl: string, private readonly context: PdvTerminalContext) {
    this.client = new BravoApiClient({
      baseUrl: apiBaseUrl,
      sessionToken: context.operatorToken,
    });
  }

  async verifyTerminalSession() {
    const actor = await this.client.getSession();
    return {
      terminalId: this.context.terminalId,
      pointOfSaleCode: this.context.pointOfSaleCode,
      operatorName: actor.fullName,
      roles: actor.roles,
    };
  }
}
