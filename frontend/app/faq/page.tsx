export default function FAQPage() {
  const items = [
    { q: 'Ownership', a: 'Fractional and full suite options available.' },
    { q: 'Legal', a: 'Contracts and disclaimers provided before purchase.' },
    { q: 'Exit', a: 'Defined exit options per plan.' },
    { q: 'Revenue', a: '60% investor, 40% management fee.' },
    { q: 'Risk', a: 'Market and occupancy risks apply.' },
    { q: 'Personal stay', a: 'Plan A: 3 days, Plan B: 5 days per month.' },
    { q: 'Transferability', a: 'Subject to agreement terms.' }
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-['Playfair Display'] text-4xl text-ocean">FAQ</h1>
      <div className="mt-8 space-y-6">
        {items.map((i) => (
          <div key={i.q} className="rounded-lg border border-gold/30 bg-white p-4">
            <h2 className="text-xl font-semibold text-ocean">{i.q}</h2>
            <p className="mt-2 text-ocean/80">{i.a}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

