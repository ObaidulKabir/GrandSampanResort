'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import Button from '@/components/Button';
import { useAppStore } from '@/store/appStore';

type Suite = { id: string; type: string; view?: string; floor?: number };

export default function BookingPage() {
  const user = useAppStore((s) => s.user);
  const hydrate = useAppStore((s) => s.hydrate);
  const [suites, setSuites] = useState<Suite[]>([]);
  const [suiteId, setSuiteId] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [availability, setAvailability] = useState<'unknown' | 'checking' | 'available' | 'unavailable'>('unknown');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<{ bookingId: string; amount: number; paid: boolean } | null>(null);

  useEffect(() => {
    hydrate();
    api('/suites').then((s) => {
      const list = Array.isArray(s) ? s : s?.suites ?? [];
      setSuites(list);
      if (list?.length) setSuiteId(list[0].id);
    });
  }, [hydrate]);

  const toIso = (d: string) => (d ? new Date(d).toISOString() : '');
  const datesValid = suiteId && start && end && new Date(start) < new Date(end);

  const checkAvailability = async () => {
    setError('');
    if (!datesValid) {
      setError('Choose a suite and a valid date range');
      return;
    }
    setAvailability('checking');
    const res = await api(
      `/booking/availability?suiteId=${encodeURIComponent(suiteId)}&start=${encodeURIComponent(toIso(start))}&end=${encodeURIComponent(toIso(end))}`
    );
    setAvailability(res?.available ? 'available' : 'unavailable');
  };

  const createBooking = async () => {
    setError('');
    if (!datesValid) {
      setError('Choose a suite and a valid date range');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api('/booking', {
        method: 'POST',
        body: JSON.stringify({
          suiteId,
          start: toIso(start),
          end: toIso(end),
          investorId: user?.id
        })
      });
      if (res?.ok && res.booking?.id) {
        let paid = false;
        const schedule = await api(`/booking/${res.booking.id}/schedule`);
        const item = (schedule?.schedule || [])[0];
        if (item) {
          const payRes = await api('/payments/pay', {
            method: 'POST',
            body: JSON.stringify({
              bookingId: res.booking.id,
              itemId: item.id,
              amount: item.amount,
              method: 'card'
            })
          });
          paid = !!payRes?.ok;
        }
        setConfirmation({ bookingId: res.booking.id, amount: res.booking.amountTotal || 0, paid });
      } else {
        setError('Those dates are unavailable for this suite — try different dates.');
        setAvailability('unavailable');
      }
    } catch {
      setError('Booking failed — please try again.');
    }
    setSubmitting(false);
  };

  if (confirmation) {
    const suite = suites.find((s) => s.id === suiteId);
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <div className="border border-gold/40 bg-white p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-gold">Booking confirmed</p>
          <h1 className="font-display mt-2 text-4xl text-ocean">See you at the beach</h1>
          <p className="mt-3 text-ocean/75">
            {suite ? `${suite.type} suite ${suite.id}` : `Suite ${suiteId}`} ·{' '}
            {start && new Date(start).toLocaleDateString()} → {end && new Date(end).toLocaleDateString()}
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="bg-pearl p-4">
              <div className="text-xs uppercase tracking-wide text-ocean/60">Booking reference</div>
              <div className="mt-1 font-mono text-sm text-ocean">{confirmation.bookingId}</div>
            </div>
            <div className="bg-pearl p-4">
              <div className="text-xs uppercase tracking-wide text-ocean/60">
                {confirmation.paid ? 'Paid' : 'Amount due'}
              </div>
              <div className="font-display mt-1 text-2xl text-ocean">৳ {confirmation.amount.toLocaleString()}</div>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/investor">
              <Button>View my bookings</Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmation(null);
                setAvailability('unknown');
                setStart('');
                setEnd('');
              }}
            >
              Book another stay
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 md:py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold">Reserve your stay</p>
      <h1 className="font-display mt-1 text-4xl text-ocean">Book a Stay</h1>
      <p className="mt-3 max-w-2xl text-ocean/75">
        Short beachfront stays at Grand Sampan. Looking for ownership instead?{' '}
        <Link className="font-semibold underline" href="/invest">
          Explore investment plans
        </Link>
        .
      </p>

      {error && <div className="mt-5 border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <div className="mt-6 space-y-5 border border-ocean/10 bg-white p-6 md:p-8">
        <div className="grid gap-5 md:grid-cols-3">
          <label className="block text-sm font-medium text-ocean">
            Suite
            <select className="field mt-1" value={suiteId} onChange={(e) => { setSuiteId(e.target.value); setAvailability('unknown'); }}>
              {suites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} · {s.type}
                  {s.view ? ` · ${s.view} view` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-ocean">
            Check-in
            <input
              className="field mt-1"
              type="date"
              value={start}
              onChange={(e) => { setStart(e.target.value); setAvailability('unknown'); }}
            />
          </label>
          <label className="block text-sm font-medium text-ocean">
            Check-out
            <input
              className="field mt-1"
              type="date"
              value={end}
              onChange={(e) => { setEnd(e.target.value); setAvailability('unknown'); }}
            />
          </label>
        </div>

        {availability === 'available' && (
          <div className="border border-gold/40 bg-gold/10 p-3 text-sm text-ocean">
            These dates are available — confirm below to secure them.
          </div>
        )}
        {availability === 'unavailable' && (
          <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Not available for the selected dates. Try another range or suite.
          </div>
        )}

        <div className="flex flex-wrap gap-3 border-t border-ocean/10 pt-5">
          <Button variant="outline" onClick={checkAvailability} disabled={availability === 'checking'}>
            {availability === 'checking' ? 'Checking...' : 'Check availability'}
          </Button>
          <Button onClick={createBooking} disabled={submitting}>
            {submitting ? 'Booking...' : 'Confirm booking'}
          </Button>
        </div>
        {!user?.id && (
          <p className="text-sm text-ocean/60">
            <Link href="/auth/login?next=/booking" className="underline">
              Sign in
            </Link>{' '}
            to keep this booking in your account.
          </p>
        )}
      </div>
    </main>
  );
}
