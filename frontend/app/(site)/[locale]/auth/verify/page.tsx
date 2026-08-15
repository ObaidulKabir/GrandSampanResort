'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import Image from 'next/image';
import Button from '@/components/Button';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/appStore';

export default function VerifyEmailPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const token = useAppStore((s) => s.token);
  const user = useAppStore((s) => s.user);
  const setAuth = useAppStore((s) => s.setAuth);
  const patchUser = useAppStore((s) => s.patchUser);
  const hydrate = useAppStore((s) => s.hydrate);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [nextPath, setNextPath] = useState('/invest');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    setStatus(t('checking'));
  }, [t]);

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const verifyToken = params.get('token');
    const next = params.get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      setNextPath(next);
    }
    if (!verifyToken) {
      if (user?.emailVerified) {
        setVerified(true);
        setStatus(t('alreadyVerified'));
      } else if (token) {
        setStatus(t('checkInbox'));
      } else {
        setStatus(t('signInToVerify'));
      }
      return;
    }

    let cancelled = false;
    (async () => {
      setStatus(t('verifying'));
      const res = await api(`/auth/verify-email?token=${encodeURIComponent(verifyToken)}`);
      if (cancelled) return;
      if (res?.ok && res.user) {
        if (token) {
          patchUser({
            emailVerified: true,
            email: res.user.email,
            name: res.user.name,
            id: res.user.id
          });
        }
        setVerified(true);
        setStatus(res.already ? t('emailAlreadyVerified') : t('emailVerified'));
        return;
      }
      if (res?.error === 'expired_token') {
        setStatus(t('verifyExpired'));
        return;
      }
      setStatus(t('verifyInvalid'));
    })();

    return () => {
      cancelled = true;
    };
  }, [token, user?.emailVerified, patchUser, t]);

  async function resend() {
    if (!token) {
      router.push('/auth/login?next=/auth/verify');
      return;
    }
    setBusy(true);
    setStatus(t('sendingVerify'));
    const res = await api('/auth/resend-verification', { method: 'POST', body: JSON.stringify({}) });
    setBusy(false);
    if (res?.ok && res.already) {
      patchUser({ emailVerified: true });
      setVerified(true);
      setStatus(t('alreadyVerifiedShort'));
      return;
    }
    if (res?.ok) {
      if (res.user) {
        setAuth(
          {
            id: res.user.id,
            email: res.user.email,
            name: res.user.name,
            emailVerified: !!res.user.emailVerified,
            role: res.user.role,
            kyc: res.user.kyc
          },
          token
        );
      }
      setStatus(t('verifySent'));
      return;
    }
    setStatus(res?.error === 'send_failed' ? t('sendFailed') : t('resendFailed'));
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6 md:py-16">
      <div className="mb-8 flex items-center gap-3">
        <span className="relative h-12 w-12">
          <Image src="/images/logo.png" alt={t('logoAlt')} fill sizes="48px" className="object-contain" />
        </span>
        <div>
          <p className="font-display text-lg font-semibold text-ocean">{t('brand')}</p>
          <p className="text-sm text-ocean/70">{t('verifySubtitle')}</p>
        </div>
      </div>
      <h1 className="font-display text-3xl text-ocean">{t('verifyTitle')}</h1>
      <p className="mt-2 text-ocean/75">{t('verifyIntro')}</p>
      <p className="mt-6 text-sm text-ocean/80">{status}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {!verified && (
          <Button onClick={resend} disabled={busy}>
            {busy ? t('sending') : token ? t('resendVerify') : t('signInToResend')}
          </Button>
        )}
        {verified ? (
          <Link href={nextPath}>
            <Button>{t('continue')}</Button>
          </Link>
        ) : (
          <Link href="/invest">
            <Button variant="outline">{t('browsePlans')}</Button>
          </Link>
        )}
      </div>
      {!token && (
        <p className="mt-6 text-sm text-ocean/70">
          <Link href="/auth/login?next=/auth/verify" className="font-semibold text-ocean underline">
            {t('signIn')}
          </Link>
        </p>
      )}
    </main>
  );
}
