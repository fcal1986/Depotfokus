// Ruft Tageskurse für die bekannten Wertpapiere ab und schreibt _site/prices.json.
// Läuft in GitHub Actions beim Veröffentlichen. Es werden keine Bestände übertragen,
// nur öffentliche Symbole aus den Stammdaten (src/logic.js) und symbols.txt.
// Schlägt der Abruf fehl, wird eine leere Kursdatei geschrieben; die App nutzt dann die Exportwerte.
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] || '_site/prices.json';
const logic = fs.readFileSync('src/logic.js', 'utf8');
const stamm = logic.slice(logic.indexOf('const STAMM={'), logic.indexOf('};', logic.indexOf('const STAMM={')));
const symbols = new Set([...stamm.matchAll(/'([A-Z0-9.\-^=]+)':\{bucket/g)].map(m => m[1]));
if (fs.existsSync('symbols.txt')) fs.readFileSync('symbols.txt', 'utf8').split(/\s+/).filter(s => s && !s.startsWith('#')).forEach(s => symbols.add(s));
const FX = { USD: 'EURUSD=X', DKK: 'EURDKK=X', GBP: 'EURGBP=X', CHF: 'EURCHF=X' };

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function chart(sym) {
  for (const host of ['query1', 'query2']) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=5d&interval=1d`, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
        if (r.status === 429) { await sleep(1500); continue; }
        if (!r.ok) break;
        const j = await r.json();
        const m = j?.chart?.result?.[0]?.meta;
        if (m && m.regularMarketPrice > 0) return { p: m.regularMarketPrice, ccy: m.currency, t: new Date(m.regularMarketTime * 1000).toISOString(), ex: m.exchangeName };
        break;
      } catch (e) { await sleep(500); }
    }
  }
  return null;
}

const quotes = {}, fx = {}, missing = [];
for (const s of symbols) { const q = await chart(s); if (q) quotes[s] = q; else missing.push(s); await sleep(250); }
const need = new Set(Object.values(quotes).map(q => q.ccy === 'GBp' || q.ccy === 'GBX' ? 'GBP' : q.ccy).filter(c => c && c !== 'EUR'));
for (const c of need) { if (!FX[c]) continue; const q = await chart(FX[c]); if (q) fx[c] = q.p; await sleep(250); }

const data = { asOf: new Date().toISOString(), source: 'Yahoo Finance', note: 'Verzögerte Kurse, ohne Gewähr', quotes, fx, missing };
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(data));
console.log(`Kurse: ${Object.keys(quotes).length}/${symbols.size}, Devisen: ${Object.keys(fx).join(',') || '-'}, fehlend: ${missing.join(',') || '-'}`);
