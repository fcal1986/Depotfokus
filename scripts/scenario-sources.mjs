// Szenario-Monitor: Datenadapter für amtliche, frei abrufbare Quellen.
// EZB Data Portal (SDMX-CSV), Eurostat (JSON-stat 2.0), FRED (fredgraph.csv, ohne API-Schlüssel).
// Jeder Adapter liefert [{period, v}] in der echten Veröffentlichungsfrequenz oder wirft einen Fehler.
// Es werden keine Werte ergänzt, geschätzt oder aus dem Modellgedächtnis übernommen.

const UA = 'Depotfokus-Szenario-Monitor/1.0 (+https://github.com/fcal1986/Depotfokus)';
const sleep = ms => new Promise(r => setTimeout(r, ms));

export function makeFetcher({ timeoutMs = 20000, retries = 2, maxRequests = 30 } = {}) {
  let count = 0;
  return async function get(url, accept) {
    let last;
    for (let a = 0; a <= retries; a++) {
      if (++count > maxRequests) throw new Error(`Abruflimit von ${maxRequests} Anfragen erreicht`);
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeoutMs);
      try {
        const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: accept || '*/*' }, signal: ctl.signal });
        clearTimeout(t);
        if (r.status === 404) throw Object.assign(new Error('HTTP 404'), { fatal: true });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return { text: await r.text(), lastModified: r.headers.get('last-modified') };
      } catch (e) {
        clearTimeout(t); last = e.name === 'AbortError' ? new Error(`Zeitüberschreitung nach ${timeoutMs / 1000} s`) : e;
        if (e.fatal) break;
        if (a < retries) await sleep(1500 * (a + 1));
      }
    }
    throw last;
  };
}

/* Robuster CSV-Parser (Anführungszeichen, Kommas in Feldern) */
export function parseCSV(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++ } else q = false } else f += c; continue }
    if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); f = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = [] }
    else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row) }
  return rows;
}

const isoDaysAgo = (now, d) => new Date(now.getTime() - d * 864e5).toISOString().slice(0, 10);
const startFor = (freq, now) => freq === 'D' ? isoDaysAgo(now, 75) : freq === 'M' ? isoDaysAgo(now, 3 * 365).slice(0, 7) : `${now.getUTCFullYear() - 3}-Q1`;

/* EZB Data Portal: https://data-api.ecb.europa.eu/service/data/{FLOW}/{KEY}?format=csvdata */
export async function ecb(ind, get, now) {
  const [flow, key] = ind.key.split('/');
  const url = `https://data-api.ecb.europa.eu/service/data/${flow}/${key}?format=csvdata&startPeriod=${startFor(ind.frequency, now)}`;
  const { text, lastModified } = await get(url, 'text/csv');
  const rows = parseCSV(text); if (rows.length < 2) throw new Error('EZB: leere Antwort');
  const h = rows[0].map(x => x.trim()), it = h.indexOf('TIME_PERIOD'), iv = h.indexOf('OBS_VALUE');
  if (it < 0 || iv < 0) throw new Error('EZB: Spalten TIME_PERIOD/OBS_VALUE fehlen');
  const obs = rows.slice(1).map(r => ({ period: r[it], v: r[iv] === '' ? NaN : +r[iv] })).filter(o => o.period && Number.isFinite(o.v));
  if (!obs.length) throw new Error('EZB: keine Werte');
  return { obs: normPeriods(obs, ind.frequency), url, source_updated_at: lastModified ? new Date(lastModified).toISOString() : null, geo_used: 'U2 (Euroraum, wechselnde Zusammensetzung)' };
}

/* Eurostat JSON-stat 2.0. Euroraum-Code wechselt mit dem Beitritt neuer Länder (EA20 → EA21); deshalb Liste, gewählt wird der Code mit den jüngsten Daten. */
export async function eurostat(ind, get, now) {
  let best = null, errs = [];
  for (const geo of ind.geo || ['EA']) {
    const qs = new URLSearchParams({ format: 'JSON', lang: 'EN', geo, sinceTimePeriod: startFor(ind.frequency, now), ...(ind.params || {}) });
    const url = `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${ind.dataset}?${qs}`;
    try {
      const { text } = await get(url, 'application/json');
      const j = JSON.parse(text);
      const ids = j.id, size = j.size, ti = ids.indexOf('time');
      if (ti < 0) throw new Error('keine Zeitdimension');
      ids.forEach((d, k) => { if (k !== ti && size[k] !== 1) throw new Error(`Dimension ${d} nicht eindeutig (${size[k]})`) });
      const tIndex = j.dimension.time.category.index;
      const obs = Object.entries(tIndex).map(([p, k]) => ({ period: p, v: j.value[k] ?? j.value[String(k)] })).filter(o => Number.isFinite(o.v));
      if (!obs.length) { errs.push(`${geo}: keine Werte`); continue }
      const lastP = obs.map(o => o.period).sort().pop();
      if (!best || lastP > best.lastP) best = { obs: normPeriods(obs, ind.frequency), url, source_updated_at: j.updated ? new Date(j.updated).toISOString() : null, geo_used: geo, lastP };
    } catch (e) { errs.push(`${geo}: ${e.message}`) }
  }
  if (!best) throw new Error('Eurostat: ' + errs.join('; '));
  delete best.lastP; return best;
}

/* FRED Grafik-CSV (ohne Schlüssel). Spaltenkopf observation_date oder DATE. */
export async function fred(ind, get, now) {
  const cosd = ind.frequency === 'D' ? isoDaysAgo(now, 75) : isoDaysAgo(now, 4 * 365);
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(ind.series)}&cosd=${cosd}`;
  const { text, lastModified } = await get(url, 'text/csv');
  const rows = parseCSV(text); if (rows.length < 2) throw new Error('FRED: leere Antwort');
  const h = rows[0].map(x => x.trim()), id = h.findIndex(x => /^(observation_date|DATE)$/i.test(x)), iv = h.indexOf(ind.series);
  if (id < 0 || iv < 0) throw new Error('FRED: unerwartete Spalten ' + h.join(','));
  const obs = rows.slice(1).map(r => ({ period: r[id], v: r[iv] === '.' || r[iv] === '' ? NaN : +r[iv] })).filter(o => /^\d{4}-\d{2}-\d{2}$/.test(o.period) && Number.isFinite(o.v));
  if (!obs.length) throw new Error('FRED: keine Werte');
  return { obs: normPeriods(obs, ind.frequency), url: `https://fred.stlouisfed.org/series/${ind.series}`, source_updated_at: lastModified ? new Date(lastModified).toISOString() : null, geo_used: null };
}

/* Perioden einheitlich: Tag YYYY-MM-DD, Monat YYYY-MM, Quartal YYYY-Qn */
export function normPeriods(obs, freq) {
  const out = obs.map(o => {
    let p = String(o.period).trim(), m;
    if (freq === 'M') { if ((m = /^(\d{4})-(\d{2})/.exec(p))) p = `${m[1]}-${m[2]}` }
    else if (freq === 'Q') {
      if ((m = /^(\d{4})-?Q([1-4])$/.exec(p))) p = `${m[1]}-Q${m[2]}`;
      else if ((m = /^(\d{4})-(\d{2})-\d{2}$/.exec(p))) p = `${m[1]}-Q${Math.floor((+m[2] - 1) / 3) + 1}`;
    }
    return { period: p, v: o.v };
  });
  const seen = new Map(); out.forEach(o => seen.set(o.period, o)); // Doppelte Meldung derselben Periode = ein Ereignis
  return [...seen.values()].sort((a, b) => a.period < b.period ? -1 : 1);
}

export const ADAPTERS = { ecb, eurostat, fred };
