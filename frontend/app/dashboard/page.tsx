'use client';
import React, { useState } from 'react';
export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-['Playfair Display'] text-4xl text-ocean">Investor Dashboard</h1>
      <div className="mt-8 grid md:grid-cols-3 gap-6">
        {['My Suites / Shares', 'My Stay Days', 'My Rented Days', 'My Earnings', 'Statements', 'Booking Calendar', 'Request Stay', 'Withdraw Earnings'].map(
          (item) => (
            <div key={item} className="rounded-lg border border-gold/30 bg-white p-4">
              <span className="text-ocean">{item}</span>
            </div>
          )
        )}
        <PaymentScheduleWidget />
      </div>
    </main>
  );
}

function PaymentScheduleWidget() {
  const [bookingId, setBookingId] = useState('');
  const [items, setItems] = useState<any[]>([]);
  async function fetchSchedule() {
    const res = await fetch(`http://localhost:4000/booking/${bookingId}/schedule`);
    const json = await res.json();
    setItems(json?.schedule ?? []);
  }
  return (
    <div className="rounded-lg border border-gold/30 bg-white p-4 md:col-span-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-sm text-ocean">Booking ID</label>
          <input
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            className="mt-1 w-full rounded border border-ocean/20 px-2 py-1"
            placeholder="B-xxxxxx"
          />
        </div>
        <button onClick={fetchSchedule} className="rounded bg-ocean px-3 py-2 text-white">
          Load Schedule
        </button>
      </div>
      <div className="mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-ocean">
              <th className="text-left">Type</th>
              <th className="text-left">Due</th>
              <th className="text-left">Amount (BDT)</th>
              <th className="text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t border-ocean/10">
                <td>{i.type}</td>
                <td>{new Date(i.dueDate).toLocaleDateString()}</td>
                <td>৳ {i.amount}</td>
                <td>{i.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

