const fs = require('fs');
const p = 'app/(site)/[locale]/pricing/plans/[id]/page.tsx';
let s = fs.readFileSync(p, 'utf8');

const pairs = [
  ['Booking submitted', "{t('confirmEyebrow')}"],
  ['Plan reserved', "{t('confirmTitle')}"],
  ["{plan?.name ? `Your ${plan.name} plan` : 'Your plan'}", "{plan?.name ? t('confirmYourPlanNamed', { name: plan.name }) : t('confirmYourPlan')}"],
  ["{suite?.id ? ` on suite ${suite.id}` : ''} is reserved. The booking will be completed after\n            our team confirms your first payment and reviews your details.\n            A confirmation email was sent to the address you entered; you will also receive an invoice when\n            the booking is completed.", "{suite?.id ? t('confirmOnSuite', { id: suite.id }) : ''}{t('confirmBody')}"],
  ['Booking reference', "{t('bookingRef')}"],
  ['Amount due today', "{t('amountDueToday')}"],
  ['Payment submitted', "{t('paymentSubmitted')}"],
  [' · Ref ', "{t('refLabel')}"],
  ['Status: awaiting admin confirmation of payment receipt and KYC verification.', "{t('awaitingAdmin')}"],
  ['Open owner portal', "{t('openPortal')}"],
  ['Browse more plans', "{t('browseMore')}"],
  ['Your details and payment reference were sent with this booking. Questions? ', "{t('confirmFooter')} "],
  ['Share plan', "{t('sharePlan')}"],
  ["{plan?.name || 'Plan Details'}", "{plan?.name || t('planDetailsFallback')}"],
  ["? `${plan.daysPerMonth} days each month · share held ${plan.lockIn ?? 36} months`\n              : 'Loading...'", "? t('planMeta', { days: plan.daysPerMonth, months: plan.lockIn ?? 36 })\n              : t('loading')"],
  ['Other shares on this suite', "{t('otherShares')}"],
  ["st === 'unsold' ? 'Available' : st === 'reserved' ? 'Reserved' : 'Booked'", "st === 'unsold' ? t('optionAvailable') : st === 'reserved' ? t('optionReserved') : t('optionBooked')"],
  ["{option.name || 'Share'} · {option.daysPerMonth} days/mo · {tag}", "{t('optionLine', { name: option.name || t('shareFallback'), days: option.daysPerMonth, tag })}"],
  ['statusLabel="Booked by"', 'statusLabel={t(\'bookedBy\')}'],
  ['This share has already been booked.', "{t('alreadyBooked')}"],
  ['This share is reserved while a booking is being completed.', "{t('reservedNotice')}"],
  ['{available ? \'Total price\' : \'Sold at\'}', "{available ? t('totalPrice') : t('soldAtLabel')}"],
  ['Due today', "{t('dueToday')}"],
  ['{quote?.upfrontPct ?? 10}% with the option selected on the right', "{t('dueTodayHint', { pct: quote?.upfrontPct ?? 10 })}"],
  ['>Status<', ">{t('status')}<"],
  ["{booked ? 'Booked' : 'Reserved'}", "{booked ? t('booked') : t('reserved')}"],
  ["{booked ? 'This share is no longer for sale' : 'Held while a booking completes'}", "{booked ? t('noLongerSale') : t('heldBooking')}"],
  ["['Entitlement', `${plan?.daysPerMonth || 0} days/mo`]", "[t('entitlement'), t('entitlementValue', { days: plan?.daysPerMonth || 0 })]"],
  ["['Suite', suite?.id || plan?.suiteId || '—']", "[t('suite'), suite?.id || plan?.suiteId || '—']"],
  ["{suite?.type || 'Suite'} · {suite?.view || '—'}", "{t('suiteMeta', { type: suite?.type || t('suite'), view: suite?.view || '—' })}"],
  ['Floor {suite?.floor ?? \'—\'} · {suite?.size ?? \'—\'} sq ft · Unit {suite?.id || plan?.suiteId || \'—\'}', "{t('suiteFloor', { floor: suite?.floor ?? '—', size: suite?.size ?? '—', unit: suite?.id || plan?.suiteId || '—' })}"],
];

let hit = 0;
for (const [a, b] of pairs) {
  if (s.includes(a)) {
    s = s.split(a).join(b);
    hit++;
  } else console.warn('MISS', a.slice(0, 80));
}
console.log('ui1 hit', hit);
fs.writeFileSync(p, s);
