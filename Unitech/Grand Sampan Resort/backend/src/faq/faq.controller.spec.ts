import { FaqController } from './faq.controller';
import { FaqService } from './faq.service';

describe('FaqController', () => {
  it('returns ok with items and categories', async () => {
    const service: Partial<FaqService> = {
      list: async () => [{ id: '1' } as any],
      categories: async () => ['General']
    };
    const controller = new FaqController(service as FaqService);
    const res = await controller.list();
    expect(res.ok).toBe(true);
    expect(res.items.length).toBe(1);
    expect(res.categories).toEqual(['General']);
  });
});

