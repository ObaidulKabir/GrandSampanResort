import AboutCardsSection from '@/components/about/AboutCardsSection';
import { ABOUT_SECTION_META, ABOUT_SECTIONS, EMPTY_ABOUT_SECTIONS, type AboutSectionsMap } from '@/lib/aboutContent';

export const dynamic = 'force-dynamic';

async function getAboutSections(): Promise<AboutSectionsMap> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  try {
    const res = await fetch(`${baseUrl}/about-content`, {
      next: { tags: ['about-content'], revalidate: 3600 }
    });
    const json = await res.json().catch(() => null);
    const sections = json?.sections;
    if (!res.ok || !sections || typeof sections !== 'object') return EMPTY_ABOUT_SECTIONS;
    return {
      ABOUT_PROJECT: Array.isArray(sections.ABOUT_PROJECT) ? sections.ABOUT_PROJECT : [],
      ABOUT_COMPOUND: Array.isArray(sections.ABOUT_COMPOUND) ? sections.ABOUT_COMPOUND : [],
      ABOUT_COMPANY: Array.isArray(sections.ABOUT_COMPANY) ? sections.ABOUT_COMPANY : []
    };
  } catch {
    return EMPTY_ABOUT_SECTIONS;
  }
}

export default async function AboutPage() {
  const sections = await getAboutSections();

  return (
    <main className="mx-auto max-w-7xl px-6 py-16">
      <section className="mx-auto max-w-4xl text-center">
        <h1 className="font-['Playfair Display'] text-4xl text-ocean md:text-5xl">About Grand Sampan Resort</h1>
        <p className="mt-4 text-lg text-ocean/80">
          Explore the project story, surrounding compound, and company background through curated content cards managed from the admin panel.
        </p>
      </section>

      {ABOUT_SECTIONS.map((sectionKey) => (
        <AboutCardsSection
          key={sectionKey}
          title={ABOUT_SECTION_META[sectionKey].title}
          description={ABOUT_SECTION_META[sectionKey].description}
          cards={sections[sectionKey]}
        />
      ))}
    </main>
  );
}
