import { toPublicOwner } from './public-owner';

describe('toPublicOwner', () => {
  it('exposes name, city, and profession only', () => {
    const owner = toPublicOwner({
      name: 'Rahim Uddin',
      city: 'Chattogram',
      profession: 'Businessman',
      picUrl: '/uploads/a.jpg',
      nid: 'secret',
      contact: '017',
      email: 'x@y.com',
      address: '12 Secret Street, Khulshi'
    });
    expect(owner).toEqual({
      name: 'Rahim Uddin',
      city: 'Chattogram',
      profession: 'Businessman'
    });
    expect(owner).not.toHaveProperty('picUrl');
  });

  it('falls back to the last part of address when city is blank', () => {
    const owner = toPublicOwner({
      name: 'Nadia',
      city: '',
      profession: 'Doctor',
      address: 'House 9, Road 4, Dhanmondi'
    });
    expect(owner?.city).toBe('Dhanmondi');
    expect(owner).not.toHaveProperty('address');
  });
});
