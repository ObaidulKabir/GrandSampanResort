import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private prisma: PrismaClient | null = (() => {
    try {
      return process.env.DATABASE_URL ? new PrismaClient() : null;
    } catch {
      return null;
    }
  })();

  constructor(private jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers['authorization'] || '';
    const token = typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) throw new UnauthorizedException('missing_token');

    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('invalid_token');
    }

    if (!payload?.sub || !this.prisma) throw new UnauthorizedException('invalid_token');
    const user = await this.prisma.user.findUnique({ where: { id: String(payload.sub) } });
    if (!user) throw new UnauthorizedException('user_not_found');

    req.user = { id: user.id, email: user.email, role: user.role };
    return true;
  }
}
