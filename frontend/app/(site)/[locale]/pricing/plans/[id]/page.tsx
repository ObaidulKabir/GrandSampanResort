'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { api, apiUpload } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { resolveMediaUrl } from '@/lib/media';
import { prepareImageForUpload } from '@/lib/uploadImage';
import Image from 'next/image';
import { useAppStore } from '@/store/appStore';
import Button from '@/components/Button';
import PlanOwner from '@/components/PlanOwner';
import ReturnsCalculator from '@/components/ReturnsCalculator';
import SuitePlans from '@/components/SuitePlans';
import {
  captureReferralFromSearch,
  clearStoredReferralCode,
  getStoredReferralCode,
  normalizeReferralCode,
  setStoredReferralCode
} from '@/lib/referral';
import { loadBookingDraft, saveBookingDraft, clearBookingDraft } from '@/lib/bookingDraft';
import { formatSavePct, tierHeadline, tierHelp } from '@/lib/paymentCopy';
import { generatePaymentSchedule, planOfferPrice, scheduleTotals } from '@/lib/schedule';
import { uploadImageErrorMessageLocalized } from '@/lib/errors';

type Plan = {
  id: string;
  name: string;
  daysPerMonth: number;
  lockIn?: number;
  price: number;
  suiteId?: string;
  planType?: string;
  timeFraction?: number;
  planStatus?: string;
  discountPct?: number;
  discountedPrice?: number;
  promoName?: string;
  promoEndsAt?: string;
  owner?: { name: string; city?: string; profession?: string; picUrl?: string | null } | null;
};
type Suite = { id: string; type: string; view: string; floor: number; size: number };
type Rule = { start: string; end: string; price: number };

type KycForm = {
  name: string;
  fatherName: string;
  nid: string;
  dob: string;
  address: string;
  permanentAddress: string;
  contact: string;
  email: string;
  picUrl: string;
  profession: string;
  city: string;
  nomineeName: string;
  nomineeNid: string;
  nomineePicUrl: string;
};

const emptyKyc = (): KycForm => ({
  name: '',
  fatherName: '',
  nid: '',
  dob: '',
  address: '',
  permanentAddress: '',
  contact: '',
  email: '',
  picUrl: '',
  profession: '',
  city: '',
  nomineeName: '',
  nomineeNid: '',
  nomineePicUrl: ''
});

function kycFieldLabels(t: (key: string) => string): Record<keyof KycForm, string> {
  return {
    name: t('kycName'),
    fatherName: t('kycFatherName'),
    nid: t('kycNid'),
    dob: t('kycDob'),
    address: t('kycAddress'),
    permanentAddress: t('kycPermanentAddress'),
    contact: t('kycContact'),
    email: t('kycEmail'),
    picUrl: t('kycPic'),
    profession: t('kycProfession'),
    city: t('kycCity'),
    nomineeName: t('kycNomineeName'),
    nomineeNid: t('kycNomineeNid'),
    nomineePicUrl: t('kycNomineePic')
  };
}

function missingKycFields(kyc: KycForm): (keyof KycForm)[] {
  return (Object.keys(kyc) as (keyof KycForm)[]).filter(
    (key) => String(kyc[key] || '').trim().length === 0
  );
}

function isKycComplete(kyc: KycForm) {
  return missingKycFields(kyc).length === 0;
}

type DepositMethod = 'cheque' | 'cash_payorder' | 'online_transfer';

function depositMethodLabels(t: (key: string) => string): Record<DepositMethod, string> {
  return {
    cheque: t('depositCheque'),
    cash_payorder: t('depositCash'),
    online_transfer: t('depositOnline')
  };
}

export default function PlanDetailsPage({ params }: { params: { id: string } }) {
  const t = useTranslations('planDetails');
  const tPayment = useTranslations('payment');
  const tErrors = useTranslations('errors');
  const planId = params.id;
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const token = useAppStore((s) => s.token);
  const hydrate = useAppStore((s) => s.hydrate);
  const setAuth = useAppStore((s) => s.setAuth);
  const emailVerified = !!user?.emailVerified || user?.role === 'admin';
  const [plan, setPlan] = useState<Plan | null>(null);
  const [suite, setSuite] = useState<Suite | null>(null);
  const [unitPlans, setUnitPlans] = useState<Plan[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [showTools, setShowTools] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    bookingId: string;
    depositAmount: number;
    depositMethod: DepositMethod;
    depositReference: string;
  } | null>(null);

  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [depositPct, setDepositPct] = useState<number>(10);
  const [downPct, setDownPct] = useState<number>(20);
  const [cadence, setCadence] = useState<'monthly' | 'quarterly'>('monthly');
  const [paymentTierId, setPaymentTierId] = useState('standard');
  const [installmentMonths, setInstallmentMonths] = useState(24);
  const [tenors, setTenors] = useState<number[]>([24, 36]);
  const [resolvedTiers, setResolvedTiers] = useState<any[]>([]);
  const [quote, setQuote] = useState<any>(null);
  const [showScheduleOptions, setShowScheduleOptions] = useState(false);
  const [kyc, setKyc] = useState<KycForm>(() => emptyKyc());
  const [uploadingPic, setUploadingPic] = useState<'pic' | 'nominee' | null>(null);
  const [picPreview, setPicPreview] = useState<{ pic?: string; nominee?: string }>({});
  const [picError, setPicError] = useState<{ pic?: string; nominee?: string }>({});
  const [depositMethod, setDepositMethod] = useState<DepositMethod>('cheque');
  const [depositReference, setDepositReference] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [depositProofUrl, setDepositProofUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referralHint, setReferralHint] = useState('');
  const suppressDraftPersist = useRef(false);

  useEffect(() => {
    captureReferralFromSearch(typeof window !== 'undefined' ? window.location.search : '');
    setReferralCode(getStoredReferralCode() || '');
  }, []);

  useEffect(() => {
    const code = normalizeReferralCode(referralCode);
    if (!code) {
      setReferralHint('');
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const res = await api(`/referral/validate?code=${encodeURIComponent(code)}&buyerId=${encodeURIComponent(user?.id || '')}`);
      if (cancelled) return;
      if (res?.ok) {
        setReferralHint(t('referrer', { name: res.referrer?.name || res.code }));
        setStoredReferralCode(code);
      } else if (res?.error === 'self_referral') {
        setReferralHint(t('selfReferral'));
      } else {
        setReferralHint(t('codeUnrecognized'));
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [referralCode, user?.id, t]);

  // Restore in-progress booking form after login redirects / refreshes.
  useLayoutEffect(() => {
    suppressDraftPersist.current = true;
    const draft = loadBookingDraft(planId);
    if (draft) {
      if (draft.kyc && typeof draft.kyc === 'object') {
        setKyc({ ...emptyKyc(), ...draft.kyc });
      } else {
        setKyc(emptyKyc());
      }
      if (
        draft.depositMethod === 'cheque' ||
        draft.depositMethod === 'cash_payorder' ||
        draft.depositMethod === 'online_transfer'
      ) {
        setDepositMethod(draft.depositMethod);
      } else {
        setDepositMethod('cheque');
      }
      setDepositReference(typeof draft.depositReference === 'string' ? draft.depositReference : '');
      setDepositNote(typeof draft.depositNote === 'string' ? draft.depositNote : '');
      setDepositProofUrl(typeof draft.depositProofUrl === 'string' ? draft.depositProofUrl : '');
      if (typeof draft.startDate === 'string' && draft.startDate) setStartDate(draft.startDate);
      if (draft.cadence === 'monthly' || draft.cadence === 'quarterly') setCadence(draft.cadence);
      if (typeof draft.paymentTierId === 'string' && draft.paymentTierId) setPaymentTierId(draft.paymentTierId);
      if (Number(draft.installmentMonths) > 0) setInstallmentMonths(Number(draft.installmentMonths));
    } else {
      setKyc(emptyKyc());
      setDepositReference('');
      setDepositNote('');
      setDepositProofUrl('');
      setDepositMethod('cheque');
    }
  }, [planId]);

  useEffect(() => {
    if (suppressDraftPersist.current) {
      suppressDraftPersist.current = false;
      return;
    }
    saveBookingDraft(planId, {
      kyc,
      depositMethod,
      depositReference,
      depositNote,
      depositProofUrl,
      startDate,
      cadence,
      paymentTierId,
      installmentMonths
    });
  }, [
    planId,
    kyc,
    depositMethod,
    depositReference,
    depositNote,
    depositProofUrl,
    startDate,
    cadence,
    paymentTierId,
    installmentMonths
  ]);

  useEffect(() => {
    if (!user) return;
    setKyc((prev) => ({
      ...prev,
      name: prev.name || user.name || '',
      email: prev.email || user.email || ''
    }));
  }, [user]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const t = q.get('tier');
      const m = Number(q.get('months'));
        if (t) setPaymentTierId(t);
        if (Number.isFinite(m) && m > 0) {
          setInstallmentMonths(m);
          if (m !== 24) setShowScheduleOptions(true);
        }
    } catch {
      /* ignore */
    }
  }, [planId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await api('/payment-plans/policy');
      if (cancelled || !res?.ok) return;
      if (Array.isArray(res.policy?.tenors) && res.policy.tenors.length) {
        setTenors(res.policy.tenors);
      }
      if (Array.isArray(res.resolved)) setResolvedTiers(res.resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!planId) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await api('/booking/quote', {
        method: 'POST',
        body: JSON.stringify({
          planId,
          paymentTierId,
          installmentMonths,
          cadence,
          start: new Date(startDate).toISOString()
        })
      });
      if (cancelled || !res?.ok) return;
      setQuote(res.quote);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [planId, paymentTierId, installmentMonths, cadence, startDate]);

  useEffect(() => {
    return () => {
      if (picPreview.pic) URL.revokeObjectURL(picPreview.pic);
      if (picPreview.nominee) URL.revokeObjectURL(picPreview.nominee);
    };
    // Only revoke on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh emailVerified (and other profile flags) from the server after hydrate.
  useEffect(() => {
    if (!token) return;
    api('/auth/me')
      .then((res) => {
        if (res?.ok && res.user) {
          setAuth(
            {
              id: res.user.id,
              email: res.user.email,
              name: res.user.name,
              emailVerified: !!res.user.emailVerified,
              role: res.user.role,
              kyc: res.user.kyc
            },
            token
          );
        }
      })
      .catch(() => {});
  }, [token, setAuth]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [pRes, allPlansRes] = await Promise.all([
          api(`/timeshares/${planId}`),
          api('/timeshares').catch(() => [])
        ]);
        const p = pRes?.id ? pRes : pRes?.plan || null;
        if (p) {
          setPlan(p);
          const allPlans = Array.isArray(allPlansRes) ? allPlansRes : allPlansRes?.plans ?? [];
          if (p.suiteId) {
            const sRes = await api(`/suites/${p.suiteId}`);
            setSuite(sRes?.suite || sRes || null);
            const onSuite = allPlans
              .filter((x: Plan) => x.suiteId === p.suiteId)
              .sort(
                (a: Plan, b: Plan) =>
                  Number(a.daysPerMonth || 0) - Number(b.daysPerMonth || 0) ||
                  String(a.id).localeCompare(String(b.id), undefined, { numeric: true })
              );
            if (!onSuite.some((x: Plan) => x.id === p.id)) {
              onSuite.unshift(p);
            }
            setUnitPlans(onSuite);
          } else {
            setUnitPlans([p]);
          }
          const rRes = await api(`/pricing/plans/${planId}`);
          setRules(Array.isArray(rRes?.rules) ? rRes.rules : []);
        }
      } catch {
        setError(t('loadFailed'));
      }
      setLoading(false);
    }
    load();
  }, [planId]);

  function selectUnitPlan(nextId: string) {
    if (!nextId || nextId === planId) return;
    router.push(`/pricing/plans/${encodeURIComponent(nextId)}`);
  }

  function updateKyc<K extends keyof KycForm>(key: K, value: KycForm[K]) {
    setKyc((prev) => ({ ...prev, [key]: value }));
  }

  function persistCurrentDraft() {
    saveBookingDraft(planId, {
      kyc,
      depositMethod,
      depositReference,
      depositNote,
      depositProofUrl,
      startDate,
      cadence,
      paymentTierId,
      installmentMonths
    });
  }

  function redirectToLogin() {
    persistCurrentDraft();
    router.push(`/auth/login?next=${encodeURIComponent(`/pricing/plans/${planId}`)}`);
  }

  async function uploadKycPhoto(kind: 'pic' | 'nominee', file: File | null) {
    if (!file) return;
    if (!token || !user?.id) {
      redirectToLogin();
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPicPreview((prev) => {
      if (prev[kind]) URL.revokeObjectURL(prev[kind]!);
      return { ...prev, [kind]: previewUrl };
    });
    setPicError((prev) => ({ ...prev, [kind]: undefined }));
    setUploadingPic(kind);
    setStatus('');

    try {
      const prepared = await prepareImageForUpload(file);
      const form = new FormData();
      form.append('file', prepared);
      const res = await apiUpload('/media/kyc-upload', form);
      if (!res?.ok || !res.url) {
        const authFailed = res?.status === 401 || res?.status === 403;
        const message = authFailed
          ? t('photoUploadAuth')
          : typeof res?.message === 'string'
            ? res.message
            : t('photoUploadFailed');
        setPicError((prev) => ({ ...prev, [kind]: message }));
        setStatus(message);
        return;
      }
      updateKyc(kind === 'pic' ? 'picUrl' : 'nomineePicUrl', res.url);
      setPicError((prev) => ({ ...prev, [kind]: undefined }));
    } catch (err) {
      const message = uploadImageErrorMessageLocalized(err, tErrors);
      setPicError((prev) => ({ ...prev, [kind]: message }));
      setStatus(message);
    } finally {
      setUploadingPic(null);
    }
  }

  async function uploadDepositProof(file: File | null) {
    if (!file) return;
    if (!token || !user?.id) {
      redirectToLogin();
      return;
    }
    setUploadingProof(true);
    setStatus('');
    try {
      const prepared = await prepareImageForUpload(file);
      const form = new FormData();
      form.append('file', prepared);
      const res = await apiUpload('/media/payment-proof', form);
      if (!res?.ok || !res.url) {
        setStatus(t('proofUploadFailed'));
        return;
      }
      setDepositProofUrl(res.url);
    } catch (err) {
      setStatus(uploadImageErrorMessageLocalized(err, tErrors));
    } finally {
      setUploadingProof(false);
    }
  }

  async function confirmInvestment() {
    if (!plan?.suiteId) {
      setStatus(t('planNotLinked'));
      return;
    }
    if (!token || !user?.id) {
      redirectToLogin();
      return;
    }
    if (!emailVerified) {
      persistCurrentDraft();
      setStatus(t('verifyBeforeSubmit'));
      router.push(`/auth/verify?next=${encodeURIComponent(`/pricing/plans/${planId}`)}`);
      return;
    }
    if (!isKycComplete(kyc)) {
      const missing = missingKycFields(kyc).map((key) => kycFieldLabels(t)[key]);
      setStatus(
        missing.length
          ? t('stillNeeded', { fields: missing.join(', ') })
          : t('completeKyc')
      );
      if (typeof window !== 'undefined') {
        document.getElementById('booking-kyc')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    if (!depositReference.trim()) {
      setStatus(t('enterPaymentRef'));
      if (typeof window !== 'undefined') {
        document.getElementById('booking-deposit')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    const sold = (plan.planStatus || '').toLowerCase() !== 'unsold';
    if (sold) {
      setStatus(t('planUnavailable'));
      return;
    }
    setBuying(true);
    setStatus(t('submitting'));
    try {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 3);
      const res = await api('/booking', {
        method: 'POST',
        body: JSON.stringify({
          suiteId: plan.suiteId,
          planId: plan.id,
          start: start.toISOString(),
          end: end.toISOString(),
          investorId: user.id,
          cadence,
          kyc: {
            name: kyc.name.trim(),
            fatherName: kyc.fatherName.trim(),
            nid: kyc.nid.trim(),
            dob: kyc.dob.trim(),
            address: kyc.address.trim(),
            permanentAddress: kyc.permanentAddress.trim(),
            contact: kyc.contact.trim(),
            email: kyc.email.trim(),
            picUrl: kyc.picUrl.trim(),
            profession: kyc.profession.trim(),
            city: kyc.city.trim(),
            nomineeName: kyc.nomineeName.trim(),
            nomineeNid: kyc.nomineeNid.trim(),
            nomineePicUrl: kyc.nomineePicUrl.trim()
          },
          depositMethod,
          depositReference: depositReference.trim(),
          depositProofUrl: depositProofUrl.trim() || undefined,
          depositNote: depositNote.trim() || undefined,
          referralCode: normalizeReferralCode(referralCode) || undefined,
          paymentTierId,
          installmentMonths,
          quoteToken: quote?.quoteToken || undefined
        })
      });
      if (!res?.ok || !res.booking?.id) {
        const msg =
          res?.error === 'email_not_verified'
            ? t('errEmailNotVerified')
            : res?.error === 'kyc_required'
              ? t('errKycRequired')
              : res?.error === 'deposit_payment_required'
                ? t('errDepositRequired')
                : res?.error === 'plan_not_available' || res?.error === 'conflict'
                  ? t('errPlanUnavailable')
                  : res?.error === 'plan_not_found'
                    ? t('errPlanNotFound')
                    : res?.error === 'plan_suite_mismatch'
                      ? t('errSuiteMismatch')
                      : res?.error === 'suite_not_found'
                        ? t('errSuiteNotFound')
                        : res?.error === 'quote_expired' || res?.error === 'quote_invalid'
                      ? t('errQuoteExpired')
                      : res?.error === 'busy'
                          ? t('errConflict')
                          : res?.error === 'booking_failed'
                            ? t('errBookingFailed')
                            : t('errPurchaseFailed');
        if (res?.error === 'email_not_verified') {
          router.push(`/auth/verify?next=${encodeURIComponent(`/pricing/plans/${planId}`)}`);
        }
        if (res?.error === 'quote_expired' || res?.error === 'quote_invalid') {
          const fresh = await api('/booking/quote', {
            method: 'POST',
            body: JSON.stringify({
              planId,
              paymentTierId,
              installmentMonths,
              cadence,
              start: start.toISOString()
            })
          });
          if (fresh?.ok) setQuote(fresh.quote);
        }
        setStatus(msg);
        setBuying(false);
        return;
      }
      const scheduleRes = await api(`/booking/${res.booking.id}/schedule`);
      const deposit = (scheduleRes?.schedule || []).find((i: any) => i.type === 'deposit');
      setStatus('');
      clearStoredReferralCode();
      setConfirmation({
        bookingId: res.booking.id,
        depositAmount: deposit?.amount || depositPreview,
        depositMethod,
        depositReference: depositReference.trim()
      });
      clearBookingDraft(planId);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setStatus(t('errPurchaseFailed'));
    }
    setBuying(false);
  }

  const listPrice = Math.round(Number(plan?.price) || 0);
  const offerPrice = quote?.afterPromo ?? planOfferPrice(plan);
  const netPayable = quote?.netPrice ?? offerPrice;
  const discounted = offerPrice < listPrice || typeof plan?.discountedPrice === 'number';
  const kycMissing = useMemo(() => missingKycFields(kyc), [kyc]);
  const kycComplete = kycMissing.length === 0;
  const onlyPhotosMissing =
    kycMissing.length > 0 && kycMissing.every((k) => k === 'picUrl' || k === 'nomineePicUrl');

  const selectedTier = resolvedTiers.find((t) => t.id === paymentTierId);
  const pricedSchedule = useMemo(() => {
    if (quote?.schedule?.length) return quote.schedule;
    return generatePaymentSchedule(netPayable, new Date(startDate || Date.now()), {
      upfrontPct: quote?.upfrontPct ?? selectedTier?.upfrontPct ?? 10,
      downpaymentPct: quote?.assumptions?.downpaymentPct ?? 20,
      downpaymentAfterMonths: quote?.assumptions?.downpaymentAfterMonths ?? 3,
      installmentMonths,
      cadence
    });
  }, [
    quote,
    netPayable,
    startDate,
    selectedTier?.upfrontPct,
    installmentMonths,
    cadence
  ]);
  const payTotals = scheduleTotals(pricedSchedule);
  const depositPreview = quote?.depositAmount ?? payTotals.deposit;
  const downPreview = payTotals.downpayment;
  const installmentCount = payTotals.installmentCount;
  const installmentAmount = payTotals.installmentAmount;
  const schedule = pricedSchedule;
  const afterPromo = offerPrice;
  const defaultTenor = tenors.includes(24) ? 24 : tenors[0] || 24;
  const scheduleIsCustom = paymentTierId !== 'full' && (installmentMonths !== defaultTenor || cadence !== 'monthly');

  const available = (plan?.planStatus || 'Unsold').toLowerCase() === 'unsold';
  const reserved = (plan?.planStatus || '').toLowerCase() === 'reserved';
  const booked = !available && !reserved;

  if (confirmation) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-24">
        <div className="border border-gold/40 bg-white p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-gold">{t('confirmEyebrow')}</p>
          <h1 className="font-display mt-2 text-3xl text-ocean md:text-4xl">{t('confirmTitle')}</h1>
          <p className="mt-3 text-ocean/75">
            {plan?.name ? t('confirmYourPlanNamed', { name: plan.name }) : t('confirmYourPlan')}
            {suite?.id ? t('confirmOnSuite', { id: suite.id }) : ''}{t('confirmBody')}
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="bg-pearl p-4">
              <div className="text-xs uppercase tracking-wide text-ocean/60">{t('bookingRef')}</div>
              <div className="mt-1 font-mono text-sm text-ocean">{confirmation.bookingId}</div>
            </div>
            <div className="bg-pearl p-4">
              <div className="text-xs uppercase tracking-wide text-ocean/60">{t('amountDueToday')}</div>
              <div className="font-display mt-1 text-2xl text-ocean">
                {formatMoney(confirmation.depositAmount)}
              </div>
            </div>
            <div className="border border-gold/40 bg-gold/10 p-4 sm:col-span-2">
              <div className="text-xs uppercase tracking-wide text-ocean/60">{t('paymentSubmitted')}</div>
              <div className="mt-1 text-ocean">
                {depositMethodLabels(t)[confirmation.depositMethod]}{t('refLabel')}
                <span className="font-mono text-sm">{confirmation.depositReference}</span>
              </div>
              <p className="mt-2 text-sm text-ocean/70">
                {t('awaitingAdmin')}
              </p>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/investor" className="sm:inline-flex">
              <Button className="w-full sm:w-auto">{t('openPortal')}</Button>
            </Link>
            <Link href="/invest" className="sm:inline-flex">
              <Button variant="outline" className="w-full sm:w-auto">{t('browseMore')}</Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-ocean/60">
            {t('confirmFooter')}{' '}
            <a href="mailto:info@grandsampan.com" className="underline">
              info@grandsampan.com
            </a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 md:py-16 lg:pb-16">
      <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr] lg:gap-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gold">{t('sharePlan')}</p>
          <h1 className="font-display mt-2 text-3xl text-ocean md:text-4xl">{plan?.name || t('planDetailsFallback')}</h1>
          <p className="mt-2 text-ocean/75">
            {plan ? t('planMeta', { days: plan.daysPerMonth, months: plan.lockIn ?? 36 }) : t('loading')}
          </p>
          {unitPlans.length > 1 && (
            <label className="mt-4 block max-w-md text-sm font-medium text-ocean">
              {t('otherShares')}
              <select
                value={planId}
                onChange={(e) => selectUnitPlan(e.target.value)}
                className="field mt-1"
              >
                {unitPlans.map((option) => {
                  const st = String(option.planStatus || 'Unsold').toLowerCase();
                  const tag =
                    st === 'unsold' ? t('optionAvailable') : st === 'reserved' ? t('optionReserved') : t('optionBooked');
                  const who = option.owner?.name ? ` · ${option.owner.name}` : '';
                  return (
                    <option key={option.id} value={option.id}>
                      {t('optionLine', { name: option.name || t('shareFallback'), days: option.daysPerMonth, tag })}
                      {who}
                    </option>
                  );
                })}
              </select>
            </label>
          )}
          {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
          {status && <div className="mt-4 rounded-md border border-ocean/15 bg-ocean/5 p-3 text-ocean">{status}</div>}

          {booked && (
            <div className="mt-6 border border-ocean/15 bg-pearl px-4 py-4">
              {plan?.owner ? (
                <PlanOwner owner={plan.owner} statusLabel={t('bookedBy')} hidePhoto />
              ) : (
                <p className="text-sm text-ocean/75">{t('alreadyBooked')}</p>
              )}
            </div>
          )}
          {reserved && (
            <div className="mt-6 border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-ocean">
              {t('reservedNotice')}
            </div>
          )}

          {discounted && (
            <div className="mt-4 border border-gold bg-gold/10 px-4 py-3 text-ocean">
              <span className="font-semibold">✦ {plan?.promoName}</span> — {plan?.discountPct}% off until{' '}
              {plan?.promoEndsAt ? formatDate(plan.promoEndsAt) : ''}
            </div>
          )}

          <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border border-ocean/15 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-ocean/60">
                {available ? t('totalPrice') : t('soldAtLabel')}
              </div>
              {discounted && available ? (
                <>
                  <div className="text-sm text-ocean/50 line-through">{formatMoney(listPrice)}</div>
                  <div className="font-display text-2xl font-semibold text-ocean">{formatMoney(offerPrice)}</div>
                </>
              ) : (
                <div className="mt-1 font-display text-2xl font-semibold text-ocean">
                  {formatMoney(plan?.price || 0)}
                </div>
              )}
            </div>
            {available ? (
              <div className="border border-gold/50 bg-gold/10 p-4 sm:col-span-1">
                <div className="text-xs font-bold uppercase tracking-wide text-ocean/70">{t('dueToday')}</div>
                <div className="font-display mt-1 text-3xl font-bold text-ocean">{formatMoney(depositPreview)}</div>
                <p className="mt-1 text-[11px] font-medium text-ocean/65">
                  {t('dueTodayHint', { pct: quote?.upfrontPct ?? 10 })}
                </p>
              </div>
            ) : (
              <div className="border border-ocean/20 bg-ocean p-4 text-white">
                <div className="text-xs font-bold uppercase tracking-wide text-white/70">{t('status')}</div>
                <div className="font-display mt-1 text-3xl font-bold">{booked ? t('booked') : t('reserved')}</div>
                <p className="mt-1 text-[11px] font-medium text-white/75">
                  {booked ? t('noLongerSale') : t('heldBooking')}
                </p>
              </div>
            )}
            {[
              [t('entitlement'), t('entitlementValue', { days: plan?.daysPerMonth || 0 })],
              [t('suite'), suite?.id || plan?.suiteId || '—']
            ].map(([label, value]) => (
              <div key={label} className="border border-ocean/10 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-ocean/60">{label}</div>
                <div className="mt-1 font-display text-xl text-ocean">{value}</div>
              </div>
            ))}
          </section>

          <section className="mt-8 border border-ocean/10 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10">
                <Image src="/images/icons/balcony.svg" alt="" fill sizes="40px" />
              </div>
              <div>
                <div className="text-ocean">
                  {t('suiteMeta', { type: suite?.type || t('suite'), view: suite?.view || '—' })}
                </div>
                <div className="text-sm text-ocean/70">
                  {t('suiteFloor', { floor: suite?.floor ?? '—', size: suite?.size ?? '—', unit: suite?.id || plan?.suiteId || '—' })}
                </div>
              </div>
            </div>
          </section>

          <ReturnsCalculator
            className="mt-8"
            showHeading
            locked
            suite={
              suite
                ? {
                    id: suite.id,
                    type: suite.type,
                    size: suite.size,
                    view: suite.view,
                    floor: suite.floor
                  }
                : plan?.suiteId
                  ? { id: plan.suiteId }
                  : null
            }
            plan={
              plan
                ? {
                    id: plan.id,
                    name: plan.name,
                    suiteId: plan.suiteId,
                    daysPerMonth: plan.daysPerMonth,
                    planStatus: plan.planStatus
                  }
                : null
            }
          />

          {(plan?.suiteId || suite?.id) && <SuitePlans suiteId={plan?.suiteId || suite!.id} />}
        </div>

        <aside id="reserve-panel" className="scroll-mt-24 border border-gold/40 bg-white p-4 sm:p-6 lg:sticky lg:top-24 lg:self-start">
          {!available ? (
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gold">
                {booked ? t('asideBooked') : t('asideReserved')}
              </p>
              <h2 className="font-display mt-1 text-2xl text-ocean">
                {booked ? t('asideTaken') : t('asideInProgress')}
              </h2>
              <div className="mt-4 border border-ocean/10 bg-pearl px-3 py-3">
                {booked && plan?.owner ? (
                  <PlanOwner owner={plan.owner} statusLabel={t('bookedBy')} hidePhoto />
                ) : booked ? (
                  <p className="text-sm text-ocean/75">{t('alreadyBooked')}</p>
                ) : (
                  <p className="text-sm text-ocean/75">
                    {t('heldOtherBuyer')}
                  </p>
                )}
              </div>
              {booked && (
                <p className="mt-3 text-sm text-ocean/65">{t('soldAt', { amount: formatMoney(plan?.price || 0) })}</p>
              )}
              {unitPlans.some(
                (x) => x.id !== planId && String(x.planStatus || 'Unsold').toLowerCase() === 'unsold'
              ) ? (
                <div className="mt-5">
                  <p className="text-sm font-semibold text-ocean">{t('otherAvailable')}</p>
                  <ul className="mt-2 space-y-2">
                    {unitPlans
                      .filter(
                        (x) =>
                          x.id !== planId &&
                          String(x.planStatus || 'Unsold').toLowerCase() === 'unsold'
                      )
                      .map((x) => (
                        <li key={x.id}>
                          <Link
                            href={`/pricing/plans/${x.id}`}
                            className="block border border-ocean/15 px-3 py-2 text-sm text-ocean hover:border-gold/50"
                          >
                            <span className="font-semibold">{x.name || t('shareFallback')}</span>
                            <span className="text-ocean/65">
                              {' '}
                              · {t('entitlementValue', { days: x.daysPerMonth })} · {formatMoney(x.price || 0)}
                            </span>
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : (
                <Link href="/invest" className="mt-5 inline-block">
                  <Button>{t('browseAvailable')}</Button>
                </Link>
              )}
              <p className="mt-4 text-xs text-ocean/55">
                {t('privacyNote')}
              </p>
            </div>
          ) : (
            <>
          <h2 className="font-display text-2xl text-ocean">{t('reserveTitle')}</h2>
          <p className="mt-2 text-sm text-ocean/75">
            {t('reserveIntro')}
          </p>
          <p className="mt-3 text-xs text-ocean/60">
            {t('notSure')}{' '}
            <Link href="/invest/advisor" className="font-semibold text-ocean underline">
              {t('helpChoose')}
            </Link>
          </p>

          <div className="mt-5">
            <p className="text-sm font-semibold text-ocean">{t('step1')}</p>
            <p className="mt-1 text-xs text-ocean/65">{t('step1Hint')}</p>
            <div className="mt-3 grid gap-2">
              {resolvedTiers.map((tier) => {
                const selected = paymentTierId === tier.id;
                const net = Math.round(afterPromo * (1 - (Number(tier.offeredDiscountPct) || 0) / 100));
                const due = Math.round((net * (Number(tier.upfrontPct) || 0)) / 100);
                const save = Math.max(0, afterPromo - net);
                const saveLabel = formatSavePct(tier.offeredDiscountPct);
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setPaymentTierId(tier.id)}
                    className={`border px-3 py-3 text-left transition ${
                      selected ? 'border-gold bg-gold/10' : 'border-ocean/15 hover:border-gold/50'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-semibold text-ocean">{tierHeadline(tier, tPayment)}</div>
                      {saveLabel ? (
                        <div className="text-xs font-semibold text-gold">{t('saveLabel', { pct: saveLabel })}</div>
                      ) : (
                        <div className="text-xs text-ocean/50">{t('lowestToday')}</div>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-ocean/65">{tierHelp(tier, tPayment)}</p>
                    <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <span className="font-semibold text-ocean">{t('todayAmount', { amount: formatMoney(due) })}</span>
                      <span className="text-ocean/70">
                        {t('totalAmount', { amount: formatMoney(net) })}
                        {save > 0 ? <span className="text-gold">{t('saveAmount', { amount: formatMoney(save) })}</span> : null}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            {paymentTierId !== 'full' && (
              <div className="mt-3">
                <button
                  type="button"
                  className="text-xs font-semibold text-ocean underline"
                  onClick={() => setShowScheduleOptions((v) => !v)}
                >
                  {showScheduleOptions || scheduleIsCustom ? t('hideInstallments') : t('needSmaller')}
                </button>
                {(showScheduleOptions || scheduleIsCustom) && (
                  <div className="mt-3 space-y-3">
                    {tenors.length > 1 && (
                      <div>
                        <p className="text-xs font-medium text-ocean/70">{t('howLong')}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('installmentLength')}>
                          {tenors.map((n) => {
                            const selected = installmentMonths === n;
                            return (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setInstallmentMonths(n)}
                                className={`border px-3 py-2 text-sm font-semibold ${
                                  selected ? 'border-gold bg-gold/10 text-ocean' : 'border-ocean/15 text-ocean/80'
                                }`}
                              >
                                {t('months', { n })}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-ocean/70">{t('howOften')}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('installmentCadence')}>
                        {(
                          [
                            { value: 'monthly' as const, label: t('everyMonth'), hint: t('paymentsCount', { count: installmentMonths }) },
                            {
                              value: 'quarterly' as const,
                              label: t('every3Months'),
                              hint: t('paymentsCount', { count: Math.ceil(installmentMonths / 3) })
                            }
                          ] as const
                        ).map((opt) => {
                          const selected = cadence === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              onClick={() => setCadence(opt.value)}
                              className={`border px-3 py-3 text-left transition ${
                                selected ? 'border-gold bg-gold/10' : 'border-ocean/15 hover:border-gold/50'
                              }`}
                            >
                              <div className="font-semibold text-ocean">{opt.label}</div>
                              <div className="mt-0.5 text-xs text-ocean/65">{opt.hint}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <label className="mt-5 block text-sm text-ocean">
            {t('startDays')}
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="field mt-1"
            />
          </label>

          <div id="booking-kyc" className="mt-6 border-t border-ocean/10 pt-5">
            <p className="text-sm font-semibold text-ocean">{t('step2')}</p>
            <p className="mt-1 text-xs text-ocean/65">
              {t('step2Hint')}
            </p>

            <div className="mt-4 border border-ocean/10 bg-pearl px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-ocean/55">
                {t('shownAfter')}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[5.5rem_1fr]">
                <label className="block text-sm text-ocean">
                  <span className="sr-only">{t('kycPic')}</span>
                  <div className="relative">
                    {kyc.picUrl || picPreview.pic ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={kyc.picUrl ? resolveMediaUrl(kyc.picUrl) : picPreview.pic!}
                        alt={t('photoAlt')}
                        className="h-20 w-20 border border-ocean/15 object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center border border-dashed border-ocean/25 bg-white text-center text-[10px] leading-tight text-ocean/50">
                        {t('photoRequired')}
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
                      className="mt-2 block w-full text-[10px] text-ocean/80"
                      disabled={!!uploadingPic}
                      onChange={(e) => {
                        const selected = e.target.files?.[0] || null;
                        void uploadKycPhoto('pic', selected);
                        e.target.value = '';
                      }}
                    />
                  </div>
                  {uploadingPic === 'pic' && (
                    <span className="mt-1 block text-xs font-medium text-ocean/70">{t('uploading')}</span>
                  )}
                  {picError.pic && <span className="mt-1 block text-xs text-red-700">{picError.pic}</span>}
                </label>
                <div className="grid gap-3">
                  <label className="block text-sm text-ocean">
                    {t('kycName')}
                    <input
                      value={kyc.name}
                      onChange={(e) => updateKyc('name', e.target.value)}
                      className="field mt-1"
                      autoComplete="name"
                    />
                  </label>
                  <label className="block text-sm text-ocean">
                    {t('kycProfession')}
                    <input
                      value={kyc.profession}
                      onChange={(e) => updateKyc('profession', e.target.value)}
                      className="field mt-1"
                      placeholder={t('professionPlaceholder')}
                    />
                  </label>
                  <label className="block text-sm text-ocean">
                    {t('kycCity')}
                    <input
                      value={kyc.city}
                      onChange={(e) => updateKyc('city', e.target.value)}
                      className="field mt-1"
                      placeholder={t('cityPlaceholder')}
                    />
                  </label>
                </div>
              </div>
              {(kyc.name.trim() || kyc.profession.trim() || kyc.city.trim()) && (
                <div className="mt-3 border-t border-ocean/10 pt-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-ocean/50">{t('preview')}</p>
                  <PlanOwner
                    owner={{
                      name: kyc.name.trim() || t('yourName'),
                      profession: kyc.profession.trim(),
                      city: kyc.city.trim()
                    }}
                    statusLabel={t('bookedBy')}
                    hidePhoto
                  />
                </div>
              )}
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-ocean/55">
              {t('privateOnly')}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-ocean">
                {t('kycFatherName')}
                <input
                  value={kyc.fatherName}
                  onChange={(e) => updateKyc('fatherName', e.target.value)}
                  className="field mt-1"
                />
              </label>
              <label className="block text-sm text-ocean">
                {t('kycNid')}
                <input
                  value={kyc.nid}
                  onChange={(e) => updateKyc('nid', e.target.value)}
                  className="field mt-1"
                />
              </label>
              <label className="block text-sm text-ocean">
                {t('kycDob')}
                <input
                  type="date"
                  value={kyc.dob}
                  onChange={(e) => updateKyc('dob', e.target.value)}
                  className="field mt-1"
                />
              </label>
              <label className="block text-sm text-ocean">
                {t('kycContact')}
                <input
                  value={kyc.contact}
                  onChange={(e) => updateKyc('contact', e.target.value)}
                  className="field mt-1"
                  autoComplete="tel"
                />
              </label>
              <label className="block text-sm text-ocean sm:col-span-2">
                {t('kycEmail')}
                <input
                  type="email"
                  value={kyc.email}
                  onChange={(e) => updateKyc('email', e.target.value)}
                  className="field mt-1"
                  autoComplete="email"
                />
              </label>
              <label className="block text-sm text-ocean sm:col-span-2">
                {t('kycAddress')}
                <textarea
                  value={kyc.address}
                  onChange={(e) => updateKyc('address', e.target.value)}
                  className="field mt-1 min-h-[4.5rem]"
                  rows={2}
                />
              </label>
              <label className="block text-sm text-ocean sm:col-span-2">
                {t('kycPermanentAddress')}
                <textarea
                  value={kyc.permanentAddress}
                  onChange={(e) => updateKyc('permanentAddress', e.target.value)}
                  className="field mt-1 min-h-[4.5rem]"
                  rows={2}
                />
              </label>
              <label className="block text-sm text-ocean">
                {t('kycNomineeName')}
                <input
                  value={kyc.nomineeName}
                  onChange={(e) => updateKyc('nomineeName', e.target.value)}
                  className="field mt-1"
                />
              </label>
              <label className="block text-sm text-ocean">
                {t('kycNomineeNid')}
                <input
                  value={kyc.nomineeNid}
                  onChange={(e) => updateKyc('nomineeNid', e.target.value)}
                  className="field mt-1"
                />
              </label>
              <label className="block text-sm text-ocean sm:col-span-2">
                {t('nomineePhoto')} <span className="text-ocean/50">{t('nomineePrivate')}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
                  className="mt-1 block w-full text-xs text-ocean/80"
                  disabled={!!uploadingPic}
                  onChange={(e) => {
                    const selected = e.target.files?.[0] || null;
                    void uploadKycPhoto('nominee', selected);
                    e.target.value = '';
                  }}
                />
                {uploadingPic === 'nominee' && (
                  <span className="mt-1 block text-xs font-medium text-ocean/70">{t('uploadingPhoto')}</span>
                )}
                {picError.nominee && <span className="mt-1 block text-xs text-red-700">{picError.nominee}</span>}
                {(kyc.nomineePicUrl || picPreview.nominee) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={kyc.nomineePicUrl ? resolveMediaUrl(kyc.nomineePicUrl) : picPreview.nominee!}
                    alt={t('nomineeAlt')}
                    className="mt-2 h-20 w-20 border border-ocean/15 object-cover"
                  />
                )}
                {kyc.nomineePicUrl ? (
                  <span className="mt-1 block text-xs text-ocean/60">{t('uploaded')}</span>
                ) : (
                  !uploadingPic &&
                  !picError.nominee && (
                    <span className="mt-1 block text-xs text-gold">{t('choosePhoto')}</span>
                  )
                )}
              </label>
            </div>
          </div>

          <div id="booking-deposit" className="mt-6 border-t border-ocean/10 pt-5">
            <p className="text-sm font-semibold text-ocean">{t('step3')}</p>
            <p className="mt-1 text-xs text-ocean/65">
              {t('step3Hint')}
            </p>
            <label className="mt-4 block text-sm text-ocean">
              {t('referralOptional')} <span className="font-normal text-ocean/55">{t('optional')}</span>
              <input
                className="field mt-1 uppercase tracking-wide"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder={t('referralPlaceholder')}
                autoComplete="off"
              />
              {referralHint && <span className="mt-1 block text-xs text-ocean/65">{referralHint}</span>}
            </label>
            <div className="mt-3 grid grid-cols-1 gap-2" role="radiogroup" aria-label={t('depositMethodAria')}>
              {(
                [
                  { value: 'cheque' as const, label: t('depositCheque') },
                  { value: 'cash_payorder' as const, label: t('depositCash') },
                  { value: 'online_transfer' as const, label: t('depositOnline') }
                ] as const
              ).map((opt) => {
                const selected = depositMethod === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setDepositMethod(opt.value)}
                    className={`border px-3 py-2.5 text-left text-sm transition ${
                      selected ? 'border-gold bg-gold/10' : 'border-ocean/15 hover:border-gold/50'
                    }`}
                  >
                    <span className="font-semibold text-ocean">{opt.label}</span>
                  </button>
                );
              })}
            </div>
            <label className="mt-3 block text-sm text-ocean">
              {t('paymentReference')}
              <input
                value={depositReference}
                onChange={(e) => setDepositReference(e.target.value)}
                className="field mt-1"
                placeholder={
                  depositMethod === 'cheque'
                    ? t('refCheque')
                    : depositMethod === 'cash_payorder'
                      ? t('refPayOrder')
                      : t('refTransfer')
                }
              />
            </label>
            <label className="mt-3 block text-sm text-ocean">
              {t('noteOptional')}
              <textarea
                value={depositNote}
                onChange={(e) => setDepositNote(e.target.value)}
                className="field mt-1 min-h-[3.5rem]"
                rows={2}
                placeholder={t('notePlaceholder')}
              />
            </label>
            <label className="mt-3 block text-sm text-ocean">
              {t('proofOptional')}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="mt-1 block w-full text-xs text-ocean/80"
                disabled={uploadingProof}
                onChange={(e) => uploadDepositProof(e.target.files?.[0] || null)}
              />
              {uploadingProof && <span className="mt-1 block text-xs text-ocean/60">{t('uploading')}</span>}
              {depositProofUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveMediaUrl(depositProofUrl)}
                  alt={t('proofAlt')}
                  className="mt-2 h-20 w-20 border border-ocean/15 object-cover"
                />
              )}
            </label>
          </div>

          <div className="mt-4 border-t border-ocean/10 pt-4 text-sm text-ocean/80">
            <div className="flex justify-between">
              <span>{t('totalPrice')}</span>
              <span className={discounted ? 'line-through text-ocean/50' : 'font-semibold text-ocean'}>
                {formatMoney(listPrice)}
              </span>
            </div>
            {discounted && (
              <div className="mt-1 flex justify-between">
                <span className="text-ocean/70">
                  {plan?.promoName} ({plan?.discountPct}%)
                </span>
                <span className="font-semibold text-gold">
                  − {formatMoney(listPrice - offerPrice)}
                </span>
              </div>
            )}
            {discounted && (
              <div className="mt-2 flex justify-between border-t border-ocean/10 pt-2">
                <span className="font-semibold text-ocean">{t('offerPrice')}</span>
                <span className="font-semibold text-ocean">{formatMoney(offerPrice)}</span>
              </div>
            )}
            {quote?.advanceDiscountPct > 0 && (
              <div className="mt-1 flex justify-between">
                <span className="text-ocean/70">{t('payingMore', { pct: quote.advanceDiscountPct })}</span>
                <span className="font-semibold text-gold">− {formatMoney(quote.savings || 0)}</span>
              </div>
            )}
            {quote && (
              <div className="mt-2 flex justify-between border-t border-ocean/10 pt-2">
                <span className="font-semibold text-ocean">{t('youPay')}</span>
                <span className="font-semibold text-ocean">{formatMoney(quote.netPrice)}</span>
              </div>
            )}
            <div className="mt-3 space-y-2 border border-ocean/10 bg-pearl px-3 py-3">
              {downPreview > 0 && (
                <div className="flex justify-between">
                  <span>{t('downpayment')}</span>
                  <span className="font-semibold text-ocean">{formatMoney(downPreview)}</span>
                </div>
              )}
              {installmentCount > 0 && (
                <div className="flex justify-between">
                  <span>
                    {cadence === 'monthly'
                      ? t('monthlyInstallment', { count: installmentCount })
                      : t('quarterlyInstallment', { count: installmentCount })}
                  </span>
                  <span className="font-semibold text-ocean">{formatMoney(installmentAmount)}</span>
                </div>
              )}
              {installmentCount === 0 && (
                <p className="text-[11px] text-ocean/60">{t('noInstallments')}</p>
              )}
            </div>
            <div className="mt-3 border border-gold/50 bg-gold/10 px-3 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wide text-ocean/70">{t('dueToday')}</span>
                <span className="font-display text-2xl font-bold text-ocean">{formatMoney(depositPreview)}</span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-ocean/65">
                {t('dueTodayConfirm', { pct: quote?.upfrontPct ?? 10 })}
              </p>
            </div>
          </div>
          {token && user && !emailVerified && (
            <div className="mt-4 border border-gold/50 bg-gold/10 px-3 py-3 text-sm text-ocean">
              {t('verifyBanner')}{' '}
              <Link href={`/auth/verify?next=${encodeURIComponent(`/pricing/plans/${planId}`)}`} className="font-semibold underline">
                {t('verifyEmail')}
              </Link>
            </div>
          )}
          {status && (
            <div className="mt-4 rounded-md border border-ocean/15 bg-ocean/5 p-3 text-sm text-ocean">{status}</div>
          )}
          {!kycComplete && (
            <p className="mt-4 text-xs text-ocean/65">
              {t('missingDetails', { fields: kycMissing.map((key) => kycFieldLabels(t)[key]).join(', ') })}
            </p>
          )}
          <Button
            type="button"
            className="mt-6 w-full bg-gold text-ocean hover:bg-gold/90"
            onClick={confirmInvestment}
            disabled={
              buying ||
              loading ||
              !available ||
              !!uploadingPic ||
              uploadingProof ||
              (!!token && !emailVerified)
            }
          >
            {buying
              ? t('btnSubmitting')
              : !available
                ? t('btnUnavailable')
                : token && !emailVerified
                  ? t('btnVerifyContinue')
                  : !kycComplete
                    ? onlyPhotosMissing
                      ? t('btnUploadPhotos')
                      : t('btnAddDetails')
                    : !depositReference.trim()
                      ? t('btnAddRef')
                      : t('btnReserve')}
          </Button>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link href="/investor" className="text-ocean underline">
              {t('dashboard')}
            </Link>
            <a href="mailto:info@grandsampan.com" className="text-ocean underline">
              {t('contactSales')}
            </a>
          </div>
            </>
          )}
        </aside>
      </div>

      <section className="mt-14 border-t border-ocean/10 pt-10">
        <button
          type="button"
          onClick={() => setShowTools((v) => !v)}
          className="text-sm font-semibold text-ocean underline"
        >
          {showTools ? t('hideTools') : t('showTools')}
        </button>

        {showTools && (
          <div className="mt-6">
                <p className="text-sm text-ocean/65">
                  {t('scheduleHint')}
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <label className="text-sm text-ocean">
                    {t('depositPct')}
                    <input
                      type="number"
                      value={depositPct}
                      onChange={(e) => setDepositPct(Number(e.target.value))}
                      className="field mt-1"
                    />
                  </label>
                  <label className="text-sm text-ocean">
                    {t('downPct')}
                    <input
                      type="number"
                      value={downPct}
                      onChange={(e) => setDownPct(Number(e.target.value))}
                      className="field mt-1"
                    />
                  </label>
                  <label className="text-sm text-ocean">
                    {t('cadence')}
                    <select
                      value={cadence}
                      onChange={(e) => setCadence(e.target.value as 'monthly' | 'quarterly')}
                      className="field mt-1"
                    >
                      <option value="monthly">{t('monthly')}</option>
                      <option value="quarterly">{t('quarterly')}</option>
                    </select>
                  </label>
                </div>
                <div className="mt-4 overflow-auto border border-ocean/10 bg-white">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-ocean">
                        <th className="p-3">{t('colType')}</th>
                        <th className="p-3">{t('colDue')}</th>
                        <th className="p-3">{t('colAmount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.slice(0, 8).map((i: { id: string; type: string; dueDate: string; amount: number }) => (
                        <tr key={i.id} className="border-t border-ocean/10">
                          <td className="p-3 capitalize">{i.type}</td>
                          <td className="p-3">{formatDate(i.dueDate)}</td>
                          <td className="p-3">{formatMoney(i.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-ocean/60">
                  {t('schedulePreview', { cadence, count: installmentCount, amount: formatMoney(installmentAmount) })}
                </p>

            {rules.length > 0 && (
              <p className="mt-4 text-sm text-ocean/70">{t('rulesOnFile', { count: rules.length })}</p>
            )}
          </div>
        )}
      </section>

      {available && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ocean/10 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(14,58,90,0.12)] pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ocean/50">{t('dueToday')}</p>
              <p className="font-display truncate text-lg font-bold leading-tight text-ocean">
                {formatMoney(depositPreview)}
              </p>
            </div>
            <Button
              type="button"
              className="ml-auto shrink-0 bg-gold px-4 py-2.5 text-ocean hover:bg-gold/90"
              onClick={() =>
                document.getElementById('reserve-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            >
              {t('mobileContinue')}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
