// Updates public/ecb-rates.json from the European Central Bank's daily euro reference rates
// (https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist.zip). Run it by hand when you want the
// latest days: `npm run ecb:update`. The app reads the file from its own origin; nothing is sent out.
import { writeFileSync } from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';

const URL_ZIP = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist.zip';
const FROM = '2015-01-01';
const KEEP = ['USD', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF'];
const OUT = new URL('../../public/ecb-rates.json', import.meta.url);

const res = await fetch(URL_ZIP);
if (!res.ok) throw new Error(`ECB answered ${res.status}`);
const files = unzipSync(new Uint8Array(await res.arrayBuffer()));
const csv = strFromU8(Object.values(files)[0]);
const [head, ...rows] = csv.trim().split(/\r?\n/);
const cols = head.split(',').map((c) => c.trim());
const rates = {};
for (const code of KEEP) {
  const i = cols.indexOf(code);
  if (i < 0) continue;
  rates[code] = rows
    .map((r) => r.split(','))
    .filter((r) => r[0] >= FROM && Number(r[i]) > 0)
    .map((r) => [r[0], Number(r[i])])
    .sort((a, b) => a[0].localeCompare(b[0]));
}
const last = rates.USD.at(-1)[0];
writeFileSync(
  OUT,
  JSON.stringify({
    source: URL_ZIP,
    note: 'ECB euro foreign exchange reference rates: units of the currency for 1 euro',
    from: FROM,
    until: last,
    rates,
  })
);
console.log(`ecb-rates.json: ${KEEP.length} currencies, ${FROM} to ${last}`);
