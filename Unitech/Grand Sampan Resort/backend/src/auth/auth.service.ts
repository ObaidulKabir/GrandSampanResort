import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class AuthService {
  private prisma: PrismaClient | null = (() => {
    try {
      return process.env.DATABASE_URL ? new PrismaClient() : null;
    } catch {
      return null;
    }
  })();
  constructor(private jwt: JwtService) {}

  async registerInvestor(email: string, password: string) {
    if (!this.prisma) throw new ForbiddenException('db_required');
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !password) throw new UnauthorizedException('invalid');
    const exists = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (exists) return null;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({ data: { email: normalizedEmail, passwordHash, role: Role.INVESTOR } });
    return { id: user.id, email: user.email, role: user.role };
  }

  async bootstrapAdmin(email: string, password: string, bootstrapToken: string) {
    if (!this.prisma) throw new ForbiddenException('db_required');
    if (!process.env.ADMIN_BOOTSTRAP_TOKEN || bootstrapToken !== process.env.ADMIN_BOOTSTRAP_TOKEN) throw new UnauthorizedException('invalid_bootstrap');
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !password) throw new UnauthorizedException('invalid');
    const exists = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (exists) return { id: exists.id, email: exists.email, role: exists.role };
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({ data: { email: normalizedEmail, passwordHash, role: Role.ADMIN } });
    return { id: user.id, email: user.email, role: user.role };
  }

  private async issueAccessToken(user: { id: string; email: string; role: Role }) {
    const token = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role });
    return token;
  }

  private hashRefreshToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  async login(email: string, password: string) {
    if (!this.prisma) throw new ForbiddenException('db_required');
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;

    const accessToken = await this.issueAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = randomBytes(48).toString('base64url');
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({ data: { userId: user.id, tokenHash: refreshTokenHash, expiresAt } });

    return { accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } };
  }

  async refresh(refreshToken: string) {
    if (!this.prisma) throw new ForbiddenException('db_required');
    const token = String(refreshToken || '');
    if (!token) throw new UnauthorizedException('missing_refresh');
    const tokenHash = this.hashRefreshToken(token);
    const existing = await this.prisma.refreshToken.findFirst({ where: { tokenHash, revokedAt: null } });
    if (!existing) throw new UnauthorizedException('invalid_refresh');
    if (existing.expiresAt.getTime() < Date.now()) throw new UnauthorizedException('expired_refresh');

    const user = await this.prisma.user.findUnique({ where: { id: existing.userId } });
    if (!user) throw new UnauthorizedException('user_not_found');

    await this.prisma.refreshToken.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });

    const nextRefreshToken = randomBytes(48).toString('base64url');
    const nextRefreshTokenHash = this.hashRefreshToken(nextRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({ data: { userId: user.id, tokenHash: nextRefreshTokenHash, expiresAt } });

    const accessToken = await this.issueAccessToken({ id: user.id, email: user.email, role: user.role });
    return { accessToken, refreshToken: nextRefreshToken, user: { id: user.id, email: user.email, role: user.role } };
  }

  async logout(refreshToken: string) {
    if (!this.prisma) throw new ForbiddenException('db_required');
    const token = String(refreshToken || '');
    if (!token) return { ok: true };
    const tokenHash = this.hashRefreshToken(token);
    const existing = await this.prisma.refreshToken.findFirst({ where: { tokenHash, revokedAt: null } });
    if (!existing) return { ok: true };
    await this.prisma.refreshToken.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });
    return { ok: true };
  }
}

