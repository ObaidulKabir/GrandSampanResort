import { defineRouting } from 'next-intl/routing';

export const locales = ['en', 'bn'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  bn: 'বাংলা'
};

export const routing = defineRouting({
  locales,
  defaultLocale: 'en',
  // English keeps the bare paths (/invest); Bangla is prefixed (/bn/invest).
  localePrefix: 'as-needed',
  // Many Bangladeshi users browse with English-locale devices, so header
  // sniffing would send them to the wrong site. The switcher is the only
  // thing that changes locale, and the choice persists in a cookie.
  localeDetection: false
});
