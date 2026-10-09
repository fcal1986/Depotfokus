// Tests für die Nachrichten-Pipeline: node --test scripts/news-test.mjs
// Alle Feeds, Seiten und Modellantworten hier sind TESTDATEN und erscheinen nie in data/news/.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { run, selectCandidates, canonUrl, similar, ENUMS, briefFrom } from './news-run.mjs';
import { checkArticle, quoteOk, numbersOk, numbersIn } from './news-check.mjs';
import { parseFeed } from './news-sources.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/news/sources.json'), 'utf8'));
const NOW = new Date('2026-10-12T06:30:00Z'); // Montag 08:30 Berliner Zeit

/* ---------- Testdaten ---------- */
const PAGE_HICP = 'TESTDATEN. Euro area annual inflation is expected to be 1.9% in September 2026, down from 2.1% in August, according to a flash estimate. Looking at the main components, energy is expected to have the highest annual rate in September (2.4%, compared with 2.0% in August). The next release is scheduled for 17 October 2026. '.repeat(2);
const PAGE_RATE = 'TESTDATEN. The Governing Council today decided to lower the three key ECB interest rates by 25 basis points. The deposit facility rate will be 2.25% from 15 October 2026. Inflation is projected to average 2.0% in 2027. '.repeat(3);
const PAGE_DIV = 'TESTDATEN. Example Foods Inc. reported revenue of 4.2 billion dollars for the third quarter. The board will review the dividend policy later this year. Net income was 310 million dollars. '.repeat(3);
const rss = items => `<?xml version="1.0"?><rss><channel>${items.map(i => `<item><title>${i.t}</title><link>${i.u}</link><pubDate>${new Date(i.d).toUTCString()}</pubDate><description>${i.s || ''}</description></item>`).join('')}</channel></rss>`;
function mkFeeds({ eurostat = true, ecb = true, fail = false } = {}) {
  const f = {
    'https://www.ecb.europa.eu/rss/press.html': rss(ecb ? [{ t: 'Monetary policy decisions', u: 'https://www.ecb.europa.eu//press/pr/date/2026/html/ecb.mp261011.en.html?utm_source=x', d: '2026-10-11T12:15:00Z' }, { t: 'Christine Lagarde: Speech at a conference', u: 'https://www.ecb.europa.eu/press/key/x.html', d: '2026-10-11T09:00:00Z' }] : []),
    [CFG.sources.find(s => s.id === 'eurostat').urls[0]]: rss(eurostat ? [{ t: 'Euro area annual inflation down to 1.9%', u: 'https://ec.europa.eu/eurostat/web/products-euro-indicators/w/2-01102026-ap', d: '2026-10-11T09:00:00Z' }] : []),
    'https://apps.bea.gov/rss/rss.xml': rss([{ t: 'ECB: Monetary policy decisions', u: 'https://www.ecb.europa.eu/press/pr/date/2026/html/ecb.mp261011.en.html', d: '2026-10-11T12:00:00Z' }, { t: 'Old release', u: 'https://bea.gov/old', d: '2026-09-01T12:00:00Z' }])
  };
  const pages = {
    'https://www.ecb.europa.eu//press/pr/date/2026/html/ecb.mp261011.en.html?utm_source=x': PAGE_RATE,
    'https://ec.europa.eu/eurostat/web/products-euro-indicators/w/2-01102026-ap': PAGE_HICP
  };
  return async (url) => {
    if (fail) throw new Error('HTTP 503');
    if (f[url] != null) return { text: f[url], type: 'application/rss+xml', url };
    if (pages[url] != null) return { text: `<html><body><main>${pages[url]}</main></body></html>`, type: 'text/html', url };
    throw Object.assign(new Error('HTTP 404'), { fatal: true });
  };
}
const GOOD = {
  'Monetary policy decisions': { relevant: true, title: 'EZB senkt die Leitzinsen um 25 Basispunkte', kernaussage: 'Die EZB senkt ihre wichtigsten Zinsen. Der Einlagezins liegt ab 15. Oktober bei 2,25 %.', event_date: '2026-10-11',
    facts: [{ text: 'Der EZB-Rat senkt die drei Leitzinsen um 25 Basispunkte.', quote: 'decided to lower the three key ECB interest rates by 25 basis points' }, { text: 'Der Einlagezins beträgt ab 15. Oktober 2026 2,25 %.', quote: 'The deposit facility rate will be 2.25% from 15 October 2026' }],
    numbers: [{ value: 2.25, unit: '%', period: 'ab 15.10.2026', quote: 'The deposit facility rate will be 2.25% from 15 October 2026' }],
    alltag: 'Kredite und Baufinanzierungen können günstiger werden. Sparzinsen auf Tagesgeld können ebenfalls sinken.',
    finanzwirkung: 'Für Unternehmen mit hohen Schulden kann die Finanzierung billiger werden. Ob mehr Gewinn bleibt, hängt davon ab, wie sich Nachfrage und Kosten entwickeln. Banken können weniger am Zins verdienen.',
    naechstes: { text: 'Wichtig ist, wie sich die Inflation in den nächsten Monaten entwickelt.', date: null, quote: null },
    categories: ['zinsen'], regions: ['Euroraum'], sectors: ['Banken', 'Immobilien'], companies: [], dividend: { status: 'nicht erwähnt', quote: null },
    glossary: [{ term: 'Einlagezins', def: 'Der Zins, den Banken für Geld bekommen, das sie bei der Zentralbank parken.' }], scenario_link: { scenario: 'A', why: 'Niedrigere Zinsen können eine schwache Erholung stützen.' } },
  'Euro area annual inflation down to 1.9%': { relevant: true, title: 'Inflation im Euroraum sinkt auf 1,9 %', kernaussage: 'Die Preise steigen langsamer: 1,9 % im September nach 2,1 % im August.', event_date: '2026-10-11',
    facts: [{ text: 'Die Inflationsrate im Euroraum lag im September 2026 laut Schnellschätzung bei 1,9 %, nach 2,1 % im August.', quote: 'Euro area annual inflation is expected to be 1.9% in September 2026, down from 2.1% in August' }],
    numbers: [{ value: 1.9, unit: '%', period: 'September 2026, zum Vorjahresmonat', quote: 'Euro area annual inflation is expected to be 1.9% in September 2026' }],
    alltag: 'Das Leben wird weiter teurer, aber langsamer als zuvor. Löhne können dadurch etwas mehr Kaufkraft bringen.',
    finanzwirkung: 'Wenn der Preisdruck nachlässt, kann die EZB vorsichtiger mit Zinserhöhungen sein. Für Unternehmen hängt die Wirkung davon ab, ob ihre Kosten langsamer steigen als ihre Preise.',
    naechstes: { text: 'Die endgültigen Zahlen folgen am 17. Oktober 2026.', date: '2026-10-17', quote: 'The next release is scheduled for 17 October 2026' },
    categories: ['preise'], regions: ['Euroraum'], sectors: [], companies: [], dividend: { status: 'nicht erwähnt', quote: null }, glossary: [], scenario_link: null }
};
const mkAsk = (map = GOOD, calls = { n: 0 }) => async (ev) => { calls.n++; const o = map[ev.title]; if (!o) throw new Error('kein Mock'); return { out: JSON.parse(JSON.stringify(o)), usage: { input_tokens: 3000, output_tokens: 900 } }; };
function tmp() { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'news-')); fs.copyFileSync(path.join(ROOT, 'data/news/sources.json'), path.join(d, 'sources.json')); return d; }
const J = (d, f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'));
const quiet = () => {};

/* ---------- Auswahl und Dubletten ---------- */
test('Feeds werden geparst, alte und ausgeschlossene Meldungen fallen weg, Dubletten werden ein Ereignis', async () => {
  const get = mkFeeds();
  const feeds = [];
  for (const s of CFG.sources) { try { const r = await get(s.urls[0]); feeds.push({ source_id: s.id, items: parseFeed(r.text) }) } catch { } }
  const c = selectCandidates(feeds, CFG, { urls: {}, events: {} }, NOW);
  assert.equal(c.length, 2, c.map(x => x.title).join(' | '));
  assert.ok(!c.some(x => /Speech|Old release/.test(x.title)));
  const rate = c.find(x => x.source_id === 'ecb');
  assert.equal(rate.also.length, 1, 'gleiche Adresse aus zwei Feeds = ein Ereignis');
  assert.equal(canonUrl('https://www.ecb.europa.eu//press/x.html?utm_source=a#t'), canonUrl('https://ecb.europa.eu/press/x.html'));
  assert.ok(similar('Euro area annual inflation down to 1.9%', 'Euro area annual inflation down to 1.9 %') >= 0.6);
});

/* ---------- Prüfregeln ---------- */
const EV = { text: PAGE_HICP + PAGE_RATE + PAGE_DIV };
test('Falsche Zahlen, Einheiten und Vorzeichen werden verworfen', () => {
  const base = JSON.parse(JSON.stringify(GOOD['Euro area annual inflation down to 1.9%']));
  base.facts.push({ text: 'Die Inflation lag bei 2,9 %.', quote: 'Euro area annual inflation is expected to be 1.9% in September 2026' });
  base.facts.push({ text: 'Die Rate lag bei 1,9 Prozentpunkten.', quote: 'Euro area annual inflation is expected to be 1.9% in September 2026, down from 2.1% in August' });
  base.facts.push({ text: 'Energiepreise lagen bei -2,4 %.', quote: 'energy is expected to have the highest annual rate in September (2.4%, compared with 2.0% in August)' });
  base.facts.push({ text: 'Erfundenes Zitat mit 1,9 %.', quote: 'Inflation was exactly 1.9% and nobody expected that' });
  const c = checkArticle(base, EV, ENUMS);
  assert.equal(c.article.facts.length, 1);
  const why = c.log.map(l => l.why).join(' | ');
  assert.match(why, /Zahl nicht im Zitat: 2\.9/); assert.match(why, /Prozentpunkte/); assert.match(why, /Vorzeichen/); assert.match(why, /Zitat nicht in der Quelle/);
  assert.deepEqual(numbersIn('3 % im September 2026'), [3]);
  assert.ok(numbersOk('1,9 %', '1.9%').ok);
});

test('„Preise sinken“ bei fallender Inflationsrate, unbelegte Erwartungen und Pauschalurteile werden nicht veröffentlicht', () => {
  const a = JSON.parse(JSON.stringify(GOOD['Euro area annual inflation down to 1.9%']));
  a.alltag = 'Die Preise sinken jetzt. Das freut Verbraucher.';
  const c = checkArticle(a, EV, ENUMS);
  assert.equal(c.interpOk, false); assert.equal(c.article.alltag, null); assert.match(c.log.map(l => l.why).join(), /langsamer steigende Preise/);
  const b = JSON.parse(JSON.stringify(GOOD['Monetary policy decisions']));
  b.facts.push({ text: 'Analysten hatten eine Senkung erwartet.', quote: 'decided to lower the three key ECB interest rates by 25 basis points' });
  b.finanzwirkung = 'Sinkende Zinsen lassen Aktien steigen. Jetzt kaufen.';
  const d = checkArticle(b, EV, ENUMS);
  assert.equal(d.article.facts.length, 2); assert.match(d.log.map(l => l.why).join(), /Erwartung oder Prognose ohne Beleg/);
  assert.equal(d.interpOk, false); assert.match(d.log.map(l => l.why).join(), /Empfehlungssprache|Pauschalaussage/);
  const e = JSON.parse(JSON.stringify(GOOD['Monetary policy decisions']));
  e.finanzwirkung = 'Die Finanzierung wird billiger. Banken verdienen weniger.';
  assert.match(checkArticle(e, EV, ENUMS).log.map(l => l.why).join(), /nicht bedingt/);
});

test('Abgeleitete Zahl in der Überschrift (0,25 Prozentpunkte aus 25 Basispunkten) wird nicht übernommen', () => {
  const a = { ...JSON.parse(JSON.stringify(GOOD['Monetary policy decisions'])), title: 'EZB senkt die Leitzinsen um 0,25 Prozentpunkte' };
  const c = checkArticle(a, EV, ENUMS);
  assert.equal(c.article.title, null); assert.equal(c.publishable, true); assert.match(c.log.map(l => l.why).join(), /Originaltitel/);
});

test('Angekündigte und erwartete Dividenden werden unterschieden', () => {
  const a = { ...JSON.parse(JSON.stringify(GOOD['Monetary policy decisions'])), dividend: { status: 'angekündigt', quote: 'The board will review the dividend policy later this year' } };
  a.finanzwirkung = 'Eine höhere Dividende wurde angekündigt, wenn das Geld reicht.';
  const c = checkArticle(a, EV, ENUMS);
  assert.equal(c.article.dividend.status, 'nicht erwähnt');
  assert.match(c.log.map(l => l.why).join(), /Dividendenaussage ohne Ankündigung|nicht durch die Quelle belegt/);
  const b = { ...JSON.parse(JSON.stringify(GOOD['Monetary policy decisions'])), dividend: { status: 'erwartet', quote: 'The board will review the dividend policy later this year' } };
  assert.equal(checkArticle(b, EV, ENUMS).article.dividend.status, 'erwartet');
});

/* ---------- Läufe ---------- */
test('Lauf mit Modell: geprüfte Meldungen, stabile IDs, wiederholter Lauf ohne neue Modellaufrufe', async () => {
  const d = tmp(), calls = { n: 0 };
  const r1 = await run({ dir: d, now: NOW, get: mkFeeds(), ask: mkAsk(GOOD, calls), log: process.env.DBG ? console.log : quiet });
  assert.equal(r1.result, 'items'); assert.equal(r1.items.length, 2); assert.equal(calls.n, 2);
  const L1 = J(d, 'latest.json');
  L1.items.forEach(i => { assert.equal(i.status, 'geprüft'); assert.equal(i.revision, 1); assert.ok(i.facts.every(f => f.quote)); assert.ok(i.source.name && i.url && i.published_at && i.retrieved_at); });
  const r2 = await run({ dir: d, now: new Date(NOW.getTime() + 3600e3), get: mkFeeds(), ask: mkAsk(GOOD, calls), log: quiet });
  assert.equal(calls.n, 2, 'unveränderte Quellen werden nicht erneut aufbereitet');
  assert.deepEqual(r2.items.map(i => [i.id, i.revision]), L1.items.map(i => [i.id, i.revision]));
  assert.equal(J(d, 'archive/index.json').days.length, 1);
  // Geplanter Zweitlauf am selben Tag endet sofort
  const r3 = await run({ dir: d, now: new Date(NOW.getTime() + 3600e3), get: mkFeeds(), ask: mkAsk(GOOD, calls), event: 'schedule', log: quiet });
  assert.equal(r3.result, 'skipped');
});

test('Korrektur der Quelle ergibt sichtbare Revision mit gleicher ID', async () => {
  const d = tmp();
  await run({ dir: d, now: NOW, get: mkFeeds(), ask: mkAsk(), log: quiet });
  const id = J(d, 'latest.json').items.find(i => i.source.id === 'eurostat').id;
  const get0 = mkFeeds();
  const get = async u => { const r = await get0(u); if (/2-01102026-ap/.test(u)) r.text = r.text.replace('</main>', ' Corrected on 12 October.</main>'); return r; };
  await run({ dir: d, now: new Date(NOW.getTime() + 7200e3), get, ask: mkAsk(), log: quiet });
  const a = J(d, 'latest.json').items.find(i => i.id === id);
  assert.equal(a.revision, 2); assert.ok(a.revised_at); assert.match(a.revision_note, /geändert/);
});

test('Ohne API-Schlüssel: belegte Kurzmeldungen ohne erfundene Einordnung', async () => {
  const d = tmp();
  const r = await run({ dir: d, now: NOW, get: mkFeeds(), ask: null, log: quiet });
  assert.equal(r.items.length, 2);
  r.items.forEach(i => { assert.equal(i.status, 'kurzmeldung'); assert.equal(i.alltag, null); assert.equal(i.finanzwirkung, null); assert.ok(i.facts[0].quote.length >= 40); assert.ok(PAGE_HICP.includes(i.facts[0].quote) || PAGE_RATE.includes(i.facts[0].quote)); });
  assert.equal(J(d, 'status.json').llm, 'kein API-Schlüssel');
});

test('Modellfehler und irrelevante Quellen: Kurzmeldung bzw. zurückgehalten', async () => {
  const d = tmp();
  const ask = async ev => { if (ev.source_id === 'ecb') throw new Error('Claude API 500'); return { out: { ...GOOD['Euro area annual inflation down to 1.9%'], relevant: false }, usage: {} }; };
  const r = await run({ dir: d, now: NOW, get: mkFeeds(), ask, log: quiet });
  assert.equal(r.items.length, 1); assert.equal(r.items[0].status, 'kurzmeldung'); assert.match(r.items[0].check_note, /nicht verfügbar/);
  assert.equal(r.held.length, 1);
});

test('Quellenausfall: letzte gültige Ausgabe bleibt mit ursprünglichem Datum; ruhiger Tag ist zulässig', async () => {
  const d = tmp();
  await run({ dir: d, now: NOW, get: mkFeeds(), ask: mkAsk(), log: quiet });
  const before = J(d, 'latest.json');
  const r = await run({ dir: d, now: new Date('2026-10-13T06:30:00Z'), get: mkFeeds({ fail: true }), ask: mkAsk(), log: quiet });
  assert.equal(r.result, 'failed'); assert.deepEqual(J(d, 'latest.json'), before);
  assert.equal(J(d, 'status.json').last_result, 'failed');
  // Ruhiger Tag (Feeds erreichbar, aber nichts Neues im Zeitfenster): „keine neue relevante Entwicklung“, Vortag als alt sichtbar
  const r2 = await run({ dir: d, now: new Date('2026-10-20T06:30:00Z'), get: mkFeeds(), ask: mkAsk(), log: quiet });
  assert.equal(r2.result, 'none');
  const L = J(d, 'latest.json');
  assert.equal(L.date, '2026-10-20'); assert.equal(L.previous.date, '2026-10-12'); assert.equal(L.previous.items.length, 2);
});

test('Geplante Läufe: Sommer-/Winterzeit', async () => {
  const d = tmp();
  const early = await run({ dir: d, now: new Date('2026-10-26T06:20:00Z'), get: mkFeeds(), ask: null, event: 'schedule', log: quiet }); // 07:20 Winterzeit
  assert.equal(early.result, 'early');
  const ok = await run({ dir: d, now: new Date('2026-10-26T07:20:00Z'), get: mkFeeds(), ask: null, event: 'schedule', log: quiet });
  assert.notEqual(ok.result, 'early');
});

test('Kurzmeldung nimmt nur einen echten Satz aus der Quelle', () => {
  const b = briefFrom({ title: 'X', published_at: '2026-10-11T00:00:00Z' }, { text: 'Skip to main content. ' + PAGE_RATE });
  assert.ok(PAGE_RATE.includes(b.facts[0].quote)); assert.equal(b.facts[0].text, null);
});
