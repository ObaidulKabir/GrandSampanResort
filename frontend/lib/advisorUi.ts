export function monthlyOutlay(s: {
  netPrice?: number;
  depositAmount?: number;
  installmentMonths?: number;
  cadence?: string;
}) {
  const remaining = Math.max(0, Number(s.netPrice) - Number(s.depositAmount));
  const months = Math.max(1, Number(s.installmentMonths) || 1);
  const payments = s.cadence === 'quarterly' ? Math.max(1, Math.ceil(months / 3)) : months;
  return remaining / payments;
}

export type AdvisorBadgeKey = 'bestFit' | 'payLess' | 'smallerMonthly' | '';

export function badgesFor(
  list: Array<{ netPrice?: number; depositAmount?: number; installmentMonths?: number; cadence?: string }>
): AdvisorBadgeKey[] {
  const badges: AdvisorBadgeKey[] = list.map(() => '');
  if (!list.length) return badges;
  badges[0] = 'bestFit';
  let minMonthly = 0;
  let minPrice = 0;
  list.forEach((s, i) => {
    if (monthlyOutlay(s) < monthlyOutlay(list[minMonthly])) minMonthly = i;
    if (Number(s.netPrice) < Number(list[minPrice].netPrice)) minPrice = i;
  });
  if (minPrice !== 0) badges[minPrice] = 'payLess';
  if (minMonthly !== 0 && !badges[minMonthly]) badges[minMonthly] = 'smallerMonthly';
  else if (minMonthly !== 0 && badges[minMonthly]) {
    let next = -1;
    list.forEach((s, i) => {
      if (i === 0 || i === minMonthly) return;
      if (next < 0 || monthlyOutlay(s) < monthlyOutlay(list[next])) next = i;
    });
    if (next > 0 && !badges[next]) badges[next] = 'smallerMonthly';
  }
  return badges;
}
