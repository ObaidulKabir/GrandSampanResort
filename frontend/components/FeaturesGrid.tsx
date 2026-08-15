import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

const amenities = [
  { icon: '/images/icons/beach-access.svg', key: 'beach' },
  { icon: '/images/icons/balcony.svg', key: 'balcony' },
  { icon: '/images/icons/concierge.svg', key: 'concierge' },
  { icon: '/images/icons/security.svg', key: 'security' },
  { icon: '/images/icons/housekeeping.svg', key: 'housekeeping' },
  { icon: '/images/icons/wifi.svg', key: 'wifi' },
  { icon: '/images/icons/power.svg', key: 'power' },
  { icon: '/images/icons/parking.svg', key: 'parking' }
] as const;

export default async function FeaturesGrid() {
  const t = await getTranslations('features');

  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden border border-ocean/10 bg-ocean/10 sm:grid-cols-2 md:grid-cols-4">
      {amenities.map((a) => (
        <div key={a.key} className="group bg-white p-4 transition-colors hover:bg-pearl sm:p-6">
          <div className="relative h-9 w-9">
            <Image src={a.icon} alt="" fill sizes="36px" />
          </div>
          <div className="font-display mt-4 text-lg text-ocean">{t(`${a.key}Title`)}</div>
          <p className="mt-1.5 text-sm leading-relaxed text-ocean/70">{t(`${a.key}Desc`)}</p>
        </div>
      ))}
    </div>
  );
}
