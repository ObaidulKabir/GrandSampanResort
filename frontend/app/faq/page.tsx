export default function FAQPage() {
  const faqs = [
    {
      q: 'How does fractional ownership work?',
      a: 'You purchase a share plan that entitles you to usage days per month and potential revenue share per policy.'
    },
    {
      q: 'Can I transfer or resell my plan?',
      a: 'Transfers and resales are subject to company review and compliance; please contact support for procedures.'
    },
    {
      q: 'What payment schedule applies?',
      a: 'Typical schedules include deposit, downpayment and monthly installments. Due dates appear in your investor dashboard.'
    },
    {
      q: 'Where is the resort located?',
      a: 'Marine Dirve Road, Rupayan Beach View Innani, Cox\'s Bazar.'
    },
    {
      q: 'What amenities are available in the compound?',
      a: 'As part of Rupayan Beach View: secured boundary, CC surveillance, amusement and water parks, mall, mosque, children play area, boat club, beach security, restaurant, pickup/drop-off and hospital.'
    }
  ];
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-['Playfair Display'] text-4xl text-ocean">Frequently Asked Questions</h1>
      <div className="mt-8 space-y-6">
        {faqs.map((item, i) => (
          <div key={i} className="rounded-lg border border-gold/30 bg-white p-5">
            <div className="text-xl text-ocean">{item.q}</div>
            <div className="mt-2 text-ocean/80">{item.a}</div>
          </div>
        ))}
      </div>
    </main>
  );
}

