export type BrochureLocale = 'en' | 'bn';

export type BrochureCopy = {
  brand: string;
  tagline: string;
  headline: string;
  headlineAccent: string;
  sub: string;
  declaration: string;
  promoTitle: string;
  promoNone: string;
  promoOff: string;
  promoUntil: string;
  resortTitle: string;
  aboutBody: string;
  highlights: string[];
  amenitiesTitle: string;
  amenities: { title: string; desc: string }[];
  locationLabel: string;
  location: string;
  designTitle: string;
  designEmpty: string;
  suitesTitle: string;
  suitesEmpty: string;
  colUnit: string;
  colType: string;
  colView: string;
  colFloor: string;
  colSize: string;
  colShare: string;
  colPrice: string;
  colFrom: string;
  daysMo: string;
  returnsTitle: string;
  returnsIntro: string;
  sampleDays: string;
  colCategory: string;
  colLow: string;
  colHigh: string;
  returnsDisclaimer: string;
  buyTitle: string;
  buyBody: string;
  termsTitle: string;
  termsEmpty: string;
  faqTitle: string;
  faqEmpty: string;
  aboutTitle: string;
  companyTitle: string;
  companyIntro: string;
  contactTitle: string;
  phone: string;
  email: string;
  web: string;
  footerNote: string;
  pageOf: string;
};

const EN: BrochureCopy = {
  brand: 'Unitech Grand Sampan Resort',
  tagline: '64-room beachfront in Cox’s Bazar',
  headline: 'Own the beach.',
  headlineAccent: 'Earn from it.',
  sub: 'Fractional ownership and premium stays on Cox’s Bazar’s oceanfront.',
  declaration:
    'This brochure is for information only. Prices, promotions, and sample rental figures are illustrative and can change. They are not a prospectus, guarantee of income, or an offer to sell. Ownership follows a signed contract, KYC, and the published terms. Contact sales to confirm current availability.',
  promoTitle: 'Current promotions',
  promoNone: 'No limited-time promotion is running. Reserve from 10% today, or pay more now to save.',
  promoOff: '{pct}% off',
  promoUntil: 'Until {date}',
  resortTitle: 'The resort',
  aboutBody:
    'Unitech Grand Sampan Resort is a boutique beachfront development on Marine Drive, Innani, in the secured Rupayan Beach View compound. It blends hospitality and fractional ownership for premium stays and long-term stewardship.',
  highlights: [
    'Prime location with direct beach access',
    '64 suites, each with a private balcony',
    'Rooftop café designed for sunset dining',
    'Concierge and modern amenities in a compact luxury format'
  ],
  amenitiesTitle: 'Amenities',
  amenities: [
    { title: 'Private beach access', desc: 'Step onto Cox’s Bazar shoreline from the grounds.' },
    { title: 'Sea-facing balconies', desc: 'Every suite frames an ocean view.' },
    { title: '24/7 concierge', desc: 'Reservations, transfers, and daily requests.' },
    { title: 'Round-the-clock security', desc: 'Gated access and monitored grounds.' },
    { title: 'Daily housekeeping', desc: 'Five-star standard, year-round.' },
    { title: 'High-speed Wi-Fi', desc: 'Fibre across guest and owner areas.' },
    { title: 'Backup power', desc: 'Site-wide generator support.' },
    { title: 'On-site parking', desc: 'For owners and staying guests.' }
  ],
  locationLabel: 'Location',
  location: 'Marine Drive Road, Innani, Cox’s Bazar',
  designTitle: 'Design & layout',
  designEmpty: 'Layout drawings are published on grandsampanresort.com/design-layout.',
  suitesTitle: 'Available suites',
  suitesEmpty: 'No unsold shares in this snapshot. Check grandsampanresort.com/invest for live availability.',
  colUnit: 'Unit',
  colType: 'Type',
  colView: 'View',
  colFloor: 'Fl',
  colSize: 'Sq ft',
  colShare: 'Days/mo',
  colPrice: 'Price',
  colFrom: 'Reserve',
  daysMo: '{n}d',
  returnsTitle: 'Sample return projection',
  returnsIntro:
    'Illustrative annual net rent for a 5-day/month share at current site assumptions (occupancy band and operating cost). Not a forecast.',
  sampleDays: 'Sample share: 5 days per month',
  colCategory: 'Suite type',
  colLow: 'Lower occupancy',
  colHigh: 'Higher occupancy',
  returnsDisclaimer:
    'Actual earnings depend on occupancy, seasonality, ADR, fees, and taxes. Catalog cards use the same assumptions.',
  buyTitle: 'How to invest',
  buyBody:
    'Choose a suite share, reserve from 10% today by cheque, cash/pay order, or transfer, then complete KYC. Pay more now to reduce the total. Help me choose on the website suggests a plan from live prices.',
  termsTitle: 'Terms & conditions',
  termsEmpty: 'Full terms are at grandsampanresort.com/terms.',
  faqTitle: 'Frequently asked questions',
  faqEmpty: 'More answers are at grandsampanresort.com/faq.',
  aboutTitle: 'About',
  companyTitle: 'Unitech',
  companyIntro:
    'Unitech develops hospitality-led coastal projects with an emphasis on durability, guest experience, and long-term stewardship.',
  contactTitle: 'Contact',
  phone: '+880 1300-999750',
  email: 'admin@grandsampanresort.com',
  web: 'www.grandsampanresort.com',
  footerNote: 'Figures illustrative · see terms · www.grandsampanresort.com',
  pageOf: '{page}'
};

const BN: BrochureCopy = {
  brand: 'ইউনিটেক গ্র্যান্ড সাম্পান রিসোর্ট',
  tagline: 'কক্সবাজারে ৬৪-রুম সমুদ্রসৈকতের রিসোর্ট',
  headline: 'সৈকতের মালিক হোন।',
  headlineAccent: 'এ থেকে আয় করুন।',
  sub: 'কক্সবাজারের সমুদ্রতীরে ভগ্নাংশ মালিকানা ও প্রিমিয়াম থাকা।',
  declaration:
    'এই ব্রোশিওর শুধু তথ্যের জন্য। দাম, প্রমোশন ও নমুনা ভাড়া আয় উদাহরণমাত্র এবং বদলাতে পারে। এটি প্রসপেক্টাস, আয়ের নিশ্চয়তা বা বিক্রির প্রস্তাব নয়। মালিকানা স্বাক্ষরিত চুক্তি, কেওয়াইসি ও প্রকাশিত শর্তাবলী অনুসরণ করে। বর্তমান খালি জায়গা নিশ্চিত করতে সেলসে যোগাযোগ করুন।',
  promoTitle: 'চলমান প্রমোশন',
  promoNone: 'এখন কোনো সীমিত সময়ের প্রমোশন নেই। আজ ১০% দিয়ে রিজার্ভ করুন, অথবা এখন বেশি দিয়ে সাশ্রয় করুন।',
  promoOff: '{pct}% ছাড়',
  promoUntil: '{date} পর্যন্ত',
  resortTitle: 'রিসোর্ট',
  aboutBody:
    'ইউনিটেক গ্র্যান্ড সাম্পান রিসোর্ট ইনানীর মেরিন ড্রাইভে, রূপায়ণ বিচ ভিউ কম্পাউন্ডের সুরক্ষিত এলাকায় একটি বুটিক সমুদ্রতীরবর্তী উন্নয়ন। এটি আতিথেয়তা ও ভগ্নাংশ মালিকানা মিলিয়ে প্রিমিয়াম থাকা ও দীর্ঘমেয়াদি তত্ত্বাবধান দেয়।',
  highlights: [
    'সরাসরি সৈকত প্রবেশসহ প্রধান অবস্থান',
    '৬৪টি স্যুট, প্রতিটিতে প্রাইভেট বারান্দা',
    'সূর্যাস্তের ডাইনিংয়ের জন্য রুফটপ ক্যাফে',
    'কনসিয়ার্জ ও আধুনিক সুবিধাসহ কমপ্যাক্ট লাক্সারি'
  ],
  amenitiesTitle: 'সুবিধা',
  amenities: [
    { title: 'প্রাইভেট সৈকত প্রবেশ', desc: 'রিসোর্ট থেকে সরাসরি কক্সবাজারের সৈকতে নামুন।' },
    { title: 'সমুদ্রমুখী বারান্দা', desc: 'প্রতিটি স্যুট সমুদ্রের দৃশ্য ফ্রেম করে।' },
    { title: '২৪/৭ কনসিয়ার্জ', desc: 'রিজার্ভেশন, ট্রান্সফার ও দৈনন্দিন চাহিদা।' },
    { title: 'চব্বিশ ঘণ্টা নিরাপত্তা', desc: 'গেটেড প্রবেশ ও নজরদারি।' },
    { title: 'দৈনিক হাউসকিপিং', desc: 'সারা বছর পাঁচ-তারা মান।' },
    { title: 'হাই-স্পিড ওয়াই-ফাই', desc: 'গেস্ট ও মালিক এলাকায় ফাইবার।' },
    { title: 'ব্যাকআপ বিদ্যুৎ', desc: 'পূর্ণ সাইট জেনারেটর।' },
    { title: 'অন-সাইট পার্কিং', desc: 'মালিক ও অতিথির জন্য।' }
  ],
  locationLabel: 'অবস্থান',
  location: 'মেরিন ড্রাইভ রোড, ইনানী, কক্সবাজার',
  designTitle: 'ডিজাইন ও লেআউট',
  designEmpty: 'লেআউট অঙ্কন grandsampanresort.com/bn/design-layout-এ প্রকাশিত।',
  suitesTitle: 'ক্রয়যোগ্য স্যুট',
  suitesEmpty: 'এই স্ন্যাপশটে অবিক্রীত শেয়ার নেই। লাইভ খালি জায়গা grandsampanresort.com/bn/invest-এ দেখুন।',
  colUnit: 'ইউনিট',
  colType: 'টাইপ',
  colView: 'দৃশ্য',
  colFloor: 'তলা',
  colSize: 'বর্গফুট',
  colShare: 'দিন/মাস',
  colPrice: 'দাম',
  colFrom: 'রিজার্ভ',
  daysMo: '{n}দ',
  returnsTitle: 'নমুনা রিটার্ন প্রজেকশন',
  returnsIntro:
    'বর্তমান সাইট অনুমানে (অকুপেন্সি ব্যান্ড ও অপারেটিং খরচ) মাসে ৫ দিনের শেয়ারের উদাহরণ বার্ষিক নিট ভাড়া। পূর্বাভাস নয়।',
  sampleDays: 'নমুনা শেয়ার: মাসে ৫ দিন',
  colCategory: 'স্যুট টাইপ',
  colLow: 'নিম্ন অকুপেন্সি',
  colHigh: 'উচ্চ অকুপেন্সি',
  returnsDisclaimer:
    'প্রকৃত আয় অকুপেন্সি, সিজন, ADR, ফি ও ট্যাক্সের ওপর নির্ভর করে। ক্যাটালগ কার্ড একই অনুমান ব্যবহার করে।',
  buyTitle: 'কীভাবে বিনিয়োগ করবেন',
  buyBody:
    'স্যুট শেয়ার বেছে নিন, চেক/নগদ/ট্রান্সফারে আজ ১০% দিয়ে রিজার্ভ করুন, তারপর কেওয়াইসি সম্পন্ন করুন। এখন বেশি দিলে মোট কমে। সাইটের “বেছে নিতে সাহায্য করুন” লাইভ দাম থেকে প্ল্যান সাজায়।',
  termsTitle: 'শর্তাবলী',
  termsEmpty: 'পূর্ণ শর্তাবলী grandsampanresort.com/bn/terms-এ আছে।',
  faqTitle: 'সচরাচর জিজ্ঞাসা',
  faqEmpty: 'আরও উত্তর grandsampanresort.com/bn/faq-এ আছে।',
  aboutTitle: 'সম্পর্কে',
  companyTitle: 'ইউনিটেক',
  companyIntro:
    'ইউনিটেক স্থায়িত্ব, অতিথি অভিজ্ঞতা ও দীর্ঘমেয়াদি তত্ত্বাবধানকে গুরুত্ব দিয়ে উপকূলীয় আতিথেয়তা প্রকল্প গড়ে তোলে।',
  contactTitle: 'যোগাযোগ',
  phone: '+880 1300-999750',
  email: 'admin@grandsampanresort.com',
  web: 'www.grandsampanresort.com',
  footerNote: 'সংখ্যা উদাহরণমাত্র · শর্ত দেখুন · www.grandsampanresort.com',
  pageOf: '{page}'
};

export function brochureCopy(locale: string): BrochureCopy {
  return locale === 'bn' ? BN : EN;
}

export function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}
