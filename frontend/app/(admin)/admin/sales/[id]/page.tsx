'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { resolveMediaUrl } from '@/lib/media';
import Button from '@/components/Button';
import KycEditor from '@/components/KycEditor';

type ScheduleItem = {
  id: string;
  type: string;
  dueDate: string;
  amount: number;
  status: string;
  gatewayRef?: string | null;
};

const METHOD_LABELS: Record<string, string> = {
  cheque: 'Cheque',
  cash_payorder: 'Cash / pay order',
  online_transfer: 'Online transfer'
};

export default function AdminBookingDetailPage({ params }: { params: { id: string } }) {
  const bookingId = params.id;
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryRes, scheduleRes] = await Promise.all([
        api(`/booking/${encodeURIComponent(bookingId)}/summary`),
        api(`/booking/${encodeURIComponent(bookingId)}/schedule`)
      ]);
      if (!summaryRes?.ok || !summaryRes?.summary) {
        setError('Booking not found');
        setSummary(null);
        setSchedule([]);
        return;
      }
      setSummary(summaryRes.summary);
      setSchedule(Array.isArray(scheduleRes?.schedule) ? scheduleRes.schedule : []);
    } catch {
      setError('Failed to load booking');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmDeposit() {
    if (!window.confirm('Confirm deposit receipt / bank encashment for this booking?')) return;
    setActing(true);
    setActionMsg('');
    try {
      const res = await api(`/booking/${encodeURIComponent(bookingId)}/confirm-deposit`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      if (!res?.ok) {
        setActionMsg(
          res?.error === 'not_pending_review' || res?.error === 'not_awaiting_payment'
            ? 'This booking is not pending admin review'
            : 'Could not confirm deposit'
        );
      } else if (res.completed) {
        setActionMsg('Deposit and KYC both approved. Booking completed and plan booked.');
        await load();
      } else {
        setActionMsg('Deposit confirmed. Verify KYC to complete the booking.');
        await load();
      }
    } catch {
      setActionMsg('Could not confirm deposit');
    }
    setActing(false);
  }

  async function verifyKyc() {
    if (!window.confirm('Confirm that the KYC information for this booking is valid?')) return;
    setActing(true);
    setActionMsg('');
    try {
      const res = await api(`/booking/${encodeURIComponent(bookingId)}/verify-kyc`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      if (!res?.ok) {
        setActionMsg(
          res?.error === 'kyc_missing'
            ? 'No KYC snapshot on this booking'
            : res?.error === 'not_pending_review'
              ? 'This booking is not pending admin review'
              : 'Could not verify KYC'
        );
      } else if (res.completed) {
        setActionMsg('KYC verified and deposit already confirmed. Booking completed and plan booked.');
        await load();
      } else {
        setActionMsg('KYC verified. Confirm deposit receipt to complete the booking.');
        await load();
      }
    } catch {
      setActionMsg('Could not verify KYC');
    }
    setActing(false);
  }

  async function cancelBooking(presetReason?: string) {
    const reason = (presetReason ?? cancelReason).trim();
    if (!reason) {
      setActionMsg('Enter a cancellation reason before discarding.');
      setShowCancelForm(true);
      return;
    }
    if (
      !window.confirm(
        'Discard this reservation and set the share plan back to Unsold? This cannot be undone.'
      )
    ) {
      return;
    }
    setActing(true);
    setActionMsg('');
    try {
      const res = await api(`/booking/${encodeURIComponent(bookingId)}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
      if (!res?.ok) {
        setActionMsg(
          res?.error === 'reason_required'
            ? 'A discard reason is required'
            : res?.error === 'already_cancelled'
              ? 'This booking is already cancelled'
              : res?.error === 'not_cancellable'
                ? 'This booking cannot be discarded in its current status'
                : res?.error === 'not_investment_booking'
                  ? 'Only investment bookings with a plan can be discarded here'
                  : 'Could not discard reservation'
        );
      } else {
        const parts = [
          res.planReleased
            ? 'Reservation discarded. Plan is Unsold again and available to sell.'
            : 'Reservation discarded.'
        ];
        if (res.clientNotified && res.notifiedEmail) {
          parts.push(`Cancellation email sent to ${res.notifiedEmail}.`);
        } else {
          parts.push('Could not send cancellation email to the client — check SMTP or buyer email.');
        }
        setActionMsg(parts.join(' '));
        setShowCancelForm(false);
        setCancelReason('');
        await load();
      }
    } catch {
      setActionMsg('Could not discard reservation');
    }
    setActing(false);
  }

  const booking = summary?.booking;
  const client = summary?.client;
  const suite = summary?.suite;
  const plan = summary?.plan;
  const investor = summary?.investor;
  const referrer = summary?.referrer;
  const referralReward = summary?.referralReward;
  const pendingReview =
    booking?.status === 'awaiting_payment' || booking?.status === 'awaiting_kyc';
  const canCancel =
    !!booking?.planId &&
    (booking?.status === 'awaiting_payment' ||
      booking?.status === 'awaiting_kyc' ||
      booking?.status === 'confirmed');
  const depositConfirmed = !!booking?.depositConfirmedAt;
  const kycVerified = !!booking?.kycVerified;
  const planStatusLabel = String(plan?.planStatus || '—');

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/sales" className="text-sm font-semibold text-ocean underline">
            ← Back to Sales Desk
          </Link>
          <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-gold">Booking</p>
          <h1 className="font-display mt-1 text-4xl text-ocean">{booking?.id || bookingId}</h1>
          <p className="mt-2 text-ocean/75">
            {plan
              ? `${plan.name || plan.id} · Unit ${suite?.id || booking?.suiteId || '—'}`
              : booking?.planId
                ? `Plan ${booking.planId}`
                : 'Guest stay booking'}
          </p>
        </div>
        <Link href="/admin/sales">
          <Button variant="outline">All bookings</Button>
        </Link>
      </div>

      {error && <div className="mt-4 border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
      {actionMsg && (
        <div className="mt-4 border border-ocean/15 bg-ocean/5 p-3 text-ocean">{actionMsg}</div>
      )}
      {loading && <p className="mt-6 text-ocean/70">Loading booking…</p>}

      {!loading && booking && (
        <div className="mt-8 space-y-8">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Status', String(booking.status || '—').replace(/_/g, ' ')],
              ['Total', formatMoney(booking.amountTotal || 0)],
              ['Paid', formatMoney(summary.paidTotal || 0)],
              ['Outstanding', formatMoney(summary.outstanding || 0)]
            ].map(([label, value]) => (
              <div key={label} className="border border-ocean/10 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-ocean/60">{label}</div>
                <div className="font-display mt-1 text-xl capitalize text-ocean">{value}</div>
              </div>
            ))}
          </section>

          {booking.planId && (booking.paymentTierId || booking.advanceDiscountPct) && (
            <section className="border border-ocean/10 bg-white p-5">
              <h2 className="font-display text-xl text-ocean">Payment plan</h2>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-ocean/60">Tier</dt>
                  <dd className="font-medium text-ocean">{booking.paymentTierId || 'standard'}</dd>
                </div>
                <div>
                  <dt className="text-ocean/60">List price</dt>
                  <dd className="font-medium text-ocean">{formatMoney(booking.listPrice || booking.amountTotal || 0)}</dd>
                </div>
                <div>
                  <dt className="text-ocean/60">Advance discount</dt>
                  <dd className="font-medium text-ocean">
                    {booking.advanceDiscountPct != null ? `${Number(booking.advanceDiscountPct).toFixed(2)}%` : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-ocean/60">Net charged</dt>
                  <dd className="font-medium text-ocean">{formatMoney(booking.amountTotal || 0)}</dd>
                </div>
                <div>
                  <dt className="text-ocean/60">Tenor</dt>
                  <dd className="font-medium text-ocean">
                    {booking.installmentMonths || 24} months · {booking.cadence || 'monthly'}
                  </dd>
                </div>
                <div>
                  <dt className="text-ocean/60">Rate used</dt>
                  <dd className="font-medium text-ocean">
                    {booking.discountRateAnnualPct != null ? `${booking.discountRateAnnualPct}%` : '—'}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          {booking.planId && (
            <section className="border border-gold/40 bg-gold/10 p-5">
              <h2 className="font-display text-2xl text-ocean">Completion checklist</h2>
              <p className="mt-1 text-sm text-ocean/70">
                Booking completes only after both deposit receipt and KYC are approved. If payment was
                not received or KYC is invalid, discard the reservation to return the plan to Unsold.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-ocean">
                <li>
                  Plan status:{' '}
                  <span className="font-semibold">{planStatusLabel}</span>
                  {booking.status === 'cancelled' && planStatusLabel.toLowerCase() === 'unsold'
                    ? ' (released)'
                    : ''}
                </li>
                <li>
                  {depositConfirmed ? '✓' : '○'} Deposit payment confirmed
                  {depositConfirmed && booking.depositConfirmedAt
                    ? ` (${formatDate(booking.depositConfirmedAt)})`
                    : ''}
                </li>
                <li>
                  {kycVerified ? '✓' : '○'} KYC verified as valid
                  {kycVerified && booking.kycVerifiedAt ? ` (${formatDate(booking.kycVerifiedAt)})` : ''}
                </li>
              </ul>
              {pendingReview && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {!depositConfirmed && (
                    <Button onClick={confirmDeposit} disabled={acting}>
                      {acting ? 'Working…' : 'Confirm deposit receipt'}
                    </Button>
                  )}
                  {!kycVerified && (
                    <Button onClick={verifyKyc} disabled={acting || !client}>
                      {acting ? 'Working…' : 'Verify KYC'}
                    </Button>
                  )}
                  {!depositConfirmed && (
                    <Button
                      variant="outline"
                      onClick={() => cancelBooking('Payment not received / could not be verified')}
                      disabled={acting}
                    >
                      Discard — payment not received
                    </Button>
                  )}
                  {!kycVerified && (
                    <Button
                      variant="outline"
                      onClick={() => cancelBooking('KYC information not valid')}
                      disabled={acting}
                    >
                      Discard — KYC not valid
                    </Button>
                  )}
                </div>
              )}
            </section>
          )}

          {canCancel && (
            <section className="border border-red-200 bg-red-50/40 p-5">
              <h2 className="font-display text-2xl text-ocean">
                {pendingReview ? 'Discard reservation' : 'Cancel booking'}
              </h2>
              <p className="mt-1 text-sm text-ocean/70">
                {pendingReview
                  ? 'Use this when payment was not received or KYC is not valid. The share plan returns to Unsold and can be sold again. The client is emailed the cancellation reason.'
                  : 'Cancel for operational reasons and release the share plan back to Unsold. The client is emailed the cancellation reason.'}
              </p>
              {!showCancelForm ? (
                <div className="mt-4">
                  <Button variant="outline" onClick={() => setShowCancelForm(true)} disabled={acting}>
                    {pendingReview ? 'Discard reservation & release plan' : 'Cancel booking & release plan'}
                  </Button>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <label className="block text-sm font-medium text-ocean">
                    Reason
                    <textarea
                      className="field mt-1 min-h-[96px]"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="e.g. Payment not received / KYC documents not valid / buyer withdrew"
                      maxLength={1000}
                      required
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => cancelBooking()} disabled={acting || !cancelReason.trim()}>
                      {acting ? 'Discarding…' : pendingReview ? 'Confirm discard' : 'Confirm cancellation'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowCancelForm(false);
                        setCancelReason('');
                      }}
                      disabled={acting}
                    >
                      Keep booking
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {booking?.status === 'cancelled' && (
            <section className="border border-ocean/10 bg-white p-5">
              <h2 className="font-display text-2xl text-ocean">Cancellation</h2>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="border-b border-ocean/10 pb-2">
                  <dt className="text-xs uppercase tracking-wide text-ocean/55">Cancelled at</dt>
                  <dd className="mt-0.5 text-ocean">
                    {booking.cancelledAt ? formatDate(booking.cancelledAt) : '—'}
                  </dd>
                </div>
                <div className="border-b border-ocean/10 pb-2 sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-ocean/55">Reason</dt>
                  <dd className="mt-0.5 text-ocean">{booking.cancellationReason || '—'}</dd>
                </div>
              </dl>
            </section>
          )}

          {booking.planId && (
            <section className="border border-ocean/10 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl text-ocean">Deposit payment</h2>
                  <p className="mt-1 text-sm text-ocean/65">
                    Offline payment submitted by the buyer. Confirm after cash receipt or bank
                    encashment.
                  </p>
                </div>
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="border-b border-ocean/10 pb-2">
                  <dt className="text-xs uppercase tracking-wide text-ocean/55">Method</dt>
                  <dd className="mt-0.5 text-ocean">
                    {METHOD_LABELS[booking.depositMethod] ||
                      String(booking.depositMethod || '—').replace(/_/g, ' ')}
                  </dd>
                </div>
                <div className="border-b border-ocean/10 pb-2">
                  <dt className="text-xs uppercase tracking-wide text-ocean/55">Reference</dt>
                  <dd className="mt-0.5 font-mono text-ocean">{booking.depositReference || '—'}</dd>
                </div>
                <div className="border-b border-ocean/10 pb-2 sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-ocean/55">Note</dt>
                  <dd className="mt-0.5 text-ocean">{booking.depositNote || '—'}</dd>
                </div>
                <div className="border-b border-ocean/10 pb-2">
                  <dt className="text-xs uppercase tracking-wide text-ocean/55">Submitted</dt>
                  <dd className="mt-0.5 text-ocean">
                    {booking.depositSubmittedAt ? formatDate(booking.depositSubmittedAt) : '—'}
                  </dd>
                </div>
                <div className="border-b border-ocean/10 pb-2">
                  <dt className="text-xs uppercase tracking-wide text-ocean/55">Proof</dt>
                  <dd className="mt-0.5 text-ocean">
                    {booking.depositProofUrl ? (
                      <a
                        href={resolveMediaUrl(booking.depositProofUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        View proof
                      </a>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
              </dl>
              {booking.depositProofUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveMediaUrl(booking.depositProofUrl)}
                  alt="Deposit payment proof"
                  className="mt-4 h-40 w-auto max-w-full border border-ocean/15 object-contain"
                />
              )}
            </section>
          )}

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="border border-ocean/10 bg-white p-5">
              <h2 className="font-display text-2xl text-ocean">Plan & unit</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b border-ocean/10 pb-2">
                  <dt className="text-ocean/60">Plan</dt>
                  <dd className="text-right text-ocean">
                    <div>{plan?.name || booking.planId || '—'}</div>
                    {booking.planId && (
                      <div className="font-mono text-xs text-ocean/55">{booking.planId}</div>
                    )}
                    {plan?.planStatus && (
                      <div className="mt-0.5 text-xs text-ocean/55">Status: {plan.planStatus}</div>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-ocean/10 pb-2">
                  <dt className="text-ocean/60">Unit</dt>
                  <dd className="text-right text-ocean">
                    {suite?.id || booking.suiteId ? (
                      <Link
                        href={`/admin/units/${suite?.id || booking.suiteId}/plans`}
                        className="underline"
                      >
                        {suite?.id || booking.suiteId}
                      </Link>
                    ) : (
                      '—'
                    )}
                    {suite?.type && (
                      <div className="text-xs text-ocean/55">
                        {suite.type} · Floor {suite.floor} · {suite.view}
                      </div>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-ocean/10 pb-2">
                  <dt className="text-ocean/60">Booked at</dt>
                  <dd className="text-ocean">
                    {formatDateTime(booking.createdAt || booking.depositSubmittedAt || null)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-ocean/10 pb-2">
                  <dt className="text-ocean/60">Contract start</dt>
                  <dd className="text-ocean">{formatDate(booking.start)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-ocean/10 pb-2">
                  <dt className="text-ocean/60">Account holder</dt>
                  <dd className="text-right text-ocean">
                    <div>{investor?.name || booking.investorId || '—'}</div>
                    {investor?.email && (
                      <div className="text-xs text-ocean/55">{investor.email}</div>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-ocean/10 pb-2">
                  <dt className="text-ocean/60">Referrer</dt>
                  <dd className="text-right text-ocean">
                    {referrer || booking.referralCode ? (
                      <>
                        <div>{referrer?.name || booking.referralCode}</div>
                        <div className="text-xs text-ocean/55">
                          {[referrer?.referralCode || booking.referralCode, referrer?.email]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      </>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                {referralReward && (
                  <div className="flex justify-between gap-4 border-b border-ocean/10 pb-2">
                    <dt className="text-ocean/60">Referral reward</dt>
                    <dd className="text-right text-ocean">
                      <div>
                        {formatMoney(referralReward.totalIncentive)} ·{' '}
                        <span className="capitalize">{referralReward.status}</span>
                      </div>
                      <div className="text-xs text-ocean/55">
                        T1 {referralReward.tranche1Status} · T2 {referralReward.tranche2Status}
                      </div>
                      <Link href="/admin/referrals" className="text-xs font-semibold text-ocean underline">
                        Open ledger
                      </Link>
                    </dd>
                  </div>
                )}
                {summary.nextDue && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-ocean/60">Next due</dt>
                    <dd className="text-right text-ocean">
                      <div className="capitalize">{summary.nextDue.type}</div>
                      <div className="text-xs text-ocean/55">
                        {formatMoney(summary.nextDue.amount)} · {formatDate(summary.nextDue.dueDate)}
                      </div>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="border border-ocean/10 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="font-display text-2xl text-ocean">KYC snapshot</h2>
                {kycVerified ? (
                  <span className="border border-ocean/30 bg-ocean/5 px-2 py-0.5 text-xs text-ocean">
                    Verified
                  </span>
                ) : (
                  <span className="border border-gold/50 bg-gold/10 px-2 py-0.5 text-xs text-ocean">
                    Pending review
                  </span>
                )}
              </div>
              {!client ? (
                <p className="mt-4 text-sm text-ocean/65">No KYC submitted for this booking.</p>
              ) : (
                <div className="mt-4">
                  <p className="mb-3 text-sm text-ocean/70">
                    Add or correct identity details here — including profession and city, which appear on
                    booked catalog cards. NID and address stay private.
                  </p>
                  <KycEditor
                    bookingId={bookingId}
                    client={client}
                    variant="admin"
                    onSaved={(next) =>
                      setSummary((prev: any) => (prev ? { ...prev, client: next } : prev))
                    }
                  />
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ocean">Payment schedule</h2>
            <div className="mt-3 overflow-auto border border-ocean/10 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ocean/10 text-left text-ocean/70">
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Due</th>
                    <th className="p-3 font-medium">Amount</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((item) => (
                    <tr key={item.id} className="border-t border-ocean/10">
                      <td className="p-3 capitalize">{item.type}</td>
                      <td className="p-3">{formatDate(item.dueDate)}</td>
                      <td className="p-3">{formatMoney(item.amount)}</td>
                      <td className="p-3 capitalize">{item.status}</td>
                      <td className="p-3 font-mono text-xs text-ocean/60">{item.gatewayRef || '—'}</td>
                    </tr>
                  ))}
                  {schedule.length === 0 && (
                    <tr>
                      <td className="p-4 text-ocean/70" colSpan={5}>
                        No schedule items
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
