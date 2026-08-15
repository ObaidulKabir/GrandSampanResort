import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.grandsampanresort.com';

export function absoluteUrl(pathname: string, locale: Locale) {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const normalized = path === '/' ? '' : path;
  if (locale === routing.defaultLocale) return `${SITE_URL}${normalized}` || SITE_URL;
  return `${SITE_URL}/${locale}${normalized}`;
}

export async function buildLocaleMetadata(
  locale: string,
  opts?: { title?: string; description?: string; path?: string }
): Promise<Metadata> {
  const loc = (routing.locales.includes(locale as Locale) ? locale : routing.defaultLocale) as Locale;
  setRequestLocale(loc);
  const t = await getTranslations({ locale: loc, namespace: 'meta' });
  const title = opts?.title || t('title');
  const description = opts?.description || t('description');
  const path = opts?.path || '/';
  const languages: Record<string, string> = {
    en: absoluteUrl(path, 'en'),
    bn: absoluteUrl(path, 'bn'),
    'x-default': absoluteUrl(path, 'en')
  };

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(path, loc),
      languages
    },
    openGraph: {
      title,
      description,
      locale: loc === 'bn' ? 'bn_BD' : 'en_US',
      alternateLocale: loc === 'bn' ? ['en_US'] : ['bn_BD'],
      url: absoluteUrl(path, loc),
      siteName: t('title'),
      type: 'website'
    }
  };
}
