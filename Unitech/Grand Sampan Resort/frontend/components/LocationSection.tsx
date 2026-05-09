export default function LocationSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-16">
      <h2 className="font-['Playfair Display'] text-3xl text-ocean">Location</h2>
      <p className="mt-2 text-ocean/80">Marine Dirve Road, Rupayan Beach View Innani, Cox's Bazar</p>
      <div className="mt-6 relative h-[400px] w-full rounded-xl overflow-hidden border border-gold/30">
        <iframe
          title="Resort Location Map"
          src="https://www.google.com/maps?q=Marine%20Dirve%20Road%20Rupayan%20Beach%20View%20Innani%20Cox%27s%20Bazar&output=embed"
          className="absolute inset-0 h-full w-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </section>
  );
}
