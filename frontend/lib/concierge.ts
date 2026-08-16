export type ConciergeLink = { href: string; labelKey: string };
export type ConciergeIntent =
  | 'location'
  | 'payment'
  | 'plans'
  | 'reserve'
  | 'contact'
  | 'terms'
  | 'faq'
  | 'visit'
  | 'availability'
  | 'suite'
  | 'returns'
  | 'fallback';

export type ConciergeMatch = {
  intent: ConciergeIntent;
  linkKeys?: ConciergeLink[];
};

type Locale = 'en' | 'bn';

const INTENT_KEYWORDS: Record<ConciergeIntent, Record<Locale, string[]>> = {
  location: {
    en: ['location', 'where', 'address', 'map'],
    bn: ['কোথায়', 'কোথায়', 'ঠিকানা', 'লোকেশন', 'কথায়', 'kothay', 'thikana', 'location', 'where']
  },
  payment: {
    en: ['discount', 'how much', 'payment', 'instal', 'advisor', 'choose', 'budget'],
    bn: ['ছাড়', 'ডিসকাউন্ট', 'কত', 'দাম', 'পেমেন্ট', 'কিস্তি', 'বাজেট', 'পরামর্শ', 'dam', 'kisti', 'budget', 'discount', 'payment', 'choose', 'advisor']
  },
  plans: {
    en: ['plan', 'invest', 'buy', 'suite share'],
    bn: ['প্ল্যান', 'বিনিয়োগ', 'কিন', 'শেয়ার', 'plan', 'invest', 'buy']
  },
  reserve: {
    en: ['reserve', 'book', 'kyc', 'deposit'],
    bn: ['রিজার্ভ', 'সংরক্ষণ', 'বুক', 'ডিপোজিট', 'জমা', 'কেওয়াইসি', 'reserve', 'book', 'deposit', 'kyc']
  },
  contact: {
    en: ['contact', 'support', 'phone', 'email', 'call'],
    bn: ['যোগাযোগ', 'সাপোর্ট', 'ফোন', 'ইমেইল', 'কল', 'contact', 'support', 'phone', 'email']
  },
  terms: {
    en: ['terms'],
    bn: ['শর্ত', 'টার্মস', 'terms']
  },
  faq: {
    en: ['faq', 'question'],
    bn: ['প্রশ্ন', 'জিজ্ঞাসা', 'faq']
  },
  visit: {
    en: ['site visit', 'visit'],
    bn: ['সাইট ভিজিট', 'দেখতে', 'ভিজিট', 'visit']
  },
  availability: {
    en: ['availability', 'stay', 'holiday'],
    bn: ['খালি', 'থাকা', 'হলিডে', 'stay', 'availability']
  },
  suite: {
    en: ['suite', 'room', 'deluxe', 'premium'],
    bn: ['স্যুট', 'রুম', 'ডিলাক্স', 'প্রিমিয়াম', 'suite', 'room']
  },
  returns: {
    en: ['return', 'income', 'occupancy', 'rental', 'calculator'],
    bn: ['আয়', 'রিটার্ন', 'ভাড়া', 'অকুপেন্সি', 'ক্যালকুলেটর', 'return', 'income', 'rent', 'calculator']
  },
  fallback: { en: [], bn: [] }
};

const INTENT_LINKS: Partial<Record<ConciergeIntent, ConciergeLink[]>> = {
  payment: [
    { href: '/invest/advisor', labelKey: 'linkHelpChoose' },
    { href: '/invest', labelKey: 'linkBrowseSuites' }
  ],
  plans: [
    { href: '/invest', labelKey: 'linkSeePlans' },
    { href: '/invest/advisor', labelKey: 'linkHelpChoose' }
  ],
  returns: [{ href: '/returns-income', labelKey: 'linkReturnsCalculator' }],
  reserve: [{ href: '/invest', labelKey: 'linkStartSuite' }],
  terms: [{ href: '/terms', labelKey: 'linkTerms' }],
  availability: [{ href: '/invest', labelKey: 'linkSeePlans' }],
  fallback: [
    { href: '/invest', labelKey: 'linkBrowseSuites' },
    { href: '/invest/advisor', labelKey: 'linkHelpChoose' }
  ]
};

function normalize(input: string) {
  return input.toLowerCase().normalize('NFC');
}

export function matchConciergeIntent(input: string, locale: Locale = 'en'): ConciergeIntent {
  const q = normalize(input);
  const order: ConciergeIntent[] = [
    'location',
    'payment',
    'plans',
    'reserve',
    'contact',
    'terms',
    'faq',
    'visit',
    'availability',
    'returns',
    'suite'
  ];
  for (const intent of order) {
    const keywords = [
      ...INTENT_KEYWORDS[intent].en,
      ...(locale === 'bn' ? INTENT_KEYWORDS[intent].bn : [])
    ];
    if (keywords.some((k) => q.includes(normalize(k)))) return intent;
  }
  return 'fallback';
}

export function conciergeMatch(input: string, locale: Locale = 'en'): ConciergeMatch {
  const intent = matchConciergeIntent(input, locale);
  return { intent, linkKeys: INTENT_LINKS[intent] };
}

/** @deprecated Prefer conciergeMatch + message catalog. Kept for tests with English defaults. */
export function conciergeReply(input: string): { text: string; links?: { href: string; label: string }[] } {
  const { intent, linkKeys } = conciergeMatch(input, 'en');
  const texts: Record<ConciergeIntent, string> = {
    location: "We're on Marine Drive Road, Rupayan Beach View Innani, Cox's Bazar.",
    payment:
      'You can reserve from 10% today, or pay more now to save. Tell us what you can pay today and each month — we’ll suggest a plan.',
    plans: 'Live share plans are listed with the amount needed to reserve today. Open a suite to pick how much you pay now.',
    reserve:
      'To reserve: choose a suite, pick how much to pay today, add your details and photos, then send the first payment by cheque, cash, or transfer. We confirm once it arrives.',
    contact: 'Email info@grandsampan.com or call +880 17 0000 0000 — we’ll help you from there.',
    terms: 'Our terms are on the site if you’d like to read them before reserving.',
    faq: 'Common questions are in the footer FAQ. You can also ask me here.',
    visit: 'Happy to arrange a site visit. Share a preferred date and time and we’ll confirm what’s free.',
    availability:
      'For a holiday stay, check dates on Book a Stay. For ownership, availability is shown on each share plan.',
    suite: 'Suites come in Standard, Deluxe, and Premium, with sea or hill views. Each share is a set number of days per month.',
    returns:
      'Use the returns calculator to estimate rental income from occupancy and daily rates. Figures follow the same assumptions shown on live plans.',
    fallback: 'I can help you browse suites, estimate what to pay today, or point you to the team.'
  };
  const labelMap: Record<string, string> = {
    linkHelpChoose: 'Help me choose',
    linkBrowseSuites: 'Browse suites',
    linkSeePlans: 'See available plans',
    linkStartSuite: 'Start with a suite',
    linkTerms: 'Terms & conditions',
    linkReturnsCalculator: 'Returns calculator'
  };
  return {
    text: texts[intent],
    links: linkKeys?.map((l) => ({ href: l.href, label: labelMap[l.labelKey] || l.labelKey }))
  };
}

export const CONCIERGE_QUICK = [
  { labelKey: 'quickHelpChoose', promptKey: 'promptHelpChoose', promptEn: 'Help me choose a payment plan' },
  { labelKey: 'quickBrowse', promptKey: 'promptBrowse', promptEn: 'Show me investment plans' },
  { labelKey: 'quickReserve', promptKey: 'promptReserve', promptEn: 'How do I reserve a suite?' }
] as const;
