import Image from 'next/image';

const amenities = [
  {
    icon: '/images/icons/beach-access.svg',
    title: 'Private beach access',
    desc: 'Step straight onto Cox\u2019s Bazar\u2019s shoreline from the resort grounds.'
  },
  {
    icon: '/images/icons/balcony.svg',
    title: 'Sea-facing balconies',
    desc: 'Every suite is designed to frame an unobstructed ocean view.'
  },
  {
    icon: '/images/icons/concierge.svg',
    title: '24/7 concierge',
    desc: 'Dedicated staff for reservations, transfers, and daily requests.'
  },
  {
    icon: '/images/icons/security.svg',
    title: 'Round-the-clock security',
    desc: 'Gated access and monitored grounds for total peace of mind.'
  },
  {
    icon: '/images/icons/housekeeping.svg',
    title: 'Daily housekeeping',
    desc: 'Suites are maintained to a five-star standard year-round.'
  },
  {
    icon: '/images/icons/wifi.svg',
    title: 'High-speed Wi-Fi',
    desc: 'Fibre connectivity throughout guest and owner areas.'
  },
  {
    icon: '/images/icons/power.svg',
    title: 'Backup power',
    desc: 'Uninterrupted comfort with full-site generator backup.'
  },
  {
    icon: '/images/icons/parking.svg',
    title: 'Secure parking',
    desc: 'On-site parking reserved for owners and guests.'
  }
];

export default function FeaturesGrid() {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden border border-ocean/10 bg-ocean/10 sm:grid-cols-2 md:grid-cols-4">
      {amenities.map((a) => (
        <div key={a.title} className="group bg-white p-4 transition-colors hover:bg-pearl sm:p-6">
          <div className="relative h-9 w-9">
            <Image src={a.icon} alt="" fill sizes="36px" />
          </div>
          <div className="font-display mt-4 text-lg text-ocean">{a.title}</div>
          <p className="mt-1.5 text-sm leading-relaxed text-ocean/70">{a.desc}</p>
        </div>
      ))}
    </div>
  );
}
