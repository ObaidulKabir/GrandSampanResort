'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import { apiBaseUrl } from '@/lib/api';

export default function Footer() {
  const t = useTranslations('footer');
  const locale = useLocale() === 'bn' ? 'bn' : 'en';
  const year = new Date().getFullYear();
  const brochureHref = `${apiBaseUrl()}/brochure.pdf?locale=${locale}`;

  return (
    <footer className="w-full border-t border-gold/20 bg-pearl">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 md:grid-cols-3 md:py-12">
        <div>
          <h3 className="font-display text-xl text-ocean md:text-2xl">{t('brand')}</h3>
          <p className="mt-2 text-ocean/80">{t('tagline')}</p>
          <p className="mt-1 text-ocean/70">{t('address')}</p>
          <div className="mt-4">
            <LocaleSwitcher compact />
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-ocean">{t('contacts')}</h4>
          <ul className="mt-2 space-y-2 text-ocean/80">
            <li>
              <a className="inline-flex min-h-11 items-center" href="tel:+8801300999750">
                +880 1300-999750
              </a>
            </li>
            <li>
              <a className="break-all" href="mailto:admin@grandsampanresort.com">
                admin@grandsampanresort.com
              </a>
            </li>
            <li>
              <Link href="/about">{t('about')}</Link>
            </li>
            <li>
              <Link href="/design-layout">{t('designLayout')}</Link>
            </li>
            <li>
              <Link href="/invest">{t('invest')}</Link>
            </li>
            <li>
              <Link href="/returns-income">{t('returns')}</Link>
            </li>
            <li>
              <a href={brochureHref}>{t('brochure')}</a>
            </li>
            <li>
              <Link href="/faq">{t('faq')}</Link>
            </li>
            <li>
              <Link href="/terms">{t('terms')}</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-ocean">{t('social')}</h4>
          <ul className="mt-2 space-y-2 text-ocean/80">
            <li>
              <a href="https://www.facebook.com/GrandSampanResort" target="_blank" rel="noopener noreferrer">
                {t('facebook')}
              </a>
            </li>
            <li>
              <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">
                {t('instagram')}
              </a>
            </li>
            <li>
              <a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer">
                {t('youtube')}
              </a>
            </li>
            <li>
              <a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer">
                {t('linkedin')}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 pb-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))] text-sm text-ocean/60 sm:px-6 md:pb-8">
        {t('copyright', { year })}
      </div>
    </footer>
  );
}
