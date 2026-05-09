import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('register/investor')
  async registerInvestor(@Body() body: any) {
    const { email, password } = body || {};
    const res = await this.service.registerInvestor(email, password);
    if (!res) return { ok: false, error: 'exists' };
    return { ok: true, user: res };
  }

  @Post('bootstrap-admin')
  async bootstrapAdmin(@Body() body: any) {
    const { email, password, token } = body || {};
    const res = await this.service.bootstrapAdmin(email, password, token);
    return { ok: true, user: res };
  }

  @Post('login')
  async login(@Body() body: any) {
    const { email, password } = body || {};
    const res = await this.service.login(email, password);
    if (!res) return { ok: false, error: 'invalid' };
    return { ok: true, accessToken: res.accessToken, refreshToken: res.refreshToken, user: res.user };
  }

  @Post('refresh')
  async refresh(@Body() body: any) {
    const { refreshToken } = body || {};
    const res = await this.service.refresh(refreshToken);
    return { ok: true, accessToken: res.accessToken, refreshToken: res.refreshToken, user: res.user };
  }

  @Post('logout')
  async logout(@Body() body: any) {
    const { refreshToken } = body || {};
    const res = await this.service.logout(refreshToken);
    return res;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    return { ok: true, user: req.user };
  }
}

