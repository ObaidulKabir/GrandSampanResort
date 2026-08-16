'use client';

import { useLocale, useTranslations } from 'next-intl';
import { apiBaseUrl } from '@/lib/api';
import Button from '@/components/Button';

type Props = {
  variant?: 'primary' | 'outline' | 'ghost';
  className?: string;
};

export default function BrochureDownload({ variant = 'outline', className = '' }: Props) {
  const t = useTranslations('brochure');
  const locale = useLocale() === 'bn' ? 'bn' : 'en';
  const href = `${apiBaseUrl()}/brochure.pdf?locale=${locale}`;

  return (
    <Button type="button" variant={variant} className={className} onClick={() => { window.location.href = href; }}>
      {t('download')}
    </Button>
  );
}
