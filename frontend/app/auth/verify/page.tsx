'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/appStore';

export default function VerifyEmailPage() {
  const router = useRouter();
  const token = useAppStore((s) => s.token);
  const user = useAppStore((s) => s.user);
  const setAuth = useAppStore((s) => s.setAuth);
  const patchUser = useAppStore((s) => s.patchUser);
  const hydrate = useAppStore((s) => s.hydrate);
  const [status, setStatus] = useState('Checking…');
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [nextPath, setNextPath] = useState('/invest');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

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
        setStatus('Your email is already verified. You can book investment plans.');
      } else if (token) {
        setStatus('Check your inbox for a verification link, or resend it below.');
      } else {
        setStatus('Sign in, then resend a verification email — or open the link from your inbox.');
      }
      return;
    }

    let cancelled = false;
    (async () => {
      setStatus('Verifying your email…');
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
        setStatus(
          res.already
            ? 'Email already verified. You can book investment plans.'
            : 'Email verified. You can now submit investment bookings.'
        );
        return;
      }
      if (res?.error === 'expired_token') {
        setStatus('This verification link has expired. Sign in and resend a new link.');
        return;
      }
      setStatus('Invalid verification link. Sign in and resend a new one.');
    })();

    return () => {
      cancelled = true;
    };
  }, [token, user?.emailVerified, patchUser]);

  async function resend() {
    if (!token) {
      router.push('/auth/login?next=/auth/verify');
      return;
    }
    setBusy(true);
    setStatus('Sending verification email…');
    const res = await api('/auth/resend-verification', { method: 'POST', body: JSON.stringify({}) });
    setBusy(false);
    if (res?.ok && res.already) {
      patchUser({ emailVerified: true });
      setVerified(true);
      setStatus('Your email is already verified.');
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
      setStatus('Verification email sent. Check your inbox (and spam).');
      return;
    }
    setStatus(res?.error === 'send_failed' ? 'Could not send email. Try again later.' : 'Could not resend.');
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-8 flex items-center gap-3">
        <span className="relative h-12 w-12">
          <Image src="/images/logo.png" alt="Grand Sampan Resort" fill sizes="48px" className="object-contain" />
        </span>
        <div>
          <p className="font-display text-lg font-semibold text-ocean">Unitech Grand Sampan Resort</p>
          <p className="text-sm text-ocean/70">Email verification</p>
        </div>
      </div>
      <h1 className="font-display text-3xl text-ocean">Verify your email</h1>
      <p className="mt-2 text-ocean/75">
        You can sign in without verifying, but investment bookings require a verified account email.
      </p>
      <p className="mt-6 text-sm text-ocean/80">{status}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {!verified && (
          <Button onClick={resend} disabled={busy}>
            {busy ? 'Sending…' : token ? 'Resend verification email' : 'Sign in to resend'}
          </Button>
        )}
        {verified ? (
          <Link href={nextPath}>
            <Button>Continue</Button>
          </Link>
        ) : (
          <Link href="/invest">
            <Button variant="outline">Browse plans</Button>
          </Link>
        )}
      </div>
      {!token && (
        <p className="mt-6 text-sm text-ocean/70">
          <Link href="/auth/login?next=/auth/verify" className="font-semibold text-ocean underline">
            Sign in
          </Link>
        </p>
      )}
    </main>
  );
}
