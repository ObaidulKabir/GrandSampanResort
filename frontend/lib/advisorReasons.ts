import { formatMoney } from '@/lib/format';

export type AdvisorReason = {
  code?: string;
  amountBdt?: number;
  fromMonth?: number;
  yieldPct?: number;
  tierId?: string;
};

type Translate = (key: string, values?: any) => string;

/** Render advisor reason codes with localized copy (do not use API summary/points). */
export function formatAdvisorReasons(reasons: AdvisorReason[] | null | undefined, t: Translate): string[] {
  if (!Array.isArray(reasons) || !reasons.length) return [];
  return reasons
    .map((r) => {
      const code = String(r?.code || '');
      const amount = formatMoney(r?.amountBdt || 0, 0);
      switch (code) {
        case 'SAVES_VS_STANDARD':
          return t('SAVES_VS_STANDARD', { amount });
        case 'HIGHER_YIELD':
          return r.amountBdt ? t('HIGHER_YIELD_AMOUNT', { amount }) : t('HIGHER_YIELD');
        case 'FULL_PAYMENT':
          return t('FULL_PAYMENT');
        case 'HALF_ADVANCE':
          return t('HALF_ADVANCE');
        case 'MERGED_DOWNPAYMENT':
          return t('MERGED_DOWNPAYMENT');
        case 'LONGER_TENOR':
          return t('LONGER_TENOR');
        case 'REFERRAL_COVERS_INSTALLMENTS':
          return t('REFERRAL_COVERS_INSTALLMENTS', { amount });
        case 'INFEASIBLE_WITHOUT_REFERRAL':
          return t('INFEASIBLE_WITHOUT_REFERRAL');
        case 'INFEASIBLE':
          return t('INFEASIBLE');
        default:
          return '';
      }
    })
    .filter(Boolean);
}
