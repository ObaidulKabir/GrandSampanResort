'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import { api } from '@/lib/api';

export default function ResetPasswordPage() {
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
      setStatus('Missing reset token. Open the link from your email.');
      return;
    }
    if (password.length < 8) {
      setStatus('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setStatus('Passwords do not match.');
      return;
    }
    setStatus('Updating password…');
    const res = await api('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password })
    });
    if (res?.ok) {
      setDone(true);
      setStatus('Password updated. You can sign in with your new password.');
      return;
    }
    if (res?.error === 'expired_token') {
      setStatus('This reset link has expired. Request a new one.');
      return;
    }
    if (res?.error === 'password_too_short') {
      setStatus('Password must be at least 8 characters.');
      return;
    }
    setStatus('Invalid or used reset link. Request a new one.');
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-8 flex items-center gap-3">
        <span className="relative h-12 w-12">
          <Image src="/images/logo.png" alt="Grand Sampan Resort" fill sizes="48px" className="object-contain" />
        </span>
        <div>
          <p className="font-display text-lg font-semibold text-ocean">Unitech Grand Sampan Resort</p>
          <p className="text-sm text-ocean/70">Choose a new password</p>
        </div>
      </div>
      <h1 className="font-display text-3xl text-ocean">Reset password</h1>
      <p className="mt-2 text-ocean/75">Set a new password for your investor account.</p>
      {!token ? (
        <p className="mt-8 text-sm text-ocean/70">
          Missing reset token.{' '}
          <Link href="/auth/forgot-password" className="font-semibold text-ocean underline">
            Request a new link
          </Link>
        </p>
      ) : done ? (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-ocean/70">{status}</p>
          <Button className="w-full" onClick={() => router.push('/auth/login')}>
            Sign in
          </Button>
        </div>
      ) : (
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm text-ocean">
            New password
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
            Confirm password
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
            Update password
          </Button>
          {status && <p className="text-sm text-ocean/70">{status}</p>}
        </form>
      )}
      <p className="mt-6 text-sm text-ocean/70">
        <Link href="/auth/forgot-password" className="font-semibold text-ocean underline">
          Request another reset link
        </Link>
      </p>
    </main>
  );
}
