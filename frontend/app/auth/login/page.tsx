'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Button from '@/components/Button';
import { useAppStore } from '@/store/appStore';
import { api } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const setAuth = useAppStore((s) => s.setAuth);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Signing in...');
    const res = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (res?.ok && res.token && res.user) {
      setAuth({ id: res.user.id, email: res.user.email, name: res.user.name }, res.token);
      setStatus('Signed in');
      const next =
        typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('next') : null;
      router.push(next || '/investor');
      return;
    }
    setStatus('Invalid credentials');
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-8 flex items-center gap-3">
        <span className="relative h-12 w-12">
          <Image src="/images/logo.png" alt="Grand Sampan Resort" fill sizes="48px" className="object-contain" />
        </span>
        <div>
          <p className="font-display text-lg font-semibold text-ocean">Unitech Grand Sampan Resort</p>
          <p className="text-sm text-ocean/70">Investor sign in</p>
        </div>
      </div>
      <h1 className="font-display text-3xl text-ocean">Welcome back</h1>
      <p className="mt-2 text-ocean/75">Access your holdings, schedules, and payments.</p>
      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm text-ocean">
          Email
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
          Password
          <input
            className="field mt-1"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <Button className="w-full" type="submit">
          Continue
        </Button>
        {status && <p className="text-sm text-ocean/70">{status}</p>}
      </form>
      <p className="mt-6 text-sm text-ocean/70">
        New investor?{' '}
        <Link href="/auth/register" className="font-semibold text-ocean underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
