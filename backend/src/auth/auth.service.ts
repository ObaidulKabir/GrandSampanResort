import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Investor } from '../domain/models';

type UserRecord = Investor & { passwordHash: string };

@Injectable()
export class AuthService {
  private users: UserRecord[] = [];
  constructor(private jwt: JwtService) {}

  async register(name: string, email: string, password: string) {
    const exists = this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) return null;
    const passwordHash = await bcrypt.hash(password, 10);
    const user: UserRecord = { id: 'U-' + Math.random().toString(36).slice(2, 8), name, email, kyc: false, passwordHash };
    this.users.push(user);
    return { id: user.id, name: user.name, email: user.email, kyc: user.kyc };
  }

  async login(email: string, password: string) {
    const user = this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    const token = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { token, user: { id: user.id, name: user.name, email: user.email, kyc: user.kyc } };
  }

  async me(token: string) {
    try {
      const payload = await this.jwt.verifyAsync(token);
      const user = this.users.find((u) => u.id === payload.sub);
      if (!user) return null;
      return { id: user.id, name: user.name, email: user.email, kyc: user.kyc };
    } catch {
      return null;
    }
  }
}

