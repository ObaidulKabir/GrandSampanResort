/** Session drafts so a logged-out buyer can sign in and resume booking. */

const PREFIX = 'gsr_booking_draft:';

export type CheckoutDraft = {
  step?: number;
  maxCompletedStep?: number;
  selectedTierId?: string;
  kyc?: Record<string, string>;
  referralCode?: string;
  depositMethod?: 'cheque' | 'cash_payorder' | 'online_transfer';
  depositReference?: string;
  depositNote?: string;
  depositProofUrl?: string;
  startDate?: string;
  cadence?: 'monthly' | 'quarterly';
  paymentTierId?: string;
  installmentMonths?: number;
};

function canUseStorage() {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

export function bookingDraftKey(planId: string) {
  return `${PREFIX}${planId}`;
}

export function saveBookingDraft(planId: string, data: CheckoutDraft) {
  if (!canUseStorage() || !planId) return;
  try {
    sessionStorage.setItem(bookingDraftKey(planId), JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

export function loadBookingDraft(planId: string): CheckoutDraft | null {
  if (!canUseStorage() || !planId) return null;
  try {
    const raw = sessionStorage.getItem(bookingDraftKey(planId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function clearBookingDraft(planId: string) {
  if (!canUseStorage() || !planId) return;
  try {
    sessionStorage.removeItem(bookingDraftKey(planId));
  } catch {
    /* ignore */
  }
}

/** Used when the buyer creates a new account — booking input must be discarded. */
export function clearAllBookingDrafts() {
  if (!canUseStorage()) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(PREFIX)) keys.push(key);
    }
    keys.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    /* ignore */
  }
}

export function bookingReturnPath(planId: string, from: 'invest' | 'advisor' | 'plan' = 'invest') {
  if (from === 'advisor') return `/invest/advisor?resume=${encodeURIComponent(planId)}`;
  if (from === 'plan') return `/pricing/plans/${encodeURIComponent(planId)}?resume=1`;
  return `/invest?resume=${encodeURIComponent(planId)}`;
}
