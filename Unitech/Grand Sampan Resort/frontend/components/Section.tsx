export default function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <h2 className="font-['Playfair Display'] text-3xl text-ocean">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

