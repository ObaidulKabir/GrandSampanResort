const fs = require('fs');
const p = 'app/(site)/[locale]/pricing/plans/[id]/page.tsx';
let s = fs.readFileSync(p, 'utf8');

const pairs = [
  ["{booked ? 'Already booked' : 'Reserved'}", "{booked ? t('asideBooked') : t('asideReserved')}"],
  ["{booked ? 'This share is taken' : 'Booking in progress'}", "{booked ? t('asideTaken') : t('asideInProgress')}"],
  ['Held while another buyer completes payment and identity checks.', "{t('heldOtherBuyer')}"],
  ['Sold at {formatMoney(plan?.price || 0)}', "{t('soldAt', { amount: formatMoney(plan?.price || 0) })}"],
  ['Other shares still available on this suite', "{t('otherAvailable')}"],
  ["{x.name || 'Share'}", "{x.name || t('shareFallback')}"],
  ['· {x.daysPerMonth} days/mo · {formatMoney(x.price || 0)}', "· {x.daysPerMonth} {t('entitlementValue', { days: x.daysPerMonth }).replace(String(x.daysPerMonth)+' ','')} · {formatMoney(x.price || 0)}"],
  ['Browse available shares', "{t('browseAvailable')}"],
  [
    'Name, profession, and city are shown so you can see who already invested. NID, phone, and\n                address stay private.',
    "{t('privacyNote')}"
  ],
  ['Reserve this suite', "{t('reserveTitle')}"],
  [
    'Pick how much to pay today, add your details, then send deposit proof. We confirm the booking\n            when payment is received.',
    "{t('reserveIntro')}"
  ],
  ['Not sure which option fits?', "{t('notSure')}"],
  ['Help me choose', "{t('helpChoose')}"],
  ['1. How much will you pay today?', "{t('step1')}"],
  ['Pay more now to save on the total.', "{t('step1Hint')}"],
  ['Save {saveLabel}', "{t('saveLabel', { pct: saveLabel })}"],
  ['Lowest today', "{t('lowestToday')}"],
  ['Today {formatMoney(due)}', "{t('todayAmount', { amount: formatMoney(due) })}"],
  ['Total {formatMoney(net)}', "{t('totalAmount', { amount: formatMoney(net) })}"],
  ["{save > 0 ? <span className=\"text-gold\"> · save {formatMoney(save)}</span> : null}", "{save > 0 ? <span className=\"text-gold\">{t('saveAmount', { amount: formatMoney(save) })}</span> : null}"],
  ["? 'Hide installment options'\n                    : 'Need smaller monthly payments?'", "? t('hideInstallments')\n                    : t('needSmaller')"],
  ['How long to finish paying', "{t('howLong')}"],
  ['aria-label="Installment length"', "aria-label={t('installmentLength')}"],
  ['{n} months', "{t('months', { n })}"],
  ['How often you pay', "{t('howOften')}"],
  ['aria-label="Installment cadence"', "aria-label={t('installmentCadence')}"],
  ["label: 'Every month'", "label: t('everyMonth')"],
  ["label: 'Every 3 months'", "label: t('every3Months')"],
  ["hint: `${installmentMonths} payments`", "hint: t('paymentsCount', { count: installmentMonths })"],
  ["hint: `${Math.ceil(installmentMonths / 3)} payments`", "hint: t('paymentsCount', { count: Math.ceil(installmentMonths / 3) })"],
  ['When do your suite days start?', "{t('startDays')}"],
  ['2. Your details', "{t('step2')}"],
];

let hit = 0;
for (const [a, b] of pairs) {
  if (s.includes(a)) {
    s = s.split(a).join(b);
    hit++;
  } else console.warn('MISS', a.slice(0, 70));
}
console.log('reserve hit', hit);

// Fix the bad share line replacement if applied - simplify
s = s.replace(
  /· \{x\.daysPerMonth\} \{t\('entitlementValue', \{ days: x\.daysPerMonth \}\)\.replace\(String\(x\.daysPerMonth\)\+' ',''\)\} · \{formatMoney\(x\.price \|\| 0\)\}/,
  "· {t('shareLine', { name: '', days: x.daysPerMonth, price: formatMoney(x.price || 0) }).replace(/^ · /, ' · ')}"
);

fs.writeFileSync(p, s);
