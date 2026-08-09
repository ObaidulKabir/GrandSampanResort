'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Button from '@/components/Button';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Sending reset link…');
    const res = await api('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    if (res?.ok) {
      setSent(true);
      setStatus('If an account exists for that email, a reset link has been sent. Check your inbox and spam.');
      return;
    }
    setStatus('Could not send reset email. Try again later.');
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-8 flex items-center gap-3">
        <span className="relative h-12 w-12">
          <Image src="/images/logo.png" alt="Grand Sampan Resort" fill sizes="48px" className="object-contain" />
        </span>
        <div>
          <p className="font-display text-lg font-semibold text-ocean">Unitech Grand Sampan Resort</p>
          <p className="text-sm text-ocean/70">Password recovery</p>
        </div>
      </div>
      <h1 className="font-display text-3xl text-ocean">Forgot password</h1>
      <p className="mt-2 text-ocean/75">Enter your account email and we will send a reset link.</p>
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
            disabled={sent}
          />
        </label>
        <Button className="w-full" type="submit" disabled={sent}>
          {sent ? 'Email sent' : 'Send reset link'}
        </Button>
        {status && <p className="text-sm text-ocean/70">{status}</p>}
      </form>
      <p className="mt-6 text-sm text-ocean/70">
        <Link href="/auth/login" className="font-semibold text-ocean underline">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
