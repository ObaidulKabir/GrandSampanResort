export type ConciergeLink = { href: string; label: string };
export type ConciergeReply = { text: string; links?: ConciergeLink[] };

export function conciergeReply(input: string): ConciergeReply {
  const q = input.toLowerCase();
  if (q.includes('location') || q.includes('where')) {
    return { text: "We're on Marine Drive Road, Rupayan Beach View Innani, Cox's Bazar." };
  }
  if (
    q.includes('discount') ||
    q.includes('how much') ||
    q.includes('payment') ||
    q.includes('instal') ||
    q.includes('advisor') ||
    q.includes('choose') ||
    q.includes('budget')
  ) {
    return {
      text: 'You can reserve from 10% today, or pay more now to save. Tell us what you can pay today and each month — we’ll suggest a plan.',
      links: [
        { href: '/invest/advisor', label: 'Help me choose' },
        { href: '/invest', label: 'Browse suites' }
      ]
    };
  }
  if (q.includes('plan') || q.includes('invest') || q.includes('buy') || q.includes('suite share')) {
    return {
      text: 'Live share plans are listed with the amount needed to reserve today. Open a suite to pick how much you pay now.',
      links: [
        { href: '/invest', label: 'See available plans' },
        { href: '/invest/advisor', label: 'Help me choose' }
      ]
    };
  }
  if (q.includes('reserve') || q.includes('book') || q.includes('kyc') || q.includes('deposit')) {
    return {
      text: 'To reserve: choose a suite, pick how much to pay today, add your details and photos, then send the first payment by cheque, cash, or transfer. We confirm once it arrives.',
      links: [{ href: '/invest', label: 'Start with a suite' }]
    };
  }
  if (q.includes('contact') || q.includes('support') || q.includes('phone') || q.includes('email')) {
    return { text: 'Email info@grandsampan.com or call +880 17 0000 0000 — we’ll help you from there.' };
  }
  if (q.includes('terms')) {
    return {
      text: 'Our terms are on the site if you’d like to read them before reserving.',
      links: [{ href: '/terms', label: 'Terms & conditions' }]
    };
  }
  if (q.includes('faq')) {
    return { text: 'Common questions are in the footer FAQ. You can also ask me here.' };
  }
  if (q.includes('site visit') || q.includes('visit')) {
    return { text: 'Happy to arrange a site visit. Share a preferred date and time and we’ll confirm what’s free.' };
  }
  if (q.includes('availability') || q.includes('stay')) {
    return {
      text: 'For a holiday stay, check dates on Book a Stay. For ownership, availability is shown on each share plan.',
      links: [{ href: '/invest', label: 'See share plans' }]
    };
  }
  if (q.includes('suite')) {
    return {
      text: 'Suites come in Standard, Deluxe, and Premium, with sea or hill views. Each share is a set number of days per month.'
    };
  }
  return {
    text: 'I can help you browse suites, estimate what to pay today, or point you to the team.',
    links: [
      { href: '/invest', label: 'Browse suites' },
      { href: '/invest/advisor', label: 'Help me choose' }
    ]
  };
}

export const CONCIERGE_QUICK = [
  { label: 'Help me choose', prompt: 'Help me choose a payment plan' },
  { label: 'Browse suites', prompt: 'Show me investment plans' },
  { label: 'How to reserve', prompt: 'How do I reserve a suite?' }
];
