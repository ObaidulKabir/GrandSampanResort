/**
 * Fails when locale catalogs drift apart.
 *
 * Run in CI on every PR so a missing Bangla key is caught at review time
 * rather than rendering a raw message key to a customer.
 */
const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, '..', 'messages');
const REFERENCE_LOCALE = 'en';
const LOCALES = ['en', 'bn'];

function load(locale) {
  const file = path.join(MESSAGES_DIR, `${locale}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing message catalog: ${path.relative(process.cwd(), file)}`);
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`Invalid JSON in ${locale}.json: ${err.message}`);
  }
}

function flatten(value, prefix, out) {
  for (const [key, entry] of Object.entries(value)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      flatten(entry, full, out);
    } else {
      out.set(full, entry);
    }
  }
  return out;
}

function main() {
  const catalogs = new Map();
  for (const locale of LOCALES) {
    catalogs.set(locale, flatten(load(locale), '', new Map()));
  }

  const reference = catalogs.get(REFERENCE_LOCALE);
  const problems = [];

  for (const [key, value] of reference) {
    if (typeof value !== 'string' || value.trim() === '') {
      problems.push(`[${REFERENCE_LOCALE}] empty or non-string value: ${key}`);
    }
  }

  for (const locale of LOCALES) {
    if (locale === REFERENCE_LOCALE) continue;
    const catalog = catalogs.get(locale);

    for (const key of reference.keys()) {
      if (!catalog.has(key)) problems.push(`[${locale}] missing key: ${key}`);
    }
    for (const [key, value] of catalog) {
      if (!reference.has(key)) problems.push(`[${locale}] extra key not in ${REFERENCE_LOCALE}: ${key}`);
      else if (typeof value !== 'string' || value.trim() === '') {
        problems.push(`[${locale}] empty or non-string value: ${key}`);
      }
    }
  }

  if (problems.length) {
    console.error(`Message catalog check failed (${problems.length} problem(s)):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }

  console.log(`Message catalogs OK: ${reference.size} keys x ${LOCALES.length} locales.`);
}

try {
  main();
} catch (err) {
  console.error(`Message catalog check failed: ${err.message}`);
  process.exit(1);
}
