import Image from 'next/image';
import { AboutCard } from '@/lib/aboutContent';

export default function AboutCardsSection({
  title,
  description,
  cards
}: {
  title: string;
  description: string;
  cards: AboutCard[];
}) {
  return (
    <section className="mx-auto mt-12 max-w-7xl">
      <div className="max-w-3xl">
        <h2 className="font-['Playfair Display'] text-3xl text-ocean md:text-4xl">{title}</h2>
        <p className="mt-3 text-ocean/80">{description}</p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, index) => (
          <article
            key={card.id}
            className="overflow-hidden rounded-2xl border border-gold/25 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="relative h-52 w-full bg-pearl sm:h-56">
              <Image
                src={card.imageUrl || '/images/logo.svg'}
                alt={card.imageAlt || card.title}
                fill
                priority={index === 0}
                sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="p-6">
              <h3 className="text-2xl text-ocean">{card.title}</h3>
              <div
                className="prose prose-sm mt-3 max-w-none text-ocean/80 prose-p:text-ocean/80 prose-li:text-ocean/80"
                dangerouslySetInnerHTML={{ __html: card.bodyHtml }}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
