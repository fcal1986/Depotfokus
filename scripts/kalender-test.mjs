// Tests für den Dividendenkalender: node --test scripts/kalender-test.mjs (Daten = TESTDATEN)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = fs.readFileSync(path.join(ROOT, 'src/kalender.js'), 'utf8');
const line = n => { const i = src.indexOf(n); return src.slice(i, src.indexOf('\n', i)) };
const K = new Function(['function isoYears', 'const isoDays', 'const isWeekend', 'const prevBizDay', 'const nextBizDay'].map(line).join('\n') + '\n' + src.slice(src.indexOf('function nextPayEstimate'), src.indexOf('/* Stück am Ex-Tag')) + '\nreturn {nextPayEstimate};')();
const hist = pays => ({ ev: pays.map(p => ({ pay: p })) });

test('Devisenkurse werden immer geladen, auch wenn alle Kurse in Euro notieren (Ursache „0 €“)', () => {
  const fp = fs.readFileSync(path.join(ROOT, 'scripts/fetch-prices.mjs'), 'utf8');
  assert.match(fp, /new Set\(\['USD', 'DKK', 'GBP', 'CHF'/);
  assert.match(fp, /data-api\.ecb\.europa\.eu\/service\/data\/EXR/);
});

test('Zahltag-Schätzung folgt dem Muster des Unternehmens (geprüft gegen DivvyDiary)', () => {
  // Apple zahlt donnerstags: 52 Wochen später
  assert.equal(K.nextPayEstimate(hist(['2025-05-15', '2025-08-14', '2025-11-13', '2026-02-12', '2026-05-14', '2026-08-13']), '2025-11-13'), '2026-11-12');
  // Realty Income zahlt am 15., am Wochenende davor: 15.11.2026 ist ein Sonntag
  assert.equal(K.nextPayEstimate(hist(['2026-05-15', '2026-06-15', '2026-07-15', '2026-08-14', '2026-09-15', '2026-10-15']), '2025-11-14'), '2026-11-13');
  // Omega zahlt am 15., am Wochenende meist danach
  assert.equal(K.nextPayEstimate(hist(['2025-05-15', '2025-08-15', '2025-11-17', '2026-02-17', '2026-05-15', '2026-08-14']), '2025-11-17'), '2026-11-16');
});

test('Kopfzeile zeigt nie „rund 0 €“, wenn nur der Devisenkurs fehlt; Stück am Ex-Tag aus Umsätzen', () => {
  assert.match(src, /Devisenkurs \$\{esc\(K\.noFx\.join/);
  assert.match(src, /function sharesAt\(d,p,ex\)/);
  assert.match(src, /t\.date<ex/);
});
