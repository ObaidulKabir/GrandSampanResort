'use client';
import { useState } from 'react';
import Button from '@/components/Button';
import { useAppStore } from '@/store/appStore';
import { api } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const setUser = useAppStore((s) => s.setUser);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Signing in...');
    const res = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (res?.ok) {
      setUser({ id: res.user.id, email: res.user.email });
      setStatus('Signed in');
      return;
    }
    setStatus('Invalid credentials');
  };
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-['Playfair Display'] text-4xl text-ocean">Sign In</h1>
      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <input className="w-full rounded border p-3" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full rounded border p-3" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button className="w-full" type="submit">Continue</Button>
        {status && <p className="text-ocean/70">{status}</p>}
      </form>
    </main>
  );
}
