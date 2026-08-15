'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import Button from '@/components/Button';
import { useAppStore } from '@/store/appStore';

type Suite = { id: string; type: string; view?: string; floor?: number };

export default function BookingPage() {
  const t = useTranslations('booking');
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
      setError(t('errorDates'));
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
      setError(t('errorDates'));
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
        setError(t('errorUnavailable'));
        setAvailability('unavailable');
      }
    } catch {
      setError(t('errorFailed'));
    }
    setSubmitting(false);
  };

  if (confirmation) {
    const suite = suites.find((s) => s.id === suiteId);
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-24">
        <div className="border border-gold/40 bg-white p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-gold">{t('confirmedEyebrow')}</p>
          <h1 className="font-display mt-2 text-3xl text-ocean md:text-4xl">{t('confirmedTitle')}</h1>
          <p className="mt-3 text-ocean/75">
            {suite ? t('suiteLine', { type: suite.type, id: suite.id }) : t('suiteFallback', { id: suiteId })} ·{' '}
            {start && formatDate(start)} → {end && formatDate(end)}
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="bg-pearl p-4">
              <div className="text-xs uppercase tracking-wide text-ocean/60">{t('bookingRef')}</div>
              <div className="mt-1 font-mono text-sm text-ocean">{confirmation.bookingId}</div>
            </div>
            <div className="bg-pearl p-4">
              <div className="text-xs uppercase tracking-wide text-ocean/60">
                {confirmation.paid ? t('paid') : t('amountDue')}
              </div>
              <div className="font-display mt-1 text-2xl text-ocean">{formatMoney(confirmation.amount)}</div>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/investor" className="sm:inline-flex">
              <Button className="w-full sm:w-auto">{t('viewBookings')}</Button>
            </Link>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setConfirmation(null);
                setAvailability('unknown');
                setStart('');
                setEnd('');
              }}
            >
              {t('bookAnother')}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold">{t('eyebrow')}</p>
      <h1 className="font-display mt-1 text-3xl text-ocean md:text-4xl">{t('title')}</h1>
      <p className="mt-3 max-w-2xl text-ocean/75">
        {t('intro')}{' '}
        <Link className="font-semibold underline" href="/invest">
          {t('exploreInvest')}
        </Link>
        .
      </p>

      {error && <div className="mt-5 border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <div className="mt-6 space-y-5 border border-ocean/10 bg-white p-4 sm:p-6 md:p-8">
        <div className="grid gap-5 md:grid-cols-3">
          <label className="block text-sm font-medium text-ocean">
            {t('suite')}
            <select className="field mt-1" value={suiteId} onChange={(e) => { setSuiteId(e.target.value); setAvailability('unknown'); }}>
              {suites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} · {s.type}
                  {s.view ? t('viewSuffix', { view: s.view }) : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-ocean">
            {t('checkIn')}
            <input
              className="field mt-1"
              type="date"
              value={start}
              onChange={(e) => { setStart(e.target.value); setAvailability('unknown'); }}
            />
          </label>
          <label className="block text-sm font-medium text-ocean">
            {t('checkOut')}
            <input
              className="field mt-1"
              type="date"
              value={end}
              onChange={(e) => { setEnd(e.target.value); setAvailability('unknown'); }}
            />
          </label>
        </div>

        {availability === 'available' && (
          <div className="border border-gold/40 bg-gold/10 p-3 text-sm text-ocean">{t('datesAvailable')}</div>
        )}
        {availability === 'unavailable' && (
          <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{t('datesUnavailable')}</div>
        )}

        <div className="flex flex-col gap-3 border-t border-ocean/10 pt-5 sm:flex-row sm:flex-wrap">
          <Button variant="outline" className="w-full sm:w-auto" onClick={checkAvailability} disabled={availability === 'checking'}>
            {availability === 'checking' ? t('checking') : t('checkAvailability')}
          </Button>
          <Button className="w-full sm:w-auto" onClick={createBooking} disabled={submitting}>
            {submitting ? t('booking') : t('confirm')}
          </Button>
        </div>
        {!user?.id && (
          <p className="text-sm text-ocean/60">
            <Link href="/auth/login?next=/booking" className="underline">
              {t('signIn')}
            </Link>
            {t('signInHint')}
          </p>
        )}
      </div>
    </main>
  );
}
