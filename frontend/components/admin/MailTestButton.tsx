'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import Button from '@/components/Button';

export default function MailTestButton() {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function sendTest() {
    setBusy(true);
    setStatus('');
    try {
      const res = await api('/mail/test', { method: 'POST', body: JSON.stringify({}) });
      if (res?.ok) {
        setStatus(`Test email sent to ${res.to}. Check inbox/spam.`);
      } else if (res?.error === 'smtp_not_configured') {
        setStatus('SMTP is not configured on the server (.env SMTP_*).');
      } else {
        setStatus(res?.detail || res?.error || 'Send failed');
      }
    } catch {
      setStatus('Send failed');
    }
    setBusy(false);
  }

  return (
    <div className="mt-10 border border-ocean/10 bg-white p-5">
      <h2 className="font-display text-xl text-ocean">Email notifications</h2>
      <p className="mt-2 text-sm text-ocean/70">
        Booking emails (submit, deposit, KYC, completion + invoice, rejection) go out via Zoho SMTP.
        Use this to verify the live mailer.
      </p>
      <div className="mt-4">
        <Button onClick={sendTest} disabled={busy}>
          {busy ? 'Sending…' : 'Send test email'}
        </Button>
      </div>
      {status && <p className="mt-3 text-sm text-ocean/80">{status}</p>}
    </div>
  );
}
