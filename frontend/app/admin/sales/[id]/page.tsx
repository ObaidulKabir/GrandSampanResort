'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { resolveMediaUrl } from '@/lib/media';
import Button from '@/components/Button';

type ScheduleItem = {
  id: string;
  type: string;
  dueDate: string;
  amount: number;
  status: string;
  gatewayRef?: string | null;
};

export default function AdminBookingDetailPage({ params }: { params: { id: string } }) {
  const bookingId = params.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    async function load() {
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
    }
    load();
  }, [bookingId]);

  const booking = summary?.booking;
  const client = summary?.client;
  const suite = summary?.suite;
  const plan = summary?.plan;
  const investor = summary?.investor;

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
      {loading && <p className="mt-6 text-ocean/70">Loading booking…</p>}

      {!loading && booking && (
        <div className="mt-8 space-y-8">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Status', String(booking.status || '—')],
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
              <h2 className="font-display text-2xl text-ocean">KYC snapshot</h2>
              {!client ? (
                <p className="mt-4 text-sm text-ocean/65">No KYC submitted for this booking.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap gap-4">
                    {client.picUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveMediaUrl(client.picUrl)}
                        alt="Buyer photograph"
                        className="h-24 w-24 border border-ocean/15 object-cover"
                      />
                    )}
                    {client.nomineePicUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveMediaUrl(client.nomineePicUrl)}
                        alt="Nominee photograph"
                        className="h-24 w-24 border border-ocean/15 object-cover"
                      />
                    )}
                  </div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    {[
                      ['Name', client.name],
                      ['Father / husband', client.fatherName],
                      ['NID', client.nid],
                      ['Date of birth', client.dob],
                      ['Contact', client.contact],
                      ['Email', client.email],
                      ['Present address', client.address],
                      ['Permanent address', client.permanentAddress],
                      ['Nominee', client.nomineeName],
                      ['Nominee NID', client.nomineeNid]
                    ].map(([label, value]) => (
                      <div key={label} className="border-b border-ocean/10 pb-2">
                        <dt className="text-xs uppercase tracking-wide text-ocean/55">{label}</dt>
                        <dd className="mt-0.5 text-ocean">{value || '—'}</dd>
                      </div>
                    ))}
                  </dl>
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
