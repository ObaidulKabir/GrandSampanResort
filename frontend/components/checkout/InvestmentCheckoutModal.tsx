'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import Button from '@/components/Button';
import CheckoutStepper from './CheckoutStepper';
import PvTierVisualizer, { TIERS_META } from './PvTierVisualizer';
import KycStepForm, { type KycData } from './KycStepForm';

type SharePlan = {
  id: string;
  name: string;
  daysPerMonth: number;
  lockIn: number;
  price: number;
  suiteId?: string;
  suite?: { id: string; type: string; view?: string };
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  plan: SharePlan | null;
  user?: { id: string; email?: string; name?: string } | null;
  onBookingSuccess?: (bookingId: string) => void;
};

const initialKyc: KycData = {
  name: '',
  fatherName: '',
  nid: '',
  dob: '',
  profession: '',
  city: '',
  address: '',
  permanentAddress: '',
  contact: '',
  email: '',
  picUrl: '',
  nomineeName: '',
  nomineeNid: '',
  nomineePicUrl: '',
};

export default function InvestmentCheckoutModal({
  isOpen,
  onClose,
  plan,
  user,
  onBookingSuccess,
}: Props) {
  const [step, setStep] = useState(1);
  const [maxCompletedStep, setMaxCompletedStep] = useState(1);
  const [selectedTierId, setSelectedTierId] = useState('standard');
  const [kycData, setKycData] = useState<KycData>(initialKyc);
  const [referralCode, setReferralCode] = useState('');
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [depositMethod, setDepositMethod] = useState<'cheque' | 'cash_payorder' | 'online_transfer'>('cheque');
  const [depositReference, setDepositReference] = useState('');
  const [depositProofUrl, setDepositProofUrl] = useState('');
  const [depositNote, setDepositNote] = useState('');

  const [quoteData, setQuoteData] = useState<any>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  // Pre-fill email/name from logged in user if available
  useEffect(() => {
    if (user) {
      setKycData((prev) => ({
        ...prev,
        email: prev.email || user.email || '',
        name: prev.name || user.name || '',
      }));
    }
  }, [user]);

  // Fetch signed PV Quote whenever plan or selected tier changes
  const fetchQuote = async (tierId: string = selectedTierId) => {
    if (!plan) return;
    setLoadingQuote(true);
    setError('');
    try {
      const res = await api('/booking/quote', {
        method: 'POST',
        body: JSON.stringify({
          planId: plan.id,
          paymentTierId: tierId,
          referralCode: referralCode.trim() || undefined,
        }),
      });
      if (res && res.amountTotal) {
        setQuoteData(res);
      } else {
        // Fallback calculations if server endpoint returns error
        const tier = TIERS_META.find((t) => t.id === tierId) || TIERS_META[0];
        const net = Math.round(plan.price * (1 - tier.discountPct / 100));
        setQuoteData({
          listPrice: plan.price,
          advanceDiscountPct: tier.discountPct,
          amountTotal: net,
          tierId,
        });
      }
    } catch {
      const tier = TIERS_META.find((t) => t.id === tierId) || TIERS_META[0];
      setQuoteData({
        listPrice: plan.price,
        advanceDiscountPct: tier.discountPct,
        amountTotal: Math.round(plan.price * (1 - tier.discountPct / 100)),
        tierId,
      });
    }
    setLoadingQuote(false);
  };

  useEffect(() => {
    if (isOpen && plan) {
      fetchQuote(selectedTierId);
    }
  }, [isOpen, plan, selectedTierId]);

  if (!isOpen || !plan) return null;

  const currentTier = TIERS_META.find((t) => t.id === selectedTierId) || TIERS_META[0];
  const netPrice = quoteData?.amountTotal ?? Math.round(plan.price * (1 - currentTier.discountPct / 100));
  const dueTodayAmount = Math.round(netPrice * (currentTier.dueTodayPct / 100));

  const validateKyc = () => {
    const k = kycData;
    if (!k.name.trim() || !k.fatherName.trim() || !k.nid.trim() || !k.contact.trim() || !k.email.trim() || !k.address.trim()) {
      setError('Please fill in all required investor fields (*)');
      return false;
    }
    if (!k.nomineeName.trim() || !k.nomineeNid.trim()) {
      setError('Please fill in nominee name and NID/passport number (*)');
      return false;
    }
    setError('');
    return true;
  };

  const handleNextStep = () => {
    setError('');
    if (step === 1) {
      setStep(2);
      setMaxCompletedStep((prev) => Math.max(prev, 2));
    } else if (step === 2) {
      if (validateKyc()) {
        setStep(3);
        setMaxCompletedStep((prev) => Math.max(prev, 3));
      }
    } else if (step === 3) {
      setStep(4);
      setMaxCompletedStep((prev) => Math.max(prev, 4));
    }
  };

  const handlePrevStep = () => {
    setError('');
    if (step > 1) setStep(step - 1);
  };

  const handleSubmitBooking = async () => {
    setError('');
    setSubmitting(true);

    try {
      const suiteId = plan.suiteId || plan.suite?.id || 'SUITE-101';
      const now = new Date();
      const nextYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

      const payload = {
        suiteId,
        planId: plan.id,
        start: now.toISOString(),
        end: nextYear.toISOString(),
        investorId: user?.id,
        quoteToken: quoteData?.quoteToken,
        referralCode: referralCode.trim() || undefined,
        depositMethod,
        depositReference: depositReference.trim() || undefined,
        depositProofUrl: depositProofUrl.trim() || undefined,
        depositNote: depositNote.trim() || undefined,
        client: kycData,
      };

      const res = await api('/booking', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res?.ok && res.booking?.id) {
        setConfirmedBooking(res.booking);
        if (onBookingSuccess) onBookingSuccess(res.booking.id);
      } else {
        setError(res?.message || 'Failed to place booking. Please check details.');
      }
    } catch (err: any) {
      setError(err?.message || 'Server error while submitting booking.');
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ocean/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-gold/30 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ocean/10 bg-ocean px-6 py-4 text-white">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gold">
              Grand Sampan Investment Portal
            </span>
            <h2 className="font-display text-xl text-white">
              {plan.name} · {plan.suite?.type || 'Luxury Suite'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Stepper Navigation */}
        {!confirmedBooking && (
          <div className="border-b border-ocean/10 bg-pearl px-6 py-3">
            <CheckoutStepper
              currentStep={step}
              onStepClick={(s) => {
                if (s <= maxCompletedStep) setStep(s);
              }}
              maxCompletedStep={maxCompletedStep}
            />
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* Body Content */}
        <div className="max-h-[65vh] overflow-y-auto p-6 text-ocean">
          {confirmedBooking ? (
            /* Confirmation View */
            <div className="space-y-6 text-center py-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-3xl">
                ✓
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-gold">Investment Placed Successfully</span>
                <h3 className="font-display text-3xl text-ocean mt-1">Thank You for Investing!</h3>
                <p className="mt-2 text-sm text-ocean/70 max-w-lg mx-auto">
                  Your share plan reservation has been submitted. Our accounts team will verify your deposit and issue your notarized deed confirmation.
                </p>
              </div>

              <div className="mx-auto max-w-md rounded-xl border border-gold/40 bg-pearl p-5 text-left space-y-3">
                <div className="flex justify-between border-b border-ocean/10 pb-2 text-xs">
                  <span className="text-ocean/60">Booking Reference</span>
                  <span className="font-mono font-bold text-ocean">{confirmedBooking.id}</span>
                </div>
                <div className="flex justify-between border-b border-ocean/10 pb-2 text-xs">
                  <span className="text-ocean/60">Selected Tier</span>
                  <span className="font-bold text-ocean">{currentTier.label}</span>
                </div>
                <div className="flex justify-between border-b border-ocean/10 pb-2 text-xs">
                  <span className="text-ocean/60">Total Net Price</span>
                  <span className="font-bold text-ocean">{formatMoney(netPrice)}</span>
                </div>
                <div className="flex justify-between text-sm pt-1">
                  <span className="font-semibold text-ocean">Due Today (Deposit)</span>
                  <span className="font-display font-bold text-gold text-lg">{formatMoney(dueTodayAmount)}</span>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-3 pt-4">
                <Button onClick={onClose}>Close & View Dashboard</Button>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: PV Tier Selection */}
              {step === 1 && (
                <PvTierVisualizer
                  listPrice={plan.price}
                  selectedTierId={selectedTierId}
                  onSelectTier={(id) => {
                    setSelectedTierId(id);
                    fetchQuote(id);
                  }}
                  quoteData={quoteData}
                  loadingQuote={loadingQuote}
                  onRefreshQuote={() => fetchQuote(selectedTierId)}
                />
              )}

              {/* Step 2: KYC Form */}
              {step === 2 && (
                <KycStepForm
                  data={kycData}
                  onChange={setKycData}
                  userEmail={user?.email}
                  userName={user?.name}
                />
              )}

              {/* Step 3: Referral & Quote Confirmation */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="rounded-xl border border-ocean/10 bg-pearl p-5 space-y-4">
                    <h3 className="font-display text-lg text-ocean">Referral & Promo Code</h3>
                    <p className="text-xs text-ocean/70">
                      If you were referred by an existing investor or sales partner, enter their referral code below.
                    </p>

                    <div className="flex gap-3 max-w-md">
                      <input
                        type="text"
                        className="field font-mono text-sm uppercase"
                        placeholder="e.g. REF-12345"
                        value={referralCode}
                        onChange={(e) => {
                          setReferralCode(e.target.value);
                          setReferralValid(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fetchQuote(selectedTierId)}
                        className="btn-outline shrink-0 text-xs px-4"
                      >
                        Apply Code
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gold/40 bg-white p-5 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-ocean/10 pb-3">
                      <div>
                        <span className="text-xs font-semibold uppercase text-gold">Final Investment Snapshot</span>
                        <h4 className="font-display text-xl text-ocean">{plan.name}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-ocean/50 font-mono">Tier: {currentTier.label}</span>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 text-xs">
                      <div className="bg-pearl p-3 rounded-lg">
                        <span className="text-ocean/60 block">List Price</span>
                        <span className="font-bold text-sm text-ocean">{formatMoney(plan.price)}</span>
                      </div>
                      <div className="bg-pearl p-3 rounded-lg">
                        <span className="text-ocean/60 block">PV Discount Applied</span>
                        <span className="font-bold text-sm text-emerald-700">
                          {quoteData?.advanceDiscountPct || currentTier.discountPct}% OFF
                        </span>
                      </div>
                      <div className="bg-gold/10 border border-gold/30 p-3 rounded-lg">
                        <span className="text-ocean/70 block font-medium">Final Net Price</span>
                        <span className="font-display font-bold text-base text-ocean">{formatMoney(netPrice)}</span>
                      </div>
                    </div>

                    <div className="rounded-lg bg-ocean p-4 text-white flex items-center justify-between">
                      <div>
                        <span className="text-xs text-gold uppercase font-semibold">First Deposit Payment Due Today</span>
                        <div className="text-xs text-white/70">Includes merged booking + downpayment (if tier applicable)</div>
                      </div>
                      <div className="font-display text-2xl font-bold text-gold">{formatMoney(dueTodayAmount)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Offline Deposit Selection & Receipt Upload */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="rounded-xl border border-ocean/10 bg-pearl p-5 space-y-4">
                    <h3 className="font-display text-lg text-ocean">Select Deposit Payment Method</h3>
                    <p className="text-xs text-ocean/70">
                      Choose how you are submitting your initial deposit (৳{formatMoney(dueTodayAmount)}).
                    </p>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        { id: 'cheque', label: 'Bank Cheque', icon: '🏦', desc: 'Account payee cheque to Unitech Holdings Ltd.' },
                        { id: 'cash_payorder', label: 'Cash / Pay Order', icon: '📜', desc: 'Bank draft / Pay order deposited at branch.' },
                        { id: 'online_transfer', label: 'Online Wire / BEFTN', icon: '💻', desc: 'Direct bank transfer / EFTN transaction.' },
                      ].map((m) => (
                        <div
                          key={m.id}
                          onClick={() => setDepositMethod(m.id as any)}
                          className={`cursor-pointer rounded-xl border p-4 transition-all ${
                            depositMethod === m.id
                              ? 'border-gold bg-white ring-2 ring-gold/40 shadow-sm'
                              : 'border-ocean/10 bg-white/60 hover:bg-white'
                          }`}
                        >
                          <div className="text-2xl mb-1">{m.icon}</div>
                          <div className="font-semibold text-sm text-ocean">{m.label}</div>
                          <div className="text-[11px] text-ocean/60 mt-0.5">{m.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Details Input */}
                  <div className="rounded-xl border border-ocean/10 bg-white p-5 space-y-4">
                    <h4 className="font-semibold text-sm text-ocean">Deposit Verification References</h4>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-xs font-semibold text-ocean">
                          {depositMethod === 'cheque'
                            ? 'Cheque Number & Bank Name *'
                            : depositMethod === 'cash_payorder'
                            ? 'Pay Order No. & Issuing Bank *'
                            : 'Transaction ID / Wire Reference *'}
                        </span>
                        <input
                          type="text"
                          required
                          className="field mt-1 font-mono text-sm"
                          placeholder="e.g. CHQ-987654321 / Dutch Bangla Bank"
                          value={depositReference}
                          onChange={(e) => setDepositReference(e.target.value)}
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs font-semibold text-ocean">Deposit Slip / Receipt URL (Optional)</span>
                        <input
                          type="url"
                          className="field mt-1 text-sm"
                          placeholder="https://... image link or leave blank"
                          value={depositProofUrl}
                          onChange={(e) => setDepositProofUrl(e.target.value)}
                        />
                      </label>

                      <label className="block sm:col-span-2">
                        <span className="text-xs font-semibold text-ocean">Additional Payment Note (Optional)</span>
                        <textarea
                          rows={2}
                          className="field mt-1 text-sm"
                          placeholder="Any special instructions for the accounts department..."
                          value={depositNote}
                          onChange={(e) => setDepositNote(e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        {!confirmedBooking && (
          <div className="flex items-center justify-between border-t border-ocean/10 bg-pearl px-6 py-4">
            <Button
              variant="outline"
              onClick={handlePrevStep}
              disabled={step === 1 || submitting}
              className="px-6"
            >
              ← Back
            </Button>

            {step < 4 ? (
              <Button onClick={handleNextStep} className="px-8">
                Continue to Step {step + 1} →
              </Button>
            ) : (
              <Button onClick={handleSubmitBooking} disabled={submitting} className="px-8 bg-gold text-ocean hover:bg-gold/90 font-bold">
                {submitting ? 'Submitting Reservation...' : `Confirm & Submit Deposit (৳${formatMoney(dueTodayAmount)})`}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
