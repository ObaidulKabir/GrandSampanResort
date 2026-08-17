import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.grandsampanresort.com';

const PATHS = [
  '/',
  '/invest',
  '/invest/advisor',
  '/suites',
  '/booking',
  '/about',
  '/directors',
  '/faq',
  '/terms',
  '/trust',
  '/design-layout',
  '/investment-plans',
  '/returns-income',
  '/brochure',
  '/investor',
  '/auth/login',
  '/auth/register'
];

function urlFor(locale: string, path: string) {
  if (locale === routing.defaultLocale) {
    return `${SITE_URL}${path === '/' ? '' : path}` || SITE_URL;
  }
  return `${SITE_URL}/${locale}${path === '/' ? '' : path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const path of PATHS) {
    for (const locale of routing.locales) {
      entries.push({
        url: urlFor(locale, path),
        lastModified: new Date(),
        changeFrequency: path === '/' || path === '/invest' ? 'weekly' : 'monthly',
        priority: path === '/' ? 1 : path.startsWith('/invest') ? 0.9 : 0.6,
        alternates: {
          languages: Object.fromEntries(routing.locales.map((l) => [l, urlFor(l, path)]))
        }
      });
    }
  }
  return entries;
}
