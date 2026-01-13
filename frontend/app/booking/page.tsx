export default function BookingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-['Playfair Display'] text-4xl text-ocean">Book a Stay</h1>
      <p className="mt-3 text-ocean/80">
        Select dates and room category. Payment options: bKash, Nagad, Card, Bank transfer.
      </p>
      <div className="mt-8 rounded-lg border border-gold/30 bg-white p-6">
        <p className="text-ocean/70">Booking engine to be connected to availability and payments.</p>
      </div>
    </main>
  );
}

