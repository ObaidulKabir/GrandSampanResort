import { Injectable } from '@nestjs/common';
import { SuitesService } from '../suites/suites.service';
import { TimesharesService } from '../timeshares/timeshares.service';
import { AvailabilityService } from '../availability/availability.service';
import { PricingService } from '../pricing/pricing.service';
import { ClientsService } from '../clients/clients.service';
import { BookingService } from '../booking/booking.service';

@Injectable()
export class SeedService {
  constructor(
    private readonly suites: SuitesService,
    private readonly plans: TimesharesService,
    private readonly availability: AvailabilityService,
    private readonly pricing: PricingService,
    private readonly clients: ClientsService,
    private readonly bookings: BookingService
  ) {}

  async run() {
    const suiteA =
      (await this.suites.get('S-303')) ||
      (await this.suites.create({
        id: 'S-303',
        floor: 3,
        type: 'Deluxe',
        size: 323,
        view: 'Ocean',
        totalPrice: 185000,
        currency: 'BDT'
      } as any));
    const suiteB =
      (await this.suites.get('S-404')) ||
      (await this.suites.create({
        id: 'S-404',
        floor: 4,
        type: 'Premium',
        size: 366,
        view: 'Hill',
        totalPrice: 225000,
        currency: 'BDT'
      } as any));

    const planA =
      (await this.plans.get('P-7D')) ||
      (await this.plans
        .create({
          id: 'P-7D',
          name: '7 days/month',
          daysPerMonth: 7,
          lockIn: 36,
          price: 70000,
          currency: 'BDT',
          suiteId: 'S-303',
          planType: 'DPM',
          planStatus: 'Unsold'
        } as any)
        .then((r) => (r.ok ? r.plan : null)));
    const planB =
      (await this.plans.get('P-FULL')) ||
      (await this.plans
        .create({
          id: 'P-FULL',
          name: 'Full Share',
          daysPerMonth: 30,
          lockIn: 48,
          price: 350000,
          currency: 'BDT',
          suiteId: 'S-404',
          planType: 'FULL',
          planStatus: 'Unsold'
        } as any)
        .then((r) => (r.ok ? r.plan : null)));

    const today = new Date();
    const dates: string[] = [];
    for (let i = 0; i < 10; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString());
    }
    await this.availability.setBulk('S-303', dates, 'available');

    await this.pricing.add('P-7D', undefined, undefined, 70000);

    const client =
      (await this.clients.get('C-001')) ||
      (await this.clients.create({
        id: 'C-001',
        name: 'Md. Rahim',
        fatherName: 'Abdul Karim',
        nid: '1987654321',
        dob: '1990-05-15',
        address: 'Dhaka',
        permanentAddress: 'Chittagong',
        contact: '+88017XXXXXXXX',
        email: 'rahim@example.com',
        picUrl: '',
        nomineeName: 'Sultana Rahman',
        nomineeNid: '1987000123',
        nomineePicUrl: ''
      }));

    const start = new Date();
    start.setDate(start.getDate() + 30);
    const end = new Date(start);
    end.setDate(end.getDate() + 3);
    const booking = await this.bookings.book(
      'S-303',
      'P-7D',
      start.toISOString(),
      end.toISOString(),
      client.id
    );

    return {
      suites: [suiteA, suiteB],
      plans: [planA, planB],
      availability: await this.availability.listRange('S-303', dates[0], dates[dates.length - 1]),
      pricing: await this.pricing.list('P-7D'),
      clients: [client],
      booking
    };
  }
}
