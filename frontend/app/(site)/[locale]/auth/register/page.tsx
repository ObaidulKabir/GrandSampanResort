'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import Image from 'next/image';
import Button from '@/components/Button';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import {
  captureReferralFromSearch,
  getStoredReferralCode,
  normalizeReferralCode,
  setStoredReferralCode
} from '@/lib/referral';
import { clearAllBookingDrafts } from '@/lib/bookingDraft';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const setAuth = useAppStore((s) => s.setAuth);
  const router = useRouter();

  useEffect(() => {
    clearAllBookingDrafts();
    captureReferralFromSearch(typeof window !== 'undefined' ? window.location.search : '');
    setReferralCode(getStoredReferralCode() || '');
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(t('creatingAccount'));
    const code = normalizeReferralCode(referralCode);
    if (code) setStoredReferralCode(code);
    const res = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, referralCode: code || undefined })
    });
    if (!res?.ok) {
      setStatus(t('accountExists'));
      return;
    }
    const login = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (login?.ok && login.token && login.user) {
      setAuth(
        {
          id: login.user.id,
          email: login.user.email,
          name: login.user.name,
          emailVerified: !!login.user.emailVerified,
          role: login.user.role,
          kyc: login.user.kyc
        },
        login.token
      );
      setStatus(t('accountCreatedVerify'));
      const next =
        typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('next') : null;
      router.push(next ? `/auth/verify?next=${encodeURIComponent(next)}` : '/auth/verify');
      return;
    }
    setStatus(t('accountCreatedSignIn'));
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6 md:py-16">
      <div className="mb-8 flex items-center gap-3">
        <span className="relative h-12 w-12">
          <Image src="/images/logo.png" alt={t('logoAlt')} fill sizes="48px" className="object-contain" />
        </span>
        <div>
          <p className="font-display text-lg font-semibold text-ocean">{t('brand')}</p>
          <p className="text-sm text-ocean/70">{t('registerSubtitle')}</p>
        </div>
      </div>
      <h1 className="font-display text-3xl text-ocean">{t('registerTitle')}</h1>
      <p className="mt-2 text-ocean/75">{t('registerIntro')}</p>
      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm text-ocean">
          {t('fullName')}
          <input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block text-sm text-ocean">
          {t('email')}
          <input
            className="field mt-1"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm text-ocean">
          {t('password')}
          <input
            className="field mt-1"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm text-ocean">
          {t('referralOptional')} <span className="font-normal text-ocean/55">{t('optional')}</span>
          <input
            className="field mt-1 uppercase tracking-wide"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            placeholder={t('referralPlaceholder')}
            autoComplete="off"
          />
        </label>
        <Button className="w-full" type="submit">
          {t('createAccount')}
        </Button>
        {status && <p className="text-sm text-ocean/70">{status}</p>}
      </form>
      <p className="mt-6 text-sm text-ocean/70">
        {t('alreadyRegistered')}{' '}
        <Link href="/auth/login" className="font-semibold text-ocean underline">
          {t('signIn')}
        </Link>
      </p>
    </main>
  );
}
