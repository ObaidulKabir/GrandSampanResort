import { Injectable } from "@nestjs/common";
import { SuitesService } from "../suites/suites.service";
import { TimesharesService } from "../timeshares/timeshares.service";
import { AvailabilityService } from "../availability/availability.service";
import { PricingService } from "../pricing/pricing.service";
import { ClientsService } from "../clients/clients.service";
import { BookingService } from "../booking/booking.service";

@Injectable()
export class SeedService {
  constructor(
    private readonly suites: SuitesService,
    private readonly plans: TimesharesService,
    private readonly availability: AvailabilityService,
    private readonly pricing: PricingService,
    private readonly clients: ClientsService,
    private readonly bookings: BookingService,
  ) {}

  async run() {
    const suiteA = await this.suites.create({
      id: "S-303",
      floor: 3,
      type: "Deluxe",
      size: 365,
      view: "Ocean",
      totalPrice: 185000,
      currency: "BDT",
    });
    const suiteB = await this.suites.create({
      id: "S-404",
      floor: 4,
      type: "Premium",
      size: 365,
      view: "Hill",
      totalPrice: 225000,
      currency: "BDT",
    });

    await this.plans.create({
      id: "P-7D",
      name: "7 days/month",
      daysPerMonth: 7,
      lockIn: 36,
      price: 70000,
      revenueEntitlement: 0.08,
      currency: "BDT",
      suiteId: "S-303",
      planType: "DPM",
      planStatus: "Unsold",
    });
    await this.plans.create({
      id: "P-FULL",
      name: "Full Share",
      daysPerMonth: 30,
      lockIn: 48,
      price: 350000,
      revenueEntitlement: 0.12,
      currency: "BDT",
      suiteId: "S-404",
      planType: "FULL",
      planStatus: "Unsold",
    });

    const today = new Date();
    const dates: string[] = [];
    for (let i = 0; i < 10; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString());
    }
    await this.availability.setBulk("S-303", dates, "available");

    await this.pricing.add("P-7D", undefined, undefined, 70000);

    const client = await this.clients.create({
      id: "C-001",
      name: "Md. Rahim",
      fatherName: "Abdul Karim",
      nid: "1987654321",
      dob: new Date("1990-05-15").toISOString(),
      address: "Dhaka",
      permanentAddress: "Chittagong",
      contact: "+88017XXXXXXXX",
      email: "rahim@example.com",
      picUrl: "",
      nomineeName: "Sultana Rahman",
      nomineeNid: "1987000123",
      nomineePicUrl: "",
    });

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 3);
    const booking = await this.bookings.book(
      "S-303",
      "P-7D",
      start.toISOString(),
      end.toISOString(),
      client.id,
    );

    return {
      suites: [suiteA, suiteB],
      plans: await this.plans.list(),
      availability: await this.availability.listRange(
        "S-303",
        dates[0],
        dates[dates.length - 1],
      ),
      pricing: await this.pricing.list("P-7D"),
      clients: [client],
      booking,
    };
  }
}
