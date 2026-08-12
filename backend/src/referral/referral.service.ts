import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '../../prisma/client';

export type ReferralPolicy = {
  enabled: boolean;
  incentivePct: number;
  tranche1Pct: number;
  tranche2Pct: number;
};

const POLICY_KEY = 'referral-policy';

const DEFAULT_POLICY: ReferralPolicy = {
  enabled: true,
  incentivePct: 2,
  tranche1Pct: 40,
  tranche2Pct: 60
};

type MemReward = {
  id: string;
  referrerId: string;
  bookingId: string;
  buyerId?: string | null;
  saleAmount: number;
  ratePct: number;
  totalIncentive: number;
  tranche1Amount: number;
  tranche1Status: string;
  tranche1EarnedAt?: string | null;
  tranche2Amount: number;
  tranche2Status: string;
  tranche2EarnedAt?: string | null;
  status: string;
  paidAt?: string | null;
  voidReason?: string | null;
  createdAt: string;
};

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);
  private memoryRewards: MemReward[] = [];
  private memoryCodes = new Map<string, string>(); // userId -> code
  private memoryReferredBy = new Map<string, string>(); // userId -> referrerId
  private memoryPolicy: ReferralPolicy | null = null;

  private get db() {
    return process.env.DATABASE_URL ? prisma : null;
  }

  private siteUrl() {
    return (process.env.PUBLIC_SITE_URL || 'https://www.grandsampanresort.com').replace(/\/+$/, '');
  }

  private normalizeCode(raw?: string | null) {
    return String(raw || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 16);
  }

  private makeCode(seed: string) {
    const base = String(seed || 'REF')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${base || 'REF'}${suffix}`.slice(0, 12);
  }

  private overallStatus(t1: string, t2: string) {
    if (t1 === 'void' || t2 === 'void') return 'void';
    if (t1 === 'paid' && t2 === 'paid') return 'paid';
    if (t1 === 'earned' && t2 === 'earned') return 'earned';
    if (t1 === 'earned' || t2 === 'earned' || t1 === 'paid' || t2 === 'paid') return 'partial';
    return 'pending';
  }

  async getPolicy(): Promise<ReferralPolicy> {
    if (this.db) {
      const row = await this.db.appSetting.findUnique({ where: { key: POLICY_KEY } });
      const v = (row?.value || {}) as Partial<ReferralPolicy>;
      return {
        enabled: v.enabled !== false,
        incentivePct: Number.isFinite(Number(v.incentivePct)) ? Number(v.incentivePct) : DEFAULT_POLICY.incentivePct,
        tranche1Pct: Number.isFinite(Number(v.tranche1Pct)) ? Number(v.tranche1Pct) : DEFAULT_POLICY.tranche1Pct,
        tranche2Pct: Number.isFinite(Number(v.tranche2Pct)) ? Number(v.tranche2Pct) : DEFAULT_POLICY.tranche2Pct
      };
    }
    return this.memoryPolicy || { ...DEFAULT_POLICY };
  }

  async setPolicy(patch: Partial<ReferralPolicy>) {
    const current = await this.getPolicy();
    const next: ReferralPolicy = {
      enabled: patch.enabled ?? current.enabled,
      incentivePct: Number.isFinite(Number(patch.incentivePct))
        ? Math.max(0, Math.min(100, Number(patch.incentivePct)))
        : current.incentivePct,
      tranche1Pct: Number.isFinite(Number(patch.tranche1Pct))
        ? Math.max(0, Math.min(100, Number(patch.tranche1Pct)))
        : current.tranche1Pct,
      tranche2Pct: Number.isFinite(Number(patch.tranche2Pct))
        ? Math.max(0, Math.min(100, Number(patch.tranche2Pct)))
        : current.tranche2Pct
    };
    if (this.db) {
      await this.db.appSetting.upsert({
        where: { key: POLICY_KEY },
        create: { key: POLICY_KEY, value: next as any },
        update: { value: next as any }
      });
    } else {
      this.memoryPolicy = next;
    }
    return next;
  }

  async ensureCode(userId: string, nameHint?: string) {
    if (!userId) return null;
    if (this.db) {
      const user = await this.db.user.findUnique({ where: { id: userId } });
      if (!user) return null;
      if (user.referralCode) return user.referralCode;
      for (let i = 0; i < 8; i++) {
        const code = this.makeCode(nameHint || user.name || user.email);
        try {
          const updated = await this.db.user.update({
            where: { id: userId },
            data: { referralCode: code }
          });
          return updated.referralCode;
        } catch {
          /* unique collision — retry */
        }
      }
      return null;
    }
    if (this.memoryCodes.has(userId)) return this.memoryCodes.get(userId)!;
    const code = this.makeCode(nameHint || userId);
    this.memoryCodes.set(userId, code);
    return code;
  }

  async findReferrerByCode(codeRaw?: string | null) {
    const code = this.normalizeCode(codeRaw);
    if (!code) return null;
    if (this.db) {
      return this.db.user.findFirst({
        where: { referralCode: code },
        select: { id: true, name: true, email: true, referralCode: true, role: true }
      });
    }
    for (const [userId, c] of this.memoryCodes.entries()) {
      if (c === code) return { id: userId, name: userId, email: '', referralCode: c, role: 'investor' };
    }
    return null;
  }

  async validateCode(codeRaw?: string | null, buyerId?: string | null) {
    const referrer = await this.findReferrerByCode(codeRaw);
    if (!referrer) return { ok: false as const, error: 'invalid_code' };
    if (buyerId && referrer.id === buyerId) return { ok: false as const, error: 'self_referral' };
    return {
      ok: true as const,
      code: referrer.referralCode,
      referrer: { id: referrer.id, name: referrer.name }
    };
  }

  async resolveForBooking(codeRaw?: string | null, buyerId?: string | null) {
    const validated = await this.validateCode(codeRaw, buyerId);
    if (!validated.ok) return { referralCode: null as string | null, referredByUserId: null as string | null };
    return {
      referralCode: validated.code || this.normalizeCode(codeRaw),
      referredByUserId: validated.referrer.id
    };
  }

  async attachReferredByOnRegister(userId: string, codeRaw?: string | null) {
    const referrer = await this.findReferrerByCode(codeRaw);
    if (!referrer || referrer.id === userId) return null;
    if (this.db) {
      await this.db.user.update({
        where: { id: userId },
        data: { referredById: referrer.id }
      });
    } else {
      this.memoryReferredBy.set(userId, referrer.id);
    }
    return referrer.id;
  }

  async summaryForUser(userId: string) {
    const policy = await this.getPolicy();
    const code = await this.ensureCode(userId);
    const link = code ? `${this.siteUrl()}/invest?ref=${encodeURIComponent(code)}` : null;
    const rewards = await this.listForReferrer(userId);
    const totals = rewards.reduce(
      (acc, r) => {
        if (r.status === 'void') return acc;
        acc.totalIncentive += r.totalIncentive;
        const t1 =
          r.tranche1Status === 'earned' || r.tranche1Status === 'paid' ? r.tranche1Amount : 0;
        const t2 =
          r.tranche2Status === 'earned' || r.tranche2Status === 'paid' ? r.tranche2Amount : 0;
        acc.unlocked += t1 + t2;
        acc.waiting +=
          (r.tranche1Status === 'pending' ? r.tranche1Amount : 0) +
          (r.tranche2Status === 'pending' ? r.tranche2Amount : 0);
        acc.paid +=
          (r.tranche1Status === 'paid' ? r.tranche1Amount : 0) +
          (r.tranche2Status === 'paid' ? r.tranche2Amount : 0);
        return acc;
      },
      { totalIncentive: 0, unlocked: 0, waiting: 0, paid: 0 }
    );
    return {
      ok: true as const,
      policy,
      code,
      link,
      totals,
      rewards
    };
  }

  async listForReferrer(referrerId: string) {
    if (this.db) {
      return this.db.referralReward.findMany({
        where: { referrerId },
        orderBy: { createdAt: 'desc' }
      });
    }
    return this.memoryRewards
      .filter((r) => r.referrerId === referrerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listAll(status?: string) {
    if (this.db) {
      return this.db.referralReward.findMany({
        where: status ? { status } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          referrer: { select: { id: true, name: true, email: true, referralCode: true } },
          booking: { select: { id: true, planId: true, amountTotal: true, status: true } }
        }
      });
    }
    return this.memoryRewards
      .filter((r) => (status ? r.status === status : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Create/update reward and unlock tranche 1 (40%) when booking is confirmed.
   */
  async onBookingConfirmed(booking: {
    id: string;
    planId?: string | null;
    investorId?: string | null;
    amountTotal?: number | null;
    referredByUserId?: string | null;
    referralCode?: string | null;
    status?: string | null;
  }) {
    try {
      const policy = await this.getPolicy();
      if (!policy.enabled) return { ok: false as const, error: 'disabled' };
      if (!booking.planId) return { ok: false as const, error: 'not_investment' };

      let referrerId = booking.referredByUserId || null;
      if (!referrerId && booking.referralCode) {
        const ref = await this.findReferrerByCode(booking.referralCode);
        referrerId = ref?.id || null;
      }
      if (!referrerId && booking.investorId && this.db) {
        const buyer = await this.db.user.findUnique({
          where: { id: booking.investorId },
          select: { referredById: true }
        });
        referrerId = buyer?.referredById || null;
      }
      if (!referrerId && booking.investorId) {
        referrerId = this.memoryReferredBy.get(booking.investorId) || null;
      }
      if (!referrerId) return { ok: false as const, error: 'no_referrer' };
      if (booking.investorId && referrerId === booking.investorId) {
        return { ok: false as const, error: 'self_referral' };
      }

      const saleAmount = Math.max(0, Math.round(Number(booking.amountTotal) || 0));
      if (!saleAmount) return { ok: false as const, error: 'no_sale_amount' };

      const totalIncentive = Math.round((saleAmount * policy.incentivePct) / 100);
      const tranche1Amount = Math.round((totalIncentive * policy.tranche1Pct) / 100);
      const tranche2Amount = Math.max(0, totalIncentive - tranche1Amount);
      const now = new Date();

      if (this.db) {
        const existing = await this.db.referralReward.findUnique({ where: { bookingId: booking.id } });
        if (existing) {
          if (existing.status === 'void') return { ok: false as const, error: 'void' };
          if (existing.tranche1Status === 'earned' || existing.tranche1Status === 'paid') {
            return { ok: true as const, reward: existing, created: false };
          }
          const updated = await this.db.referralReward.update({
            where: { id: existing.id },
            data: {
              tranche1Status: 'earned',
              tranche1EarnedAt: now,
              status: this.overallStatus('earned', existing.tranche2Status)
            }
          });
          return { ok: true as const, reward: updated, created: false };
        }
        const created = await this.db.referralReward.create({
          data: {
            id: 'RR-' + Math.random().toString(36).slice(2, 10),
            referrerId,
            bookingId: booking.id,
            buyerId: booking.investorId || null,
            saleAmount,
            ratePct: policy.incentivePct,
            totalIncentive,
            tranche1Amount,
            tranche1Status: 'earned',
            tranche1EarnedAt: now,
            tranche2Amount,
            tranche2Status: 'pending',
            status: 'partial'
          }
        });
        return { ok: true as const, reward: created, created: true };
      }

      const existing = this.memoryRewards.find((r) => r.bookingId === booking.id);
      if (existing) {
        if (existing.tranche1Status === 'pending') {
          existing.tranche1Status = 'earned';
          existing.tranche1EarnedAt = now.toISOString();
          existing.status = this.overallStatus(existing.tranche1Status, existing.tranche2Status);
        }
        return { ok: true as const, reward: existing, created: false };
      }
      const reward: MemReward = {
        id: 'RR-' + Math.random().toString(36).slice(2, 10),
        referrerId,
        bookingId: booking.id,
        buyerId: booking.investorId || null,
        saleAmount,
        ratePct: policy.incentivePct,
        totalIncentive,
        tranche1Amount,
        tranche1Status: 'earned',
        tranche1EarnedAt: now.toISOString(),
        tranche2Amount,
        tranche2Status: 'pending',
        status: 'partial',
        createdAt: now.toISOString()
      };
      this.memoryRewards.push(reward);
      return { ok: true as const, reward, created: true };
    } catch (err: any) {
      this.logger.warn(`onBookingConfirmed failed: ${err?.message || err}`);
      return { ok: false as const, error: 'failed' };
    }
  }

  /** Unlock tranche 2 (60%) when downpayment schedule item is paid. */
  async onDownpaymentPaid(bookingId: string) {
    try {
      const now = new Date();
      if (this.db) {
        const reward = await this.db.referralReward.findUnique({ where: { bookingId } });
        if (!reward) return { ok: false as const, error: 'not_found' };
        if (reward.status === 'void') return { ok: false as const, error: 'void' };
        if (reward.tranche2Status === 'earned' || reward.tranche2Status === 'paid') {
          return { ok: true as const, reward, already: true };
        }
        // Ensure tranche1 is at least earned if somehow missed.
        const t1 =
          reward.tranche1Status === 'pending'
            ? { tranche1Status: 'earned', tranche1EarnedAt: now }
            : {};
        const nextT1 = reward.tranche1Status === 'pending' ? 'earned' : reward.tranche1Status;
        const updated = await this.db.referralReward.update({
          where: { id: reward.id },
          data: {
            ...t1,
            tranche2Status: 'earned',
            tranche2EarnedAt: now,
            status: this.overallStatus(nextT1, 'earned')
          }
        });
        return { ok: true as const, reward: updated };
      }
      const reward = this.memoryRewards.find((r) => r.bookingId === bookingId);
      if (!reward) return { ok: false as const, error: 'not_found' };
      if (reward.tranche1Status === 'pending') {
        reward.tranche1Status = 'earned';
        reward.tranche1EarnedAt = now.toISOString();
      }
      reward.tranche2Status = 'earned';
      reward.tranche2EarnedAt = now.toISOString();
      reward.status = this.overallStatus(reward.tranche1Status, reward.tranche2Status);
      return { ok: true as const, reward };
    } catch (err: any) {
      this.logger.warn(`onDownpaymentPaid failed: ${err?.message || err}`);
      return { ok: false as const, error: 'failed' };
    }
  }

  async voidForBooking(bookingId: string, reason?: string) {
    if (this.db) {
      const reward = await this.db.referralReward.findUnique({ where: { bookingId } });
      if (!reward) return { ok: false as const, error: 'not_found' };
      const updated = await this.db.referralReward.update({
        where: { id: reward.id },
        data: {
          status: 'void',
          tranche1Status: reward.tranche1Status === 'paid' ? 'paid' : 'void',
          tranche2Status: reward.tranche2Status === 'paid' ? 'paid' : 'void',
          voidReason: reason || 'booking_cancelled'
        }
      });
      return { ok: true as const, reward: updated };
    }
    const reward = this.memoryRewards.find((r) => r.bookingId === bookingId);
    if (!reward) return { ok: false as const, error: 'not_found' };
    reward.status = 'void';
    if (reward.tranche1Status !== 'paid') reward.tranche1Status = 'void';
    if (reward.tranche2Status !== 'paid') reward.tranche2Status = 'void';
    reward.voidReason = reason || 'booking_cancelled';
    return { ok: true as const, reward };
  }

  async markPaid(rewardId: string) {
    const now = new Date();
    if (this.db) {
      const reward = await this.db.referralReward.findUnique({ where: { id: rewardId } });
      if (!reward) return { ok: false as const, error: 'not_found' };
      if (reward.status === 'void') return { ok: false as const, error: 'void' };
      const updated = await this.db.referralReward.update({
        where: { id: rewardId },
        data: {
          tranche1Status: reward.tranche1Status === 'pending' ? 'pending' : 'paid',
          tranche2Status: reward.tranche2Status === 'pending' ? 'pending' : 'paid',
          status:
            reward.tranche1Status !== 'pending' && reward.tranche2Status !== 'pending'
              ? 'paid'
              : 'partial',
          paidAt:
            reward.tranche1Status !== 'pending' && reward.tranche2Status !== 'pending' ? now : reward.paidAt
        }
      });
      // If both unlocked, mark fully paid
      if (updated.tranche1Status !== 'pending' && updated.tranche2Status !== 'pending') {
        const full = await this.db.referralReward.update({
          where: { id: rewardId },
          data: {
            tranche1Status: 'paid',
            tranche2Status: 'paid',
            status: 'paid',
            paidAt: now
          }
        });
        return { ok: true as const, reward: full };
      }
      return { ok: true as const, reward: updated };
    }
    const reward = this.memoryRewards.find((r) => r.id === rewardId);
    if (!reward) return { ok: false as const, error: 'not_found' };
    if (reward.tranche1Status !== 'pending') reward.tranche1Status = 'paid';
    if (reward.tranche2Status !== 'pending') reward.tranche2Status = 'paid';
    if (reward.tranche1Status === 'paid' && reward.tranche2Status === 'paid') {
      reward.status = 'paid';
      reward.paidAt = now.toISOString();
    } else {
      reward.status = 'partial';
    }
    return { ok: true as const, reward };
  }
}
