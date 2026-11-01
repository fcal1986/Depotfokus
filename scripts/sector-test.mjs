// Tests für die Branchen-Zuordnung neuer Positionen: node --test scripts/sector-test.mjs (TESTDATEN)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = fs.readFileSync(path.join(ROOT, 'src/news.js'), 'utf8');
const block = src.slice(src.indexOf('const NEWS_SECTORS='), src.indexOf('function sectorCard'));
const mk = depot => new Function('STAMM', 'D', 'persist', 'isIncluded', block + '\nreturn {sectorSuggest,sectorsFor,setSectors,newsMatch:typeof newsMatch!=="undefined"?newsMatch:null,NEWS_SECTOR_LIST};')({}, () => depot, () => {}, () => true);

test('Vorschläge für unbekannte Werte aus Name und Baustein', () => {
  const { sectorSuggest } = mk({});
  assert.deepEqual(sectorSuggest({ name: 'NVIDIA Corp', bucket: 'single' }), ['Halbleiter']);
  assert.deepEqual(sectorSuggest({ name: 'Allianz SE' }), ['Versicherungen']);
  assert.deepEqual(sectorSuggest({ name: 'Vanguard FTSE All-World UCITS ETF', bucket: 'core' }), ['Breiter Markt']);
  assert.deepEqual(sectorSuggest({ name: 'Unbekannte Holding AG', bucket: 'single' }), []);
});

test('Eigene Wahl vor bekannter Tabelle vor Vorschlag; leere Wahl bleibt leer', () => {
  const d = { positions: [], sectors: {} }, M = mk(d);
  const nv = { name: 'NVIDIA Corp', symbol: 'NVD.DE', isin: 'US67066G1040' }, pep = { name: 'PepsiCo', symbol: 'PEP.DE' };
  assert.equal(M.sectorsFor(nv, d).src, 'suggest');
  assert.equal(M.sectorsFor(pep, d).src, 'stamm');
  M.setSectors(nv, ['Technologie', 'Erfunden']);
  assert.deepEqual(M.sectorsFor(nv, d), { list: ['Technologie'], src: 'own' }, 'nur Branchen aus der Liste');
  M.setSectors(nv, []);
  assert.deepEqual(M.sectorsFor(nv, d), { list: [], src: 'own' });
});

test('Branchenwahl wird beim nächsten Import übernommen', () => {
  assert.match(fs.readFileSync(path.join(ROOT, 'src/parts.js'), 'utf8'), /d\.sectors=prev\.sectors\|\|\{\}/);
});
