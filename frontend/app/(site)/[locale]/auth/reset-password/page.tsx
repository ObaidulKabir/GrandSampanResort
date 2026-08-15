'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import Image from 'next/image';
import Button from '@/components/Button';
import { api } from '@/lib/api';

export default function ResetPasswordPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    setToken(params.get('token') || '');
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setStatus(t('missingToken'));
      return;
    }
    if (password.length < 8) {
      setStatus(t('passwordMin'));
      return;
    }
    if (password !== confirm) {
      setStatus(t('passwordsMismatch'));
      return;
    }
    setStatus(t('updatingPassword'));
    const res = await api('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password })
    });
    if (res?.ok) {
      setDone(true);
      setStatus(t('passwordUpdated'));
      return;
    }
    if (res?.error === 'expired_token') {
      setStatus(t('expiredToken'));
      return;
    }
    if (res?.error === 'password_too_short') {
      setStatus(t('passwordMin'));
      return;
    }
    setStatus(t('invalidToken'));
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6 md:py-16">
      <div className="mb-8 flex items-center gap-3">
        <span className="relative h-12 w-12">
          <Image src="/images/logo.png" alt={t('logoAlt')} fill sizes="48px" className="object-contain" />
        </span>
        <div>
          <p className="font-display text-lg font-semibold text-ocean">{t('brand')}</p>
          <p className="text-sm text-ocean/70">{t('resetSubtitle')}</p>
        </div>
      </div>
      <h1 className="font-display text-3xl text-ocean">{t('resetTitle')}</h1>
      <p className="mt-2 text-ocean/75">{t('resetIntro')}</p>
      {!token ? (
        <p className="mt-8 text-sm text-ocean/70">
          {t('missingTokenShort')}{' '}
          <Link href="/auth/forgot-password" className="font-semibold text-ocean underline">
            {t('requestNewLink')}
          </Link>
        </p>
      ) : done ? (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-ocean/70">{status}</p>
          <Button className="w-full" onClick={() => router.push('/auth/login')}>
            {t('signIn')}
          </Button>
        </div>
      ) : (
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm text-ocean">
            {t('newPassword')}
            <input
              className="field mt-1"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
          <label className="block text-sm text-ocean">
            {t('confirmPassword')}
            <input
              className="field mt-1"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              required
            />
          </label>
          <Button className="w-full" type="submit">
            {t('updatePassword')}
          </Button>
          {status && <p className="text-sm text-ocean/70">{status}</p>}
        </form>
      )}
      <p className="mt-6 text-sm text-ocean/70">
        <Link href="/auth/forgot-password" className="font-semibold text-ocean underline">
          {t('requestAnother')}
        </Link>
      </p>
    </main>
  );
}
