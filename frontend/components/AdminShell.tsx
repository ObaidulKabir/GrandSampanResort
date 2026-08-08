'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/admin', label: 'Home', exact: true },
  { href: '/admin/sales', label: 'Sales Desk' },
  { href: '/admin/units', label: 'Units' },
  { href: '/admin/units/new', label: 'New Unit' },
  { href: '/admin/media', label: 'Media' },
  { href: '/admin/faq', label: 'FAQ' },
  { href: '/admin/terms', label: 'Terms' },
  { href: '/admin/policy', label: 'Policy' }
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8f8f6_0%,#eef2f4_100%)]">
      <header className="border-b border-ocean/10 bg-ocean text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="relative h-8 w-8 shrink-0">
              <Image src="/images/logo.png" alt="Grand Sampan Resort" fill sizes="32px" className="object-contain" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">Grand Sampan</span>
            <span className="border border-white/25 px-2 py-0.5 text-xs uppercase tracking-wide text-white/80">
              Ops
            </span>
          </div>
          <Link href="/" className="text-sm text-white/80 hover:text-white">
            View site
          </Link>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6 pb-3">
          {links.map((l) => {
            const active = l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(l.href + '/');
            return (
              <Link
                key={l.href + l.label}
                href={l.href}
                className={`whitespace-nowrap rounded-md px-3 py-2 text-sm ${
                  active ? 'bg-white/15 font-semibold text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </header>
      {children}
    </div>
  );
}
