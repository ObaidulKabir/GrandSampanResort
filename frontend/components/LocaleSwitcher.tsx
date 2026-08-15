'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { locales, type Locale } from '@/i18n/routing';

type Props = {
  className?: string;
  compact?: boolean;
};

export default function LocaleSwitcher({ className = '', compact = false }: Props) {
  const t = useTranslations('localeSwitcher');
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: Locale) {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  }

  return (
    <div className={`inline-flex items-center gap-1 ${className}`} role="group" aria-label={t('label')}>
      {locales.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => switchTo(code)}
            aria-pressed={active}
            className={`min-h-9 rounded-md px-2.5 text-sm font-medium transition ${
              active
                ? 'bg-ocean text-pearl'
                : 'border border-ocean/20 text-ocean hover:border-gold hover:text-gold'
            } ${compact ? 'px-2 text-xs' : ''}`}
          >
            {t(code)}
          </button>
        );
      })}
    </div>
  );
}
