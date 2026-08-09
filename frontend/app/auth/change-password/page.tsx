'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/appStore';

export default function ChangePasswordPage() {
  const router = useRouter();
  const token = useAppStore((s) => s.token);
  const hydrated = useAppStore((s) => s.hydrated);
  const hydrate = useAppStore((s) => s.hydrate);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace('/auth/login?next=/auth/change-password');
    }
  }, [hydrated, token, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      router.push('/auth/login?next=/auth/change-password');
      return;
    }
    if (newPassword.length < 8) {
      setStatus('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirm) {
      setStatus('New passwords do not match.');
      return;
    }
    setStatus('Updating password…');
    const res = await api('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
    if (res?.ok) {
      setDone(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      setStatus('Password changed successfully.');
      return;
    }
    if (res?.error === 'invalid_current_password') {
      setStatus('Current password is incorrect.');
      return;
    }
    if (res?.error === 'password_too_short') {
      setStatus('New password must be at least 8 characters.');
      return;
    }
    if (res?.error === 'unauthorized') {
      setStatus('Session expired. Sign in again.');
      router.push('/auth/login?next=/auth/change-password');
      return;
    }
    setStatus('Could not change password. Try again.');
  };

  if (!hydrated || !token) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
        <p className="text-ocean/70">Checking session…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-8 flex items-center gap-3">
        <span className="relative h-12 w-12">
          <Image src="/images/logo.png" alt="Grand Sampan Resort" fill sizes="48px" className="object-contain" />
        </span>
        <div>
          <p className="font-display text-lg font-semibold text-ocean">Unitech Grand Sampan Resort</p>
          <p className="text-sm text-ocean/70">Account security</p>
        </div>
      </div>
      <h1 className="font-display text-3xl text-ocean">Change password</h1>
      <p className="mt-2 text-ocean/75">Update the password for your signed-in account.</p>
      {done ? (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-ocean/70">{status}</p>
          <Link href="/investor">
            <Button className="w-full">Back to portal</Button>
          </Link>
        </div>
      ) : (
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm text-ocean">
            Current password
            <input
              className="field mt-1"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm text-ocean">
            New password
            <input
              className="field mt-1"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
          <label className="block text-sm text-ocean">
            Confirm new password
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
            Save new password
          </Button>
          {status && <p className="text-sm text-ocean/70">{status}</p>}
        </form>
      )}
      <p className="mt-6 text-sm text-ocean/70">
        <Link href="/investor" className="font-semibold text-ocean underline">
          Back to portal
        </Link>
      </p>
    </main>
  );
}
