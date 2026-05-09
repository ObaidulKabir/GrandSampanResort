'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/appStore';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const setAuth = useAppStore((s) => s.setAuth);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Signing in...');
    const res = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (res?.ok && res?.user?.role === 'ADMIN') {
      setAuth({ user: res.user, accessToken: res.accessToken, refreshToken: res.refreshToken });
      router.push('/admin');
      return;
    }
    setStatus('Invalid admin credentials');
  };

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-['Playfair Display'] text-4xl text-ocean">Admin Sign In</h1>
      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <input className="w-full rounded border p-3" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full rounded border p-3" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button className="w-full" type="submit">Continue</Button>
        {status && <p className="text-ocean/70">{status}</p>}
      </form>
    </main>
  );
}

