// Nachrichten: Abruf und Normalisierung amtlicher Feeds (RSS 2.0, Atom, RDF) und Quellseiten.
// Liefert nur, was die Quelle tatsächlich ausliefert; nichts wird ergänzt.
const UA = 'Depotfokus-Nachrichten/1.0 (+https://github.com/fcal1986/Depotfokus)';
const sleep = ms => new Promise(r => setTimeout(r, ms));

export function makeGetter({ timeoutMs = 20000, retries = 2, maxRequests = 60 } = {}) {
  let n = 0;
  return async function get(url, accept) {
    let last;
    for (let a = 0; a <= retries; a++) {
      if (++n > maxRequests) throw new Error(`Abruflimit ${maxRequests} erreicht`);
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeoutMs);
      try {
        const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: accept || '*/*', 'Accept-Language': 'de,en;q=0.8' }, signal: ctl.signal, redirect: 'follow' });
        clearTimeout(t);
        if (r.status === 404 || r.status === 403 || r.status === 410) throw Object.assign(new Error(`HTTP ${r.status}`), { fatal: true });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return { text: await r.text(), type: r.headers.get('content-type') || '', url: r.url };
      } catch (e) {
        clearTimeout(t); last = e.name === 'AbortError' ? new Error('Zeitüberschreitung') : e;
        if (e.fatal) break;
        if (a < retries) await sleep(1200 * (a + 1));
      }
    }
    throw last;
  };
}

export const rx = p => { const i = p.startsWith('(?i)'); return new RegExp(i ? p.slice(4) : p, i ? 'i' : ''); };

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', bdquo: '„', hellip: '…', euro: '€', auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß', eacute: 'é', middot: '·', shy: '' };
export function decode(s) {
  return String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&([a-z]+);/gi, (m, k) => ENT[k] ?? m);
}
export const stripTags = s => decode(String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>|<\/p>|<\/li>|<\/h\d>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();

const tag = (xml, name) => { const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i').exec(xml); return m ? m[1] : null; };
const attr = (xml, name, a) => { const m = new RegExp(`<${name}\\b[^>]*\\b${a}="([^"]*)"`, 'i').exec(xml); return m ? decode(m[1]) : null; };

export function parseFeed(xml) {
  const items = [];
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks) {
    const title = stripTags(tag(b, 'title'));
    let link = stripTags(tag(b, 'link')) || attr(b, 'link', 'href') || stripTags(tag(b, 'guid'));
    const date = stripTags(tag(b, 'pubDate') || tag(b, 'dc:date') || tag(b, 'published') || tag(b, 'updated') || '');
    const desc = stripTags(tag(b, 'description') || tag(b, 'summary') || tag(b, 'content') || '');
    const d = date ? new Date(date) : null;
    if (!title || !link) continue;
    items.push({ title, url: link.trim(), published_at: d && !isNaN(d) ? d.toISOString() : null, summary: desc.slice(0, 600) });
  }
  return items;
}

export async function fetchSource(src, get) {
  const errs = [];
  for (const u of src.urls) {
    try {
      const r = await get(u, 'application/rss+xml, application/atom+xml, application/xml, text/xml');
      if (!/<(rss|feed|rdf:RDF)\b/i.test(r.text)) { errs.push(`${u}: kein Feed`); continue; }
      const items = parseFeed(r.text);
      if (!items.length) { errs.push(`${u}: leer`); continue; }
      return { feed_url: u, items };
    } catch (e) { errs.push(`${u}: ${e.message}`); }
  }
  throw new Error(errs.join(' | '));
}

/* Quellseite als Text. Bevorzugt <main>/<article>, entfernt Navigation. PDFs werden nicht gelesen. */
export async function fetchPage(url, get, maxChars = 14000) {
  const r = await get(url, 'text/html');
  if (/pdf/i.test(r.type) || /\.pdf($|\?)/i.test(url)) throw new Error('PDF wird nicht ausgewertet');
  let h = r.text.replace(/<(nav|header|footer|aside|form|noscript)\b[\s\S]*?<\/\1>/gi, ' ');
  const main = tag(h, 'main') || tag(h, 'article') || tag(h, 'body') || h;
  const text = stripTags(main);
  if (text.length < 200) throw new Error('Seite enthält kaum Text');
  return { text: text.slice(0, maxChars), truncated: text.length > maxChars, final_url: r.url };
}
