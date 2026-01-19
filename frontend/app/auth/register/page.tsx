'use client';
import { useState } from 'react';
import Button from '@/components/Button';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Creating account...');
    const res = await api('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
    if (res?.ok) {
      setStatus('Account created. Please sign in.');
      return;
    }
    setStatus('Account exists');
  };
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-['Playfair Display'] text-4xl text-ocean">Create Account</h1>
      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <input className="w-full rounded border p-3" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="w-full rounded border p-3" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full rounded border p-3" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button className="w-full" type="submit">Sign Up</Button>
        {status && <p className="text-ocean/70">{status}</p>}
      </form>
    </main>
  );
}

