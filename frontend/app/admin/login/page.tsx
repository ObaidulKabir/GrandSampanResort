'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Button from '@/components/Button';
import { useAppStore } from '@/store/appStore';
import { api } from '@/lib/api';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAppStore((s) => s.setAuth);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      if (!res?.ok || !res.token || !res.user) {
        setError('Invalid email or password.');
        setLoading(false);
        return;
      }
      if (res.user.role !== 'admin') {
        setError('This account does not have admin access.');
        setLoading(false);
        return;
      }
      setAuth({ id: res.user.id, email: res.user.email, name: res.user.name }, res.token);
      router.replace('/admin');
    } catch {
      setError('Sign in failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#0b2436_0%,#0f3145_100%)] px-6">
      <div className="w-full max-w-sm border border-white/10 bg-white p-8 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="relative h-10 w-10 shrink-0">
            <Image src="/images/logo.png" alt="Grand Sampan Resort" fill sizes="40px" className="object-contain" />
          </span>
          <div>
            <p className="font-display text-base font-semibold text-ocean">Grand Sampan</p>
            <p className="text-xs uppercase tracking-wide text-ocean/60">Operations</p>
          </div>
        </div>
        <h1 className="font-display mt-6 text-2xl text-ocean">Admin sign in</h1>
        <p className="mt-1 text-sm text-ocean/70">Restricted to authorized staff.</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm text-ocean">
            Email
            <input
              className="field mt-1"
              type="email"
              autoComplete="username"
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
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
