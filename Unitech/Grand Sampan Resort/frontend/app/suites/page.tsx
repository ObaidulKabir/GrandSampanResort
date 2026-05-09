import { api } from '@/lib/api';

async function getSuites() {
  return api('/suites');
}

export default async function SuitesPage() {
  const suites = await getSuites();
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-['Playfair Display'] text-4xl text-ocean">Suites</h1>
      <div className="mt-8 grid md:grid-cols-2 gap-6">
        {suites.map((s: any) => (
          <div key={s.id} className="rounded-lg border border-gold/30 bg-white p-6">
            <h2 className="text-2xl text-ocean">{s.id}</h2>
            <p className="text-ocean/80">{s.type} • {s.size} sq ft • {s.view}</p>
            <p className="text-ocean/70">BDT {s.totalPrice}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

