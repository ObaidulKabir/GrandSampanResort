/** Persist referral code from ?ref= across pages until purchase/register. */
const REF_KEY = 'gsr_referral_code';

export function normalizeReferralCode(raw?: string | null) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 16);
}

export function captureReferralFromSearch(search: string | URLSearchParams | null | undefined) {
  if (typeof window === 'undefined') return null;
  try {
    const params =
      typeof search === 'string'
        ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
        : search instanceof URLSearchParams
          ? search
          : new URLSearchParams(window.location.search);
    const code = normalizeReferralCode(params.get('ref'));
    if (code) {
      localStorage.setItem(REF_KEY, code);
      return code;
    }
  } catch {
    /* ignore */
  }
  return getStoredReferralCode();
}

export function getStoredReferralCode() {
  if (typeof window === 'undefined') return null;
  try {
    return normalizeReferralCode(localStorage.getItem(REF_KEY)) || null;
  } catch {
    return null;
  }
}

export function setStoredReferralCode(code?: string | null) {
  if (typeof window === 'undefined') return;
  const normalized = normalizeReferralCode(code);
  try {
    if (normalized) localStorage.setItem(REF_KEY, normalized);
    else localStorage.removeItem(REF_KEY);
  } catch {
    /* ignore */
  }
}

export function clearStoredReferralCode() {
  setStoredReferralCode(null);
}
