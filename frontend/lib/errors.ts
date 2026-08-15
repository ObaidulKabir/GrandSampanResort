/**
 * Map API error codes to localized user-facing sentences.
 * Never render raw `res.error` / `res.message` from the API client.
 */

type Translate = (key: string, values?: any) => string;

const KNOWN_CODES = new Set([
  'plan_required',
  'plan_not_found',
  'plan_not_available',
  'kyc_required',
  'deposit_payment_required',
  'email_not_verified',
  'login_required',
  'forbidden',
  'invalid_token',
  'bad_response',
  'request_failed',
  'reason_required',
  'reason_too_long',
  'referral_invalid',
  'referral_self',
  'quote_expired',
  'quote_invalid',
  'booking_exists',
  'insufficient_deposit',
  'file_too_large',
  'heic_unsupported',
  'unsupported_type',
  'upload_failed'
]);

export function apiErrorMessage(
  codeOrMessage: string | null | undefined,
  t: Translate,
  fallbackKey = 'generic'
): string {
  const raw = String(codeOrMessage || '').trim();
  if (!raw) return safeT(t, fallbackKey);

  // Prefer exact code keys under errors.*
  const asCode = raw.replace(/\s+/g, '_').toLowerCase();
  if (KNOWN_CODES.has(raw) || KNOWN_CODES.has(asCode)) {
    const key = KNOWN_CODES.has(raw) ? raw : asCode;
    return safeT(t, key, fallbackKey);
  }

  // Machine-looking snake_case → try as key, else generic (never leak English class-validator)
  if (/^[a-z][a-z0-9_]+$/.test(raw)) {
    return safeT(t, raw, fallbackKey);
  }

  return safeT(t, fallbackKey);
}

function safeT(t: Translate, key: string, fallbackKey = 'generic') {
  try {
    const value = t(key);
    if (value && value !== key) return value;
  } catch {
    /* missing */
  }
  try {
    return t(fallbackKey);
  } catch {
    return 'Something went wrong. Please try again.';
  }
}

export function uploadImageErrorMessageLocalized(err: unknown, t: Translate): string {
  const code = err instanceof Error ? err.message : String(err || '');
  if (code === 'file_too_large') return safeT(t, 'file_too_large');
  if (code === 'heic_unsupported') return safeT(t, 'heic_unsupported');
  if (code === 'unsupported_type') return safeT(t, 'unsupported_type');
  return safeT(t, 'upload_failed');
}
