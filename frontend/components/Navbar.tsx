'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useAppStore } from '@/store/appStore';
import { captureReferralFromSearch } from '@/lib/referral';
import LocaleSwitcher from '@/components/LocaleSwitcher';

export default function Navbar() {
  const t = useTranslations('nav');
  const pathname = usePathname() || '';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const user = useAppStore((s) => s.user);
  const token = useAppStore((s) => s.token);
  const hydrated = useAppStore((s) => s.hydrated);
  const hydrate = useAppStore((s) => s.hydrate);
  const logout = useAppStore((s) => s.logout);
  const signedIn = hydrated && !!token && !!user;
  const displayName = (user?.name || user?.email || t('account')).trim();

  const navLinks = [
    { href: '/invest' as const, label: t('invest') },
    { href: '/returns-income' as const, label: t('returns') },
    { href: '/suites' as const, label: t('suites') },
    { href: '/design-layout' as const, label: t('designLayout') },
    { href: '/booking' as const, label: t('bookStay') },
    { href: '/investor' as const, label: t('dashboard') }
  ];

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    captureReferralFromSearch(typeof window !== 'undefined' ? window.location.search : '');
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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
    router.push('/');
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gold/20 bg-pearl/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 md:py-4">
        <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3" onClick={() => setOpen(false)}>
          <span className="relative h-9 w-9 shrink-0 sm:h-10 sm:w-10">
            <Image src="/images/logo.png" alt={t('logoAlt')} fill sizes="40px" className="object-contain" />
          </span>
          <span className="font-display truncate text-base font-bold text-ocean sm:text-lg md:text-xl">
            <span className="sm:hidden">{t('brandShort')}</span>
            <span className="hidden sm:inline">{t('brandFull')}</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-4 text-sm font-medium text-ocean lg:flex">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-gold">
              {l.label}
            </Link>
          ))}
          <LocaleSwitcher compact />
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
                {t('logOut')}
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-md border border-ocean/20 px-3 py-1.5 text-ocean transition hover:border-gold hover:text-gold"
            >
              {t('signIn')}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <LocaleSwitcher compact />
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-ocean/20 text-ocean"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? t('closeMenu') : t('openMenu')}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">{open ? t('close') : t('menu')}</span>
            <span className="flex h-4 w-5 flex-col justify-between" aria-hidden>
              <span className={`h-0.5 w-full bg-ocean transition ${open ? 'translate-y-1.5 rotate-45' : ''}`} />
              <span className={`h-0.5 w-full bg-ocean transition ${open ? 'opacity-0' : ''}`} />
              <span className={`h-0.5 w-full bg-ocean transition ${open ? '-translate-y-1.5 -rotate-45' : ''}`} />
            </span>
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          className="max-h-[min(32rem,calc(100dvh-3.5rem))] overflow-y-auto border-t border-gold/20 bg-pearl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
        >
          <ul className="flex flex-col">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`block rounded-md px-3 py-3.5 text-base ${
                    pathname === l.href || pathname.startsWith(`${l.href}/`)
                      ? 'bg-ocean/5 font-semibold text-ocean'
                      : 'text-ocean hover:bg-ocean/5'
                  }`}
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
                    className="block w-full rounded-md px-3 py-3.5 text-left text-base text-ocean hover:bg-ocean/5"
                    onClick={onLogout}
                  >
                    {t('logOut')}
                  </button>
                </li>
              </>
            ) : (
              <li>
                <Link
                  href="/auth/login"
                  className="block rounded-md px-3 py-3.5 text-base text-ocean hover:bg-ocean/5"
                  onClick={() => setOpen(false)}
                >
                  {t('signIn')}
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
