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
const symbols = new Set([...stamm.matchAll(/'([A-Z0-9.\-^=]+)':\{bucket/g)].map(m => m[1]));
if (fs.existsSync('symbols.txt')) fs.readFileSync('symbols.txt', 'utf8').split(/\r?\n/).map(l => l.replace(/#.*/, '').trim()).filter(Boolean).forEach(s => symbols.add(s));

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
async function stooq(code) {
  try {
    const r = await fetch(`https://stooq.com/q/l/?s=${encodeURIComponent(code)}&f=sd2t2c&h&e=csv`, { headers: { 'User-Agent': UA } });
    if (!r.ok) { note(code, `stooq ${r.status}`); return null; }
    const lines = (await r.text()).trim().split(/\r?\n/);
    const v = (lines[1] || '').split(',');
    const p = parseFloat(v[3]);
    if (!(p > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(v[1] || '')) { note(code, `stooq keine Daten`); return null; }
    return { p, t: `${v[1]}T${/^\d\d:\d\d:\d\d$/.test(v[2]) ? v[2] : '22:00:00'}Z` };
  } catch (e) { note(code, `stooq ${e.message}`); return null; }
}
const stooqCcy = code => code.endsWith('.us') ? 'USD' : code.endsWith('.uk') ? 'GBp' : 'EUR';

const quotes = {}, fx = {}, missing = [];
for (const s of symbols) {
  let q = await yahoo(s);
  if (!q && /\.(DE|F)$/.test(s)) { const c = s.toLowerCase().replace(/\.f$/, '.de'); const r = await stooq(c); if (r) q = { ...r, ccy: 'EUR', src: 'Stooq' }; }
  if (!q && US[s]) { const r = await stooq(US[s]); if (r) q = { ...r, ccy: stooqCcy(US[s]), src: 'Stooq, US-Notiz', alt: US[s] }; }
  if (q) quotes[s] = q; else missing.push(s);
  await sleep(250);
}
const need = new Set(Object.values(quotes).map(q => (q.ccy === 'GBp' || q.ccy === 'GBX') ? 'GBP' : q.ccy).filter(c => c && c !== 'EUR'));
for (const c of need) {
  let r = await yahoo(`EUR${c}=X`);
  if (!r) { const s = await stooq(`eur${c.toLowerCase()}`); if (s) r = s; }
  if (!r) {
    try {
      const e = await fetch(`https://data-api.ecb.europa.eu/service/data/EXR/D.${c}.EUR.SP00.A?lastNObservations=1&format=csvdata`);
      if (e.ok) { const rows = (await e.text()).trim().split(/\r?\n/); const h = rows[0].split(','), v = rows[rows.length - 1].split(','); const p = parseFloat(v[h.indexOf('OBS_VALUE')]); if (p > 0) r = { p }; }
      else note(`EUR${c}`, `ecb ${e.status}`);
    } catch (e) { note(`EUR${c}`, `ecb ${e.message}`); }
  }
  if (r) fx[c] = r.p;
}
const used = [...new Set(Object.values(quotes).map(q => q.src))];
const data = { asOf: new Date().toISOString(), source: used.join(', ') || 'keine', note: 'Verzögerte Kurse, ohne Gewähr', quotes, fx, missing, errors };
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(data));
console.log(`Kurse: ${Object.keys(quotes).length}/${symbols.size} (${data.source}), Devisen: ${Object.keys(fx).join(',') || '-'}, fehlend: ${missing.join(',') || '-'}`);
