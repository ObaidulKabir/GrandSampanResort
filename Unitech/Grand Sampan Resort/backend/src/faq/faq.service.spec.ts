import { FaqService } from './faq.service';

describe('FaqService', () => {
  let service: FaqService;

  beforeEach(() => {
    delete process.env.DATABASE_URL;
    service = new FaqService();
  });

  it('lists seeded faq entries', async () => {
    const items = await service.list();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
  });

  it('creates a new faq entry in a category', async () => {
    const created = await service.create({
      category: 'Payments',
      question: 'How do payments work?',
      answerHtml: '<p>Payments are handled using scheduled items and may support multiple gateways depending on configuration.</p>'
    });

    expect(created.id).toBeTruthy();
    expect(created.category).toBe('Payments');
    expect(created.sortOrder).toBeGreaterThanOrEqual(0);
  });

  it('updates an faq entry and moves category', async () => {
    const items = await service.list();
    const updated = await service.update(items[0].id, {
      category: 'General',
      question: 'Updated question?',
      answerHtml: '<p>This updated answer is long enough to satisfy validation requirements.</p>'
    });

    expect(updated?.question).toBe('Updated question?');
    expect(updated?.category).toBe('General');
  });

  it('reorders items inside a category', async () => {
    const items = await service.list({ category: 'General' });
    const ids = items.filter((i) => (i.category || '') === 'General').map((i) => i.id);
    if (ids.length < 2) {
      const created = await service.create({
        category: 'General',
        question: 'Another general question?',
        answerHtml: '<p>This answer is sufficiently descriptive to allow reordering tests to proceed.</p>'
      });
      ids.push(created.id);
    }
    const reversed = [...ids].reverse();
    const reordered = await service.reorder('General', reversed);
    expect(reordered.map((i) => i.id)).toEqual(reversed);
  });

  it('removes an faq entry', async () => {
    const created = await service.create({
      category: 'Temporary',
      question: 'Temporary question?',
      answerHtml: '<p>This entry exists only to verify delete behavior in the FAQ service.</p>'
    });

    await service.remove(created.id);
    const after = await service.list({ category: 'Temporary' });
    expect(after.find((i) => i.id === created.id)).toBeUndefined();
  });

  it('creates, renames, reorders, and deletes categories', async () => {
    const before = await service.listCategoryEntities();
    const created = await service.createCategory({ name: 'Policies' });
    expect(created.id).toBeTruthy();

    const renamed = await service.updateCategory(created.id, { name: 'Policies & Rules' });
    expect(renamed.name).toBe('Policies & Rules');

    await service.create({
      category: 'Policies & Rules',
      question: 'What is the cancellation policy?',
      answerHtml: '<p>Please contact the team for the latest cancellation and modification policy details.</p>'
    });

    const afterCreate = await service.listCategoryEntities();
    const orderedIds = [...afterCreate].sort((a, b) => b.sortOrder - a.sortOrder).map((c) => c.id);
    const reordered = await service.reorderCategories(orderedIds);
    expect(reordered.map((c) => c.id)).toEqual(orderedIds);

    await service.deleteCategory(created.id);
    const entries = await service.list({ category: 'Policies & Rules' });
    expect(entries.length).toBe(0);

    const final = await service.listCategoryEntities();
    expect(final.length).toBeGreaterThanOrEqual(before.length);
  });
});
