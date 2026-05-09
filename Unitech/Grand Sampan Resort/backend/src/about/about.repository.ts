import type { AboutCard } from '@prisma/client';
import { ABOUT_SECTIONS, type AboutSectionValue } from './about.types';

export const DEFAULT_ABOUT_CARDS: Omit<AboutCard, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    section: ABOUT_SECTIONS.ABOUT_PROJECT,
    title: 'Beachfront Living',
    bodyHtml:
      '<p>Unitech Grand Sampan Resort is a boutique beachfront development along Marine Drive, Innani, designed for serene oceanfront living and hospitality-led ownership.</p>',
    imageUrl: '/images/resort-rooms.svg',
    imageAlt: 'Resort rooms overview',
    sortOrder: 0
  },
  {
    section: ABOUT_SECTIONS.ABOUT_PROJECT,
    title: 'Sunset Rooftop Experience',
    bodyHtml:
      '<p>The project combines premium stays with sustainable returns, anchored by curated amenities including a rooftop cafe for panoramic sunset dining.</p>',
    imageUrl: '/images/rooftop-cafe.svg',
    imageAlt: 'Rooftop cafe',
    sortOrder: 1
  },
  {
    section: ABOUT_SECTIONS.ABOUT_COMPOUND,
    title: 'Secure Shared Amenities',
    bodyHtml:
      '<ul><li>Secured boundary and access control</li><li>CC camera surveillance</li><li>Beach security</li><li>Children play area</li></ul>',
    imageUrl: '/images/icons/security.svg',
    imageAlt: 'Security icon',
    sortOrder: 0
  },
  {
    section: ABOUT_SECTIONS.ABOUT_COMPOUND,
    title: 'Lifestyle Destination',
    bodyHtml:
      '<ul><li>Amusement park</li><li>Water park</li><li>Shopping mall</li><li>Boat club</li></ul>',
    imageUrl: '/images/icons/concierge.svg',
    imageAlt: 'Lifestyle icon',
    sortOrder: 1
  },
  {
    section: ABOUT_SECTIONS.ABOUT_COMPOUND,
    title: 'Hospitality Convenience',
    bodyHtml:
      '<ul><li>Beach-side restaurant</li><li>Pickup and drop-off facility</li><li>Mosque</li><li>Hospital</li></ul>',
    imageUrl: '/images/icons/beach-access.svg',
    imageAlt: 'Beach access icon',
    sortOrder: 2
  },
  {
    section: ABOUT_SECTIONS.ABOUT_COMPANY,
    title: 'Hospitality-Led Developer',
    bodyHtml:
      '<p>Unitech develops hospitality-led coastal projects with an emphasis on durability, guest experience and long-term stewardship.</p>',
    imageUrl: '/images/logo.svg',
    imageAlt: 'Unitech logo',
    sortOrder: 0
  },
  {
    section: ABOUT_SECTIONS.ABOUT_COMPANY,
    title: 'Investor-Centered Operations',
    bodyHtml:
      '<ul><li>Transparent fractional ownership model</li><li>Local operations team for guest excellence</li><li>Commitment to environmental and community standards</li></ul>',
    imageUrl: '/images/icons/housekeeping.svg',
    imageAlt: 'Operations icon',
    sortOrder: 1
  }
];

export class AboutRepository {
  private items: AboutCard[] = DEFAULT_ABOUT_CARDS.map((item, index) => ({
    id: `about-${index + 1}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...item
  }));

  async findAll() {
    return [...this.items].sort((a, b) => a.section.localeCompare(b.section) || a.sortOrder - b.sortOrder);
  }

  async findById(id: string) {
    return this.items.find((item) => item.id === id) || null;
  }

  async create(data: Omit<AboutCard, 'id' | 'createdAt' | 'updatedAt'>) {
    const item: AboutCard = {
      id: `about-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    };
    this.items.push(item);
    return item;
  }

  async update(id: string, patch: Partial<AboutCard>) {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return null;
    this.items[index] = { ...this.items[index], ...patch, updatedAt: new Date() };
    return this.items[index];
  }

  async delete(id: string) {
    const prev = this.items.length;
    this.items = this.items.filter((item) => item.id !== id);
    return this.items.length < prev;
  }

  async replaceSection(section: AboutSectionValue, orderedIds: string[]) {
    const byId = new Map(this.items.map((item) => [item.id, item] as const));
    this.items = this.items.map((item) => {
      if (item.section !== section) return item;
      const nextIndex = orderedIds.indexOf(item.id);
      if (nextIndex === -1) return item;
      return { ...item, sortOrder: nextIndex, updatedAt: new Date() };
    });
    return orderedIds.map((id) => byId.get(id)).filter(Boolean) as AboutCard[];
  }

  async ensureDefaults() {
    if (this.items.length > 0) return;
    this.items = DEFAULT_ABOUT_CARDS.map((item, index) => ({
      id: `about-${index + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...item
    }));
  }
}
