import { Body, Controller, Get, Headers, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('register')
  async register(@Body() body: any) {
    const { name, email, password } = body || {};
    const res = await this.service.register(name, email, password);
    if (!res) return { ok: false, error: 'exists' };
    return { ok: true, user: res };
  }

  @Post('login')
  async login(@Body() body: any) {
    const { email, password } = body || {};
    const res = await this.service.login(email, password);
    if (!res) return { ok: false, error: 'invalid' };
    return { ok: true, token: res.token, user: res.user };
  }

  @Get('me')
  async me(@Headers('authorization') authHeader?: string) {
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const res = await this.service.me(token);
    if (!res) return { ok: false };
    return { ok: true, user: res };
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token?: string) {
    return this.service.verifyEmail(token || '');
  }

  @Post('resend-verification')
  async resendVerification(@Headers('authorization') authHeader?: string) {
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
    return this.service.resendVerification(token);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: any) {
    return this.service.forgotPassword(body?.email || '');
  }

  @Post('reset-password')
  async resetPassword(@Body() body: any) {
    return this.service.resetPassword(body?.token || '', body?.password || '');
  }

  @Post('change-password')
  async changePassword(@Headers('authorization') authHeader?: string, @Body() body?: any) {
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
    return this.service.changePassword(token, body?.currentPassword || '', body?.newPassword || '');
  }

  @Put('kyc')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async setKyc(@Body() body: any) {
    const { userId, kyc } = body || {};
    if (!userId || typeof userId !== 'string') {
      return { ok: false, error: 'missing_user_id' };
    }
    const res = await this.service.setKyc(userId, !!kyc);
    if (!res) return { ok: false, error: 'not_found' };
    return { ok: true, user: res };
  }

  @Get('users')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async users() {
    const users = await this.service.listUsers();
    return { ok: true, users };
  }
}
