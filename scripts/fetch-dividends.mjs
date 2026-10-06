// Sammelt Dividenden (Ex-Tag, Zahltag, Betrag je Aktie) für die bekannten Wertpapiere und schreibt dividends.json.
// Läuft in GitHub Actions beim Veröffentlichen, höchstens einmal am Tag (Cache). Es werden keine Bestände übertragen,
// nur öffentliche Symbole aus den Stammdaten (src/logic.js) und symbols.txt.
// Quellen: Nasdaq (US-Aktien, inklusive bereits erklärter künftiger Zahlungen mit Zahltag),
// sonst Yahoo Finance (Ex-Tage und Beträge der letzten zwei Jahre, ohne Zahltag).
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] || '_site/dividends.json';
const logic = fs.readFileSync('src/logic.js', 'utf8');
const i0 = logic.indexOf('const STAMM={');
const stamm = logic.slice(i0, logic.indexOf('};', i0));
const symbols = new Set([...stamm.matchAll(/'([A-Z0-9.\-^=]+)':\{(?:isin:'[A-Z0-9]{12}',)?bucket/g)].map(m => m[1]));
const FUND = new Set([...stamm.matchAll(/'([A-Z0-9.\-^=]+)':\{[^}]*fund:true/g)].map(m => m[1]));
// symbols.txt: je Zeile "SYMBOL ISIN [US-TICKER]"; der US-Ticker (z. B. KO) erlaubt den Abruf bei Nasdaq
const USX = {};
if (fs.existsSync('symbols.txt')) fs.readFileSync('symbols.txt', 'utf8').split(/\r?\n/).map(l => l.replace(/#.*/, '').trim()).filter(Boolean).forEach(l => { const [sy, , us] = l.split(/\s+/); symbols.add(sy); if (/^[A-Z.]{1,6}$/.test(us || '')) USX[sy] = us; });

// US-Ticker der Stammdaten (Nasdaq kennt Zahltage und erklärte künftige Dividenden)
const NASDAQ = { '9A2.F': 'ARCC', '13M.F': 'MAIN', 'WX4.F': 'OHI', 'RY6.F': 'O', 'PEP.DE': 'PEP', 'JNJ.DE': 'JNJ', 'CCC3.DE': 'KO', 'PRG.DE': 'PG',
  'MSF.DE': 'MSFT', '3V64.DE': 'V', GOOG: 'GOOG', AAPL: 'AAPL', MA: 'MA', ...USX };
// Yahoo-Symbol mit der Heimatbörse, wenn die deutsche Notiz keine Dividenden führt
const YAHOO = { 'NOV.DE': 'NOVO-B.CO' };

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = {};
const note = (s, m) => { (errors[s] = errors[s] || []).push(m); };
const today = new Date().toISOString().slice(0, 10);
const since = new Date(Date.now() - 800 * 864e5).toISOString().slice(0, 10);
// Abruf mit Wiederholung bei Ratenbegrenzung (429) und Serverfehlern
// Gesamtzeit begrenzen, damit der Seitenaufbau nicht hängt; was fehlt, holt der nächste Lauf
const DEADLINE = Date.now() + (+process.env.DIV_MAX_SECONDS || 240) * 1000;
const late = () => Date.now() > DEADLINE;
async function get(url, headers, tag) {
  for (let i = 0; i < 3 && !late(); i++) {
    try {
      const r = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
      if (r.ok) return r;
      note(tag, `${r.status}${i ? ' (Versuch ' + (i + 1) + ')' : ''}`);
      if (r.status !== 429 && r.status < 500) return null;
    } catch (e) { note(tag, e.message); }
    if (i < 2) await sleep(3000 * (i + 1));
  }
  return null;
}
const usDate = s => { const m = String(s || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[1]}-${m[2]}` : null; };

async function nasdaq(t) {
  for (const cls of ['stocks']) {
    try {
      const r = await get(`https://api.nasdaq.com/api/quote/${encodeURIComponent(t)}/dividends?assetclass=${cls}`,
        { 'User-Agent': UA, Accept: 'application/json, text/plain, */*', Origin: 'https://www.nasdaq.com', Referer: 'https://www.nasdaq.com/' }, `${t} nasdaq ${cls}`);
      if (!r) continue;
      const rows = (await r.json())?.data?.dividends?.rows || [];
      const ev = rows.filter(x => /cash/i.test(x.type || 'cash')).map(x => ({
        ex: usDate(x.exOrEffDate), pay: usDate(x.paymentDate), decl: usDate(x.declarationDate),
        amount: parseFloat(String(x.amount || '').replace(/[^0-9.]/g, '')) })).filter(x => x.ex && x.ex >= since && x.amount > 0);
      if (ev.length) return { src: 'Nasdaq', ref: t, ccy: 'USD', url: `https://www.nasdaq.com/market-activity/stocks/${t.toLowerCase()}/dividend-history`, ev };
      note(t, `nasdaq ${cls} leer`);
    } catch (e) { note(t, `nasdaq ${cls} ${e.message}`); }
  }
  return null;
}
// Yahoo mit Sitzungscookie und Crumb (ohne Cookie antwortet Yahoo schnell mit 429)
let ses;
async function yahooSession() {
  if (ses !== undefined) return ses;
  ses = null;
  try {
    let cookie = '';
    for (const u of ['https://fc.yahoo.com', 'https://finance.yahoo.com/']) {
      const r = await fetch(u, { headers: { 'User-Agent': UA }, redirect: 'manual', signal: AbortSignal.timeout(10000) });
      const sc = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : [r.headers.get('set-cookie')].filter(Boolean);
      cookie = sc.map(c => c.split(';')[0]).join('; ');
      if (cookie) break;
    }
    if (!cookie) { note('yahoo', 'kein Cookie'); return ses; }
    const c = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', { headers: { 'User-Agent': UA, Cookie: cookie }, signal: AbortSignal.timeout(10000) });
    const crumb = (await c.text()).trim();
    if (c.ok && crumb && crumb.length < 40 && !/[<{]/.test(crumb)) ses = { cookie, crumb }; else note('yahoo', `crumb ${c.status}`);
  } catch (e) { note('yahoo', e.message); }
  return ses;
}
async function yahoo(sym) {
  const s = await yahooSession();
  for (const host of ['query2', 'query1']) {
    try {
      const r = await get(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=2y&interval=1d&events=div${s ? '&crumb=' + encodeURIComponent(s.crumb) : ''}`,
        { 'User-Agent': UA, Accept: 'application/json', ...(s ? { Cookie: s.cookie } : {}) }, `${sym} yahoo ${host}`);
      if (!r) continue;
      const res = (await r.json())?.chart?.result?.[0];
      const d = res?.events?.dividends || {};
      const ccy = res?.meta?.currency || null;
      const ev = Object.values(d).map(x => ({ ex: new Date(x.date * 1000).toISOString().slice(0, 10), pay: null, decl: null, amount: x.amount }))
        .filter(x => x.ex >= since && x.amount > 0);
      if (!res) { note(sym, `yahoo ${host} leer`); continue; }
      // GBp (Pence) in Pfund umrechnen
      const gbp = ccy === 'GBp' || ccy === 'GBX';
      return { src: 'Yahoo Finance', ref: sym, ccy: gbp ? 'GBP' : ccy, url: `https://finance.yahoo.com/quote/${encodeURIComponent(sym)}/history/?filter=div`,
        ev: gbp ? ev.map(x => ({ ...x, amount: x.amount / 100 })) : ev };
    } catch (e) { note(sym, `yahoo ${host} ${e.message}`); }
  }
  return null;
}

// Letzter Stand: fehlt ein Wertpapier diesmal, bleiben seine älteren Daten erhalten
let prev = {}, tried = {};
try { const j = JSON.parse(fs.readFileSync(out, 'utf8')); prev = j.items || {}; tried = j.tried || {}; } catch (e) {}
// Portionen: je Lauf nur die Wertpapiere mit den ältesten Daten (Nasdaq und Yahoo drosseln Serverabrufe stark).
// Bei Läufen alle 15 Minuten ist nach rund einer Stunde alles da, danach wird jedes Wertpapier einmal am Tag erneuert.
const BATCH = +process.env.DIV_BATCH || 5, MAXAGE = 20 * 3600e3;
// Fehlversuche frühestens nach zwei Stunden wiederholen, damit sie die Portion nicht blockieren
const since0 = t => t ? Date.now() - Date.parse(t) : Infinity;
const isDue = s => since0(prev[s] && prev[s].at) > MAXAGE && since0(tried[s]) > 2 * 3600e3;
const due = [...symbols].filter(isDue).sort((a, b) => since0(tried[b]) - since0(tried[a])).slice(0, BATCH);
const items = {}, missing = [];
for (const s of symbols) if (prev[s] && !due.includes(s)) items[s] = prev[s];
let fresh = 0;
for (const s of due) {
  if (late()) { if (prev[s]) items[s] = prev[s]; note(s, 'Zeitlimit'); continue; }
  tried[s] = new Date().toISOString();
  let it = NASDAQ[s] && !FUND.has(s) ? await nasdaq(NASDAQ[s]) : null;
  if (!it) it = await yahoo(YAHOO[s] || s);
  if (!it && NASDAQ[s]) it = await yahoo(NASDAQ[s]);
  if (it) { it.ev.sort((a, b) => a.ex < b.ex ? -1 : 1); it.at = tried[s]; items[s] = it; fresh++; }
  else if (prev[s]) items[s] = prev[s];
  await sleep(3000);
}
for (const s of symbols) if (!items[s]) missing.push(s);
const used = [...new Set(Object.values(items).map(x => x.src))];
const data = { asOf: Object.values(items).map(x => x.at).filter(Boolean).sort().pop() || null, checkedAt: new Date().toISOString(), due, tried, today, source: used.join(', ') || 'keine',
  note: 'Dividenden je Aktie in Originalwährung: ex = Ex-Tag, pay = Zahltag (falls bekannt), decl = Tag der Erklärung. Ohne Gewähr.', items, missing, errors };
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(data));
const fut = Object.values(items).reduce((a, x) => a + x.ev.filter(e => (e.pay || e.ex) >= today).length, 0);
console.log(due.length ? `Dividenden: ${fresh}/${due.length} dieser Portion abgerufen (${due.join(',')}), gesamt ${Object.keys(items).length}/${symbols.size}, ${fut} erklärte künftige Zahlungen, fehlend: ${missing.join(',') || '-'}` : `Dividenden: alle ${symbols.size} Wertpapiere jünger als 20 Stunden, nichts zu tun.`);
