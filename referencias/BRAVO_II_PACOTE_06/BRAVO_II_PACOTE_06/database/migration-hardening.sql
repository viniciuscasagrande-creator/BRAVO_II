-- Executar SOMENTE depois de aplicar/validar o schema Prisma no PostgreSQL de homologação.
-- Uma produtora principal por evento (índice único parcial). Nomes correspondem às tabelas geradas pelo Prisma.
CREATE UNIQUE INDEX IF NOT EXISTS "bravo_event_one_primary_producer"
  ON "BravoEventProducer" ("eventId") WHERE role = 'PRINCIPAL';
-- Restringir formatos críticos no banco além das regras de domínio.
ALTER TABLE "BravoEventFee" ADD CONSTRAINT bravo_event_fee_exact_one_kind
 CHECK ((type='PERCENTUAL' AND "percentBasisPoints" BETWEEN 0 AND 10000 AND "fixedCents" IS NULL)
     OR (type='FIXA' AND "fixedCents">=0 AND "percentBasisPoints" IS NULL));
ALTER TABLE "BravoPriceLot" ADD CONSTRAINT bravo_lot_positive_capacity
 CHECK (capacity > 0 AND "faceValueCents" >= 0);
ALTER TABLE "BravoEventSession" ADD CONSTRAINT bravo_session_positive_capacity
 CHECK (capacity > 0 AND "endsAt" > "startsAt");
-- Imutabilidade de registros de auditoria: usuários do aplicativo NÃO recebem UPDATE/DELETE nesta tabela.
-- Aplicar REVOKE no papel específico de conexão da aplicação, após configurar role do DB (sem nome fixo aqui).
