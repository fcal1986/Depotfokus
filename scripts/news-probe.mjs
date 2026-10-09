// Temporär: prüft Feeds und Quellseiten aus GitHub Actions.
import fs from 'node:fs';
import { makeGetter, fetchSource, fetchPage } from './news-sources.mjs';
const cfg = JSON.parse(fs.readFileSync('data/news/sources.json', 'utf8'));
const get = makeGetter({ maxRequests: 200 });
console.log('KEY vorhanden:', process.env.HAS_KEY);
for (const s of cfg.sources) {
  try {
    const r = await fetchSource(s, get);
    console.log(`\n## ${s.id} OK ${r.feed_url} (${r.items.length})`);
    r.items.slice(0, 6).forEach(i => console.log(`- ${i.published_at} | ${i.title.slice(0, 110)} | ${i.url}`));
    try { const p = await fetchPage(r.items[0].url, get); console.log(`  Seite: ${p.text.length} Zeichen: ${p.text.slice(0, 300).replace(/\n/g, ' ')}`); } catch (e) { console.log('  Seite FEHLER', e.message); }
  } catch (e) { console.log(`\n## ${s.id} FEHLER ${e.message}`); }
}
