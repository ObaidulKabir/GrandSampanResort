import type { FaqCategory, FaqEntry } from '@prisma/client';

export const DEFAULT_FAQ_ENTRIES: Omit<FaqEntry, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    category: 'General',
    question: 'What is Unitech Grand Sampan Resort?',
    answerHtml:
      '<p>Unitech Grand Sampan Resort is a boutique beachfront hospitality development designed for premium stays and ownership-friendly investment options.</p>',
    sortOrder: 0
  },
  {
    category: 'General',
    question: 'Where is the resort located?',
    answerHtml: '<p>The resort is located along Marine Drive, Innani, Cox’s Bazar.</p>',
    sortOrder: 1
  },
  {
    category: 'Investment',
    question: 'How does the investment model work?',
    answerHtml:
      '<p>Investment options can include fractional ownership and structured plans. Contact the team for plan details and availability.</p>',
    sortOrder: 0
  },
  {
    category: 'Bookings',
    question: 'How do I book a stay?',
    answerHtml: '<p>You can book through the resort team or via the website booking flow (subject to availability).</p>',
    sortOrder: 0
  }
];

export class FaqRepository {
  private categories: FaqCategory[] = Array.from(
    new Set(DEFAULT_FAQ_ENTRIES.map((item) => item.category.trim()).filter(Boolean))
  )
    .sort((a, b) => a.localeCompare(b))
    .map((name, index) => ({
      id: `faq-category-${index + 1}`,
      name,
      sortOrder: index,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

  private items: FaqEntry[] = DEFAULT_FAQ_ENTRIES.map((item, index) => ({
    id: `faq-${index + 1}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...item
  }));

  async listCategories() {
    return [...this.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async createCategory(name: string) {
    const normalized = name.trim();
    const exists = this.categories.some((c) => c.name.toLowerCase() === normalized.toLowerCase());
    if (exists) return null;
    const category: FaqCategory = {
      id: `faq-category-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      name: normalized,
      sortOrder: this.categories.length,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.categories.push(category);
    return category;
  }

  async updateCategory(id: string, name: string) {
    const index = this.categories.findIndex((c) => c.id === id);
    if (index === -1) return null;
    const normalized = name.trim();
    const exists = this.categories.some((c) => c.id !== id && c.name.toLowerCase() === normalized.toLowerCase());
    if (exists) return null;
    const prevName = this.categories[index].name;
    this.categories[index] = { ...this.categories[index], name: normalized, updatedAt: new Date() };
    this.items = this.items.map((item) => (item.category === prevName ? { ...item, category: normalized, updatedAt: new Date() } : item));
    return { category: this.categories[index], prevName };
  }

  async deleteCategory(id: string) {
    const category = this.categories.find((c) => c.id === id);
    if (!category) return null;
    this.categories = this.categories.filter((c) => c.id !== id).map((c, idx) => ({ ...c, sortOrder: idx, updatedAt: new Date() }));
    this.items = this.items.map((item) => (item.category === category.name ? { ...item, category: 'General', updatedAt: new Date() } : item));
    return category;
  }

  async reorderCategories(orderedIds: string[]) {
    const byId = new Map(this.categories.map((c) => [c.id, c] as const));
    this.categories = orderedIds
      .map((id, index) => {
        const item = byId.get(id);
        if (!item) return null;
        return { ...item, sortOrder: index, updatedAt: new Date() };
      })
      .filter(Boolean) as FaqCategory[];
    return this.listCategories();
  }

  async findAll() {
    return [...this.items].sort((a, b) => a.category.localeCompare(b.category) || a.sortOrder - b.sortOrder);
  }

  async findById(id: string) {
    return this.items.find((item) => item.id === id) || null;
  }

  async create(data: Omit<FaqEntry, 'id' | 'createdAt' | 'updatedAt'>) {
    const item: FaqEntry = {
      id: `faq-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    };
    this.items.push(item);
    return item;
  }

  async update(id: string, patch: Partial<FaqEntry>) {
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

  async replaceCategory(category: string, orderedIds: string[]) {
    const normalized = category.trim();
    const byId = new Map(this.items.map((item) => [item.id, item] as const));
    this.items = this.items.map((item) => {
      if (item.category !== normalized) return item;
      const nextIndex = orderedIds.indexOf(item.id);
      if (nextIndex === -1) return item;
      return { ...item, sortOrder: nextIndex, updatedAt: new Date() };
    });
    return orderedIds.map((id) => byId.get(id)).filter(Boolean) as FaqEntry[];
  }

  async ensureDefaults() {
    if (this.items.length > 0 && this.categories.length > 0) return;
    if (this.categories.length === 0) {
      this.categories = Array.from(new Set(DEFAULT_FAQ_ENTRIES.map((item) => item.category.trim()).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b))
        .map((name, index) => ({
          id: `faq-category-${index + 1}`,
          name,
          sortOrder: index,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
    }
    this.items = DEFAULT_FAQ_ENTRIES.map((item, index) => ({
      id: `faq-${index + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...item
    }));
  }
}
