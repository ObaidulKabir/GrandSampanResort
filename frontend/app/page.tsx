export default function HomePage() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <h1 className="font-['Playfair Display'] text-5xl md:text-7xl leading-tight text-ocean">
            Own the Beach. <span className="text-gold">Earn from It.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ocean/80">
            A luxury beachfront resort offering fractional ownership and premium stays.
          </p>
          <div className="mt-10 flex gap-4">
            <a
              className="rounded-full bg-ocean px-6 py-3 text-white hover:bg-ocean/90"
              href="/booking"
            >
              Book a Stay
            </a>
            <a
              className="rounded-full border border-gold px-6 py-3 text-gold hover:bg-gold hover:text-ocean transition"
              href="/investment-plans"
            >
              Invest in a Suite
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="font-['Playfair Display'] text-3xl text-ocean">About the Resort</h2>
          <p className="mt-3 text-ocean/80">
            Boutique 32-room beachfront property with rooftop café and private balconies.
          </p>
        </div>
        <div>
          <h2 className="font-['Playfair Display'] text-3xl text-ocean">Investment Plans</h2>
          <p className="mt-3 text-ocean/80">
            Choose Plan A (3 days), Plan B (5 days), or Full Suite ownership.
          </p>
        </div>
      </section>
    </main>
  );
}

