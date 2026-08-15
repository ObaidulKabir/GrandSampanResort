import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PaymentPlansService } from './payment-plans.service';
import { ScheduleCadence } from './pv';

@Controller('payment-plans')
export class PaymentPlansController {
  constructor(private readonly plans: PaymentPlansService) {}

  @Get('policy')
  async policy(
    @Query('installmentMonths') installmentMonths?: string,
    @Query('cadence') cadence?: string
  ) {
    const policy = await this.plans.getPolicy();
    const months = installmentMonths ? Number(installmentMonths) : undefined;
    const resolved = this.plans.resolveTiers(policy, {
      installmentMonths: Number.isFinite(months as number) ? months : undefined,
      cadence: cadence === 'quarterly' ? 'quarterly' : ('monthly' as ScheduleCadence)
    });
    return { ok: true, policy, resolved };
  }

  @Put('policy')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async setPolicy(@Body() body: any) {
    const policy = await this.plans.setPolicy(body || {});
    const resolved = this.plans.resolveTiers(policy);
    return { ok: true, policy, resolved };
  }
}
