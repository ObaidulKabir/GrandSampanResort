import Link from 'next/link';
import MailTestButton from '@/components/admin/MailTestButton';

const tools = [
  {
    label: 'Sales Desk',
    href: '/admin/sales',
    desc: 'Pipeline, inventory snapshot, and investor KYC.'
  },
  {
    label: 'Referrals',
    href: '/admin/referrals',
    desc: 'Broker/client incentive ledger and payouts.'
  },
  {
    label: 'Units',
    href: '/admin/units',
    desc: 'List rooms and manage share plans per unit.'
  },
  {
    label: 'Create Unit',
    href: '/admin/units/new',
    desc: 'Add inventory before publishing plans.'
  },
  {
    label: 'Revenue Policy',
    href: '/admin/policy',
    desc: 'Configure revenue share rules.'
  },
  {
    label: 'Media Library',
    href: '/admin/media',
    desc: 'Upload real resort photos to replace placeholder images.'
  },
  {
    label: 'FAQ',
    href: '/admin/faq',
    desc: 'Add, edit, or remove question-and-answer cards on the FAQ page.'
  },
  {
    label: 'Terms & Conditions',
    href: '/admin/terms',
    desc: 'Add, edit, or reorder paragraphs on the Terms page.'
  },
  {
    label: 'Promotions',
    href: '/admin/promotions',
    desc: 'Create time-bound discount packages to expedite sales.'
  }
];

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10 md:py-14">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold">Operations</p>
      <h1 className="font-display mt-1 text-4xl text-ocean">Admin</h1>
      <p className="mt-3 max-w-2xl text-ocean/75">
        List units and plans, then track sales and KYC from the Sales Desk.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link
          href="/admin/sales"
          className="inline-flex rounded-md bg-ocean px-4 py-2.5 text-sm font-semibold text-white hover:bg-ocean/90"
        >
          Open Sales Desk
        </Link>
        <Link
          href="/admin/units/new"
          className="inline-flex rounded-md border border-ocean/30 px-4 py-2.5 text-sm font-semibold text-ocean hover:bg-ocean/5"
        >
          Create Unit
        </Link>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {tools.map((item) => (
          <Link
            key={item.href + item.label}
            href={item.href}
            className="block border border-ocean/10 bg-white p-5 transition hover:border-ocean/25"
          >
            <div className="font-display text-xl text-ocean">{item.label}</div>
            <p className="mt-2 text-sm text-ocean/70">{item.desc}</p>
          </Link>
        ))}
      </div>

      <MailTestButton />
    </main>
  );
}
