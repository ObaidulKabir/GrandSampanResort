import { DirectorsService } from './directors.service';

describe('DirectorsService', () => {
  const prevDb = process.env.DATABASE_URL;

  beforeEach(() => {
    delete process.env.DATABASE_URL;
  });

  afterAll(() => {
    if (prevDb === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevDb;
  });

  it('stores a profile and localizes Bangla fields', async () => {
    const service = new DirectorsService();
    const created = await service.create({
      name: 'Amina Rahman',
      title: 'Managing Director',
      bio: 'Leads development and owner relations for Grand Sampan.',
      nameBn: 'আমিনা রহমান',
      titleBn: 'ম্যানেজিং ডিরেক্টর',
      bioBn: 'গ্র্যান্ড সাম্পানের উন্নয়ন ও মালিক সম্পর্ক পরিচালনা করেন।'
    });
    expect(created.id).toMatch(/^DIR-/);

    const en = await service.listLocalized('en');
    expect(en[0].name).toBe('Amina Rahman');
    expect(en[0].title).toBe('Managing Director');

    const bn = await service.listLocalized('bn');
    expect(bn[0].name).toBe('আমিনা রহমান');
    expect(bn[0].title).toBe('ম্যানেজিং ডিরেক্টর');
    expect(bn[0].bio).toContain('গ্র্যান্ড সাম্পান');
  });

  it('reorders profiles', async () => {
    const service = new DirectorsService();
    const first = await service.create({
      name: 'First Director',
      title: 'Chair',
      bio: 'First profile for ordering tests.'
    });
    const second = await service.create({
      name: 'Second Director',
      title: 'Director',
      bio: 'Second profile for ordering tests.'
    });
    await service.move(second.id, 'up');
    const items = await service.list();
    expect(items.map((i) => i.id)).toEqual([second.id, first.id]);
  });
});
