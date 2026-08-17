'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import Image from 'next/image';
import Button from '@/components/Button';
import { useAppStore } from '@/store/appStore';
import { api } from '@/lib/api';
import { clearAllBookingDrafts } from '@/lib/bookingDraft';

export default function LoginPage() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [registerHref, setRegisterHref] = useState('/auth/register');
  const setAuth = useAppStore((s) => s.setAuth);
  const router = useRouter();

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get('next');
    setRegisterHref(next ? `/auth/register?next=${encodeURIComponent(next)}` : '/auth/register');
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(t('signingIn'));
    const res = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (res?.ok && res.token && res.user) {
      setAuth(
        {
          id: res.user.id,
          email: res.user.email,
          name: res.user.name,
          emailVerified: !!res.user.emailVerified,
          role: res.user.role,
          kyc: res.user.kyc
        },
        res.token
      );
      setStatus(t('signedIn'));
      const next =
        typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('next') : null;
      if (!res.user.emailVerified && res.user.role !== 'admin') {
        router.push(next ? `/auth/verify?next=${encodeURIComponent(next)}` : '/auth/verify');
        return;
      }
      router.push(next || '/investor');
      return;
    }
    setStatus(t('invalidCredentials'));
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6 md:py-16">
      <div className="mb-8 flex items-center gap-3">
        <span className="relative h-12 w-12">
          <Image src="/images/logo.png" alt={t('logoAlt')} fill sizes="48px" className="object-contain" />
        </span>
        <div>
          <p className="font-display text-lg font-semibold text-ocean">{t('brand')}</p>
          <p className="text-sm text-ocean/70">{t('loginSubtitle')}</p>
        </div>
      </div>
      <h1 className="font-display text-3xl text-ocean">{t('loginTitle')}</h1>
      <p className="mt-2 text-ocean/75">{t('loginIntro')}</p>
      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <p className="text-right text-sm">
          <Link href="/auth/forgot-password" className="font-semibold text-ocean underline">
            {t('forgotPassword')}
          </Link>
        </p>
        <Button className="w-full" type="submit">
          {t('continue')}
        </Button>
        {status && <p className="text-sm text-ocean/70">{status}</p>}
      </form>
      <p className="mt-6 text-sm text-ocean/70">
        {t('newInvestor')}{' '}
        <Link
          href={registerHref}
          className="font-semibold text-ocean underline"
          onClick={() => clearAllBookingDrafts()}
        >
          {t('createAccount')}
        </Link>
      </p>
    </main>
  );
}
