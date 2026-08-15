'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import Image from 'next/image';
import Button from '@/components/Button';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/appStore';

export default function ChangePasswordPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const token = useAppStore((s) => s.token);
  const hydrated = useAppStore((s) => s.hydrated);
  const hydrate = useAppStore((s) => s.hydrate);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace('/auth/login?next=/auth/change-password');
    }
  }, [hydrated, token, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      router.push('/auth/login?next=/auth/change-password');
      return;
    }
    if (newPassword.length < 8) {
      setStatus(t('newPasswordMin'));
      return;
    }
    if (newPassword !== confirm) {
      setStatus(t('newPasswordsMismatch'));
      return;
    }
    setStatus(t('updatingPassword'));
    const res = await api('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
    if (res?.ok) {
      setDone(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      setStatus(t('passwordChanged'));
      return;
    }
    if (res?.error === 'invalid_current_password') {
      setStatus(t('invalidCurrent'));
      return;
    }
    if (res?.error === 'password_too_short') {
      setStatus(t('newPasswordMin'));
      return;
    }
    if (res?.error === 'unauthorized') {
      setStatus(t('sessionExpired'));
      router.push('/auth/login?next=/auth/change-password');
      return;
    }
    setStatus(t('changeFailed'));
  };

  if (!hydrated || !token) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6 md:py-16">
        <p className="text-ocean/70">{t('checkingSession')}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6 md:py-16">
      <div className="mb-8 flex items-center gap-3">
        <span className="relative h-12 w-12">
          <Image src="/images/logo.png" alt={t('logoAlt')} fill sizes="48px" className="object-contain" />
        </span>
        <div>
          <p className="font-display text-lg font-semibold text-ocean">{t('brand')}</p>
          <p className="text-sm text-ocean/70">{t('changeSubtitle')}</p>
        </div>
      </div>
      <h1 className="font-display text-3xl text-ocean">{t('changeTitle')}</h1>
      <p className="mt-2 text-ocean/75">{t('changeIntro')}</p>
      {done ? (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-ocean/70">{status}</p>
          <Link href="/investor">
            <Button className="w-full">{t('backToPortal')}</Button>
          </Link>
        </div>
      ) : (
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm text-ocean">
            {t('currentPassword')}
            <input
              className="field mt-1"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm text-ocean">
            {t('newPassword')}
            <input
              className="field mt-1"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
          <label className="block text-sm text-ocean">
            {t('confirmNewPassword')}
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
            {t('saveNewPassword')}
          </Button>
          {status && <p className="text-sm text-ocean/70">{status}</p>}
        </form>
      )}
      <p className="mt-6 text-sm text-ocean/70">
        <Link href="/investor" className="font-semibold text-ocean underline">
          {t('backToPortal')}
        </Link>
      </p>
    </main>
  );
}
