'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/store/appStore';
import { captureReferralFromSearch } from '@/lib/referral';
import Badge from '@/components/ui/Badge';

const navLinks = [
  { href: '/invest', label: 'Invest Plans', highlight: true },
  { href: '/suites', label: 'Suites & Floorplan' },
  { href: '/returns-income', label: 'ROI Calculator' },
  { href: '/design-layout', label: 'Architecture' },
  { href: '/trust', label: 'Trust & Legal' },
  { href: '/booking', label: 'Book a Stay' }
];

export default function Navbar() {
  const pathname = usePathname() || '';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const user = useAppStore((s) => s.user);
  const token = useAppStore((s) => s.token);
  const hydrated = useAppStore((s) => s.hydrated);
  const hydrate = useAppStore((s) => s.hydrate);
  const logout = useAppStore((s) => s.logout);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const signedIn = hydrated && !!token && !!user;
  const displayName = (user?.name || user?.email?.split('@')[0] || 'Account').trim();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    captureReferralFromSearch(typeof window !== 'undefined' ? window.location.search : '');
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
    setUserDropdown(false);
  }, [pathname]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function onLogout() {
    logout();
    setOpen(false);
    setUserDropdown(false);
    router.push('/');
  }

  if (pathname.startsWith('/admin')) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gold/20 bg-pearl/95 backdrop-blur-md transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 md:py-3.5">
        <Link href="/" className="group flex min-w-0 items-center gap-2.5 sm:gap-3" onClick={() => setOpen(false)}>
          <span className="relative h-9 w-9 shrink-0 transition-transform group-hover:scale-105 sm:h-10 sm:w-10">
            <Image src="/images/logo.png" alt="Grand Sampan Resort" fill sizes="40px" className="object-contain" priority />
          </span>
          <div className="flex flex-col">
            <span className="font-display truncate text-base font-bold tracking-tight text-ocean sm:text-lg">
              <span className="sm:hidden">Grand Sampan</span>
              <span className="hidden sm:inline">Unitech Grand Sampan Resort</span>
            </span>
            <span className="hidden text-[10px] font-semibold uppercase tracking-widest text-[#997D25] sm:inline">
              Inani Beach · Cox&apos;s Bazar
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:gap-2 text-sm font-medium text-ocean lg:flex">
          {navLinks.map((l) => {
            const active = pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href + '/'));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative rounded-md px-3 py-1.5 transition-all ${
                  active
                    ? 'font-semibold text-ocean'
                    : 'text-ocean/75 hover:bg-ocean/5 hover:text-ocean'
                }`}
              >
                {l.label}
                {active && (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-gold" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {signedIn ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdown((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-gold/40 bg-white px-3.5 py-1.5 text-xs font-semibold text-ocean shadow-sm transition hover:border-gold hover:shadow"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ocean text-[10px] text-white">
                  {displayName.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[8rem] truncate">{displayName}</span>
                <span className="text-[10px] text-ocean/50">▼</span>
              </button>

              {userDropdown && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gold/30 bg-white p-2 shadow-2xl animate-fade-up">
                  <div className="border-b border-ocean/10 px-3 py-2">
                    <p className="text-xs text-ocean/60">Signed in as</p>
                    <p className="truncate text-sm font-semibold text-ocean">{user?.email}</p>
                    {user?.kyc && (
                      <div className="mt-1">
                        <Badge variant="success" size="sm" dot>KYC Verified</Badge>
                      </div>
                    )}
                  </div>
                  <div className="py-1">
                    <Link
                      href="/investor"
                      onClick={() => setUserDropdown(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ocean transition hover:bg-pearl"
                    >
                      <span>📊</span>
                      <span>Owner Portfolio</span>
                    </Link>
                    <Link
                      href="/invest/advisor"
                      onClick={() => setUserDropdown(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ocean transition hover:bg-pearl"
                    >
                      <span>✨</span>
                      <span>AI Investment Advisor</span>
                    </Link>
                    <Link
                      href="/auth/change-password"
                      onClick={() => setUserDropdown(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ocean transition hover:bg-pearl"
                    >
                      <span>🔒</span>
                      <span>Change Password</span>
                    </Link>
                  </div>
                  <div className="border-t border-ocean/10 pt-1">
                    <button
                      type="button"
                      onClick={onLogout}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50"
                    >
                      <span>🚪</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="rounded-md border border-ocean/20 px-3.5 py-1.5 text-xs font-semibold text-ocean transition hover:border-gold hover:text-gold"
              >
                Sign In
              </Link>
              <Link
                href="/invest"
                className="rounded-md bg-ocean px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-ocean/90"
              >
                Explore Plans
              </Link>
            </div>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-ocean/20 text-ocean md:hidden"
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
        <nav
          id="mobile-nav"
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-gold/20 bg-pearl px-4 pb-8 pt-3 shadow-2xl md:hidden animate-fade-in"
        >
          <div className="mb-3 border-b border-ocean/10 pb-3">
            {signedIn ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-ocean/60">Welcome back,</p>
                  <p className="font-semibold text-ocean">{displayName}</p>
                </div>
                <Link
                  href="/investor"
                  onClick={() => setOpen(false)}
                  className="rounded-md bg-ocean px-3 py-1.5 text-xs font-semibold text-white"
                >
                  My Portfolio
                </Link>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/auth/login"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-md border border-ocean/20 bg-white py-2 text-center text-xs font-semibold text-ocean"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-md bg-ocean py-2 text-center text-xs font-semibold text-white"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>

          <ul className="flex flex-col space-y-1">
            {navLinks.map((l) => {
              const active = pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href + '/'));
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={`block rounded-lg px-3 py-2.5 text-base transition ${
                      active
                        ? 'bg-white font-bold text-ocean shadow-sm'
                        : 'text-ocean/80 hover:bg-white/60 hover:text-ocean'
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
            {signedIn && (
              <>
                <li className="pt-2 border-t border-ocean/10">
                  <Link
                    href="/investor"
                    className="block rounded-lg px-3 py-2.5 text-base font-semibold text-ocean hover:bg-white/60"
                    onClick={() => setOpen(false)}
                  >
                    📊 Owner Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    href="/invest/advisor"
                    className="block rounded-lg px-3 py-2.5 text-base font-semibold text-ocean hover:bg-white/60"
                    onClick={() => setOpen(false)}
                  >
                    ✨ AI Investment Advisor
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    className="block w-full rounded-lg px-3 py-2.5 text-left text-base text-rose-600 hover:bg-rose-50"
                    onClick={onLogout}
                  >
                    🚪 Sign Out
                  </button>
                </li>
              </>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
