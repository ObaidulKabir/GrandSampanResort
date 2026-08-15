'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, apiUpload } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { resolveMediaUrl } from '@/lib/media';
import { prepareImageForUpload, uploadImageErrorMessage } from '@/lib/uploadImage';
import { effectiveAdrBand, normalizeReturnAssumptions, type ReturnAssumptions } from '@/lib/returns';
import Image from 'next/image';
import Link from 'next/link';
import { useAppStore } from '@/store/appStore';
import Button from '@/components/Button';
import PlanOwner from '@/components/PlanOwner';
import SuitePlans from '@/components/SuitePlans';
import {
  captureReferralFromSearch,
  clearStoredReferralCode,
  getStoredReferralCode,
  normalizeReferralCode,
  setStoredReferralCode
} from '@/lib/referral';
import { formatSavePct, tierHeadline, tierHelp } from '@/lib/paymentCopy';

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

const KYC_FIELD_LABELS: Record<keyof KycForm, string> = {
  name: 'Full name',
  fatherName: 'Father / husband name',
  nid: 'NID number',
  dob: 'Date of birth',
  address: 'Present address',
  permanentAddress: 'Permanent address',
  contact: 'Contact number',
  email: 'Email',
  picUrl: 'Buyer photograph',
  profession: 'Profession',
  city: 'City / district',
  nomineeName: 'Nominee name',
  nomineeNid: 'Nominee NID',
  nomineePicUrl: 'Nominee photograph'
};

function missingKycFields(kyc: KycForm): (keyof KycForm)[] {
  return (Object.keys(kyc) as (keyof KycForm)[]).filter(
    (key) => String(kyc[key] || '').trim().length === 0
  );
}

function isKycComplete(kyc: KycForm) {
  return missingKycFields(kyc).length === 0;
}

function draftStorageKey(planId: string) {
  return `gsr_booking_draft:${planId}`;
}

type DepositMethod = 'cheque' | 'cash_payorder' | 'online_transfer';

const DEPOSIT_METHOD_LABELS: Record<DepositMethod, string> = {
  cheque: 'Cheque',
  cash_payorder: 'Cash / pay order',
  online_transfer: 'Online transfer'
};

export default function PlanDetailsPage({ params }: { params: { id: string } }) {
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
  const [tab, setTab] = useState<'payment' | 'returns'>('payment');
  const [adr, setAdr] = useState<number>(8000);
  const [occupancy, setOccupancy] = useState<number>(0.6);
  const [costPct, setCostPct] = useState<number>(15);
  const [rentUpliftPct, setRentUpliftPct] = useState<number>(0);
  const [returnAssumptions, setReturnAssumptions] = useState<ReturnAssumptions | null>(null);
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
    const t = setTimeout(async () => {
      const res = await api(`/referral/validate?code=${encodeURIComponent(code)}&buyerId=${encodeURIComponent(user?.id || '')}`);
      if (cancelled) return;
      if (res?.ok) {
        setReferralHint(`Referrer: ${res.referrer?.name || res.code}`);
        setStoredReferralCode(code);
      } else if (res?.error === 'self_referral') {
        setReferralHint('You cannot use your own referral code');
      } else {
        setReferralHint('Code not recognized');
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [referralCode, user?.id]);

  // Restore in-progress booking form after login redirects / refreshes.
  useLayoutEffect(() => {
    suppressDraftPersist.current = true;
    try {
      const raw = sessionStorage.getItem(draftStorageKey(planId));
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft?.kyc && typeof draft.kyc === 'object') {
          setKyc({ ...emptyKyc(), ...draft.kyc });
        } else {
          setKyc(emptyKyc());
        }
        if (
          draft?.depositMethod === 'cheque' ||
          draft?.depositMethod === 'cash_payorder' ||
          draft?.depositMethod === 'online_transfer'
        ) {
          setDepositMethod(draft.depositMethod);
        } else {
          setDepositMethod('cheque');
        }
        setDepositReference(typeof draft?.depositReference === 'string' ? draft.depositReference : '');
        setDepositNote(typeof draft?.depositNote === 'string' ? draft.depositNote : '');
        setDepositProofUrl(typeof draft?.depositProofUrl === 'string' ? draft.depositProofUrl : '');
        if (typeof draft?.startDate === 'string' && draft.startDate) setStartDate(draft.startDate);
        if (draft?.cadence === 'monthly' || draft?.cadence === 'quarterly') setCadence(draft.cadence);
        if (typeof draft?.paymentTierId === 'string' && draft.paymentTierId) setPaymentTierId(draft.paymentTierId);
        if (Number(draft?.installmentMonths) > 0) setInstallmentMonths(Number(draft.installmentMonths));
      } else {
        setKyc(emptyKyc());
        setDepositReference('');
        setDepositNote('');
        setDepositProofUrl('');
        setDepositMethod('cheque');
      }
    } catch {
      setKyc(emptyKyc());
    }
  }, [planId]);

  useEffect(() => {
    if (suppressDraftPersist.current) {
      suppressDraftPersist.current = false;
      return;
    }
    try {
      sessionStorage.setItem(
        draftStorageKey(planId),
        JSON.stringify({
          kyc,
          depositMethod,
          depositReference,
          depositNote,
          depositProofUrl,
          startDate,
          cadence,
          paymentTierId,
          installmentMonths
        })
      );
    } catch {
      /* quota / private mode */
    }
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

  // Seed occupancy/cost from admin settings; ADR scales with suite category + size.
  useEffect(() => {
    api('/settings/return-assumptions')
      .then((a) => {
        if (!a) return;
        const normalized = normalizeReturnAssumptions(a);
        setReturnAssumptions(normalized);
        setOccupancy(
          Math.round((normalized.occupancyLowPct + normalized.occupancyHighPct) / 2) / 100
        );
        setCostPct(normalized.operatingCostPct);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!returnAssumptions) return;
    const band = effectiveAdrBand(returnAssumptions, suite);
    if (band) setAdr(Math.round((band.adrLow + band.adrHigh) / 2));
  }, [returnAssumptions, suite]);

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
        setError('Failed to load plan details');
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

  async function uploadKycPhoto(kind: 'pic' | 'nominee', file: File | null) {
    if (!file) return;
    if (!token || !user?.id) {
      router.push(`/auth/login?next=${encodeURIComponent(`/pricing/plans/${planId}`)}`);
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
          ? 'Photo upload failed — please sign in again, then re-upload.'
          : typeof res?.message === 'string'
            ? res.message
            : 'Photo upload failed. Use JPG, PNG, WEBP, or GIF under 20MB.';
        setPicError((prev) => ({ ...prev, [kind]: message }));
        setStatus(message);
        return;
      }
      updateKyc(kind === 'pic' ? 'picUrl' : 'nomineePicUrl', res.url);
      setPicError((prev) => ({ ...prev, [kind]: undefined }));
    } catch (err) {
      const message = uploadImageErrorMessage(err);
      setPicError((prev) => ({ ...prev, [kind]: message }));
      setStatus(message);
    } finally {
      setUploadingPic(null);
    }
  }

  async function uploadDepositProof(file: File | null) {
    if (!file) return;
    if (!token || !user?.id) {
      router.push(`/auth/login?next=${encodeURIComponent(`/pricing/plans/${planId}`)}`);
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
        setStatus('Proof upload failed. Use JPG, PNG, WEBP, or GIF under 20MB.');
        return;
      }
      setDepositProofUrl(res.url);
    } catch (err) {
      setStatus(uploadImageErrorMessage(err));
    } finally {
      setUploadingProof(false);
    }
  }

  async function confirmInvestment() {
    if (!plan?.suiteId) {
      setStatus('This plan is not linked to a suite');
      return;
    }
    if (!token || !user?.id) {
      router.push(`/auth/login?next=${encodeURIComponent(`/pricing/plans/${planId}`)}`);
      return;
    }
    if (!emailVerified) {
      setStatus('Verify your account email before submitting a booking');
      router.push(`/auth/verify?next=${encodeURIComponent(`/pricing/plans/${planId}`)}`);
      return;
    }
    if (!isKycComplete(kyc)) {
      const missing = missingKycFields(kyc).map((key) => KYC_FIELD_LABELS[key]);
      setStatus(
        missing.length
          ? `Still needed: ${missing.join(', ')}`
          : 'Complete all KYC fields and upload both photographs before confirming'
      );
      if (typeof window !== 'undefined') {
        document.getElementById('booking-kyc')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    if (!depositReference.trim()) {
      setStatus('Enter a payment reference (cheque no., pay order no., or transfer ref)');
      if (typeof window !== 'undefined') {
        document.getElementById('booking-deposit')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    const sold = (plan.planStatus || '').toLowerCase() !== 'unsold';
    if (sold) {
      setStatus('This plan is no longer available');
      return;
    }
    setBuying(true);
    setStatus('Submitting your booking...');
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
            ? 'Verify your account email before booking'
            : res?.error === 'kyc_required'
              ? 'Add all required details and photographs before booking'
              : res?.error === 'deposit_payment_required'
                ? 'Select a payment method and enter the payment reference'
                : res?.error === 'plan_not_available' || res?.error === 'conflict'
                  ? 'Plan already sold or unavailable'
                  : res?.error === 'plan_not_found'
                    ? 'Plan not found'
                    : res?.error === 'plan_suite_mismatch'
                      ? 'This plan is not linked to the selected unit'
                      : res?.error === 'suite_not_found'
                        ? 'Unit not found'
                        : res?.error === 'quote_expired' || res?.error === 'quote_invalid'
                      ? 'This price quote expired. Review the updated total, then submit again.'
                      : res?.error === 'busy'
                          ? 'Another booking is in progress — please try again'
                          : res?.error === 'booking_failed'
                            ? 'Could not complete booking. Please try again.'
                            : 'Purchase failed';
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
      try {
        sessionStorage.removeItem(draftStorageKey(planId));
      } catch {
        /* ignore */
      }
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setStatus('Purchase failed');
    }
    setBuying(false);
  }

  const discounted = typeof plan?.discountedPrice === 'number';
  const effectivePrice = quote?.netPrice ?? (discounted ? (plan!.discountedPrice as number) : plan?.price || 0);
  const kycMissing = useMemo(() => missingKycFields(kyc), [kyc]);
  const kycComplete = kycMissing.length === 0;
  const onlyPhotosMissing =
    kycMissing.length > 0 && kycMissing.every((k) => k === 'picUrl' || k === 'nomineePicUrl');

  const depositPreview = quote?.depositAmount ?? Math.round(effectivePrice * ((resolvedTiers.find((t) => t.id === paymentTierId)?.upfrontPct || 10) / 100));
  const downItem = (quote?.schedule || []).find((s: any) => s.type === 'downpayment');
  const downPreview = downItem?.amount ?? 0;
  const installmentItems = (quote?.schedule || []).filter((s: any) => s.type === 'installment');
  const installmentCount = installmentItems.length;
  const installmentAmount = installmentItems[0]?.amount ?? 0;
  const schedule = quote?.schedule || [];
  const afterPromo = quote?.afterPromo ?? effectivePrice;
  const defaultTenor = tenors[0] || 24;
  const scheduleIsCustom = paymentTierId !== 'full' && (installmentMonths !== defaultTenor || cadence !== 'monthly');

  const available = (plan?.planStatus || 'Unsold').toLowerCase() === 'unsold';
  const reserved = (plan?.planStatus || '').toLowerCase() === 'reserved';
  const booked = !available && !reserved;

  if (confirmation) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-24">
        <div className="border border-gold/40 bg-white p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-gold">Booking submitted</p>
          <h1 className="font-display mt-2 text-3xl text-ocean md:text-4xl">Plan reserved</h1>
          <p className="mt-3 text-ocean/75">
            {plan?.name ? `Your ${plan.name} plan` : 'Your plan'}
            {suite?.id ? ` on suite ${suite.id}` : ''} is reserved. The booking will be completed after
            our team confirms your first payment and reviews your details.
            A confirmation email was sent to the address you entered; you will also receive an invoice when
            the booking is completed.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="bg-pearl p-4">
              <div className="text-xs uppercase tracking-wide text-ocean/60">Booking reference</div>
              <div className="mt-1 font-mono text-sm text-ocean">{confirmation.bookingId}</div>
            </div>
            <div className="bg-pearl p-4">
              <div className="text-xs uppercase tracking-wide text-ocean/60">Amount due today</div>
              <div className="font-display mt-1 text-2xl text-ocean">
                {formatMoney(confirmation.depositAmount)}
              </div>
            </div>
            <div className="border border-gold/40 bg-gold/10 p-4 sm:col-span-2">
              <div className="text-xs uppercase tracking-wide text-ocean/60">Payment submitted</div>
              <div className="mt-1 text-ocean">
                {DEPOSIT_METHOD_LABELS[confirmation.depositMethod]} · Ref{' '}
                <span className="font-mono text-sm">{confirmation.depositReference}</span>
              </div>
              <p className="mt-2 text-sm text-ocean/70">
                Status: awaiting admin confirmation of payment receipt and KYC verification.
              </p>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/investor" className="sm:inline-flex">
              <Button className="w-full sm:w-auto">Open owner portal</Button>
            </Link>
            <Link href="/invest" className="sm:inline-flex">
              <Button variant="outline" className="w-full sm:w-auto">Browse more plans</Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-ocean/60">
            Your details and payment reference were sent with this booking. Questions?{' '}
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
          <p className="text-sm font-semibold uppercase tracking-wide text-gold">Share plan</p>
          <h1 className="font-display mt-2 text-3xl text-ocean md:text-4xl">{plan?.name || 'Plan Details'}</h1>
          <p className="mt-2 text-ocean/75">
            {plan
              ? `${plan.daysPerMonth} days each month · share held ${plan.lockIn ?? 36} months`
              : 'Loading...'}
          </p>
          {unitPlans.length > 1 && (
            <label className="mt-4 block max-w-md text-sm font-medium text-ocean">
              Other shares on this suite
              <select
                value={planId}
                onChange={(e) => selectUnitPlan(e.target.value)}
                className="field mt-1"
              >
                {unitPlans.map((option) => {
                  const st = String(option.planStatus || 'Unsold').toLowerCase();
                  const tag =
                    st === 'unsold' ? 'Available' : st === 'reserved' ? 'Reserved' : 'Booked';
                  const who = option.owner?.name ? ` · ${option.owner.name}` : '';
                  return (
                    <option key={option.id} value={option.id}>
                      {option.name || 'Share'} · {option.daysPerMonth} days/mo · {tag}
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
                <PlanOwner owner={plan.owner} statusLabel="Booked by" />
              ) : (
                <p className="text-sm text-ocean/75">This share has already been booked.</p>
              )}
            </div>
          )}
          {reserved && (
            <div className="mt-6 border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-ocean">
              This share is reserved while a booking is being completed.
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
                {available ? 'Total price' : 'Sold at'}
              </div>
              {discounted && available ? (
                <>
                  <div className="text-sm text-ocean/50 line-through">{formatMoney(plan?.price || 0)}</div>
                  <div className="font-display text-2xl font-semibold text-ocean">{formatMoney(effectivePrice)}</div>
                </>
              ) : (
                <div className="mt-1 font-display text-2xl font-semibold text-ocean">
                  {formatMoney(plan?.price || 0)}
                </div>
              )}
            </div>
            {available ? (
              <div className="border border-gold/50 bg-gold/10 p-4 sm:col-span-1">
                <div className="text-xs font-bold uppercase tracking-wide text-ocean/70">Due today</div>
                <div className="font-display mt-1 text-3xl font-bold text-ocean">{formatMoney(depositPreview)}</div>
                <p className="mt-1 text-[11px] font-medium text-ocean/65">
                  {quote?.upfrontPct ?? 10}% with the option selected on the right
                </p>
              </div>
            ) : (
              <div className="border border-ocean/20 bg-ocean p-4 text-white">
                <div className="text-xs font-bold uppercase tracking-wide text-white/70">Status</div>
                <div className="font-display mt-1 text-3xl font-bold">{booked ? 'Booked' : 'Reserved'}</div>
                <p className="mt-1 text-[11px] font-medium text-white/75">
                  {booked ? 'This share is no longer for sale' : 'Held while a booking completes'}
                </p>
              </div>
            )}
            {[
              ['Entitlement', `${plan?.daysPerMonth || 0} days/mo`],
              ['Suite', suite?.id || plan?.suiteId || '—']
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
                  {suite?.type || 'Suite'} · {suite?.view || '—'}
                </div>
                <div className="text-sm text-ocean/70">
                  Floor {suite?.floor ?? '—'} · {suite?.size ?? '—'} sq ft · Unit {suite?.id || plan?.suiteId || '—'}
                </div>
              </div>
            </div>
          </section>

          {(plan?.suiteId || suite?.id) && <SuitePlans suiteId={plan?.suiteId || suite!.id} />}
        </div>

        <aside id="reserve-panel" className="scroll-mt-24 border border-gold/40 bg-white p-4 sm:p-6 lg:sticky lg:top-24 lg:self-start">
          {!available ? (
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gold">
                {booked ? 'Already booked' : 'Reserved'}
              </p>
              <h2 className="font-display mt-1 text-2xl text-ocean">
                {booked ? 'This share is taken' : 'Booking in progress'}
              </h2>
              <div className="mt-4 border border-ocean/10 bg-pearl px-3 py-3">
                {booked && plan?.owner ? (
                  <PlanOwner owner={plan.owner} statusLabel="Booked by" />
                ) : booked ? (
                  <p className="text-sm text-ocean/75">This share has already been booked.</p>
                ) : (
                  <p className="text-sm text-ocean/75">
                    Held while another buyer completes payment and identity checks.
                  </p>
                )}
              </div>
              {booked && (
                <p className="mt-3 text-sm text-ocean/65">Sold at {formatMoney(plan?.price || 0)}</p>
              )}
              {unitPlans.some(
                (x) => x.id !== planId && String(x.planStatus || 'Unsold').toLowerCase() === 'unsold'
              ) ? (
                <div className="mt-5">
                  <p className="text-sm font-semibold text-ocean">Other shares still available on this suite</p>
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
                            <span className="font-semibold">{x.name || 'Share'}</span>
                            <span className="text-ocean/65">
                              {' '}
                              · {x.daysPerMonth} days/mo · {formatMoney(x.price || 0)}
                            </span>
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : (
                <Link href="/invest" className="mt-5 inline-block">
                  <Button>Browse available shares</Button>
                </Link>
              )}
              <p className="mt-4 text-xs text-ocean/55">
                Name, profession, and city are shown so you can see who already invested. NID, phone, and
                address stay private.
              </p>
            </div>
          ) : (
            <>
          <h2 className="font-display text-2xl text-ocean">Reserve this suite</h2>
          <p className="mt-2 text-sm text-ocean/75">
            Pick how much to pay today, add your details, then send deposit proof. We confirm the booking
            when payment is received.
          </p>
          <p className="mt-3 text-xs text-ocean/60">
            Not sure which option fits?{' '}
            <Link href="/invest/advisor" className="font-semibold text-ocean underline">
              Help me choose
            </Link>
          </p>

          <div className="mt-5">
            <p className="text-sm font-semibold text-ocean">1. How much will you pay today?</p>
            <p className="mt-1 text-xs text-ocean/65">Pay more now to save on the total.</p>
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
                      <div className="font-semibold text-ocean">{tierHeadline(tier)}</div>
                      {saveLabel ? (
                        <div className="text-xs font-semibold text-gold">Save {saveLabel}</div>
                      ) : (
                        <div className="text-xs text-ocean/50">Lowest today</div>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-ocean/65">{tierHelp(tier)}</p>
                    <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <span className="font-semibold text-ocean">Today {formatMoney(due)}</span>
                      <span className="text-ocean/70">
                        Total {formatMoney(net)}
                        {save > 0 ? <span className="text-gold"> · save {formatMoney(save)}</span> : null}
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
                  {showScheduleOptions || scheduleIsCustom
                    ? 'Hide installment options'
                    : 'Need smaller monthly payments?'}
                </button>
                {(showScheduleOptions || scheduleIsCustom) && (
                  <div className="mt-3 space-y-3">
                    {tenors.length > 1 && (
                      <div>
                        <p className="text-xs font-medium text-ocean/70">How long to finish paying</p>
                        <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Installment length">
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
                                {n} months
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-ocean/70">How often you pay</p>
                      <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Installment cadence">
                        {(
                          [
                            { value: 'monthly' as const, label: 'Every month', hint: `${installmentMonths} payments` },
                            {
                              value: 'quarterly' as const,
                              label: 'Every 3 months',
                              hint: `${Math.ceil(installmentMonths / 3)} payments`
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
            When do your suite days start?
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="field mt-1"
            />
          </label>

          <div id="booking-kyc" className="mt-6 border-t border-ocean/10 pt-5">
            <p className="text-sm font-semibold text-ocean">2. Your details</p>
            <p className="mt-1 text-xs text-ocean/65">
              Fill this for the person the share is booked for. After booking, other buyers see your
              photo, name, profession, and city — so they can tell who already invested. NID, phone,
              and full address stay private.
            </p>

            <div className="mt-4 border border-ocean/10 bg-pearl px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-ocean/55">
                Shown on this plan after booking
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[5.5rem_1fr]">
                <label className="block text-sm text-ocean">
                  <span className="sr-only">Photograph</span>
                  <div className="relative">
                    {kyc.picUrl || picPreview.pic ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={kyc.picUrl ? resolveMediaUrl(kyc.picUrl) : picPreview.pic!}
                        alt="Your photograph"
                        className="h-20 w-20 border border-ocean/15 object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center border border-dashed border-ocean/25 bg-white text-center text-[10px] leading-tight text-ocean/50">
                        Photo
                        <br />
                        required
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
                    <span className="mt-1 block text-xs font-medium text-ocean/70">Uploading…</span>
                  )}
                  {picError.pic && <span className="mt-1 block text-xs text-red-700">{picError.pic}</span>}
                </label>
                <div className="grid gap-3">
                  <label className="block text-sm text-ocean">
                    Full name
                    <input
                      value={kyc.name}
                      onChange={(e) => updateKyc('name', e.target.value)}
                      className="field mt-1"
                      autoComplete="name"
                    />
                  </label>
                  <label className="block text-sm text-ocean">
                    Profession
                    <input
                      value={kyc.profession}
                      onChange={(e) => updateKyc('profession', e.target.value)}
                      className="field mt-1"
                      placeholder="e.g. Businessman, Doctor, Teacher"
                    />
                  </label>
                  <label className="block text-sm text-ocean">
                    City / district
                    <input
                      value={kyc.city}
                      onChange={(e) => updateKyc('city', e.target.value)}
                      className="field mt-1"
                      placeholder="e.g. Dhaka, Chattogram"
                    />
                  </label>
                </div>
              </div>
              {(kyc.name.trim() || kyc.profession.trim() || kyc.city.trim()) && (
                <div className="mt-3 border-t border-ocean/10 pt-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-ocean/50">Preview</p>
                  <PlanOwner
                    owner={{
                      name: kyc.name.trim() || 'Your name',
                      profession: kyc.profession.trim(),
                      city: kyc.city.trim(),
                      picUrl: kyc.picUrl || picPreview.pic || null
                    }}
                    statusLabel="Booked by"
                  />
                </div>
              )}
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-ocean/55">
              Private — only our team sees this
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-ocean">
                Father / husband name
                <input
                  value={kyc.fatherName}
                  onChange={(e) => updateKyc('fatherName', e.target.value)}
                  className="field mt-1"
                />
              </label>
              <label className="block text-sm text-ocean">
                NID number
                <input
                  value={kyc.nid}
                  onChange={(e) => updateKyc('nid', e.target.value)}
                  className="field mt-1"
                />
              </label>
              <label className="block text-sm text-ocean">
                Date of birth
                <input
                  type="date"
                  value={kyc.dob}
                  onChange={(e) => updateKyc('dob', e.target.value)}
                  className="field mt-1"
                />
              </label>
              <label className="block text-sm text-ocean">
                Contact number
                <input
                  value={kyc.contact}
                  onChange={(e) => updateKyc('contact', e.target.value)}
                  className="field mt-1"
                  autoComplete="tel"
                />
              </label>
              <label className="block text-sm text-ocean sm:col-span-2">
                Email
                <input
                  type="email"
                  value={kyc.email}
                  onChange={(e) => updateKyc('email', e.target.value)}
                  className="field mt-1"
                  autoComplete="email"
                />
              </label>
              <label className="block text-sm text-ocean sm:col-span-2">
                Present address
                <textarea
                  value={kyc.address}
                  onChange={(e) => updateKyc('address', e.target.value)}
                  className="field mt-1 min-h-[4.5rem]"
                  rows={2}
                />
              </label>
              <label className="block text-sm text-ocean sm:col-span-2">
                Permanent address
                <textarea
                  value={kyc.permanentAddress}
                  onChange={(e) => updateKyc('permanentAddress', e.target.value)}
                  className="field mt-1 min-h-[4.5rem]"
                  rows={2}
                />
              </label>
              <label className="block text-sm text-ocean">
                Nominee name
                <input
                  value={kyc.nomineeName}
                  onChange={(e) => updateKyc('nomineeName', e.target.value)}
                  className="field mt-1"
                />
              </label>
              <label className="block text-sm text-ocean">
                Nominee NID
                <input
                  value={kyc.nomineeNid}
                  onChange={(e) => updateKyc('nomineeNid', e.target.value)}
                  className="field mt-1"
                />
              </label>
              <label className="block text-sm text-ocean sm:col-span-2">
                Nominee photograph <span className="text-ocean/50">(required, stays private)</span>
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
                  <span className="mt-1 block text-xs font-medium text-ocean/70">Uploading photo…</span>
                )}
                {picError.nominee && <span className="mt-1 block text-xs text-red-700">{picError.nominee}</span>}
                {(kyc.nomineePicUrl || picPreview.nominee) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={kyc.nomineePicUrl ? resolveMediaUrl(kyc.nomineePicUrl) : picPreview.nominee!}
                    alt="Nominee photograph"
                    className="mt-2 h-20 w-20 border border-ocean/15 object-cover"
                  />
                )}
                {kyc.nomineePicUrl ? (
                  <span className="mt-1 block text-xs text-ocean/60">Uploaded</span>
                ) : (
                  !uploadingPic &&
                  !picError.nominee && (
                    <span className="mt-1 block text-xs text-gold">Choose a photo — it uploads automatically</span>
                  )
                )}
              </label>
            </div>
          </div>

          <div id="booking-deposit" className="mt-6 border-t border-ocean/10 pt-5">
            <p className="text-sm font-semibold text-ocean">3. How you’ll pay today</p>
            <p className="mt-1 text-xs text-ocean/65">
              Send the amount due today by cheque, cash/pay order, or bank transfer, then add the
              reference so we can match it.
            </p>
            <label className="mt-4 block text-sm text-ocean">
              Referral code <span className="font-normal text-ocean/55">(optional)</span>
              <input
                className="field mt-1 uppercase tracking-wide"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="Enter referrer code if you have one"
                autoComplete="off"
              />
              {referralHint && <span className="mt-1 block text-xs text-ocean/65">{referralHint}</span>}
            </label>
            <div className="mt-3 grid grid-cols-1 gap-2" role="radiogroup" aria-label="Deposit payment method">
              {(
                [
                  { value: 'cheque' as const, label: 'Cheque' },
                  { value: 'cash_payorder' as const, label: 'Cash / pay order' },
                  { value: 'online_transfer' as const, label: 'Online transfer' }
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
              Payment reference
              <input
                value={depositReference}
                onChange={(e) => setDepositReference(e.target.value)}
                className="field mt-1"
                placeholder={
                  depositMethod === 'cheque'
                    ? 'Cheque number'
                    : depositMethod === 'cash_payorder'
                      ? 'Pay order / receipt number'
                      : 'Bank transfer reference'
                }
              />
            </label>
            <label className="mt-3 block text-sm text-ocean">
              Note (optional)
              <textarea
                value={depositNote}
                onChange={(e) => setDepositNote(e.target.value)}
                className="field mt-1 min-h-[3.5rem]"
                rows={2}
                placeholder="Bank name, branch, or other details"
              />
            </label>
            <label className="mt-3 block text-sm text-ocean">
              Proof of payment (optional)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="mt-1 block w-full text-xs text-ocean/80"
                disabled={uploadingProof}
                onChange={(e) => uploadDepositProof(e.target.files?.[0] || null)}
              />
              {uploadingProof && <span className="mt-1 block text-xs text-ocean/60">Uploading…</span>}
              {depositProofUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveMediaUrl(depositProofUrl)}
                  alt="Payment proof"
                  className="mt-2 h-20 w-20 border border-ocean/15 object-cover"
                />
              )}
            </label>
          </div>

          <div className="mt-4 border-t border-ocean/10 pt-4 text-sm text-ocean/80">
            <div className="flex justify-between">
              <span>Total price</span>
              <span className={discounted ? 'line-through text-ocean/50' : 'font-semibold text-ocean'}>
                {formatMoney(plan?.price || 0)}
              </span>
            </div>
            {discounted && (
              <div className="mt-1 flex justify-between">
                <span className="text-ocean/70">
                  {plan?.promoName} ({plan?.discountPct}%)
                </span>
                <span className="font-semibold text-gold">
                  − {formatMoney((plan?.price || 0) - effectivePrice)}
                </span>
              </div>
            )}
            {discounted && (
              <div className="mt-2 flex justify-between border-t border-ocean/10 pt-2">
                <span className="font-semibold text-ocean">Offer price</span>
                <span className="font-semibold text-ocean">{formatMoney(effectivePrice)}</span>
              </div>
            )}
            {quote?.advanceDiscountPct > 0 && (
              <div className="mt-1 flex justify-between">
                <span className="text-ocean/70">Paying more now ({quote.advanceDiscountPct}%)</span>
                <span className="font-semibold text-gold">− {formatMoney(quote.savings || 0)}</span>
              </div>
            )}
            {quote && (
              <div className="mt-2 flex justify-between border-t border-ocean/10 pt-2">
                <span className="font-semibold text-ocean">You pay</span>
                <span className="font-semibold text-ocean">{formatMoney(quote.netPrice)}</span>
              </div>
            )}
            <div className="mt-3 space-y-2 border border-ocean/10 bg-pearl px-3 py-3">
              {downPreview > 0 && (
                <div className="flex justify-between">
                  <span>Downpayment</span>
                  <span className="font-semibold text-ocean">{formatMoney(downPreview)}</span>
                </div>
              )}
              {installmentCount > 0 && (
                <div className="flex justify-between">
                  <span>
                    {cadence === 'monthly' ? 'Monthly' : 'Quarterly'} installment × {installmentCount}
                  </span>
                  <span className="font-semibold text-ocean">{formatMoney(installmentAmount)}</span>
                </div>
              )}
              {installmentCount === 0 && (
                <p className="text-[11px] text-ocean/60">No remaining installments on this plan.</p>
              )}
            </div>
            <div className="mt-3 border border-gold/50 bg-gold/10 px-3 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wide text-ocean/70">Due today</span>
                <span className="font-display text-2xl font-bold text-ocean">{formatMoney(depositPreview)}</span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-ocean/65">
                {quote?.upfrontPct ?? 10}% via cheque, cash/pay order, or transfer — confirmed by admin
              </p>
            </div>
          </div>
          {token && user && !emailVerified && (
            <div className="mt-4 border border-gold/50 bg-gold/10 px-3 py-3 text-sm text-ocean">
              Verify your account email before submitting a booking.{' '}
              <Link href={`/auth/verify?next=${encodeURIComponent(`/pricing/plans/${planId}`)}`} className="font-semibold underline">
                Verify email
              </Link>
            </div>
          )}
          {status && (
            <div className="mt-4 rounded-md border border-ocean/15 bg-ocean/5 p-3 text-sm text-ocean">{status}</div>
          )}
          {!kycComplete && (
            <p className="mt-4 text-xs text-ocean/65">
              Missing details: {kycMissing.map((key) => KYC_FIELD_LABELS[key]).join(', ')}
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
              ? 'Submitting...'
              : !available
                ? 'No longer available'
                : token && !emailVerified
                  ? 'Verify email to continue'
                  : !kycComplete
                    ? onlyPhotosMissing
                      ? 'Upload photographs to continue'
                      : 'Add your details to continue'
                    : !depositReference.trim()
                      ? 'Add a payment reference'
                      : 'Reserve this plan'}
          </Button>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link href="/investor" className="text-ocean underline">
              Dashboard
            </Link>
            <a href="mailto:info@grandsampan.com" className="text-ocean underline">
              Contact sales
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
          {showTools ? 'Hide' : 'Show'} payment tools & returns calculator
        </button>

        {showTools && (
          <div className="mt-6">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setTab('payment')}
                className={`shrink-0 rounded-md border px-4 py-2.5 text-sm ${
                  tab === 'payment' ? 'border-ocean bg-ocean text-white' : 'border-ocean/20 text-ocean'
                }`}
              >
                Payment schedule
              </button>
              <button
                onClick={() => setTab('returns')}
                className={`shrink-0 rounded-md border px-4 py-2.5 text-sm ${
                  tab === 'returns' ? 'border-ocean bg-ocean text-white' : 'border-ocean/20 text-ocean'
                }`}
              >
                Returns calculator
              </button>
            </div>

            {tab === 'payment' && (
              <div className="mt-6">
                <p className="text-sm text-ocean/65">
                  This table is the live quote for the payment plan selected in the sidebar. The sliders below are
                  illustrative only and do not change the booking.
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <label className="text-sm text-ocean">
                    Deposit (%)
                    <input
                      type="number"
                      value={depositPct}
                      onChange={(e) => setDepositPct(Number(e.target.value))}
                      className="field mt-1"
                    />
                  </label>
                  <label className="text-sm text-ocean">
                    Downpayment (%)
                    <input
                      type="number"
                      value={downPct}
                      onChange={(e) => setDownPct(Number(e.target.value))}
                      className="field mt-1"
                    />
                  </label>
                  <label className="text-sm text-ocean">
                    Cadence
                    <select
                      value={cadence}
                      onChange={(e) => setCadence(e.target.value as 'monthly' | 'quarterly')}
                      className="field mt-1"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                    </select>
                  </label>
                </div>
                <div className="mt-4 overflow-auto border border-ocean/10 bg-white">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-ocean">
                        <th className="p-3">Type</th>
                        <th className="p-3">Due</th>
                        <th className="p-3">Amount</th>
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
                  Preview of the first rows. Checkout uses booking 10% + downpayment 20% + 24-month{' '}
                  {cadence} installments ({installmentCount} payments of about {formatMoney(installmentAmount)}).
                </p>
              </div>
            )}

            {tab === 'returns' && (
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                <label className="text-sm text-ocean">
                  ADR (BDT)
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={Number.isFinite(adr) ? String(adr) : ''}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^\d]/g, '');
                      setAdr(cleaned === '' ? 0 : Number(cleaned));
                    }}
                    className="field mt-1"
                  />
                </label>
                <label className="text-sm text-ocean">
                  Occupancy (0–1)
                  <input
                    type="number"
                    step="0.01"
                    value={occupancy}
                    onChange={(e) => setOccupancy(Number(e.target.value))}
                    className="field mt-1"
                  />
                </label>
                <label className="text-sm text-ocean">
                  Operating cost (%)
                  <input
                    type="number"
                    step="0.01"
                    value={costPct}
                    onChange={(e) => setCostPct(Number(e.target.value))}
                    className="field mt-1"
                  />
                </label>
                <label className="text-sm text-ocean">
                  Rental uplift (%)
                  <input
                    type="number"
                    step="0.01"
                    value={rentUpliftPct}
                    onChange={(e) => setRentUpliftPct(Number(e.target.value))}
                    className="field mt-1"
                  />
                </label>
                <div className="border border-ocean/10 bg-white p-4 md:col-span-2">
                  <div className="text-xs text-ocean/60">Illustrative annual net</div>
                  <div className="font-display mt-1 text-2xl text-ocean">
                    {(() => {
                      const gross = adr * (1 + rentUpliftPct / 100) * (plan?.daysPerMonth || 0) * occupancy;
                      const net = gross * (1 - costPct / 100);
                      return formatMoney(Math.round(net * 12));
                    })()}
                  </div>
                </div>
              </div>
            )}

            {rules.length > 0 && (
              <p className="mt-4 text-sm text-ocean/70">{rules.length} pricing rule(s) on file for this plan.</p>
            )}
          </div>
        )}
      </section>

      {available && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ocean/10 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(14,58,90,0.12)] pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ocean/50">Due today</p>
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
              Continue
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
