// Ruft Tageskurse für die bekannten Wertpapiere ab und schreibt _site/prices.json.
// Läuft in GitHub Actions beim Veröffentlichen. Es werden keine Bestände übertragen,
// nur öffentliche Symbole aus den Stammdaten (src/logic.js) und symbols.txt.
// Quellen der Reihe nach: Yahoo Finance, Stooq (gleiche Börse, sonst US-Notiz), Devisen zusätzlich EZB.
// Schlägt alles fehl, wird eine leere Kursdatei geschrieben; die App nutzt dann die Exportwerte.
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] || '_site/prices.json';
const logic = fs.readFileSync('src/logic.js', 'utf8');
const i0 = logic.indexOf('const STAMM={');
const stamm = logic.slice(i0, logic.indexOf('};', i0));
const ISIN = Object.fromEntries([...stamm.matchAll(/'([A-Z0-9.\-^=]+)':\{isin:'([A-Z0-9]{12})'/g)].map(m => [m[1], m[2]]));
const symbols = new Set([...stamm.matchAll(/'([A-Z0-9.\-^=]+)':\{(?:isin:'[A-Z0-9]{12}',)?bucket/g)].map(m => m[1]));
// symbols.txt: je Zeile "SYMBOL ISIN" (ISIN optional)
if (fs.existsSync('symbols.txt')) fs.readFileSync('symbols.txt', 'utf8').split(/\r?\n/).map(l => l.replace(/#.*/, '').trim()).filter(Boolean).forEach(l => { const [sy, is] = l.split(/\s+/); symbols.add(sy); if (/^[A-Z]{2}[A-Z0-9]{10}$/.test(is || '')) ISIN[sy] = is; });

// Gleiche Aktie an einer US-Börse (Stooq-Schreibweise), falls die deutsche Notiz fehlt.
const US = { '9A2.F': 'arcc.us', '13M.F': 'main.us', 'WX4.F': 'ohi.us', 'RY6.F': 'o.us', 'PEP.DE': 'pep.us', 'JNJ.DE': 'jnj.us', 'CCC3.DE': 'ko.us', 'PRG.DE': 'pg.us',
  'MSF.DE': 'msft.us', '3V64.DE': 'v.us', 'NOV.DE': 'nvo.us', GOOG: 'goog.us', AAPL: 'aapl.us', MA: 'ma.us' };
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = {};
const note = (s, m) => { (errors[s] = errors[s] || []).push(m); };

async function yahoo(sym) {
  for (const host of ['query1', 'query2']) {
    try {
      const r = await fetch(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=5d&interval=1d`, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (!r.ok) { note(sym, `yahoo ${host} ${r.status}`); if (r.status === 429) await sleep(1200); continue; }
      const m = (await r.json())?.chart?.result?.[0]?.meta;
      if (m && m.regularMarketPrice > 0) return { p: m.regularMarketPrice, ccy: m.currency, t: new Date(m.regularMarketTime * 1000).toISOString(), src: 'Yahoo Finance' };
      note(sym, `yahoo ${host} leer`);
    } catch (e) { note(sym, `yahoo ${host} ${e.message}`); }
  }
  return null;
}
// Yahoo mit Sitzungscookie und Crumb, alle Symbole in einer Anfrage (vermeidet 429 ohne Cookie)
async function yahooSession() {
  try {
    let cookie = '';
    for (const u of ['https://fc.yahoo.com', 'https://finance.yahoo.com/']) {
      const r = await fetch(u, { headers: { 'User-Agent': UA }, redirect: 'manual' });
      const sc = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : [r.headers.get('set-cookie')].filter(Boolean);
      cookie = sc.map(c => c.split(';')[0]).join('; ');
      if (cookie) break;
    }
    if (!cookie) { note('session', 'kein Cookie'); return null; }
    const c = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', { headers: { 'User-Agent': UA, Cookie: cookie } });
    const crumb = (await c.text()).trim();
    if (!c.ok || !crumb || crumb.length > 40 || /[<{]/.test(crumb)) { note('session', `crumb ${c.status}`); return null; }
    return { cookie, crumb };
  } catch (e) { note('session', e.message); return null; }
}
async function yahooBatch(list, ses) {
  const res = {};
  if (!ses) return res;
  for (let i = 0; i < list.length; i += 40) {
    const part = list.slice(i, i + 40);
    try {
      const r = await fetch(`https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(part.join(','))}&crumb=${encodeURIComponent(ses.crumb)}`, { headers: { 'User-Agent': UA, Cookie: ses.cookie, Accept: 'application/json' } });
      if (!r.ok) { note('batch', `yahoo quote ${r.status}`); continue; }
      for (const q of (await r.json())?.quoteResponse?.result || []) {
        if (q.regularMarketPrice > 0) res[q.symbol] = { p: q.regularMarketPrice, ccy: q.currency, t: new Date((q.regularMarketTime || Date.now() / 1000) * 1000).toISOString(), src: 'Yahoo Finance' };
      }
    } catch (e) { note('batch', e.message); }
  }
  return res;
}
// Tradegate: Euro-Kurs je ISIN (letzter Preis, sonst Schluss, sonst Mitte aus Geld/Brief)
const de = v => typeof v === 'number' ? v : parseFloat(String(v || '').replace(/\./g, '').replace(',', '.'));
async function tradegate(isin) {
  try {
    const r = await fetch(`https://www.tradegatebsx.com/refresh.php?isin=${isin}`, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (!r.ok) { note(isin, `tradegate ${r.status}`); return null; }
    const j = JSON.parse(await r.text());
    const last = de(j.last), close = de(j.close), bid = de(j.bid), ask = de(j.ask);
    const p = last > 0 ? last : close > 0 ? close : (bid > 0 && ask > 0 ? (bid + ask) / 2 : NaN);
    if (!(p > 0)) { note(isin, 'tradegate kein Preis'); return null; }
    // close = Schluss des Vortags (delta ist die Veränderung dazu in Prozent)
    return { p, ccy: 'EUR', t: new Date().toISOString(), src: 'Tradegate', prev: close > 0 ? close : null };
  } catch (e) { note(isin, `tradegate ${e.message}`); return null; }
}
async function onvista(isin) {
  for (const kind of ['stocks', 'funds']) {
    try {
      const r = await fetch(`https://api.onvista.de/api/v1/${kind}/ISIN:${isin}/snapshot`, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (!r.ok) { note(isin, `onvista ${kind} ${r.status}`); continue; }
      const j = await r.json();
      const list = (j?.quoteList?.list || []).filter(q => q.isoCurrency === 'EUR' && q.last > 0).sort((a, b) => (b.volume || 0) - (a.volume || 0));
      const q = list[0];
      if (q) return { p: q.last, ccy: 'EUR', t: q.datetimeLast || new Date().toISOString(), src: 'onvista' };
    } catch (e) { note(isin, `onvista ${kind} ${e.message}`); }
  }
  return null;
}
async function stooq(code) {
  try {
    const r = await fetch(`https://stooq.com/q/d/l/?s=${encodeURIComponent(code)}&i=d`, { headers: { 'User-Agent': UA } });
    if (!r.ok) { note(code, `stooq ${r.status}`); return null; }
    const lines = (await r.text()).trim().split(/\r?\n/);
    const h = (lines[0] || '').toLowerCase().split(','), v = (lines[lines.length - 1] || '').split(',');
    const p = parseFloat(v[h.indexOf('close')]), d = v[h.indexOf('date')];
    if (!(p > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(d || '')) { note(code, `stooq keine Daten`); return null; }
    return { p, t: `${d}T20:00:00Z` };
  } catch (e) { note(code, `stooq ${e.message}`); return null; }
}
const stooqCcy = code => code.endsWith('.us') ? 'USD' : code.endsWith('.uk') ? 'GBp' : 'EUR';

const quotes = {}, fx = {}, missing = [];
let ses = null, batch = {}, tried = false;
for (const s of symbols) {
  let q = ISIN[s] ? (await tradegate(ISIN[s])) || (await onvista(ISIN[s])) : null;
  if (!q) { if (!tried) { tried = true; ses = await yahooSession(); batch = await yahooBatch([...symbols, 'EURUSD=X', 'EURDKK=X', 'EURGBP=X', 'EURCHF=X'], ses); } q = batch[s] || null; }
  if (!q && /\.(DE|F)$/.test(s)) { const c = s.toLowerCase().replace(/\.f$/, '.de'); const r = await stooq(c); if (r) q = { ...r, ccy: 'EUR', src: 'Stooq' }; }
  if (!q && US[s]) { const r = await stooq(US[s]); if (r) q = { ...r, ccy: stooqCcy(US[s]), src: 'Stooq, US-Notiz', alt: US[s] }; }
  if (q) quotes[s] = q; else missing.push(s);
  await sleep(250);
}
// Devisen: immer USD, DKK, GBP, CHF (Dividenden zahlen in Fremdwährung, auch wenn alle Kurse in Euro von Tradegate kommen).
// Zuerst der amtliche EZB-Referenzkurs, sonst Yahoo oder Stooq.
const need = new Set(['USD', 'DKK', 'GBP', 'CHF', ...Object.values(quotes).map(q => (q.ccy === 'GBp' || q.ccy === 'GBX') ? 'GBP' : q.ccy).filter(c => c && c !== 'EUR')]);
const fxSrc = {};
for (const c of need) {
  let r = null;
  try {
    const e = await fetch(`https://data-api.ecb.europa.eu/service/data/EXR/D.${c}.EUR.SP00.A?lastNObservations=1&format=csvdata`, { headers: { Accept: 'text/csv' } });
    if (e.ok) { const rows = (await e.text()).trim().split(/\r?\n/); const h = rows[0].split(','), v = rows[rows.length - 1].split(','); const p = parseFloat(v[h.indexOf('OBS_VALUE')]); if (p > 0) r = { p, src: `EZB-Referenzkurs ${v[h.indexOf('TIME_PERIOD')] || ''}`.trim() }; }
    else note(`EUR${c}`, `ecb ${e.status}`);
  } catch (e) { note(`EUR${c}`, `ecb ${e.message}`); }
  if (!r) { const y = batch[`EUR${c}=X`] || await yahoo(`EUR${c}=X`); if (y) r = { p: y.p, src: 'Yahoo Finance' }; }
  if (!r) { const s = await stooq(`eur${c.toLowerCase()}`); if (s) r = { p: s.p, src: 'Stooq' }; }
  if (r) { fx[c] = r.p; fxSrc[c] = r.src; } else missing.push(`EUR${c}`);
}
const used = [...new Set(Object.values(quotes).map(q => q.src))];
const data = { schedule: process.env.PRICE_CRON || '*/15 6-20 * * 1-5|37 21 * * 1-5', asOf: new Date().toISOString(), source: used.join(', ') || 'keine', note: 'Verzögerte Kurse, ohne Gewähr', quotes, fx, fxSrc, missing, errors };
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(data));
console.log(`Kurse: ${Object.keys(quotes).length}/${symbols.size} (${data.source}), Devisen: ${Object.keys(fx).join(',') || '-'}, fehlend: ${missing.join(',') || '-'}`);
