import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

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
}

