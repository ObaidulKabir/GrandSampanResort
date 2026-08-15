import { Body, Controller, Post, Req } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdvisorService } from './advisor.service';

@Controller('advisor')
export class AdvisorController {
  constructor(
    private readonly advisor: AdvisorService,
    private readonly jwt: JwtService
  ) {}

  @Post('suggest')
  async suggest(@Body() body: any, @Req() req: any) {
    let userId: string | null = null;
    const auth: string = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (token) {
      try {
        const payload = await this.jwt.verifyAsync(token);
        userId = payload?.sub || null;
      } catch {
        userId = null;
      }
    }
    return this.advisor.suggest(
      {
        availableNow: Number(body?.availableNow) || 0,
        monthlyCapacity: Number(body?.monthlyCapacity) || 0,
        horizonMonths: Number(body?.horizonMonths) || 36,
        referralTarget: body?.referralTarget
          ? {
              mode: body.referralTarget.mode === 'count' ? 'count' : 'volume',
              value: Number(body.referralTarget.value) || 0,
              overMonths: Number(body.referralTarget.overMonths) || 12
            }
          : null
      },
      userId
    );
  }
}
