'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/store/appStore';
import Badge from '@/components/ui/Badge';

type NavItem = {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
  badge?: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: 'Sales & CRM',
    items: [
      { href: '/admin/sales', label: 'Sales Desk & KYC', icon: '💼' },
      { href: '/admin/referrals', label: 'Broker & Referrals', icon: '🤝' }
    ]
  },
  {
    title: 'Inventory & Plans',
    items: [
      { href: '/admin/units', label: 'Unit Matrix & Suites', icon: '🏢' },
      { href: '/admin/units/new', label: 'Create New Unit', icon: '➕' }
    ]
  },
  {
    title: 'Actuarial & Policies',
    items: [
      { href: '/admin/policy', label: 'Discount & Yield Policy', icon: '⚖️' },
      { href: '/admin/promotions', label: 'Discount Promotions', icon: '🏷️' }
    ]
  },
  {
    title: 'Content & CMS',
    items: [
      { href: '/admin/media', label: 'Media Library', icon: '🖼️' },
      { href: '/admin/faq', label: 'FAQ Manager', icon: '❓' },
      { href: '/admin/terms', label: 'Terms & Disclosures', icon: '📜' }
    ]
  }
];

type AdminUser = { id: string; name: string; email: string } | null;

export default function AdminShell({
  children,
  adminUser
}: {
  children: React.ReactNode;
  adminUser?: AdminUser;
}) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const logout = useAppStore((s) => s.logout);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  function onLogout() {
    logout();
    router.replace('/admin/login');
  }

  // Close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-[#F4F6F8]">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-ocean/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-ocean/10 bg-ocean text-white shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
          <Link href="/admin" className="flex items-center gap-3">
            <span className="relative h-8 w-8 shrink-0">
              <Image
                src="/images/logo.png"
                alt="Grand Sampan Logo"
                fill
                sizes="32px"
                className="object-contain brightness-125"
              />
            </span>
            <div>
              <span className="font-display text-base font-bold tracking-tight text-white block">
                Grand Sampan
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-gold block">
                Command Center
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 lg:hidden"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        {/* Quick Admin Profile Card */}
        <div className="border-b border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold font-bold text-sm">
              {(adminUser?.name || adminUser?.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">
                {adminUser?.name || 'Administrator'}
              </p>
              <p className="truncate text-[11px] text-white/60">{adminUser?.email}</p>
            </div>
            <Badge variant="gold" size="sm">Admin</Badge>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Dashboard Home Link */}
          <div>
            <Link
              href="/admin"
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold tracking-wide transition ${
                pathname === '/admin'
                  ? 'bg-gold text-ocean font-bold shadow-md'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>📊</span>
              <span>Operations Overview</span>
            </Link>
          </div>

          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-gold/80 mb-2">
                {group.title}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const active = item.exact
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium tracking-wide transition ${
                          active
                            ? 'bg-white/15 text-gold font-bold shadow-sm'
                            : 'text-white/75 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm">{item.icon}</span>
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] text-gold font-bold">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between text-xs">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-1.5 text-white/70 hover:text-gold transition"
            >
              <span>↗</span>
              <span>Public Portal</span>
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold transition"
            >
              <span>🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top App Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ocean/10 bg-white px-4 sm:px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-ocean hover:bg-ocean/5 lg:hidden"
              aria-label="Open sidebar"
            >
              <span className="flex h-4 w-5 flex-col justify-between" aria-hidden>
                <span className="h-0.5 w-full bg-ocean" />
                <span className="h-0.5 w-full bg-ocean" />
                <span className="h-0.5 w-full bg-ocean" />
              </span>
            </button>

            {/* Breadcrumb indicator */}
            <div className="flex items-center gap-2 text-xs font-semibold text-ocean/60">
              <Link href="/admin" className="hover:text-ocean">Ops</Link>
              <span>/</span>
              <span className="text-ocean font-bold capitalize">
                {pathname.split('/')[2] || 'Overview'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-ocean/10 bg-pearl px-3 py-1.5 text-xs text-ocean/60">
              <span>🔍</span>
              <input
                type="text"
                placeholder="Search booking or unit..."
                className="bg-transparent border-none outline-none text-ocean placeholder:text-ocean/40 w-36 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <kbd className="rounded bg-white px-1.5 py-0.5 text-[10px] font-mono border border-ocean/10">
                ⌘K
              </kbd>
            </div>

            <Link
              href="/admin/sales"
              className="rounded-md bg-ocean px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-ocean/90"
            >
              Sales Desk
            </Link>
          </div>
        </header>

        {/* Page Children Content */}
        <div className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
