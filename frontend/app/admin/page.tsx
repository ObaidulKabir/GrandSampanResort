export default function AdminPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-['Playfair Display'] text-4xl text-ocean">Admin Panel</h1>
      <p className="mt-3 text-ocean/80">
        Inventory management, booking rules, revenue share, investor directory, finance and reports.
      </p>
      <div className="mt-8 grid md:grid-cols-3 gap-6">
        {[
          'Create Units',
          'Set Room Type',
          'Set Price',
          'Set Share Plans',
          'Availability',
          'Upload Photos',
          'Booking Rules',
          'Revenue Share',
          'Investors',
          'Bookings',
          'Withdrawals',
          'Reports'
        ].map((item) => (
          <div key={item} className="rounded-lg border border-gold/30 bg-white p-4">
            <span className="text-ocean">{item}</span>
          </div>
        ))}
      </div>
    </main>
  );
}

