// Stufe 1: Neue Berichte erkennen. Läuft beim Veröffentlichen der Seite und schreibt reports.json.
// Kostenlos und ohne Schlüssel. Bewertet nichts, meldet nur, was seit der letzten Prüfung erschienen ist.
import fs from 'node:fs';
import path from 'node:path';
import { filingsFor, relevant, formLabel } from './sec.mjs';

const out = process.argv[2] || '_site/reports.json';
const info = JSON.parse(fs.readFileSync('data/info.json', 'utf8'));
const res = {
  checkedAt: new Date().toISOString(), source: 'SEC EDGAR',
  assessEnabled: process.env.HAS_KEY === 'true', model: process.env.MODEL || null,
  positions: {}, proposals: [], errors: {}
};

for (const [sym, p] of Object.entries(info.positions)) {
  if (!p.cik) continue;
  try {
    const { filings } = await filingsFor(p.cik);
    const rel = filings.filter(relevant);
    const since = (p.assessedFrom && p.assessedFrom.date > p.checked) ? p.assessedFrom.date : p.checked;
    const pick = f => ({ acc: f.acc, form: f.form, label: formLabel(f), date: f.date, url: f.url });
    res.positions[sym] = {
      cik: p.cik, checked: p.checked,
      latest: rel[0] ? pick(rel[0]) : null,
      new: rel.filter(f => f.date > since).slice(0, 5).map(pick)
    };
  } catch (e) { res.errors[sym] = e.message; }
}

// Offene Vorschläge der automatischen Bewertung (Pull Requests mit Branch bericht/…)
if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY) {
  try {
    const r = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/pulls?state=open&per_page=50`, {
      headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'depotfokus' }
    });
    if (r.ok) for (const pr of await r.json()) {
      const m = pr.head?.ref?.match(/^bericht\/(.+?)--/);
      if (m) res.proposals.push({ number: pr.number, title: pr.title, url: pr.html_url, sym: m[1].replace(/_/g, '.'), created: pr.created_at });
    } else res.errors.proposals = `GitHub ${r.status}`;
  } catch (e) { res.errors.proposals = e.message; }
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(res));
const n = Object.values(res.positions).reduce((a, p) => a + p.new.length, 0);
console.log(`Berichte geprüft: ${Object.keys(res.positions).length} Unternehmen, ${n} neu, ${res.proposals.length} Vorschläge offen, Fehler: ${Object.keys(res.errors).join(',') || '-'}`);
