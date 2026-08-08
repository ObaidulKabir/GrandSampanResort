'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import AdminShell from './AdminShell';

type AdminUser = { id: string; name: string; email: string };

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const isLoginPage = pathname === '/admin/login';
  const [status, setStatus] = useState<'checking' | 'ok' | 'denied'>('checking');
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    if (isLoginPage) {
      setStatus('ok');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const hasToken = typeof window !== 'undefined' && !!window.localStorage.getItem('gsr_token');
        if (!hasToken) {
          if (!cancelled) {
            setStatus('denied');
            router.replace('/admin/login');
          }
          return;
        }
        const res = await api('/auth/me');
        if (cancelled) return;
        if (res?.ok && res.user?.role === 'admin') {
          setAdminUser({ id: res.user.id, name: res.user.name, email: res.user.email });
          setStatus('ok');
        } else {
          setStatus('denied');
          router.replace('/admin/login');
        }
      } catch {
        if (!cancelled) {
          setStatus('denied');
          router.replace('/admin/login');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isLoginPage]);

  if (isLoginPage) return <>{children}</>;

  if (status !== 'ok') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pearl text-ocean/70">
        <p className="text-sm">Checking admin access...</p>
      </div>
    );
  }

  return <AdminShell adminUser={adminUser}>{children}</AdminShell>;
}
