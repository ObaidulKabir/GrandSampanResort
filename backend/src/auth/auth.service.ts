import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { prisma } from '../../prisma/client';
import { MailService } from '../mail/mail.service';

type MemUser = {
  id: string;
  name: string;
  email: string;
  kyc: boolean;
  role: string;
  passwordHash: string;
  emailVerified: boolean;
  emailVerifyToken?: string | null;
  emailVerifyExpires?: Date | null;
  passwordResetToken?: string | null;
  passwordResetExpires?: Date | null;
};

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private memoryUsers: MemUser[] = [];

  constructor(
    private jwt: JwtService,
    private mail: MailService
  ) {}

  private get db() {
    return process.env.DATABASE_URL ? prisma : null;
  }

  private siteUrl() {
    return (process.env.PUBLIC_SITE_URL || 'https://www.grandsampanresort.com').replace(/\/+$/, '');
  }

  private publicUser(user: {
    id: string;
    name: string;
    email: string;
    kyc: boolean;
    role: string;
    emailVerified?: boolean | null;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      kyc: user.kyc,
      role: user.role,
      emailVerified: !!user.emailVerified
    };
  }

  private newVerifyToken() {
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000);
    return { token, expires };
  }

  private newResetToken() {
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    return { token, expires };
  }

  private validatePassword(password: string) {
    if (!password || typeof password !== 'string') return 'missing_password';
    if (password.length < 8) return 'password_too_short';
    return null;
  }

  private async sendVerifyEmail(user: { name: string; email: string }, token: string) {
    const verifyUrl = `${this.siteUrl()}/auth/verify?token=${encodeURIComponent(token)}`;
    await this.mail.sendEmailVerification({
      to: user.email,
      name: user.name,
      verifyUrl
    });
  }

  private async sendResetEmail(user: { name: string; email: string }, token: string) {
    const resetUrl = `${this.siteUrl()}/auth/reset-password?token=${encodeURIComponent(token)}`;
    return this.mail.sendPasswordReset({
      to: user.email,
      name: user.name,
      resetUrl
    });
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
          data: {
            id: 'U-' + Math.random().toString(36).slice(2, 8),
            name,
            email,
            passwordHash,
            kyc: true,
            role: 'admin',
            emailVerified: true
          }
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
        passwordHash,
        emailVerified: true
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
    const { token, expires } = this.newVerifyToken();

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
          role: 'investor',
          emailVerified: false,
          emailVerifyToken: token,
          emailVerifyExpires: expires
        }
      });
      try {
        await this.sendVerifyEmail(user, token);
      } catch (e) {
        this.logger.warn(`Verify email failed for ${user.email}: ${(e as Error)?.message || e}`);
      }
      return this.publicUser(user);
    }

    if (this.memoryUsers.some((u) => u.email === normalized)) return null;
    const user: MemUser = {
      id,
      name: name.trim(),
      email: normalized,
      kyc: false,
      role: 'investor',
      passwordHash,
      emailVerified: false,
      emailVerifyToken: token,
      emailVerifyExpires: expires
    };
    this.memoryUsers.push(user);
    try {
      await this.sendVerifyEmail(user, token);
    } catch (e) {
      this.logger.warn(`Verify email failed for ${user.email}: ${(e as Error)?.message || e}`);
    }
    return this.publicUser(user);
  }

  async login(email: string, password: string) {
    const normalized = (email || '').toLowerCase().trim();
    let user: MemUser | null = null;

    if (this.db) {
      user = (await this.db.user.findUnique({ where: { email: normalized } })) as any;
    } else {
      user = this.memoryUsers.find((u) => u.email === normalized) || null;
    }
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    const token = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role });
    return {
      token,
      user: this.publicUser(user)
    };
  }

  async me(token: string) {
    try {
      const payload = await this.jwt.verifyAsync(token);
      if (this.db) {
        const user = await this.db.user.findUnique({ where: { id: payload.sub } });
        if (!user) return null;
        return this.publicUser(user);
      }
      const user = this.memoryUsers.find((u) => u.id === payload.sub);
      if (!user) return null;
      return this.publicUser(user);
    } catch {
      return null;
    }
  }

  async verifyEmail(token: string) {
    const cleaned = String(token || '').trim();
    if (!cleaned) return { ok: false as const, error: 'missing_token' };

    if (this.db) {
      const user = await this.db.user.findFirst({ where: { emailVerifyToken: cleaned } });
      if (!user) return { ok: false as const, error: 'invalid_token' };
      if (user.emailVerified) {
        return { ok: true as const, already: true as const, user: this.publicUser(user) };
      }
      if (user.emailVerifyExpires && user.emailVerifyExpires.getTime() < Date.now()) {
        return { ok: false as const, error: 'expired_token' };
      }
      const updated = await this.db.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerifyToken: null,
          emailVerifyExpires: null
        }
      });
      return { ok: true as const, user: this.publicUser(updated) };
    }

    const user = this.memoryUsers.find((u) => u.emailVerifyToken === cleaned);
    if (!user) return { ok: false as const, error: 'invalid_token' };
    if (user.emailVerified) {
      return { ok: true as const, already: true as const, user: this.publicUser(user) };
    }
    if (user.emailVerifyExpires && user.emailVerifyExpires.getTime() < Date.now()) {
      return { ok: false as const, error: 'expired_token' };
    }
    user.emailVerified = true;
    user.emailVerifyToken = null;
    user.emailVerifyExpires = null;
    return { ok: true as const, user: this.publicUser(user) };
  }

  async resendVerification(authToken: string) {
    const me = await this.me(authToken);
    if (!me) return { ok: false as const, error: 'unauthorized' };
    if (me.emailVerified) return { ok: true as const, already: true as const, user: me };

    const { token, expires } = this.newVerifyToken();
    if (this.db) {
      const user = await this.db.user.update({
        where: { id: me.id },
        data: { emailVerifyToken: token, emailVerifyExpires: expires }
      });
      try {
        await this.sendVerifyEmail(user, token);
      } catch (e) {
        this.logger.warn(`Resend verify failed for ${user.email}: ${(e as Error)?.message || e}`);
        return { ok: false as const, error: 'send_failed' };
      }
      return { ok: true as const, user: this.publicUser(user) };
    }

    const user = this.memoryUsers.find((u) => u.id === me.id);
    if (!user) return { ok: false as const, error: 'unauthorized' };
    user.emailVerifyToken = token;
    user.emailVerifyExpires = expires;
    try {
      await this.sendVerifyEmail(user, token);
    } catch (e) {
      this.logger.warn(`Resend verify failed for ${user.email}: ${(e as Error)?.message || e}`);
      return { ok: false as const, error: 'send_failed' };
    }
    return { ok: true as const, user: this.publicUser(user) };
  }

  async isEmailVerified(userId: string) {
    if (!userId) return false;
    if (this.db) {
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: { emailVerified: true, role: true }
      });
      if (!user) return false;
      if (user.role === 'admin') return true;
      return !!user.emailVerified;
    }
    const user = this.memoryUsers.find((u) => u.id === userId);
    if (!user) return false;
    if (user.role === 'admin') return true;
    return !!user.emailVerified;
  }

  /** Always returns ok so callers cannot enumerate accounts. */
  async forgotPassword(email: string) {
    const normalized = String(email || '')
      .toLowerCase()
      .trim();
    if (!normalized.includes('@')) {
      return { ok: true as const };
    }

    const { token, expires } = this.newResetToken();

    if (this.db) {
      const user = await this.db.user.findUnique({ where: { email: normalized } });
      if (!user) return { ok: true as const };
      await this.db.user.update({
        where: { id: user.id },
        data: { passwordResetToken: token, passwordResetExpires: expires }
      });
      try {
        const sent = await this.sendResetEmail(user, token);
        if (!sent.ok && !('skipped' in sent && sent.skipped)) {
          this.logger.warn(`Password reset email failed for ${user.email}`);
        }
      } catch (e) {
        this.logger.warn(`Password reset email failed for ${user.email}: ${(e as Error)?.message || e}`);
      }
      return { ok: true as const };
    }

    const user = this.memoryUsers.find((u) => u.email === normalized);
    if (!user) return { ok: true as const };
    user.passwordResetToken = token;
    user.passwordResetExpires = expires;
    try {
      await this.sendResetEmail(user, token);
    } catch (e) {
      this.logger.warn(`Password reset email failed for ${user.email}: ${(e as Error)?.message || e}`);
    }
    return { ok: true as const };
  }

  async resetPassword(token: string, password: string) {
    const cleaned = String(token || '').trim();
    if (!cleaned) return { ok: false as const, error: 'missing_token' };
    const pwError = this.validatePassword(password);
    if (pwError) return { ok: false as const, error: pwError };

    const passwordHash = await bcrypt.hash(password, 10);

    if (this.db) {
      const user = await this.db.user.findFirst({ where: { passwordResetToken: cleaned } });
      if (!user) return { ok: false as const, error: 'invalid_token' };
      if (user.passwordResetExpires && user.passwordResetExpires.getTime() < Date.now()) {
        return { ok: false as const, error: 'expired_token' };
      }
      const updated = await this.db.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetToken: null,
          passwordResetExpires: null
        }
      });
      return { ok: true as const, user: this.publicUser(updated) };
    }

    const user = this.memoryUsers.find((u) => u.passwordResetToken === cleaned);
    if (!user) return { ok: false as const, error: 'invalid_token' };
    if (user.passwordResetExpires && user.passwordResetExpires.getTime() < Date.now()) {
      return { ok: false as const, error: 'expired_token' };
    }
    user.passwordHash = passwordHash;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    return { ok: true as const, user: this.publicUser(user) };
  }

  async changePassword(authToken: string, currentPassword: string, newPassword: string) {
    const me = await this.me(authToken);
    if (!me) return { ok: false as const, error: 'unauthorized' };
    if (!currentPassword) return { ok: false as const, error: 'missing_current_password' };
    const pwError = this.validatePassword(newPassword);
    if (pwError) return { ok: false as const, error: pwError };

    if (this.db) {
      const user = await this.db.user.findUnique({ where: { id: me.id } });
      if (!user) return { ok: false as const, error: 'unauthorized' };
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) return { ok: false as const, error: 'invalid_current_password' };
      const passwordHash = await bcrypt.hash(newPassword, 10);
      const updated = await this.db.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetToken: null,
          passwordResetExpires: null
        }
      });
      return { ok: true as const, user: this.publicUser(updated) };
    }

    const user = this.memoryUsers.find((u) => u.id === me.id);
    if (!user) return { ok: false as const, error: 'unauthorized' };
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return { ok: false as const, error: 'invalid_current_password' };
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    return { ok: true as const, user: this.publicUser(user) };
  }

  async setKyc(userId: string, kyc: boolean) {
    if (!userId) return null;
    if (this.db) {
      try {
        const user = await this.db.user.update({ where: { id: userId }, data: { kyc } });
        return this.publicUser(user);
      } catch {
        return null;
      }
    }
    const user = this.memoryUsers.find((u) => u.id === userId);
    if (!user) return null;
    user.kyc = kyc;
    return this.publicUser(user);
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
        emailVerified: !!u.emailVerified,
        createdAt: u.createdAt
      }));
    }
    return this.memoryUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      kyc: u.kyc,
      role: u.role,
      emailVerified: !!u.emailVerified
    }));
  }
}
