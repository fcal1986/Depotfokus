// Szenario-Monitor: deterministischer Rechenkern (ohne Netz, ohne Uhr, ohne Zufall).
// Gleiche Beobachtungen + gleiche Konfiguration => gleiche Gewichte. Jeder Stand wird
// aus denselben festen Startgewichten neu gerechnet, nie aus dem Vorwochenwert.
import crypto from 'node:crypto';

export const SC_IDS = ['A', 'B', 'C'];

/* ---------- Hilfen ---------- */
export function canonical(v) {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
  if (typeof v === 'number') return Number.isFinite(v) ? JSON.stringify(+v.toPrecision(12)) : 'null';
  return JSON.stringify(v ?? null);
}
export const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/* Hash nur über rechenrelevante Teile: reine Textänderungen ändern die Methode nicht. */
export function configHash(config, set) {
  const core = {
    model_version: config.model_version, beta: config.beta, loadings: config.loadings, bounds: config.signal_bounds,
    critical: { groups: config.critical.groups, min: config.critical.min_weight_coverage },
    groups: config.groups.map(g => ({ id: g.id, w: g.weight })),
    indicators: config.indicators.map(i => ({ id: i.id, g: i.group, role: i.role || 'signal', w: i.w ?? 1, a: i.adapter, ref: i.series || i.key || i.dataset, p: i.params, geo: i.geo, stat: i.stat, n: i.n, t: i.transform, age: i.max_age_days })),
    set: { id: set.scenario_set_id, v: set.scenario_definition_version, target: set.horizon.target_date, priors: set.scenarios.map(s => [s.id, s.prior]) }
  };
  return sha256(canonical(core)).slice(0, 16);
}

/* ---------- Konfiguration prüfen ---------- */
export function validateConfig(config, set) {
  const err = [];
  const gw = config.groups.reduce((a, g) => a + g.weight, 0);
  if (Math.abs(gw - 1) > 1e-9) err.push(`Gruppengewichte summieren sich zu ${gw}, nicht 1`);
  if (config.groups.some(g => !(g.weight >= 0))) err.push('Negatives Gruppengewicht');
  if (!(config.beta > 0 && config.beta <= 5)) err.push('beta außerhalb (0, 5]');
  const pr = set.scenarios.reduce((a, s) => a + s.prior, 0);
  if (Math.abs(pr - 1) > 1e-9) err.push(`Startgewichte summieren sich zu ${pr}`);
  if (set.scenarios.some(s => !(s.prior > 0 && s.prior < 1))) err.push('Startgewicht muss zwischen 0 und 1 liegen');
  if (set.scenarios.map(s => s.id).join() !== SC_IDS.join()) err.push('Szenario-IDs müssen A, B, C sein');
  const gids = new Set(config.groups.map(g => g.id));
  config.indicators.forEach(i => {
    if (!gids.has(i.group)) err.push(`${i.id}: unbekannte Gruppe ${i.group}`);
    if ((i.role || 'signal') === 'signal') {
      const t = i.transform || {};
      if (t.type === 'linear' && !(Number.isFinite(t.neutral) && Number.isFinite(t.full) && t.full !== t.neutral)) err.push(`${i.id}: lineare Regel unvollständig`);
      if (t.type === 'band' && !(Number.isFinite(t.target) && t.width > 0)) err.push(`${i.id}: Bandregel unvollständig`);
      if (!['linear', 'band'].includes(t.type)) err.push(`${i.id}: unbekannte Regel ${t.type}`);
    }
  });
  config.critical.groups.forEach(g => { if (!gids.has(g)) err.push(`kritische Gruppe ${g} unbekannt`) });
  if (new Set(config.indicators.map(i => i.id)).size !== config.indicators.length) err.push('Doppelte Indikator-ID');
  return err;
}

/* ---------- Zeit ---------- */
export function berlinDate(d) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false }).formatToParts(d).map(x => [x.type, x.value]));
  return { ymd: `${p.year}-${p.month}-${p.day}`, hour: +p.hour % 24 };
}
/* ISO-Kalenderwoche eines Kalenderdatums (YYYY-MM-DD), z. B. 2026-W53, 2027-W01 */
export function isoWeek(ymd) {
  const [y, m, dd] = ymd.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, dd));
  const wd = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - wd);
  const y0 = d.getUTCFullYear();
  const w = Math.ceil(((d - Date.UTC(y0, 0, 1)) / 864e5 + 1) / 7);
  return `${y0}-W${String(w).padStart(2, '0')}`;
}
export const weekIdFor = date => isoWeek(berlinDate(date).ymd);
/* Montag einer ISO-Woche als YYYY-MM-DD */
export function weekMonday(wid) {
  const [y, w] = wid.split('-W').map(Number);
  const j4 = new Date(Date.UTC(y, 0, 4)), wd = j4.getUTCDay() || 7;
  const mon = new Date(j4.getTime() + ((w - 1) * 7 - (wd - 1)) * 864e5);
  return mon.toISOString().slice(0, 10);
}
/* Wochen zwischen zwei Wochen-IDs (b − a) */
export const weeksBetween = (a, b) => Math.round((Date.parse(weekMonday(b)) - Date.parse(weekMonday(a))) / (7 * 864e5));
/* Nächster geplanter Lauf: Montag 07:20 Uhr Berliner Zeit */
export function nextMondayRun(now) {
  for (let i = 0; i <= 8; i++) {
    const d = new Date(now.getTime() + i * 864e5), b = berlinDate(d);
    const [y, m, dd] = b.ymd.split('-').map(Number);
    if (new Date(Date.UTC(y, m - 1, dd)).getUTCDay() !== 1) continue;
    for (const utcH of [5, 6]) { // 07:20 Berlin ist 05:20 UTC (Sommer) oder 06:20 UTC (Winter)
      const t = new Date(Date.UTC(y, m - 1, dd, utcH, 20));
      if (berlinDate(t).hour === 7 && t > now) return t.toISOString();
    }
  }
  return null;
}

/* Periodenende: 2026-10-08, 2026-08, 2026-Q2 */
export function periodEnd(p) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return p;
  let m = /^(\d{4})-(\d{2})$/.exec(p);
  if (m) return new Date(Date.UTC(+m[1], +m[2], 0)).toISOString().slice(0, 10);
  m = /^(\d{4})-Q([1-4])$/.exec(p);
  if (m) return new Date(Date.UTC(+m[1], +m[2] * 3, 0)).toISOString().slice(0, 10);
  return null;
}
export const ageDays = (p, asOf) => { const e = periodEnd(p); return e ? Math.floor((Date.parse(asOf) - Date.parse(e)) / 864e5) : Infinity; };
function yearBefore(p) {
  let m = /^(\d{4})-(\d{2})$/.exec(p); if (m) return `${+m[1] - 1}-${m[2]}`;
  m = /^(\d{4})-Q([1-4])$/.exec(p); if (m) return `${+m[1] - 1}-Q${m[2]}`;
  m = /^(\d{4})-(\d{2}-\d{2})$/.exec(p); if (m) return `${+m[1] - 1}-${m[2]}`;
  return null;
}

/* ---------- Beobachtungen ---------- */
/* Stand einer Serie zu einem Zeitpunkt: nur Werte, die damals schon gesehen waren, mit dem damals gültigen Revisionsstand */
export function seriesAsOf(series, asOf) {
  if (!series || !series.obs) return [];
  const out = [];
  for (const [period, o] of Object.entries(series.obs)) {
    if (o.first_seen_at && o.first_seen_at > asOf) continue;
    const hist = (o.history || []).filter(h => !h.seen_at || h.seen_at <= asOf);
    const cur = hist.length ? hist[hist.length - 1] : (o.first_seen_at <= asOf ? { v: o.v, rev: o.rev } : null);
    if (!cur || !Number.isFinite(cur.v)) continue;
    out.push({ period, v: cur.v, rev: cur.rev ?? o.rev ?? 1, first_seen_at: o.first_seen_at });
  }
  return out.sort((a, b) => a.period < b.period ? -1 : a.period > b.period ? 1 : 0);
}

export function deriveValue(ind, obs) {
  if (!obs.length) return { error: 'keine Beobachtungen' };
  const last = obs[obs.length - 1];
  if (ind.stat === 'last') return { value: last.v, period: last.period, basis: [[last.period, last.v, last.rev]] };
  if (ind.stat === 'mean_last_n') {
    const n = ind.n || 20, part = obs.slice(-n);
    if (part.length < Math.ceil(n * 0.75)) return { error: `nur ${part.length} von ${n} Beobachtungen` };
    return { value: part.reduce((a, o) => a + o.v, 0) / part.length, period: last.period, basis: part.map(o => [o.period, o.v, o.rev]) };
  }
  if (ind.stat === 'yoy_pct') {
    const p0 = yearBefore(last.period), o0 = obs.find(o => o.period === p0);
    if (!o0 || !(o0.v > 0)) return { error: `Vorjahreswert ${p0} fehlt` };
    return { value: (last.v / o0.v - 1) * 100, period: last.period, basis: [[o0.period, o0.v, o0.rev], [last.period, last.v, last.rev]] };
  }
  return { error: `unbekannte Statistik ${ind.stat}` };
}

export function toSignal(t, v) {
  if (!Number.isFinite(v)) return null;
  if (t.type === 'linear') return clamp((v - t.neutral) / (t.full - t.neutral), -1, 1);
  if (t.type === 'band') return clamp(1 - Math.abs(v - t.target) / t.width, -1, 1);
  return null;
}

/* Numerisch stabiles Softmax */
export function softmax(scores) {
  const ks = Object.keys(scores), mx = Math.max(...ks.map(k => scores[k]));
  const e = Object.fromEntries(ks.map(k => [k, Math.exp(scores[k] - mx)]));
  const s = ks.reduce((a, k) => a + e[k], 0);
  return Object.fromEntries(ks.map(k => [k, e[k] / s]));
}

/* Ganzzahlige Prozente mit exakt 100 Summe (größter Rest, Gleichstand nach ID) */
export function roundTo100(w) {
  const ks = SC_IDS.filter(k => k in w), raw = ks.map(k => w[k] * 100);
  const fl = raw.map(Math.floor); let rest = 100 - fl.reduce((a, b) => a + b, 0);
  const order = ks.map((k, i) => ({ i, r: raw[i] - fl[i] })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (let j = 0; j < rest; j++) fl[order[j % order.length].i]++;
  return Object.fromEntries(ks.map((k, i) => [k, fl[i]]));
}

/* ---------- Bewertung ---------- */
export function evaluate({ config, set, store, asOf }) {
  const prior = Object.fromEntries(set.scenarios.map(s => [s.id, s.prior]));
  const inputs = [];
  for (const ind of config.indicators) {
    const ser = store.series[ind.id];
    const base = { id: ind.id, group: ind.group, role: ind.role || 'signal', name: ind.name, unit: ind.unit, region: ind.region, frequency: ind.frequency, source: ind.source, url: ind.url, rule_text: ind.rule_text, geo_used: ser && ser.geo_used || null };
    const fetchFailed = ser && ser.last_fetch_status && ser.last_fetch_status !== 'ok';
    const obs = seriesAsOf(ser, asOf);
    const dv = deriveValue(ind, obs);
    if (dv.error) { inputs.push({ ...base, status: fetchFailed ? 'failed' : 'missing', issue: fetchFailed ? (ser.last_error || 'Abruf fehlgeschlagen') : dv.error }); continue; }
    const age = ageDays(dv.period, asOf);
    const lastObs = obs.find(o => o.period === dv.period);
    const meta = { value: dv.value, period: dv.period, basis: dv.basis, age_days: age, first_seen_at: lastObs.first_seen_at, revision: lastObs.rev, source_updated_at: ser.source_updated_at || null, retrieved_at: ser.last_success_at || null };
    if (age > (ind.max_age_days ?? 120)) { inputs.push({ ...base, ...meta, status: 'stale', issue: `Letzter Wert ${age} Tage alt (Grenze ${ind.max_age_days})${fetchFailed ? '; letzter Abruf fehlgeschlagen' : ''}` }); continue; }
    if (base.role === 'context') { inputs.push({ ...base, ...meta, status: 'context', issue: fetchFailed ? 'letzter Abruf fehlgeschlagen, älterer Wert' : null }); continue; }
    const x = toSignal(ind.transform, dv.value);
    if (x == null) { inputs.push({ ...base, ...meta, status: 'invalid', issue: 'Wert nicht auswertbar' }); continue; }
    inputs.push({ ...base, ...meta, status: fetchFailed ? 'ok_cached' : 'ok', x, issue: fetchFailed ? 'Abruf fehlgeschlagen; zuletzt gültiger Wert innerhalb der Altersgrenze' : null });
  }
  // Gruppen: Mittel der gültigen Signale (gewichtet mit w), nicht Summe
  const groups = config.groups.map(g => {
    const all = config.indicators.filter(i => i.group === g.id && (i.role || 'signal') === 'signal');
    const ok = inputs.filter(i => i.group === g.id && i.x != null);
    const wsum = ok.reduce((a, i) => a + (config.indicators.find(c => c.id === i.id).w ?? 1), 0);
    const x = ok.length ? ok.reduce((a, i) => a + (config.indicators.find(c => c.id === i.id).w ?? 1) * i.x, 0) / wsum : null;
    ok.forEach(i => { i.share = (config.indicators.find(c => c.id === i.id).w ?? 1) / wsum; });
    return { id: g.id, name: g.name, weight: g.weight, x, used: ok.length, total: all.length };
  });
  const coverage = groups.filter(g => g.x != null).reduce((a, g) => a + g.weight, 0);
  const missingCritical = config.critical.groups.filter(id => groups.find(g => g.id === id).x == null);
  const reliable = !missingCritical.length && coverage >= config.critical.min_weight_coverage - 1e-12;
  // Beitrag je Indikator und Szenario: beta × Gruppengewicht × Anteil in der Gruppe × x × Ladung
  for (const i of inputs) {
    if (i.x == null) continue;
    const g = groups.find(g => g.id === i.group);
    i.contrib = Object.fromEntries(SC_IDS.map(s => [s, config.beta * g.weight * i.share * i.x * config.loadings[s]]));
  }
  const scores = Object.fromEntries(SC_IDS.map(s => [s, Math.log(prior[s]) + groups.reduce((a, g) => a + (g.x == null ? 0 : config.beta * g.weight * config.loadings[s] * g.x), 0)]));
  const weights = softmax(scores);
  const inputHash = sha256(canonical(inputs.map(i => ({ id: i.id, s: i.status, b: i.basis || null })))).slice(0, 16);
  return { inputs, groups, coverage, missingCritical, reliable, scores, weights, inputHash };
}

export function checkWeights(w) {
  const err = [];
  const ks = Object.keys(w || {});
  if (ks.join() !== SC_IDS.join()) err.push('Gewichte für A, B, C fehlen');
  ks.forEach(k => { if (!Number.isFinite(w[k]) || w[k] < 0 || w[k] > 1) err.push(`Gewicht ${k} ungültig: ${w[k]}`); });
  const s = ks.reduce((a, k) => a + w[k], 0);
  if (Math.abs(s - 1) > 1e-9) err.push(`Gewichtssumme ${s}`);
  return err;
}

/* ---------- Veränderungen erklären ---------- */
/* Klassifiziert jede Eingabe gegenüber dem Vorstand: neue Daten, Revision, unverändert, Status gewechselt */
export function classifyInputs(prevInputs, curInputs) {
  const P = Object.fromEntries((prevInputs || []).map(i => [i.id, i]));
  return curInputs.map(c => {
    const p = P[c.id];
    if (!p) return { id: c.id, kind: prevInputs ? 'added' : 'start' };
    if (p.status !== c.status && !(['ok', 'ok_cached'].includes(p.status) && ['ok', 'ok_cached'].includes(c.status))) return { id: c.id, kind: 'status', from: p.status, to: c.status };
    if (!c.basis || !p.basis) return { id: c.id, kind: 'same' };
    if (c.period !== p.period) return { id: c.id, kind: 'new' };
    const pb = Object.fromEntries(p.basis.map(b => [b[0], b[1]]));
    const revised = c.basis.some(b => b[0] in pb && pb[b[0]] !== b[1]);
    const newBasis = c.basis.some(b => !(b[0] in pb));
    return { id: c.id, kind: revised ? 'revision' : newBasis ? 'new' : 'same' };
  });
}

const fmtNum = (v, d) => (+v).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
export function fmtValue(i) {
  if (!Number.isFinite(i.value)) return '–';
  const pctLike = /^%|als %/.test(i.unit || '');
  const d = Math.abs(i.value) < 1 && !pctLike ? 3 : 1;
  return fmtNum(i.value, d) + (pctLike ? ' %' : /Prozentpunkte/.test(i.unit || '') ? ' Pp.' : /US-Dollar je Mio/.test(i.unit || '') ? ' $/MMBtu' : '');
}
export function fmtPeriod(p) {
  if (!p) return '–';
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p); if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  m = /^(\d{4})-(\d{2})$/.exec(p); if (m) return `${['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][+m[2] - 1]} ${m[1]}`;
  m = /^(\d{4})-Q([1-4])$/.exec(p); if (m) return `${m[2]}. Quartal ${m[1]}`;
  return p;
}

/* Treiber je Szenario: Indikatoren mit der größten Beitragsänderung, getrennt nach unterstützend und gegenläufig.
   prev = null heißt: Vergleich mit dem Startgewicht (alle Signale 0). */
export function drivers(prevEval, curEval, changePP, classes) {
  const P = Object.fromEntries(((prevEval && prevEval.inputs) || []).map(i => [i.id, i]));
  const C = Object.fromEntries(classes.map(c => [c.id, c.kind]));
  const out = {};
  for (const s of SC_IDS) {
    const rows = [];
    for (const i of curEval.inputs) {
      const p = P[i.id];
      const before = p && p.contrib ? p.contrib : null, after = i.contrib || null;
      const dB = (after ? after.B : 0) - (before ? before.B : 0);
      if (Math.abs(dB) < 1e-6) continue;
      const kind = C[i.id] || 'same';
      // Wirkung auf s (Ableitung des Softmax): B gleichgerichtet, C entgegengesetzt,
      // A nur über die Normierung: dp_A ∝ dB × (p_C − p_B)
      const w = curEval.weights;
      const effect = s === 'B' ? dB : s === 'C' ? -dB : dB * (w.C - w.B);
      rows.push({ id: i.id, name: i.name, group: i.group, effect, signal_before: p && p.x != null ? round(p.x, 3) : (prevEval ? null : 0), signal_after: i.x != null ? round(i.x, 3) : null, value: i.value != null ? round(i.value, 4) : null, value_text: i.value != null ? fmtValue(i) : null, period: i.period || null, period_text: fmtPeriod(i.period), kind, url: i.url, source: i.source, status: i.status });
    }
    const dir = Math.sign(changePP[s]);
    const support = rows.filter(r => dir === 0 ? false : Math.sign(r.effect) === dir).sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect)).slice(0, 3);
    const against = rows.filter(r => dir === 0 ? false : Math.sign(r.effect) === -dir).sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect)).slice(0, 2);
    out[s] = { support: support.map(r => ({ ...r, text: driverText(r) })), against: against.map(r => ({ ...r, text: driverText(r) })) };
  }
  return out;
}
const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
function driverText(r) {
  const why = r.kind === 'revision' ? 'revidiert' : r.kind === 'new' ? 'neuer Wert' : r.kind === 'status' ? (r.signal_after == null ? 'fällt aus' : 'wieder verfügbar') : r.kind === 'start' ? 'Abweichung vom neutralen Startpunkt' : 'unverändert';
  const sig = r.signal_after == null ? 'kein gültiges Signal mehr' : r.signal_after > 0.05 ? 'spricht für Entspannung' : r.signal_after < -0.05 ? 'spricht für Belastung' : 'neutral';
  return `${r.name}: ${r.value_text ?? '–'} (${r.period_text}${r.kind === 'start' || r.kind === 'same' ? '' : ', ' + why}) – ${sig}`;
}

/* Kurze regelbasierte Wochenzusammenfassung */
export function summarize({ set, display, compare, changePP, causes, status, drv, gapNote }) {
  const name = Object.fromEntries(set.scenarios.map(s => [s.id, s.name]));
  if (status === 'kept') return 'Keine belastbare Neubewertung: Wichtige Quellen fehlen oder sind veraltet. Die letzten gültigen Gewichte bleiben stehen.';
  const moved = SC_IDS.filter(s => changePP[s] !== 0);
  const ref = compare.kind === 'start' ? 'gegenüber der Startannahme' : compare.gap_weeks > 1 ? `seit dem letzten Stand (${gapNote})` : 'seit der Vorwoche';
  if (!moved.length) return status === 'unchanged' ? `Unverändert ${ref}: Es liegen keine neuen relevanten Daten vor.` : `Unverändert ${ref}: Neue Daten haben die gerundeten Werte nicht verschoben.`;
  const parts = moved.sort((a, b) => Math.abs(changePP[b]) - Math.abs(changePP[a])).map(s => `${s} (${name[s]}) ${changePP[s] > 0 ? 'steigt' : 'sinkt'} um ${Math.abs(changePP[s])} ${Math.abs(changePP[s]) === 1 ? 'Prozentpunkt' : 'Prozentpunkte'} auf ${display[s]} %`);
  const top = moved.filter(s => s !== 'A').concat(moved).map(s => drv[s].support[0]).filter(Boolean)[0];
  const cause = causes.includes('method') ? ' Die Methode wurde geändert; ein Teil der Veränderung ist methodisch.' : causes.includes('revision') && !causes.includes('new_data') ? ' Ursache sind Datenrevisionen.' : '';
  return `${parts.join('; ')} ${ref}.${top ? ` Wichtigster Treiber: ${top.name}.` : ''}${cause}`;
}
