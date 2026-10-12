// Tests für die täglichen Statusmeldungen: node --test scripts/daily-test.mjs (TESTDATEN)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = fs.readFileSync(path.join(ROOT, 'src/daily.js'), 'utf8');
const mk = today => new Function('todayISO', ['const strHash', 'const dailyKey', 'const dayNo'].map(n => { const i = src.indexOf(n); return src.slice(i, src.indexOf('\n', i)) }).join('\n') + '\nreturn {dailyKey,dayNo};')(() => today);

test('Jeden Tag ein neuer Schlüssel; Kursänderungen im Tagesverlauf machen einen gesehenen Kreis nicht wieder neu', () => {
  const a = mk('2026-10-12'), b = mk('2026-10-13');
  const sl = (px) => [{ t: `Microsoft heute ${px}`, price: true }, { t: 'Von 100 $ Umsatz bleiben 40,3 $ Gewinn' }];
  assert.equal(a.dailyKey(sl('−1,8 %')), a.dailyKey(sl('−2,1 %')));
  assert.notEqual(a.dailyKey(sl('−1,8 %')), b.dailyKey(sl('−1,8 %')));
  assert.notEqual(a.dailyKey(sl('x')), a.dailyKey([...sl('x'), { t: 'Neue Nachricht' }]), 'neue Nachricht macht den Kreis wieder neu');
  assert.equal(b.dayNo() - a.dayNo(), 1);
});

test('Wissenshappen wechselt täglich und stammt nur aus Steckbrief, Fakten oder Regeln', () => {
  assert.match(src, /pool\[\(dayNo\(\)\+strHash\(p\.symbol\)\)%pool\.length\]/);
  assert.ok(!/fetch\(/.test(src), 'keine Netzaufrufe, alles im Browser');
});

test('Zeitpläne haben Ersatztermine gegen verspätete GitHub-Läufe', () => {
  const n = fs.readFileSync(path.join(ROOT, '.github/workflows/news.yml'), 'utf8').match(/- cron:/g).length;
  const s = fs.readFileSync(path.join(ROOT, '.github/workflows/scenarios.yml'), 'utf8').match(/- cron:/g).length;
  assert.ok(n >= 6 && s >= 6, `news ${n}, scenarios ${s}`);
});
