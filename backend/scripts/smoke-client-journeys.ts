/**
 * Read-only client journeys against a running API.
 * Does not create bookings.
 *
 *   npx ts-node scripts/smoke-client-journeys.ts
 *   API_BASE=https://www.grandsampanresort.com/api npx ts-node scripts/smoke-client-journeys.ts
 */
const CANDIDATES = [
  process.env.API_BASE,
  'http://localhost:4000/api',
  'https://www.grandsampanresort.com/api'
].filter(Boolean) as string[];

type Json = any;

async function getJson(url: string, init?: RequestInit): Promise<{ status: number; body: Json }> {
  const res = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) }
  });
  let body: Json = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

function assert(cond: any, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function pickBase(): Promise<string> {
  for (const base of CANDIDATES) {
    const root = base.replace(/\/+$/, '');
    try {
      const { status, body } = await getJson(`${root}/timeshares`);
      if (status === 200 && (Array.isArray(body) || Array.isArray(body?.plans))) return root;
    } catch {
      /* try next */
    }
  }
  throw new Error(`No API reachable. Tried: ${CANDIDATES.join(', ')}`);
}

async function main() {
  const base = await pickBase();
  console.log(`API ${base}\n`);

  const policyRes = await getJson(`${base}/payment-plans/policy`);
  if (policyRes.status !== 200 || !policyRes.body?.ok) {
    console.log(`1) Payment policy not on this API yet (${policyRes.status}). Skipping quote ladder / advisor.`);
    const plansRes = await getJson(`${base}/timeshares`);
    const plans = (Array.isArray(plansRes.body) ? plansRes.body : plansRes.body?.plans || []).filter(
      (p: any) => String(p.planStatus || 'Unsold').toLowerCase() === 'unsold'
    );
    assert(plans.length > 0, 'need at least one unsold plan');
    console.log(`2) Catalog reachable: ${plans.length} unsold plan(s). Cheapest ${plans.sort((a: any, b: any) => Number(a.price) - Number(b.price))[0]?.name}`);
    console.log('\nLive quote/advisor not deployed on this host. Unit client-journeys still cover the money path.');
    return;
  }
  const tiers = policyRes.body.resolved || [];
  assert(tiers.length >= 4, `expected 4 payment options, got ${tiers.length}`);
  console.log(`1) Payment options: ${tiers.map((t: any) => `${t.id} (${t.upfrontPct}% today)`).join(', ')}`);

  const plansRes = await getJson(`${base}/timeshares`);
  const plans = (Array.isArray(plansRes.body) ? plansRes.body : plansRes.body?.plans || []).filter(
    (p: any) => String(p.planStatus || 'Unsold').toLowerCase() === 'unsold'
  );
  assert(plans.length > 0, 'need at least one unsold plan');
  const plan = [...plans].sort((a: any, b: any) => Number(a.price) - Number(b.price))[0];
  console.log(`2) Cheapest unsold plan: ${plan.id} ${plan.name} @ ৳${Number(plan.price).toLocaleString()}`);

  const quotes: Record<string, any> = {};
  for (const tier of tiers) {
    const { status, body } = await getJson(`${base}/booking/quote`, {
      method: 'POST',
      body: JSON.stringify({
        planId: plan.id,
        paymentTierId: tier.id,
        installmentMonths: 24,
        cadence: 'monthly',
        start: '2026-03-01T00:00:00.000Z'
      })
    });
    assert(status === 200 && body?.ok, `quote ${tier.id} failed: ${JSON.stringify(body)}`);
    quotes[tier.id] = body.quote;
    const q = body.quote;
    const later = (q.schedule || []).filter((s: any) => s.type !== 'deposit').reduce((s: number, i: any) => s + i.amount, 0);
    assert(q.depositAmount + later === q.netPrice, `${tier.id}: today + later should equal you-pay`);
    console.log(
      `   ${tier.id.padEnd(20)} today ৳${q.depositAmount.toLocaleString()}  total ৳${q.netPrice.toLocaleString()}  save ৳${(q.savings || 0).toLocaleString()}`
    );
  }
  assert(quotes.full.savings > quotes.half.savings, 'full should save more than half');
  assert(quotes.half.savings > quotes.standard.savings, 'half should save more than standard');
  assert((quotes.full.schedule || []).filter((s: any) => s.type === 'installment').length === 0, 'full should have no installments');
  console.log('3) Quote ladder holds (full > half > standard savings)\n');

  const personas = [
    { name: 'Amina — first reserve', availableNow: Math.round(quotes.standard.depositAmount * 1.15), monthlyCapacity: 25000, horizonMonths: 36 },
    { name: 'Nadia — pay in full', availableNow: quotes.full.netPrice + 50_000, monthlyCapacity: 0, horizonMonths: 36 },
    { name: 'Farhan — too tight', availableNow: 20_000, monthlyCapacity: 5_000, horizonMonths: 36 }
  ];

  for (const p of personas) {
    const { status, body } = await getJson(`${base}/advisor/suggest`, {
      method: 'POST',
      body: JSON.stringify({
        availableNow: p.availableNow,
        monthlyCapacity: p.monthlyCapacity,
        horizonMonths: p.horizonMonths
      })
    });
    assert(status === 200 && body?.ok, `advisor failed for ${p.name}: ${JSON.stringify(body)}`);
    const top = (body.suggestions || [])[0];
    console.log(`4) ${p.name}`);
    console.log(`   cash ৳${p.availableNow.toLocaleString()} / ৳${p.monthlyCapacity.toLocaleString()} a month`);
    if (!top) {
      console.log('   no unsold suggestions');
      continue;
    }
    console.log(
      `   best: ${top.planName} · ${top.tierLabel} · today ৳${Number(top.depositAmount).toLocaleString()} · you pay ৳${Number(top.netPrice).toLocaleString()}`
    );
    console.log(`   ${top.summary}`);
    if (p.name.startsWith('Nadia')) {
      assert(top.paymentTierId === 'full' || top.savings > 0, 'Nadia should be offered an advance-pay saving');
    }
    if (p.name.startsWith('Farhan')) {
      assert(!top.feasibleWithoutReferral || top.depositAmount <= 20_000, 'Farhan should not be sold a large deposit as an easy fit');
    }
  }

  console.log('\nClient journeys passed (read-only).');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
