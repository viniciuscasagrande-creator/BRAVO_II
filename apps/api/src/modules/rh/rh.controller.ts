import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type {
  CreateRhEmployeeRequestDto,
  CreateRhGeofenceRequestDto,
  CreateRhPaymentBatchRequestDto,
  RecordTimePunchRequestDto,
} from '@bravo-ii/contracts';
import {
  AuthGuard,
  RequirePermission,
  type AuthenticatedRequest,
} from '../../common/auth/auth.guard';
import { ensureCorrelationId } from '@bravo-ii/telemetry';
import { RhService } from './rh.service';

@Controller('api/v1/rh')
@UseGuards(AuthGuard)
export class RhController {
  constructor(private readonly rhService: RhService) {}

  @Get('employees')
  @RequirePermission('rh:read')
  async listEmployees(@Req() req: AuthenticatedRequest) {
    const items = await this.rhService.listEmployees(req.actor!);
    return { items };
  }

  @Post('employees')
  @RequirePermission('rh:write')
  async createEmployee(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateRhEmployeeRequestDto
  ) {
    return this.rhService.createEmployee(
      req.actor!,
      body,
      ensureCorrelationId(req.headers['x-correlation-id'])
    );
  }

  @Get('geofences')
  @RequirePermission('rh:read')
  async listGeofences() {
    const items = await this.rhService.listGeofences();
    return { items };
  }

  @Post('geofences')
  @RequirePermission('rh:write')
  async createGeofence(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateRhGeofenceRequestDto
  ) {
    return this.rhService.createGeofence(
      req.actor!,
      body,
      ensureCorrelationId(req.headers['x-correlation-id'])
    );
  }

  @Get('time-punches')
  @RequirePermission('rh:read')
  async listTimePunches() {
    const items = await this.rhService.listTimePunches();
    return { items };
  }

  @Post('time-punches')
  @RequirePermission('rh:ponto-write')
  async recordTimePunch(
    @Req() req: AuthenticatedRequest,
    @Body() body: RecordTimePunchRequestDto
  ) {
    return this.rhService.recordTimePunch(
      req.actor!,
      body,
      ensureCorrelationId(req.headers['x-correlation-id'])
    );
  }

  @Get('payment-batches')
  @RequirePermission('rh:read')
  async listPaymentBatches() {
    const items = await this.rhService.listPaymentBatches();
    return { items };
  }

  @Post('payment-batches')
  @RequirePermission('rh:request-payment')
  async createPaymentBatch(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateRhPaymentBatchRequestDto
  ) {
    return this.rhService.createPaymentBatch(
      req.actor!,
      body,
      ensureCorrelationId(req.headers['x-correlation-id'])
    );
  }
}
