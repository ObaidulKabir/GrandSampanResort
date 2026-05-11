import FaqClient from '@/components/faq/FaqClient';
import { normalizeCategory, stripHtml, type FaqEntry } from '@/lib/faqContent';
import { apiBaseUrl } from '@/lib/apiBase';

export const dynamic = 'force-dynamic';

async function getFaqItems(): Promise<FaqEntry[]> {
  const baseUrl = apiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/faq`, {
      next: { tags: ['faq-content'], revalidate: 3600 }
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.items || !Array.isArray(json.items)) return [];
    return json.items;
  } catch {
    return [];
  }
}

function buildFaqJsonLd(items: FaqEntry[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: stripHtml(item.answerHtml)
      }
    }))
  };
}

export default async function FaqPage() {
  const items = await getFaqItems();
  const sorted = [...items].sort(
    (a, b) => normalizeCategory(a.category).localeCompare(normalizeCategory(b.category)) || a.sortOrder - b.sortOrder
  );
  const jsonLd = buildFaqJsonLd(sorted);

  return (
    <main className="mx-auto max-w-7xl px-6 py-16">
      <section className="mx-auto max-w-4xl text-center">
        <h1 className="font-['Playfair Display'] text-4xl text-ocean md:text-5xl">Frequently Asked Questions</h1>
        <p className="mt-4 text-lg text-ocean/80">
          Find answers quickly by browsing categories or searching by keywords.
        </p>
      </section>

      <FaqClient items={sorted} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  );
}
