const fs = require('fs');
const p = 'app/(site)/[locale]/invest/page.tsx';
let s = fs.readFileSync(p, 'utf8');

const pairs = [
  [
    "const statusLabel = sold ? 'Booked' : planStatusKey(p) === 'reserved' ? 'Reserved' : 'Available';",
    "const statusLabel = sold ? t('statusBooked') : planStatusKey(p) === 'reserved' ? t('statusReserved') : t('statusAvailable');"
  ],
  ["{suite.type ?? 'Suite'} · {humanView(suite.view)} · {p.daysPerMonth} days/mo", "{t('metaDays', { type: suite.type ?? t('suiteFallback'), view: humanView(suite.view, t), days: p.daysPerMonth })}"],
  ["{p.suiteId ?? '—'} · Floor {suite.floor ?? '—'}", "{t('metaFloor', { suiteId: p.suiteId ?? '—', floor: suite.floor ?? '—' })}"],
  ["{suite.size ? ` · ${suite.size} sq ft` : ''}", "{suite.size ? t('metaSize', { size: suite.size }) : ''}"],
  ['>Total<', ">{t('total')}<"],
  ['Today · {standardPct}%', "{t('todayPct', { pct: standardPct })}"],
  ['statusLabel="Booked by"', "statusLabel={t('bookedBy')}"],
  ['This share has been booked.', "{t('shareBooked')}"],
  ['Sold at {formatMoney(total)}', "{t('soldAt', { amount: formatMoney(total) })}"],
  ['Held while a booking completes', "{t('heldBooking')}"],
  ['{p.discountPct}% off until {formatDate(p.promoEndsAt)}', "{t('promoOff', { pct: p.discountPct, date: formatDate(p.promoEndsAt) })}"],
  ['Pay in full, save {Number(full.offeredDiscountPct).toFixed(1)}%', "{t('payFullSave', { pct: Number(full.offeredDiscountPct).toFixed(1) })}"],
  ['Rent {formatMoney(returns.low, 0)}–{formatMoney(returns.high, 0)}/yr', "{t('rentRange', { low: formatMoney(returns.low, 0), high: formatMoney(returns.high, 0) })}"],
  ['Reserve from {formatMoney(bookingAmount)}', "{t('reserveFrom', { amount: formatMoney(bookingAmount) })}"],
  ["{owner ? 'See who booked' : 'View booked plan'}", "owner ? t('seeWhoBooked') : t('viewBookedPlan')"],
  ['>Reserved<', ">{t('statusReserved')}<"],
  [
    "? 'No available plans right now. Turn on “Show booked” to see who already reserved a share, or check back soon.'",
    "? t('emptyNoAvailable')"
  ],
  [
    "? 'No plans available right now. Check back soon or contact sales.'",
    "? t('emptyNone')"
  ],
  [
    ": 'No plans match these filters. Try widening the price range or clearing filters.'",
    ": t('emptyFiltered')"
  ],
];

let hit = 0;
for (const [a, b] of pairs) {
  if (s.includes(a)) {
    s = s.split(a).join(b);
    hit++;
  } else console.warn('MISS', a.slice(0, 70));
}
fs.writeFileSync(p, s);
console.log('invest cards hit', hit);
