const fs = require('fs');
const p = 'app/(site)/[locale]/pricing/plans/[id]/page.tsx';
let s = fs.readFileSync(p, 'utf8');

const pairs = [
  ['>Total price<', ">{t('totalPrice')}<"],
  ['>Offer price<', ">{t('offerPrice')}<"],
  ['Paying more now ({quote.advanceDiscountPct}%)', "{t('payingMore', { pct: quote.advanceDiscountPct })}"],
  ['>You pay<', ">{t('youPay')}<"],
  ['>Downpayment<', ">{t('downpayment')}<"],
  [
    "{cadence === 'monthly' ? 'Monthly' : 'Quarterly'} installment × {installmentCount}",
    "cadence === 'monthly' ? t('monthlyInstallment', { count: installmentCount }) : t('quarterlyInstallment', { count: installmentCount })"
  ],
  ['No remaining installments on this plan.', "{t('noInstallments')}"],
  [
    '{quote?.upfrontPct ?? 10}% via cheque, cash/pay order, or transfer — confirmed by admin',
    "{t('dueTodayConfirm', { pct: quote?.upfrontPct ?? 10 })}"
  ],
  [
    'Verify your account email before submitting a booking.',
    "{t('verifyBanner')}"
  ],
  ['Verify email', "{t('verifyEmail')}"],
  ['Missing details: {kycMissing.map((key) => kycFieldLabels(t)[key]).join(\', \')}', "{t('missingDetails', { fields: kycMissing.map((key) => kycFieldLabels(t)[key]).join(', ') })}"],
  ["? 'Submitting...'", "? t('btnSubmitting')"],
  [": 'No longer available'", ": t('btnUnavailable')"],
  [": 'Verify email to continue'", ": t('btnVerifyContinue')"],
  [": 'Upload photographs to continue'", ": t('btnUploadPhotos')"],
  [": 'Add your details to continue'", ": t('btnAddDetails')"],
  [": 'Add a payment reference'", ": t('btnAddRef')"],
  [": 'Reserve this plan'", ": t('btnReserve')"],
  ['>Dashboard<', ">{t('dashboard')}<"],
  ['Contact sales', "{t('contactSales')}"],
  [
    "{showTools ? 'Hide' : 'Show'} payment tools & returns calculator",
    "{showTools ? t('hideTools') : t('showTools')}"
  ],
  ['Payment schedule', "{t('tabSchedule')}"],
  ['Returns calculator', "{t('tabReturns')}"],
  [
    'This table is the live quote for the payment plan selected in the sidebar. The sliders below are\n                  illustrative only and do not change the booking.',
    "{t('scheduleHint')}"
  ],
  ['Deposit (%)', "{t('depositPct')}"],
  ['Downpayment (%)', "{t('downPct')}"],
  ['>Cadence\n', ">{t('cadence')}\n"],
  ['>Monthly<', ">{t('monthly')}<"],
  ['>Quarterly<', ">{t('quarterly')}<"],
  ['>Type<', ">{t('colType')}<"],
  ['>Due<', ">{t('colDue')}<"],
  ['>Amount<', ">{t('colAmount')}<"],
  [
    'Preview of the first rows. Checkout uses booking 10% + downpayment 20% + 24-month{\' \'}\n                  {cadence} installments ({installmentCount} payments of about {formatMoney(installmentAmount)}).',
    "{t('schedulePreview', { cadence, count: installmentCount, amount: formatMoney(installmentAmount) })}"
  ],
  ['ADR (BDT)', "{t('adr')}"],
  ['Occupancy (0–1)', "{t('occupancy')}"],
  ['Operating cost (%)', "{t('operatingCost')}"],
  ['Rental uplift (%)', "{t('rentalUplift')}"],
  ['Illustrative annual net', "{t('illustrativeNet')}"],
  ['{rules.length} pricing rule(s) on file for this plan.', "{t('rulesOnFile', { count: rules.length })}"],
  ['>Continue<', ">{t('mobileContinue')}<"],
];

let hit = 0;
for (const [a, b] of pairs) {
  if (s.includes(a)) {
    s = s.split(a).join(b);
    hit++;
  } else console.warn('MISS', a.slice(0, 70));
}

// fix hide/show installment if still English
s = s.replace(
  /showScheduleOptions \|\| scheduleIsCustom\s*\?\s*'Hide installment options'\s*:\s*'Need smaller monthly payments\?'/,
  "showScheduleOptions || scheduleIsCustom ? t('hideInstallments') : t('needSmaller')"
);

// privacy note / reserve intro if leftover
s = s.replace(
  /Name, profession, and city are shown so you can see who already invested\. NID, phone, and\s+address stay private\./,
  "{t('privacyNote')}"
);
s = s.replace(
  /Pick how much to pay today, add your details, then send deposit proof\. We confirm the booking\s+when payment is received\./,
  "{t('reserveIntro')}"
);

// fix mangled share line if present
s = s.replace(
  /\{\/\* bad share \*\/\}|· \{t\('shareLine', \{ name: '', days: x\.daysPerMonth, price: formatMoney\(x\.price \|\| 0\) \}\)\.replace\(\/\^ · \/, ' · '\)\}/g,
  ''
);

fs.writeFileSync(p, s);
console.log('summary hit', hit);
