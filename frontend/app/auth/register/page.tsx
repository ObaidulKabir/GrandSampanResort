'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Button from '@/components/Button';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/appStore';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const setAuth = useAppStore((s) => s.setAuth);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Creating account...');
    const res = await api('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
    if (!res?.ok) {
      setStatus('Account exists');
      return;
    }
    const login = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (login?.ok && login.token && login.user) {
      setAuth({ id: login.user.id, email: login.user.email, name: login.user.name }, login.token);
      setStatus('Account created');
      router.push('/invest');
      return;
    }
    setStatus('Account created. Please sign in.');
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-8 flex items-center gap-3">
        <span className="relative h-12 w-12">
          <Image src="/images/logo.png" alt="Grand Sampan Resort" fill sizes="48px" className="object-contain" />
        </span>
        <div>
          <p className="font-display text-lg font-semibold text-ocean">Unitech Grand Sampan Resort</p>
          <p className="text-sm text-ocean/70">Start your investment</p>
        </div>
      </div>
      <h1 className="font-display text-3xl text-ocean">Create account</h1>
      <p className="mt-2 text-ocean/75">Register to buy share plans and track payments.</p>
      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm text-ocean">
          Full name
          <input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <Button className="w-full" type="submit">
          Create account
        </Button>
        {status && <p className="text-sm text-ocean/70">{status}</p>}
      </form>
      <p className="mt-6 text-sm text-ocean/70">
        Already registered?{' '}
        <Link href="/auth/login" className="font-semibold text-ocean underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
