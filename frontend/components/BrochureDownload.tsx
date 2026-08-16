'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Button from '@/components/Button';

type Props = {
  variant?: 'primary' | 'outline' | 'ghost';
  className?: string;
};

export default function BrochureDownload({ variant = 'outline', className = '' }: Props) {
  const t = useTranslations('brochure');

  return (
    <Link href="/brochure" className={`inline-flex ${className}`.trim()}>
      <Button type="button" variant={variant} className="w-full sm:w-auto">
        {t('download')}
      </Button>
    </Link>
  );
}
