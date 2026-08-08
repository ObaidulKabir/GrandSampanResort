import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { prisma } from '../../prisma/client';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private memoryUsers: {
    id: string;
    name: string;
    email: string;
    kyc: boolean;
    role: string;
    passwordHash: string;
  }[] = [];

  constructor(private jwt: JwtService) {}

  private get db() {
    return process.env.DATABASE_URL ? prisma : null;
  }

  async onModuleInit() {
    await this.bootstrapAdmin();
  }

  // Ensures at least one admin account exists so the admin panel is never
  // locked out. Only creates the account if that email doesn't exist yet;
  // it never overwrites an existing user's password or role on restart.
  private async bootstrapAdmin() {
    const rawEmail = process.env.ADMIN_EMAIL;
    const rawPassword = process.env.ADMIN_PASSWORD;
    if (!rawEmail || !rawPassword) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.warn('ADMIN_EMAIL/ADMIN_PASSWORD not set; skipping admin bootstrap.');
      }
      return;
    }
    const email = rawEmail.toLowerCase().trim();
    const name = process.env.ADMIN_NAME?.trim() || 'Administrator';
    try {
      if (this.db) {
        const existing = await this.db.user.findUnique({ where: { email } });
        if (existing) return;
        const passwordHash = await bcrypt.hash(rawPassword, 10);
        await this.db.user.create({
          data: { id: 'U-' + Math.random().toString(36).slice(2, 8), name, email, passwordHash, kyc: true, role: 'admin' }
        });
        this.logger.log(`Bootstrapped admin account for ${email}.`);
        return;
      }
      if (this.memoryUsers.some((u) => u.email === email)) return;
      const passwordHash = await bcrypt.hash(rawPassword, 10);
      this.memoryUsers.push({
        id: 'U-' + Math.random().toString(36).slice(2, 8),
        name,
        email,
        kyc: true,
        role: 'admin',
        passwordHash
      });
      this.logger.log(`Bootstrapped in-memory admin account for ${email}.`);
    } catch (e) {
      this.logger.error('Admin bootstrap failed', e as Error);
    }
  }

  async register(name: string, email: string, password: string) {
    if (!name?.trim() || !email?.trim() || !password) return null;
    const normalized = email.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(password, 10);
    const id = 'U-' + Math.random().toString(36).slice(2, 8);

    if (this.db) {
      const exists = await this.db.user.findUnique({ where: { email: normalized } });
      if (exists) return null;
      const user = await this.db.user.create({
        data: {
          id,
          name: name.trim(),
          email: normalized,
          passwordHash,
          kyc: false,
          role: 'investor'
        }
      });
      return { id: user.id, name: user.name, email: user.email, kyc: user.kyc, role: user.role };
    }

    if (this.memoryUsers.some((u) => u.email === normalized)) return null;
    const user = { id, name: name.trim(), email: normalized, kyc: false, role: 'investor', passwordHash };
    this.memoryUsers.push(user);
    return { id: user.id, name: user.name, email: user.email, kyc: user.kyc, role: user.role };
  }

  async login(email: string, password: string) {
    const normalized = (email || '').toLowerCase().trim();
    let user: { id: string; name: string; email: string; kyc: boolean; role: string; passwordHash: string } | null =
      null;

    if (this.db) {
      user = await this.db.user.findUnique({ where: { email: normalized } });
    } else {
      user = this.memoryUsers.find((u) => u.email === normalized) || null;
    }
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    const token = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role });
    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, kyc: user.kyc, role: user.role }
    };
  }

  async me(token: string) {
    try {
      const payload = await this.jwt.verifyAsync(token);
      if (this.db) {
        const user = await this.db.user.findUnique({ where: { id: payload.sub } });
        if (!user) return null;
        return { id: user.id, name: user.name, email: user.email, kyc: user.kyc, role: user.role };
      }
      const user = this.memoryUsers.find((u) => u.id === payload.sub);
      if (!user) return null;
      return { id: user.id, name: user.name, email: user.email, kyc: user.kyc, role: user.role };
    } catch {
      return null;
    }
  }

  async setKyc(userId: string, kyc: boolean) {
    if (!userId) return null;
    if (this.db) {
      try {
        const user = await this.db.user.update({ where: { id: userId }, data: { kyc } });
        return { id: user.id, name: user.name, email: user.email, kyc: user.kyc, role: user.role };
      } catch {
        return null;
      }
    }
    const user = this.memoryUsers.find((u) => u.id === userId);
    if (!user) return null;
    user.kyc = kyc;
    return { id: user.id, name: user.name, email: user.email, kyc: user.kyc, role: user.role };
  }

  async listUsers() {
    if (this.db) {
      const users = await this.db.user.findMany({ orderBy: { createdAt: 'desc' } });
      return users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        kyc: u.kyc,
        role: u.role,
        createdAt: u.createdAt
      }));
    }
    return this.memoryUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      kyc: u.kyc,
      role: u.role
    }));
  }
}
