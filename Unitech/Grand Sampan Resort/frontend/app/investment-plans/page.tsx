export default function InvestmentPlansPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-['Playfair Display'] text-4xl text-ocean">Investment Plans</h1>
      <div className="mt-8 grid md:grid-cols-3 gap-6">
        {[
          { name: 'Plan A', days: 3, desc: 'Personal usage: 3 days/month' },
          { name: 'Plan B', days: 5, desc: 'Personal usage: 5 days/month' },
          { name: 'Full Suite', days: 30, desc: 'Full ownership' }
        ].map((p) => (
          <div key={p.name} className="rounded-lg border border-gold/30 bg-white p-6">
            <h2 className="text-2xl font-['Playfair Display'] text-ocean">{p.name}</h2>
            <p className="mt-2 text-ocean/80">{p.desc}</p>
            <p className="mt-2 text-ocean/70">Expected return, lock-in, exit options shown at checkout.</p>
          </div>
        ))}
      </div>
    </main>
  );
}

