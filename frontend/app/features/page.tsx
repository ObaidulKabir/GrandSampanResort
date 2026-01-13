const features = [
  'Rooftop sunset restaurant',
  'Direct beach access',
  'Private balconies',
  'High-speed Wi‑Fi',
  'Power backup',
  'Concierge',
  'Housekeeping',
  'Security',
  'Parking'
];

export default function FeaturesPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-['Playfair Display'] text-4xl text-ocean">Resort Features</h1>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {features.map((f) => (
          <div key={f} className="rounded-lg border border-gold/30 bg-white p-4">
            <span className="text-ocean">{f}</span>
          </div>
        ))}
      </div>
    </main>
  );
}

