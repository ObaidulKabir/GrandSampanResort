export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-['Playfair Display'] text-4xl text-ocean">Investor Dashboard</h1>
      <div className="mt-8 grid md:grid-cols-3 gap-6">
        {['My Suites / Shares', 'My Stay Days', 'My Rented Days', 'My Earnings', 'Statements', 'Booking Calendar', 'Request Stay', 'Withdraw Earnings'].map(
          (item) => (
            <div key={item} className="rounded-lg border border-gold/30 bg-white p-4">
              <span className="text-ocean">{item}</span>
            </div>
          )
        )}
      </div>
    </main>
  );
}

