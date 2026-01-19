'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Button from '@/components/Button';

type Suite = { id: string; type: string };

export default function BookingPage() {
  const [suites, setSuites] = useState<Suite[]>([]);
  const [suiteId, setSuiteId] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [availability, setAvailability] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);

  useEffect(() => {
    api('/suites').then((s) => {
      setSuites(s);
      if (s?.length) setSuiteId(s[0].id);
    });
  }, []);

  const checkAvailability = async () => {
    setAvailability('Checking...');
    const res = await api(`/booking/availability?suiteId=${suiteId}&start=${start}&end=${end}`);
    setAvailability(res?.available ? 'Available' : 'Not available');
  };

  const createBooking = async () => {
    setBookingStatus('Submitting...');
    const res = await api('/booking', { method: 'POST', body: JSON.stringify({ suiteId, start, end }) });
    setBookingStatus(res?.ok ? 'Booked' : 'Conflict');
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-['Playfair Display'] text-4xl text-ocean">Book a Stay</h1>
      <p className="mt-3 text-ocean/80">
        Select dates and room category. Payment options: bKash, Nagad, Card, Bank transfer.
      </p>
      <div className="mt-8 rounded-lg border border-gold/30 bg-white p-6 space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-ocean">Suite</span>
            <select className="mt-2 w-full rounded border p-3" value={suiteId} onChange={(e) => setSuiteId(e.target.value)}>
              {suites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} • {s.type}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-ocean">Start</span>
            <input className="mt-2 w-full rounded border p-3" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-ocean">End</span>
            <input className="mt-2 w-full rounded border p-3" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
        <div className="flex gap-3">
          <Button onClick={checkAvailability}>Check Availability</Button>
          <Button variant="outline" onClick={createBooking}>Confirm Booking</Button>
        </div>
        {availability && <p className="text-ocean/70">{availability}</p>}
        {bookingStatus && <p className="text-ocean/70">{bookingStatus}</p>}
      </div>
    </main>
  );
}
