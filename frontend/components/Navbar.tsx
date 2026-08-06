'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/invest', label: 'Invest' },
  { href: '/suites', label: 'Suites' },
  { href: '/booking', label: 'Book a Stay' },
  { href: '/investor', label: 'Dashboard' },
  { href: '/auth/login', label: 'Sign In' }
];

export default function Navbar() {
  const pathname = usePathname() || '';
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

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
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-gold transition-colors">
              {l.label}
            </Link>
          ))}
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
        <nav
          id="mobile-nav"
          className="border-t border-gold/20 bg-pearl px-6 py-4 md:hidden"
        >
          <ul className="flex flex-col gap-1">
            {links.map((l) => (
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
          </ul>
        </nav>
      )}
    </header>
  );
}
