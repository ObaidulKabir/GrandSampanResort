export const ABOUT_SECTIONS = ['ABOUT_PROJECT', 'ABOUT_COMPOUND', 'ABOUT_COMPANY'] as const;

export type AboutSectionKey = (typeof ABOUT_SECTIONS)[number];

export type AboutCard = {
  id: string;
  section: AboutSectionKey;
  title: string;
  bodyHtml: string;
  imageUrl: string | null;
  imageAlt: string | null;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type AboutSectionsMap = Record<AboutSectionKey, AboutCard[]>;

export const ABOUT_SECTION_META: Record<AboutSectionKey, { title: string; description: string }> = {
  ABOUT_PROJECT: {
    title: 'About Project',
    description: 'Project highlights, lifestyle positioning, and key differentiators.'
  },
  ABOUT_COMPOUND: {
    title: 'About Compound',
    description: 'Shared amenities, services, and destination experiences around the resort.'
  },
  ABOUT_COMPANY: {
    title: 'About Company',
    description: 'Developer background, operating philosophy, and investor confidence points.'
  }
};

export const EMPTY_ABOUT_SECTIONS: AboutSectionsMap = {
  ABOUT_PROJECT: [],
  ABOUT_COMPOUND: [],
  ABOUT_COMPANY: []
};

export function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
