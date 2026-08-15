export default function LocationSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-20">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold">Find us</p>
      <h2 className="font-display mt-1 text-3xl text-ocean md:text-4xl">Location</h2>
      <p className="mt-2 max-w-2xl text-ocean/75">
        Marine Drive Road, Rupayan Beach View Innani, Cox&apos;s Bazar
      </p>
      <div className="relative mt-6 h-[240px] w-full overflow-hidden border border-ocean/10 md:h-[400px]">
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
