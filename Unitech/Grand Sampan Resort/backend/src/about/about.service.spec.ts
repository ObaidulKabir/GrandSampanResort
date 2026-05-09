import { AboutService } from './about.service';
import { ABOUT_SECTIONS } from './about.types';

describe('AboutService', () => {
  let service: AboutService;

  beforeEach(() => {
    delete process.env.DATABASE_URL;
    service = new AboutService();
  });

  it('creates a new about card', async () => {
    const created = await service.create({
      section: ABOUT_SECTIONS.ABOUT_PROJECT,
      title: 'New Project Card',
      bodyHtml: '<p>This card adds a new project highlight with enough descriptive text.</p>',
      imageUrl: '/uploads/about/project-card.png',
      imageAlt: 'Project highlight'
    });

    expect(created.id).toBeTruthy();
    expect(created.section).toBe(ABOUT_SECTIONS.ABOUT_PROJECT);
    expect(created.sortOrder).toBeGreaterThanOrEqual(0);
  });

  it('updates an existing about card', async () => {
    const before = await service.listAll();
    const updated = await service.update(before[0].id, {
      title: 'Updated Card Title',
      bodyHtml: '<p>This updated copy still contains more than twenty characters for validation.</p>'
    });

    expect(updated?.title).toBe('Updated Card Title');
    expect(updated?.bodyHtml).toContain('updated copy');
  });

  it('reorders cards within a section', async () => {
    const grouped = await service.listGrouped();
    const ids = grouped[ABOUT_SECTIONS.ABOUT_COMPOUND].map((card) => card.id);
    const reversed = [...ids].reverse();

    const reordered = await service.reorder(ABOUT_SECTIONS.ABOUT_COMPOUND, reversed);

    expect(reordered.map((card) => card.id)).toEqual(reversed);
  });

  it('removes an about card', async () => {
    const created = await service.create({
      section: ABOUT_SECTIONS.ABOUT_COMPANY,
      title: 'Temporary Card',
      bodyHtml: '<p>This temporary card exists solely to verify delete behavior in the service.</p>',
      imageUrl: '/uploads/about/temp-card.png',
      imageAlt: 'Temporary card'
    });

    await service.remove(created.id);
    const after = await service.listAll();

    expect(after.find((card) => card.id === created.id)).toBeUndefined();
  });
});
