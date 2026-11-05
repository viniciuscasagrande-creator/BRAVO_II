export interface BravoEnvironmentConfig {
  nodeEnv: 'development' | 'test' | 'staging' | 'production';
  port: number;
  databaseUrl?: string;
  pgliteDataDir: string;
  authSessionSecret: string;
  qrSigningSecret: string;
  allowRealPaymentGateway: boolean;
  allowRealRefundExecution: boolean;
  allowRealPayoutExecution: boolean;
}

export function loadEnvironmentConfig(env: NodeJS.ProcessEnv = process.env): BravoEnvironmentConfig {
  const nodeEnvRaw = env.NODE_ENV ?? 'development';
  const nodeEnv = (['development', 'test', 'staging', 'production'].includes(nodeEnvRaw)
    ? nodeEnvRaw
    : 'development') as BravoEnvironmentConfig['nodeEnv'];

  const allowRealPaymentGateway = env.ALLOW_REAL_PAYMENT_GATEWAY === 'true';
  const allowRealRefundExecution = env.ALLOW_REAL_REFUND_EXECUTION === 'true';
  const allowRealPayoutExecution = env.ALLOW_REAL_PAYOUT_EXECUTION === 'true';

  if (nodeEnv !== 'production' && (allowRealPaymentGateway || allowRealRefundExecution || allowRealPayoutExecution)) {
    throw new Error(
      'BLOQUEIO DE GOVERNANÇA: Operações financeiras reais (gateway, estorno ou repasse) não podem ser habilitadas fora de ambiente de produção homologado.'
    );
  }

  return {
    nodeEnv,
    port: Number(env.PORT ?? 4000),
    databaseUrl: env.DATABASE_URL?.trim() || undefined,
    pgliteDataDir: env.PGLITE_DATA_DIR?.trim() || '.data/postgres',
    authSessionSecret: env.AUTH_SESSION_SECRET?.trim() || 'dev-only-local-session-secret-change-in-staging',
    qrSigningSecret: env.QR_SIGNING_SECRET?.trim() || 'dev-only-qr-signing-secret-change-in-staging',
    allowRealPaymentGateway,
    allowRealRefundExecution,
    allowRealPayoutExecution,
  };
}
