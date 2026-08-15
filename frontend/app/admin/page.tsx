import Link from 'next/link';
import MailTestButton from '@/components/admin/MailTestButton';
import Badge from '@/components/ui/Badge';

const operationalModules = [
  {
    title: 'Sales & Client CRM',
    description: 'Track real-time pipeline, verify buyer KYC documents, and monitor cash receipts.',
    icon: '💼',
    href: '/admin/sales',
    tag: 'Core Operations'
  },
  {
    title: 'Broker & Referral Ledger',
    description: 'Approve Tranche 1 & Tranche 2 broker commission payouts and manage custom partner incentives.',
    icon: '🤝',
    href: '/admin/referrals',
    tag: 'Finance'
  },
  {
    title: 'Unit Matrix & Suites',
    description: 'Configure 64-unit floor plans, upload architectural drawings, and generate share inventory.',
    icon: '🏢',
    href: '/admin/units',
    tag: 'Inventory'
  },
  {
    title: 'Yield & Discount Policy',
    description: 'Adjust present value discount compounding, ADR assumptions, and revenue distribution models.',
    icon: '⚖️',
    href: '/admin/policy',
    tag: 'Actuarial'
  },
  {
    title: 'Promotions & Discounts',
    description: 'Launch time-bound marketing promo campaigns and seasonal booking incentives.',
    icon: '🏷️',
    href: '/admin/promotions',
    tag: 'Marketing'
  },
  {
    title: 'Media Asset Library',
    description: 'Upload high-resolution photography for hero slides, suite views, and construction updates.',
    icon: '🖼️',
    href: '/admin/media',
    tag: 'Content'
  },
  {
    title: 'FAQ Knowledge Base',
    description: 'Maintain verified answers for investor protection, legal deed registration, and stay policies.',
    icon: '❓',
    href: '/admin/faq',
    tag: 'Support'
  },
  {
    title: 'Legal Terms & Disclosures',
    description: 'Update statutory disclosures, buyer deed conditions, and dispute resolution guidelines.',
    icon: '📜',
    href: '/admin/terms',
    tag: 'Legal'
  }
];

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header Banner */}
      <div className="rounded-2xl border border-ocean/10 bg-gradient-to-r from-ocean via-ocean-light to-ocean-dark p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="gold" size="sm" dot pulse>System Live</Badge>
              <span className="text-xs text-white/70">Cox&apos;s Bazar Operations Node</span>
            </div>
            <h1 className="font-display mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              Resort Command Center
            </h1>
            <p className="mt-2 max-w-2xl text-xs text-white/80 sm:text-sm leading-relaxed">
              Manage live unit inventories, review buyer KYC dossiers, configure present-value discount policies, and monitor sales commissions.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/admin/sales"
              className="rounded-lg bg-gold px-4 py-2 text-xs font-bold text-ocean shadow-md transition hover:bg-gold/90"
            >
              Open Sales Desk &rarr;
            </Link>
            <Link
              href="/admin/units/new"
              className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/20"
            >
              + Create Unit
            </Link>
          </div>
        </div>
      </div>

      {/* Operational Modules Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-ocean">Management Modules</h2>
          <span className="text-xs text-ocean/60 font-semibold">8 Active Services</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {operationalModules.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              className="group relative flex flex-col justify-between rounded-xl border border-ocean/10 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-gold/50 hover:shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-ocean/10 bg-pearl text-xl">
                    {mod.icon}
                  </span>
                  <Badge variant="neutral" size="sm">{mod.tag}</Badge>
                </div>
                <h3 className="font-display mt-4 text-base font-bold text-ocean group-hover:text-gold transition-colors">
                  {mod.title}
                </h3>
                <p className="mt-1 text-xs text-ocean/70 leading-relaxed">
                  {mod.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-ocean/10 flex items-center justify-between text-xs font-bold text-ocean">
                <span>Configure Module</span>
                <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Diagnostic & Mail Test Utilities */}
      <div className="rounded-xl border border-ocean/10 bg-white p-6 shadow-sm">
        <h3 className="font-display text-base font-bold text-ocean">System Diagnostics &amp; Alerts</h3>
        <p className="mt-1 text-xs text-ocean/65">
          Verify outbound transactional SMTP email delivery for buyer confirmation receipts and password reset dispatches.
        </p>
        <div className="mt-4">
          <MailTestButton />
        </div>
      </div>
    </div>
  );
}
