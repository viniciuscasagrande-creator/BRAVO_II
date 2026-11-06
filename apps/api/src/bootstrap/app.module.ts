import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { DatabaseModule } from '../common/database/database.module';
import { HealthController } from '../common/health/health.controller';
import { isValidProxyKey, proxyGuardRequired } from '../core/security/proxy-guard';
import { GovernanceModule } from '../modules/governance/governance.module';
import { IdentityModule } from '../modules/identity/identity.module';
import { ProducersModule } from '../modules/producers/producers.module';
import { CustomersModule } from '../modules/customers/customers.module';
import { CommercialModule } from '../modules/commercial/commercial.module';
import { EventsModule } from '../modules/events/events.module';
import { InventoryModule } from '../modules/inventory/inventory.module';
import { OrdersModule } from '../modules/orders/orders.module';
import { TicketsModule } from '../modules/tickets/tickets.module';
import { PaymentsModule } from '../modules/payments/payments.module';
import { PointOfSaleModule } from '../modules/point-of-sale/point-of-sale.module';
import { ServiceDeskModule } from '../modules/service-desk/service-desk.module';
import { CouponsModule } from '../modules/coupons/coupons.module';
import { RefundsModule } from '../modules/refunds/refunds.module';
import { PricingFeesModule } from '../modules/pricing-fees/pricing-fees.module';
import { FinanceModule } from '../modules/finance/finance.module';
import { RhModule } from '../modules/rh/rh.module';
import { MarketingModule } from '../modules/marketing/marketing.module';
import { MessagingModule } from '../modules/messaging/messaging.module';
import { GateControlModule } from '../modules/gate-control/gate-control.module';
import { ReportingModule } from '../modules/reporting/reporting.module';
import { Pacote06Module } from '../modules/pacote06/pacote06.module';
import { BravoPacote08Module } from '../modules/pacote08/module';
import { BravoPacote09Module } from '../modules/pacote09/module';
import { BravoPacote10Module } from '../modules/pacote10/module';
import { BravoIaModule } from '../modules/ia/ia.module';

@Module({
  imports: [
    DatabaseModule,
    GovernanceModule,
    IdentityModule,
    ProducersModule,
    CustomersModule,
    CommercialModule,
    EventsModule,
    InventoryModule,
    OrdersModule,
    TicketsModule,
    PaymentsModule,
    PointOfSaleModule,
    ServiceDeskModule,
    CouponsModule,
    RefundsModule,
    PricingFeesModule,
    FinanceModule,
    RhModule,
    MarketingModule,
    MessagingModule,
    GateControlModule,
    ReportingModule,
    Pacote06Module,
    BravoPacote08Module,
    BravoPacote09Module,
    BravoPacote10Module,
    BravoIaModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: Request, res: Response, next: NextFunction) => {
        if (
          proxyGuardRequired(process.env) &&
          !isValidProxyKey(req.header('x-bravo-proxy-key'), process.env.BRAVO_PROXY_KEY)
        ) {
          res.setHeader('Cache-Control', 'no-store');
          res.status(403).json({ statusCode: 403, message: 'Acesso ao backend restrito' });
          return;
        }
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        next();
      })
      .forRoutes('*');
  }
}
