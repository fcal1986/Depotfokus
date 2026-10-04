// Stufe 2: Neue Berichte mit Claude einordnen und als Pull Request zur Freigabe vorlegen.
// Nichts geht ungeprüft live: Die App ändert sich erst, wenn du den Pull Request zusammenführst.
//
// Schutzmechanismen
// - Jede Aussage braucht ein wörtliches Zitat aus dem Bericht; das Skript prüft, dass es dort steht.
// - Jede Zahl der Aussage muss im Zitat vorkommen; sonst wird die Aussage verworfen.
// - Regeln behalten Frage, Kennzahl und Bedingung; nur Periode, Beobachtung und Status werden aktualisiert.
// - Höchstens MAX_REPORTS Berichte je Lauf; jede Einreichung wird nur einmal bewertet (data/assessed.json).
//
// Umgebung: ANTHROPIC_API_KEY (Secret), MODEL (Standard claude-sonnet-5-5), MAX_REPORTS (3),
// GITHUB_TOKEN, GITHUB_REPOSITORY. Tests: SEC_MOCK_DIR, CLAUDE_MOCK_DIR, DRY_RUN=1.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { filingsFor, relevant, isResults, mainDocument, looksLikeResults, formLabel, isoToDe } from './sec.mjs';

const KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.MODEL || 'claude-sonnet-5-5';
const MAX = +(process.env.MAX_REPORTS || 3);
const DRY = !!process.env.DRY_RUN;
const CMOCK = process.env.CLAUDE_MOCK_DIR || '';
const PRICE = { in: +(process.env.PRICE_IN || 2), out: +(process.env.PRICE_OUT || 10) }; // $ je Mio. Token (Sonnet 5.5)
const summary = [];
const log = s => { console.log(s); summary.push(s); };
const finish = () => { if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.join('\n') + '\n'); };

if (!KEY && !CMOCK) { log('Automatische Bewertung nicht eingerichtet: Secret ANTHROPIC_API_KEY fehlt.'); finish(); process.exit(0); }

const INFO_P = 'data/info.json', RES_P = 'data/resolved.json', ST_P = 'data/assessed.json';
const readJ = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJ = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 1) + '\n');
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const today = new Date().toISOString().slice(0, 10);

/* ---------- Prüfungen ---------- */
const norm = s => String(s || '').toLowerCase().replace(/[ \s]+/g, ' ').replace(/[’‘`]/g, "'").replace(/[“”„]/g, '"').replace(/[–—−]/g, '-').replace(/\s*\|\s*/g, ' ').trim();
export function quoteOk(quote, text) {
  const q = norm(quote), t = norm(text);
  if (q.length < 8) return false;
  const parts = q.split(/\s*(?:\.\.\.|…)\s*/).filter(x => x.length >= 8);
  return parts.length > 0 && parts.every(p => t.includes(p));
}
// Zahlen aus deutschem Text (0,47 · 1.234,5 · 13,4) und englischem Zitat (0.47 · 1,234.5 · 13.4)
const deNums = s => (String(s).match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g) || []).map(x => parseFloat(x.replace(/\./g, '').replace(',', '.')));
const enNums = s => (String(s).match(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g) || []).map(x => parseFloat(x.replace(/,/g, '')));
export function numbersOk(t, quote) {
  const q = enNums(quote).concat(deNums(quote));
  const need = deNums(t).filter(n => !(Number.isInteger(n) && (n < 10 || (n >= 1990 && n <= 2100))));
  const miss = need.filter(n => !q.some(x => Math.abs(x - n) <= Math.max(0.005, Math.abs(n) * 0.005)));
  return { ok: miss.length === 0, miss };
}

/* ---------- Claude ---------- */
const SYSTEM = `Du ordnest Unternehmensberichte für Depotfokus ein, ein Werkzeug für Privatanleger in Deutschland.
Regeln:
- Schreibe auf Deutsch, sachlich und kurz. Zahlen im deutschen Format (0,47 $; 13,4 Mrd. $; 5,2 %).
- Keine Empfehlungen, keine Wörter wie kaufen, verkaufen, Kursziel. Keine Prognosen über den Aktienkurs.
- Jede Aussage in changes, facts und jede Regelbeobachtung braucht ein wörtliches Zitat aus dem Bericht (Originalsprache, zusammenhängend, höchstens 300 Zeichen). Jede Zahl der Aussage muss im Zitat stehen. Was nicht im Bericht steht, lässt du weg.
- kind "metric" für berichtete Kennzahlen, "company" für Aussagen oder Prognosen des Unternehmens.
- Regeln: Frage (q) exakt wie vorgegeben übernehmen. Status nur aus dem Bericht ableiten. goal: met | not_met | np; risk: occurred | not_occurred | np. np, wenn der Bericht die Kennzahl nicht enthält.
- interp: höchstens zwei Sätze, was sich für einen langfristigen Anleger geändert hat. Ausgewogen.
- mood: pos (Rückenwind), warn (beobachten), neg (Gegenwind), neutral.
- relevant=false, wenn das Dokument keine Ergebnismeldung oder kein Bericht mit Kennzahlen ist.`;

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['relevant', 'period', 'mood', 'interp', 'changes_cmp', 'changes', 'facts', 'rules', 'notes'],
  properties: {
    relevant: { type: 'boolean' },
    period: { type: 'string', description: 'Berichtsperiode, z. B. "Q3 2026" oder "Q1 GJ 2027"' },
    mood: { type: 'string', enum: ['pos', 'warn', 'neg', 'neutral'] },
    interp: { type: 'string' },
    changes_cmp: { type: 'string', description: 'z. B. "Q3 2026 gegenüber Q2 2026"' },
    changes: { type: 'array', maxItems: 3, items: { type: 'object', additionalProperties: false, required: ['kind', 't', 'quote'], properties: { kind: { type: 'string', enum: ['metric', 'company'] }, t: { type: 'string' }, quote: { type: 'string' } } } },
    facts: { type: 'array', maxItems: 4, items: { type: 'object', additionalProperties: false, required: ['kind', 't', 'quote'], properties: { kind: { type: 'string', enum: ['metric', 'company'] }, t: { type: 'string' }, quote: { type: 'string' } } } },
    rules: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['q', 'per', 'obs', 'status', 'quote', 'next'], properties: { q: { type: 'string' }, per: { type: 'string' }, obs: { type: 'string' }, status: { type: 'string', enum: ['met', 'not_met', 'occurred', 'not_occurred', 'np'] }, quote: { type: 'string' }, next: { type: 'string', description: 'Nächster Bericht, z. B. "Bericht Q4 2026, Termin geschätzt Ende Januar"' } } } },
    notes: { type: 'string', description: 'Unsicherheiten oder Grenzen der Einordnung' }
  }
};

async function askClaude(sym, entry, f, doc, name) {
  if (CMOCK) return { input: readJ(path.join(CMOCK, `claude_${f.acc}.json`)), usage: { input_tokens: 0, output_tokens: 0 } };
  const ctx = {
    position: name, symbol: sym, bisherige_einordnung: { stand: entry.checked, interp: entry.interp, changes: entry.changes, facts: entry.facts },
    regeln: (entry.rules || []).map(r => ({ q: r.q, type: r.type, metric: r.metric, cond: r.cond, bisher: { per: r.per, obs: r.obs, status: r.status } })),
    bericht: { form: f.form, datum: f.date, url: doc.url }
  };
  const text = doc.text.length > 120000 ? doc.text.slice(0, 120000) + '\n[gekürzt]' : doc.text;
  const body = {
    model: MODEL, max_tokens: 4000, system: SYSTEM,
    tools: [{ name: 'einordnung', description: 'Neue Einordnung der Position auf Basis des Berichts', input_schema: SCHEMA }],
    tool_choice: { type: 'tool', name: 'einordnung' },
    messages: [{ role: 'user', content: `Kontext (JSON):\n${JSON.stringify(ctx, null, 1)}\n\nBericht (Text):\n<bericht>\n${text}\n</bericht>` }]
  };
  for (let i = 0; i < 3; i++) {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (r.status === 429 || r.status >= 500) { await new Promise(s => setTimeout(s, 5000 * (i + 1))); continue; }
    const j = await r.json();
    if (!r.ok) throw new Error(`Claude API ${r.status}: ${j?.error?.message || ''}`);
    const tu = (j.content || []).find(c => c.type === 'tool_use');
    if (!tu) throw new Error('Claude API: keine strukturierte Antwort');
    return { input: tu.input, usage: j.usage || {} };
  }
  throw new Error('Claude API nicht erreichbar');
}

/* ---------- Einordnung prüfen und übernehmen ---------- */
export function applyAssessment(info, resolved, sym, f, doc, out, companyName) {
  const old = info.positions[sym];
  const srcKey = `${sym.replace(/\W/g, '').toLowerCase()}_${f.acc.replace(/-/g, '')}`;
  const rejected = [], accepted = { changes: [], facts: [], rules: [] };
  const check = (it, what) => {
    if (!quoteOk(it.quote, doc.text)) { rejected.push({ what, t: it.t || it.obs, why: 'Zitat nicht im Bericht gefunden', quote: it.quote }); return false; }
    const n = numbersOk(it.t ?? it.obs, it.quote);
    if (!n.ok) { rejected.push({ what, t: it.t || it.obs, why: `Zahl nicht im Zitat: ${n.miss.join(', ')}`, quote: it.quote }); return false; }
    return true;
  };
  for (const c of out.changes || []) if (check(c, 'Veränderung')) accepted.changes.push(c);
  for (const c of out.facts || []) if (check(c, 'Fakt')) accepted.facts.push(c);
  const allowed = { goal: ['met', 'not_met', 'np'], risk: ['occurred', 'not_occurred', 'np'] };
  const rules = (old.rules || []).map(r => {
    const m = (out.rules || []).find(x => x.q.trim() === r.q.trim());
    if (!m) return { r, changed: false };
    if (!allowed[r.type].includes(m.status)) { rejected.push({ what: 'Regel', t: r.q, why: `Status ${m.status} passt nicht zum Regeltyp` }); return { r, changed: false }; }
    if (m.status === 'np') return { r: { ...r, next: m.next || r.next }, changed: false, np: true };
    if (!check({ ...m, t: m.obs }, 'Regel')) return { r, changed: false };
    const nr = { ...r, per: m.per, obs: m.obs, prev: r.obs ? `${r.per}: ${r.obs}` : r.prev, status: m.status, src: srcKey, next: m.next || r.next, quote: m.quote };
    accepted.rules.push({ old: r, neu: nr });
    return { r: nr, changed: true, old: r };
  });
  const entry = {
    ...old, checked: today, method: 'claude', model: MODEL,
    assessedFrom: { acc: f.acc, form: f.form, date: f.date, url: doc.url },
    mood: out.mood || old.mood,
    interp: out.interp && out.interp.length < 400 ? out.interp : old.interp,
    changes: accepted.changes.length ? { cmp: out.changes_cmp || out.period, items: accepted.changes.map(c => ({ kind: c.kind, t: c.t, src: [srcKey], quote: c.quote })) } : { cmp: out.changes_cmp || out.period, items: [] },
    // Neue, geprüfte Fakten zuerst; ältere bleiben mit ihrer eigenen Quelle stehen, bis es mindestens drei neue gibt
    facts: accepted.facts.map(c => ({ kind: c.kind, t: c.t, src: srcKey, quote: c.quote })).concat((old.facts || []).slice(0, Math.max(0, 3 - accepted.facts.length))),
    rules: rules.map(x => x.r)
  };
  info.sources[srcKey] = { org: companyName, doc: formLabel(f), per: out.period || '', date: isoToDe(f.date), url: doc.url };
  info.positions[sym] = entry;
  // Offene Liga-Prognosen auflösen: Frage-ID wie in der App (o|Symbol|nächster Bericht|Frage)
  const yes = r => (r.type === 'goal' && r.status === 'met') || (r.type === 'risk' && r.status === 'occurred');
  for (const x of rules) if (x.changed) resolved[`o|${sym}|${x.old.next}|${x.old.q}`] = { outcome: yes(x.r) ? 1 : 0, per: x.r.per, obs: x.r.obs, src: srcKey, at: today };
  return { entry, old, rejected, accepted, srcKey };
}

function prBody(sym, name, f, doc, out, a, usage) {
  const st = { met: 'erfüllt', not_met: 'nicht erfüllt', occurred: 'eingetreten', not_occurred: 'nicht eingetreten', open: 'offen', np: 'nicht prüfbar' };
  const cost = ((usage.input_tokens || 0) * PRICE.in + (usage.output_tokens || 0) * PRICE.out) / 1e6;
  const L = [];
  L.push(`Automatische Einordnung von **${name}** auf Basis von [${formLabel(f)} vom ${isoToDe(f.date)}](${doc.url}).`, '');
  L.push('> Wird erst nach dem Zusammenführen in der App sichtbar. Bitte Zahlen stichprobenartig gegen die Quelle prüfen. Keine Anlageberatung.', '');
  L.push('### Einordnung', `**Bisher (${a.old.checked}):** ${a.old.interp}`, '', `**Neu (${out.period}):** ${a.entry.interp}`, `Stimmung: ${a.old.mood} → ${a.entry.mood}`, '');
  if (a.accepted.changes.length) { L.push('### Was sich verändert hat'); a.accepted.changes.forEach(c => L.push(`- ${c.t}`, `  > ${c.quote}`)); L.push(''); }
  if (a.accepted.facts.length) { L.push('### Fakten'); a.accepted.facts.forEach(c => L.push(`- ${c.t}`, `  > ${c.quote}`)); L.push(''); }
  L.push('### Regeln', '| Frage | bisher | neu | beobachtet |', '|---|---|---|---|');
  a.entry.rules.forEach(r => { const o = a.old.rules.find(x => x.q === r.q) || {}; L.push(`| ${r.q} | ${st[o.status] || '–'} (${o.per || '–'}) | ${st[r.status]} (${r.per}) | ${r.obs || '–'} |`); });
  a.accepted.rules.forEach(x => L.push('', `> ${x.neu.quote}`));
  L.push('');
  if (a.rejected.length) { L.push('### Verworfen (Prüfung nicht bestanden)'); a.rejected.forEach(x => L.push(`- ${x.what}: ${x.t || ''} – ${x.why}`)); L.push(''); }
  if (out.notes) L.push('### Hinweise des Modells', out.notes, '');
  L.push('---', `Modell ${MODEL} · ${usage.input_tokens || 0} Eingabe- und ${usage.output_tokens || 0} Ausgabe-Token · rund ${cost.toFixed(2)} $`);
  return L.join('\n');
}

async function gh(method, url, body) {
  const r = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${url}`, {
    method, headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'depotfokus', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${j.message || ''}`);
  return j;
}

/* ---------- Ablauf ---------- */
async function main() {
  const info = readJ(INFO_P), state = fs.existsSync(ST_P) ? readJ(ST_P) : { processed: {} };
  let done = 0, stateChanged = false;
  const base = DRY ? null : git('rev-parse', '--abbrev-ref', 'HEAD');
  const remote = DRY ? '' : git('ls-remote', '--heads', 'origin', 'bericht/*');
  for (const [sym, p] of Object.entries(info.positions)) {
    if (!p.cik || done >= MAX) continue;
    let sub;
    try { sub = await filingsFor(p.cik); } catch (e) { log(`${sym}: SEC nicht erreichbar (${e.message})`); continue; }
    const since = (p.assessedFrom && p.assessedFrom.date > p.checked) ? p.assessedFrom.date : p.checked;
    const cand = sub.filings.filter(f => relevant(f) && f.date > since && !state.processed[f.acc]).sort((a, b) => a.date < b.date ? -1 : 1);
    for (const f of cand) {
      if (done >= MAX) break;
      // 10-Q/10-K kurz nach einer Ergebnismeldung bringen meist nichts Neues
      const coveredBy = Object.entries(state.processed).find(([, v]) => v.sym === sym && v.status === 'pr' && Math.abs(Date.parse(v.date) - Date.parse(f.date)) < 45 * 864e5);
      if (['10-Q', '10-K'].includes(f.form) && (coveredBy || cand.some(x => isResults(x) && Math.abs(Date.parse(x.date) - Date.parse(f.date)) < 45 * 864e5))) {
        state.processed[f.acc] = { sym, date: f.date, form: f.form, status: 'covered', at: today }; stateChanged = true; log(`${sym}: ${f.form} vom ${f.date} durch Ergebnismeldung abgedeckt`); continue;
      }
      const branch = `bericht/${sym.replace(/\./g, '_')}--${f.acc}`;
      if (remote.includes(`refs/heads/${branch}`)) { log(`${sym}: Vorschlag ${branch} existiert bereits`); continue; }
      let doc;
      try { doc = await mainDocument(f); } catch (e) { log(`${sym}: Dokument nicht lesbar (${e.message})`); continue; }
      if (f.form === '6-K' && !looksLikeResults(doc.text)) {
        state.processed[f.acc] = { sym, date: f.date, form: f.form, status: 'skipped', reason: 'keine Ergebnismitteilung', at: today }; stateChanged = true; log(`${sym}: 6-K vom ${f.date} übersprungen (keine Ergebnismitteilung)`); continue;
      }
      let ans;
      try { ans = await askClaude(sym, p, f, doc, sub.name); } catch (e) { log(`${sym}: ${e.message}`); continue; }
      done++;
      const out = ans.input;
      if (!out.relevant) { state.processed[f.acc] = { sym, date: f.date, form: f.form, status: 'irrelevant', at: today }; stateChanged = true; log(`${sym}: ${f.form} vom ${f.date} laut Modell ohne neue Kennzahlen`); continue; }
      const nextInfo = readJ(INFO_P), nextRes = readJ(RES_P);
      const name = sub.name ? sub.name.replace(/\b(INC|CORP|CO|LTD|PLC|AS|A\/S)\b\.?/gi, '').replace(/\s+/g, ' ').trim().replace(/\w\S*/g, w => w[0] + w.slice(1).toLowerCase()) : sym;
      const a = applyAssessment(nextInfo, nextRes, sym, f, doc, out, name);
      const title = `Neue Einordnung: ${name} (${f.form} vom ${isoToDe(f.date)})`;
      const body = prBody(sym, name, f, doc, out, a, ans.usage);
      if (DRY) {
        fs.mkdirSync('_dry', { recursive: true }); writeJ(`_dry/info_${sym}.json`, nextInfo); writeJ(`_dry/resolved_${sym}.json`, nextRes); fs.writeFileSync(`_dry/pr_${sym}.md`, `# ${title}\n\n${body}`);
        log(`${sym}: Vorschlag (Trockenlauf) geschrieben, ${a.rejected.length} verworfen`);
      } else {
        git('checkout', '-q', '-b', branch);
        writeJ(INFO_P, nextInfo); writeJ(RES_P, nextRes);
        git('add', INFO_P, RES_P); git('commit', '-q', '-m', `${title}\n\nAutomatische Einordnung, Quelle: ${doc.url}`);
        git('push', '-q', 'origin', branch);
        git('checkout', '-q', base);
        try {
          const pr = await gh('POST', '/pulls', { title, head: branch, base, body });
          await gh('POST', `/issues/${pr.number}/labels`, { labels: ['bericht'] }).catch(() => {});
          log(`${sym}: Pull Request #${pr.number} ${pr.html_url}`);
          state.processed[f.acc] = { sym, date: f.date, form: f.form, status: 'pr', pr: pr.number, at: today };
        } catch (e) {
          log(`${sym}: Branch ${branch} gepusht, Pull Request nicht möglich (${e.message}). Unter Settings › Actions › General „Allow GitHub Actions to create and approve pull requests“ aktivieren.`);
          state.processed[f.acc] = { sym, date: f.date, form: f.form, status: 'branch', branch, at: today };
        }
        stateChanged = true;
      }
      break; // je Position höchstens ein Vorschlag pro Lauf
    }
  }
  if (stateChanged) {
    writeJ(ST_P, state);
    if (!DRY) { git('add', ST_P); git('commit', '-q', '-m', 'Bewertungsstand aktualisiert [skip ci]'); git('push', '-q', 'origin', base); }
  }
  if (!DRY && Object.values(state.processed).some(v => v.status === 'pr' && v.at === today)) {
    // Seite neu bauen, damit der Vorschlag in der App unter „Datenstand“ erscheint
    await gh('POST', '/actions/workflows/pages.yml/dispatches', { ref: base }).catch(e => log('Seite nicht neu gebaut: ' + e.message));
  }
  log(`Fertig: ${done} Bewertungen.`);
  finish();
}
if (process.argv[1] && process.argv[1].endsWith('assess-reports.mjs')) main().catch(e => { log('Fehler: ' + e.message); finish(); process.exit(1); });
