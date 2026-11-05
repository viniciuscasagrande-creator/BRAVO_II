import { loadEnvironmentConfig } from '@bravo-ii/config';
import { StructuredLogger } from '@bravo-ii/telemetry';

export class OutboxWorkerCoordinator {
  private readonly logger = new StructuredLogger('bravo-ii-workers');

  verifySafeRuntime(): {
    status: 'ready';
    realGatewaysDisabled: boolean;
  } {
    const config = loadEnvironmentConfig();
    if (
      config.allowRealPaymentGateway ||
      config.allowRealRefundExecution ||
      config.allowRealPayoutExecution
    ) {
      throw new Error('Workers bloqueados: integrações bancárias reais desabilitadas fora de produção.');
    }

    this.logger.info('Coordenador de Outbox inicializado em modo seguro.', 'worker-boot');
    return {
      status: 'ready',
      realGatewaysDisabled: true,
    };
  }
}
