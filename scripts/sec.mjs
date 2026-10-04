// Gemeinsame Funktionen für den Zugriff auf SEC EDGAR (öffentlich, ohne Schlüssel).
// Die SEC verlangt einen User-Agent mit Kontakt; über SEC_USER_AGENT anpassbar.
// Für Tests: SEC_MOCK_DIR mit sub_<cik>.json und doc_<accession>.txt.
import fs from 'node:fs';
import path from 'node:path';

export const UA = process.env.SEC_USER_AGENT || 'Depotfokus (github.com/fcal1986/Depotfokus)';
const MOCK = process.env.SEC_MOCK_DIR || '';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(url, as = 'json') {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Encoding': 'gzip, deflate' } });
    if (r.status === 429 || r.status >= 500) { await sleep(1500 * (i + 1)); continue; }
    if (!r.ok) throw new Error(`SEC ${r.status} ${url}`);
    await sleep(150); // höchstens ~10 Anfragen je Sekunde
    return as === 'json' ? r.json() : r.text();
  }
  throw new Error(`SEC nicht erreichbar ${url}`);
}

const pad = cik => String(cik).padStart(10, '0');
const FORM = {
  '8-K': 'Ergebnismeldung (SEC 8-K)', '10-Q': 'Quartalsbericht (SEC 10-Q)', '10-K': 'Jahresbericht (SEC 10-K)',
  '6-K': 'Mitteilung (SEC 6-K)', '20-F': 'Jahresbericht (SEC 20-F)', '40-F': 'Jahresbericht (SEC 40-F)'
};
export const formLabel = f => FORM[f.form] || `SEC ${f.form}`;

/** Letzte Einreichungen eines Unternehmens */
export async function filingsFor(cik) {
  const j = MOCK ? JSON.parse(fs.readFileSync(path.join(MOCK, `sub_${cik}.json`), 'utf8'))
    : await get(`https://data.sec.gov/submissions/CIK${pad(cik)}.json`);
  const r = j.filings?.recent || {};
  const out = (r.accessionNumber || []).map((acc, i) => {
    const nod = acc.replace(/-/g, '');
    return {
      acc, date: r.filingDate[i], report: r.reportDate?.[i] || null, form: r.form[i], items: r.items?.[i] || '',
      doc: r.primaryDocument?.[i] || '', desc: r.primaryDocDescription?.[i] || '',
      url: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${nod}/${r.primaryDocument?.[i] || ''}`,
      dir: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${nod}/`
    };
  });
  return { name: j.name || '', filings: out };
}

/** Ist die Einreichung für die Einordnung relevant? Ergebnismeldungen, Quartals- und Jahresberichte, Mitteilungen ausländischer Emittenten. */
export function relevant(f) {
  if (f.form === '8-K') return /(^|,)\s*2\.02/.test(f.items);
  return ['10-Q', '10-K', '6-K', '20-F'].includes(f.form);
}
export const isResults = f => (f.form === '8-K' && /(^|,)\s*2\.02/.test(f.items));

/** Hauptdokument: bei 8-K und 6-K die Pressemitteilung (Exhibit 99.1), sonst das Primärdokument */
export async function mainDocument(f) {
  if (MOCK) {
    const p = path.join(MOCK, `doc_${f.acc}.txt`);
    return { url: f.url, text: fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '' };
  }
  let url = f.url;
  if (['8-K', '6-K'].includes(f.form)) {
    try {
      const idx = await get(f.dir + 'index.json');
      const items = (idx.directory?.item || []).map(x => x.name).filter(n => /\.(htm|html|txt)$/i.test(n));
      const ex = items.find(n => /ex[-_]?99[-_.]?0?1|ex991|exhibit99/i.test(n)) || items.find(n => /ex[-_]?99/i.test(n));
      if (ex) url = f.dir + ex;
    } catch (e) { /* Primärdokument verwenden */ }
  }
  const html = await get(url, 'text');
  return { url, text: htmlToText(html) };
}

export function htmlToText(html) {
  return String(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|tr|li|h\d|table|br)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&#8217;|&rsquo;/gi, "'").replace(/&#8216;|&lsquo;/gi, "'").replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#8211;|&#8212;|&ndash;|&mdash;/gi, '-').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/[ \t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Ergebnis-Mitteilung? Grobe, kostenlose Vorprüfung für 6-K (z. B. Novo meldet auch wöchentliche Aktienrückkäufe). */
export function looksLikeResults(text) {
  const head = text.slice(0, 4000).toLowerCase();
  if (/share repurchase programme|share buy-?back|transactions in connection with|major shareholder/.test(head) && !/(financial|interim) report|results for/.test(head)) return false;
  return /(financial|interim|quarterly|annual) (report|results|statements)|results for the|first (three|six|nine) months|operating profit|net sales|earnings per share/.test(head);
}

export const isoToDe = s => s ? s.split('-').reverse().join('.') : '';
