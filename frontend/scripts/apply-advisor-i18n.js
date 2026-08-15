const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'app/(site)/[locale]/invest/advisor/page.tsx');
let s = fs.readFileSync(file, 'utf8');

if (!s.includes('useTranslations')) {
  s = s.replace(
    "import { useState } from 'react';",
    "import { useState } from 'react';\nimport { useTranslations } from 'next-intl';"
  );
  s = s.replace(
    'export default function InvestAdvisorPage() {',
    "export default function InvestAdvisorPage() {\n  const t = useTranslations('investAdvisor');"
  );
}

const pairs = [
  ["'We could not match a plan right now. Try again, or browse available suites.'", "t('errorGeneric')"],
  ['<p className="text-sm font-semibold uppercase tracking-wide text-gold">Invest</p>', '<p className="text-sm font-semibold uppercase tracking-wide text-gold">{t(\'eyebrow\')}</p>'],
  ['<h1 className="font-display mt-1 text-3xl text-ocean md:text-4xl">Help me choose</h1>', '<h1 className="font-display mt-1 text-3xl text-ocean md:text-4xl">{t(\'title\')}</h1>'],
  [
    'Answer two questions. We’ll suggest a suite and how much to pay today — from live prices, not a sales pitch.',
    "{t('intro')}"
  ],
  ['How much can you pay today?', "{t('payToday')}"],
  ['placeholder="e.g. 500000"', 'placeholder={t(\'payTodayPlaceholder\')}'],
  ['The amount you can transfer now to reserve.', "{t('payTodayHint')}"],
  ['How much can you put aside each month?', "{t('monthly')}"],
  ['placeholder="e.g. 25000"', 'placeholder={t(\'monthlyPlaceholder\')}'],
  ['What you can comfortably pay after the first payment.', "{t('monthlyHint')}"],
  ['How long can you keep paying?', "{t('horizon')}"],
  ['I also earn from referring buyers', "{t('referralToggle')}"],
  [
    'Optional. We’ll treat this as extra cash, not as a reason to pick a plan.',
    "{t('referralHint')}"
  ],
  ['How you measure it', "{t('measure')}"],
  ['Number of referred sales', "{t('measureCount')}"],
  ['Taka volume of referred sales', "{t('measureVolume')}"],
  [
    "{refMode === 'count' ? 'How many referrals' : 'Sales volume (৳)'}",
    "refMode === 'count' ? t('referralCount') : t('referralVolume')"
  ],
  ['Over how many months', "{t('overMonths')}"],
  ["{loading ? 'Finding a match…' : 'Show my options'}", "loading ? t('finding') : t('showOptions')"],
  [
    "suggestions.length\n              ? 'Plans that fit what you can pay, with the trade-offs in plain terms.'\n              : 'No unsold plans to compare right now.'",
    "suggestions.length ? t('resultsIntro') : t('noPlans')"
  ],
  ['You pay', "{t('youPay')}"],
  ['Save {formatMoney(s.savings)}', "{t('save', { amount: formatMoney(s.savings) })}"],
  ['Today {formatMoney(s.depositAmount)}', "{t('today', { amount: formatMoney(s.depositAmount) })}"],
  ['Fits the budget you entered', "{t('fitsBudget')}"],
  ['Needs your referral target', "{t('needsReferral')}"],
  ['Tight against this budget', "{t('tightBudget')}"],
  ['Continue with this plan', "{t('continue')}"],
  ['Browse available suites', "{t('browse')}"],
];

for (const [a, b] of pairs) {
  if (!s.includes(a)) console.warn('MISS', a.slice(0, 80));
  else s = s.split(a).join(b);
}

if (!s.includes('badgeBestFit')) {
  s = s.replace(
    'const badges = badgesFor(suggestions);',
    `const badges = badgesFor(suggestions).map((b) => {
    if (b === 'Best fit') return t('badgeBestFit');
    if (b === 'Pay less overall') return t('badgePayLess');
    if (b === 'Smaller monthly') return t('badgeSmallerMonthly');
    return b;
  });`
  );
}

s = s.replace(
  `{n} months`,
  `{t('months', { n })}`
);

s = s.replace(
  "` · finish in ${s.installmentMonths} months${s.cadence === 'quarterly' ? ', every 3 months' : ''}`",
  "`${t('finishIn', { months: s.installmentMonths })}${s.cadence === 'quarterly' ? t('every3') : ''}`"
);

s = s.replace(
  `Then about {formatMoney(Math.round(monthlyOutlay(s)))}
                    {s.cadence === 'quarterly' ? ' / quarter' : ' / month'}`,
  `{s.cadence === 'quarterly'
                      ? t('thenQuarter', { amount: formatMoney(Math.round(monthlyOutlay(s))) })
                      : t('thenMonth', { amount: formatMoney(Math.round(monthlyOutlay(s))) })}`
);

fs.writeFileSync(file, s);
console.log('advisor ok');
