import Link from 'next/link';
export default function AdminPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-['Playfair Display'] text-4xl text-ocean">Admin Panel</h1>
      <p className="mt-3 text-ocean/80">
        Inventory management, booking rules, revenue share, investor directory, finance and reports.
      </p>
      <div className="mt-6">
        <div className="flex gap-2">
          <Link href="/admin/units/new" className="inline-block rounded bg-ocean px-4 py-2 text-white">
            Create Unit
          </Link>
          <Link href="/admin/units" className="inline-block rounded border border-ocean px-4 py-2 text-ocean">
            View Units
          </Link>
        </div>
      </div>
      <div className="mt-8 grid md:grid-cols-3 gap-6">
        {[
          { label: 'Create Units', href: '/admin/units/new' },
          { label: 'Set Room Type' },
          { label: 'Set Price' },
          { label: 'Set Share Plans' },
          { label: 'Availability' },
          { label: 'Upload Photos' },
          { label: 'Booking Rules' },
          { label: 'Revenue Share' },
          { label: 'Investors' },
          { label: 'Bookings' },
          { label: 'Withdrawals' },
          { label: 'Reports' }
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-gold/30 bg-white p-4">
            {item.href ? (
              <Link href={item.href} className="text-ocean">
                {item.label}
              </Link>
            ) : (
              <span className="text-ocean">{item.label}</span>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

