'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import Button from '@/components/Button';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(t('sendingReset'));
    const res = await api('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    if (res?.ok) {
      setSent(true);
      setStatus(t('resetSent'));
      return;
    }
    setStatus(t('resetSendFailed'));
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6 md:py-16">
      <div className="mb-8 flex items-center gap-3">
        <span className="relative h-12 w-12">
          <Image src="/images/logo.png" alt={t('logoAlt')} fill sizes="48px" className="object-contain" />
        </span>
        <div>
          <p className="font-display text-lg font-semibold text-ocean">{t('brand')}</p>
          <p className="text-sm text-ocean/70">{t('forgotSubtitle')}</p>
        </div>
      </div>
      <h1 className="font-display text-3xl text-ocean">{t('forgotTitle')}</h1>
      <p className="mt-2 text-ocean/75">{t('forgotIntro')}</p>
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
            disabled={sent}
          />
        </label>
        <Button className="w-full" type="submit" disabled={sent}>
          {sent ? t('emailSent') : t('sendResetLink')}
        </Button>
        {status && <p className="text-sm text-ocean/70">{status}</p>}
      </form>
      <p className="mt-6 text-sm text-ocean/70">
        <Link href="/auth/login" className="font-semibold text-ocean underline">
          {t('backToSignIn')}
        </Link>
      </p>
    </main>
  );
}
