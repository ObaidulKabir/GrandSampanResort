import { Body, Controller, Get, Headers, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthService } from '../auth/auth.service';
import { ReferralService } from './referral.service';

@Controller('referral')
export class ReferralController {
  constructor(
    private readonly referral: ReferralService,
    private readonly auth: AuthService
  ) {}

  private bearer(authHeader?: string) {
    return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  }

  @Get('validate')
  async validate(@Query('code') code?: string, @Query('buyerId') buyerId?: string) {
    return this.referral.validateCode(code || '', buyerId || null);
  }

  @Get('policy')
  async policy() {
    const policy = await this.referral.getPolicy();
    return { ok: true, policy };
  }

  @Put('policy')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async setPolicy(@Body() body: any) {
    const policy = await this.referral.setPolicy(body || {});
    return { ok: true, policy };
  }

  @Get('admin/referrers')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async adminReferrers() {
    const referrers = await this.referral.listReferrers();
    return { ok: true, referrers };
  }

  @Put('admin/referrers/:id/rate')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async setReferrerRate(@Param('id') id: string, @Body() body: any) {
    const raw = body?.incentivePct;
    const pct =
      raw === null || raw === undefined || raw === ''
        ? null
        : Number(raw);
    return this.referral.setReferrerIncentivePct(id, pct);
  }

  @Get('me')
  @UseGuards(RolesGuard)
  @Roles('investor', 'admin', 'broker')
  async me(@Req() req: any) {
    const userId = req?.user?.sub;
    if (!userId) return { ok: false, error: 'unauthorized' };
    return this.referral.summaryForUser(userId);
  }

  @Post('ensure-code')
  @UseGuards(RolesGuard)
  @Roles('investor', 'admin', 'broker')
  async ensureCode(@Req() req: any, @Headers('authorization') authHeader?: string) {
    const userId = req?.user?.sub;
    if (!userId) return { ok: false, error: 'unauthorized' };
    const me = await this.auth.me(this.bearer(authHeader));
    const code = await this.referral.ensureCode(userId, me?.name);
    return { ok: true, code };
  }

  @Get('admin/rewards')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async adminRewards(@Query('status') status?: string) {
    const rewards = await this.referral.listAll(status || undefined);
    return { ok: true, rewards };
  }

  @Post('admin/rewards/:id/mark-paid')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async markPaid(@Param('id') id: string) {
    return this.referral.markPaid(id);
  }
}
