'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/store/appStore';
import { captureReferralFromSearch } from '@/lib/referral';

const navLinks = [
  { href: '/invest', label: 'Invest' },
  { href: '/suites', label: 'Suites' },
  { href: '/design-layout', label: 'Design & Layout' },
  { href: '/booking', label: 'Book a Stay' },
  { href: '/investor', label: 'Dashboard' }
];

export default function Navbar() {
  const pathname = usePathname() || '';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const user = useAppStore((s) => s.user);
  const token = useAppStore((s) => s.token);
  const hydrated = useAppStore((s) => s.hydrated);
  const hydrate = useAppStore((s) => s.hydrate);
  const logout = useAppStore((s) => s.logout);
  const signedIn = hydrated && !!token && !!user;
  const displayName = (user?.name || user?.email || 'Account').trim();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    captureReferralFromSearch(typeof window !== 'undefined' ? window.location.search : '');
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function onLogout() {
    logout();
    setOpen(false);
    router.push('/');
  }

  if (pathname.startsWith('/admin')) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gold/20 bg-pearl/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex min-w-0 items-center gap-3" onClick={() => setOpen(false)}>
          <span className="relative h-10 w-10 shrink-0">
            <Image src="/images/logo.png" alt="Grand Sampan Resort" fill sizes="40px" className="object-contain" />
          </span>
          <span className="font-display truncate text-lg font-bold text-ocean sm:text-xl">
            Unitech Grand Sampan Resort
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-ocean md:flex">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-gold">
              {l.label}
            </Link>
          ))}
          {signedIn ? (
            <>
              <span className="max-w-[10rem] truncate text-ocean/80" title={displayName}>
                {displayName}
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-md border border-ocean/20 px-3 py-1.5 text-ocean transition hover:border-gold hover:text-gold"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-md border border-ocean/20 px-3 py-1.5 text-ocean transition hover:border-gold hover:text-gold"
            >
              Sign In
            </Link>
          )}
        </nav>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md border border-ocean/20 px-3 py-2 text-ocean md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? 'Close' : 'Menu'}</span>
          <span className="flex h-4 w-5 flex-col justify-between" aria-hidden>
            <span className={`h-0.5 w-full bg-ocean transition ${open ? 'translate-y-1.5 rotate-45' : ''}`} />
            <span className={`h-0.5 w-full bg-ocean transition ${open ? 'opacity-0' : ''}`} />
            <span className={`h-0.5 w-full bg-ocean transition ${open ? '-translate-y-1.5 -rotate-45' : ''}`} />
          </span>
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" className="border-t border-gold/20 bg-pearl px-6 py-4 md:hidden">
          <ul className="flex flex-col gap-1">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="block rounded-md px-3 py-3 text-ocean hover:bg-ocean/5"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            {signedIn ? (
              <>
                <li className="px-3 py-2 text-sm font-medium text-ocean/80">{displayName}</li>
                <li>
                  <button
                    type="button"
                    className="block w-full rounded-md px-3 py-3 text-left text-ocean hover:bg-ocean/5"
                    onClick={onLogout}
                  >
                    Log out
                  </button>
                </li>
              </>
            ) : (
              <li>
                <Link
                  href="/auth/login"
                  className="block rounded-md px-3 py-3 text-ocean hover:bg-ocean/5"
                  onClick={() => setOpen(false)}
                >
                  Sign In
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
