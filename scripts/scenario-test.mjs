// Tests für den Szenario-Monitor: node --test scripts/scenario-test.mjs
// Alle Daten hier sind synthetische Fixtures und landen nie in data/scenarios/.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import * as M from './scenario-model.mjs';
import { parseCSV, normPeriods, eurostat, ecb, fred } from './scenario-sources.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SET = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/scenarios/scenario_set.json'), 'utf8'));
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/scenarios/model_config.json'), 'utf8'));
const clone = o => JSON.parse(JSON.stringify(o));

/* ---------- Fixture-Erzeugung ---------- */
// Wert je Indikator, der genau das Signal x ergibt (für yoy: Endwert bei Basis 100)
function valueFor(ind, x) {
  const t = ind.transform || { type: 'linear', neutral: 1, full: 2 };
  const v = t.type === 'band' ? t.target + (1 - x) * t.width : t.neutral + x * (t.full - t.neutral);
  return ind.stat === 'yoy_pct' ? 100 * (1 + v / 100) : v;
}
function periodsFor(freq, asOf, n) {
  const d = new Date(asOf), out = [];
  if (freq === 'D') { for (let i = n; i >= 1; i--) out.push(new Date(d.getTime() - i * 864e5).toISOString().slice(0, 10)); return out }
  if (freq === 'M') { for (let i = n; i >= 1; i--) { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1 - i + 1, 1)); out.push(x.toISOString().slice(0, 7)) } return out }
  for (let i = n; i >= 1; i--) { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 3 * i, 1)); out.push(`${x.getUTCFullYear()}-Q${Math.floor(x.getUTCMonth() / 3) + 1}`) }
  return [...new Set(out)];
}
// xs: {indicatorId: x | null (fehlt)}; Standard 0 (neutral)
function makeStore(asOf, xs = {}, seenAt = '2020-01-01T00:00:00.000Z') {
  const series = {};
  for (const ind of CFG.indicators) {
    if (xs[ind.id] === null) continue;
    const x = xs[ind.id] ?? 0, obs = {};
    const ps = periodsFor(ind.frequency, asOf, ind.frequency === 'D' ? 25 : ind.frequency === 'M' ? 14 : 6);
    ps.forEach(p => { obs[p] = { v: 100, rev: 1, first_seen_at: seenAt, history: [{ v: 100, rev: 1, seen_at: seenAt }] } });
    const last = ps[ps.length - 1];
    if (ind.stat !== 'yoy_pct') ps.forEach(p => { const v = valueFor(ind, x); obs[p] = { v, rev: 1, first_seen_at: seenAt, history: [{ v, rev: 1, seen_at: seenAt }] } });
    else { const v = valueFor(ind, x); obs[last] = { v, rev: 1, first_seen_at: seenAt, history: [{ v, rev: 1, seen_at: seenAt }] } }
    series[ind.id] = { adapter: ind.adapter, frequency: ind.frequency, obs, last_fetch_status: 'ok', last_success_at: seenAt };
  }
  return { series };
}
function tmpDir(store) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'scen-'));
  fs.copyFileSync(path.join(ROOT, 'data/scenarios/scenario_set.json'), path.join(d, 'scenario_set.json'));
  fs.copyFileSync(path.join(ROOT, 'data/scenarios/model_config.json'), path.join(d, 'model_config.json'));
  if (store) fs.writeFileSync(path.join(d, 'observations.json'), JSON.stringify(store));
  return d;
}
function runAt(dir, now, extra = {}) {
  let o = '';
  try { o = execFileSync('node', [path.join(ROOT, 'scripts/scenario-run.mjs')], { env: { ...process.env, SCEN_DIR: dir, SCEN_NOW: now, SCEN_OFFLINE: '1', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_OUTPUT: '', ...extra }, encoding: 'utf8' }) }
  catch (e) { o = (e.stdout || '') + (e.stderr || ''); o += `\nEXIT ${e.status}` }
  return o;
}
const idx = d => JSON.parse(fs.readFileSync(path.join(d, 'snapshots/index.json'), 'utf8'));
const snap = (d, id) => JSON.parse(fs.readFileSync(path.join(d, `snapshots/${id}.json`), 'utf8'));
const evalX = (xs, asOf = '2026-10-12T05:20:00.000Z', cfg = CFG) => M.evaluate({ config: cfg, set: SET, store: makeStore(asOf, xs), asOf });

/* ---------- Konfiguration und Normierung ---------- */
test('Konfiguration ist gültig, Gruppengewichte summieren sich zu 1', () => {
  assert.deepEqual(M.validateConfig(CFG, SET), []);
  const bad = clone(CFG); bad.groups[0].weight = 0.3;
  assert.ok(M.validateConfig(bad, SET).some(e => /summieren/.test(e)));
});

test('Rundung ergibt immer exakt 100 % und bleibt nah am Rohwert', () => {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 5000; k++) {
    const a = rnd(), b = rnd() * (1 - a), w = { A: a, B: b, C: 1 - a - b };
    const r = M.roundTo100(w);
    assert.equal(r.A + r.B + r.C, 100);
    for (const s of M.SC_IDS) assert.ok(Math.abs(r[s] - w[s] * 100) < 1 + 1e-9);
  }
  assert.deepEqual(M.roundTo100({ A: 1 / 3, B: 1 / 3, C: 1 / 3 }), { A: 34, B: 33, C: 33 });
});

test('Softmax ist numerisch stabil, Gewichte endlich, 0..1, Summe 1', () => {
  const w = M.softmax({ A: 1000, B: 999, C: -1000 });
  assert.deepEqual(M.checkWeights(w), []);
  for (const x of [-1, -0.5, 0, 0.5, 1]) {
    const ev = evalX(Object.fromEntries(CFG.indicators.map(i => [i.id, x])));
    assert.deepEqual(M.checkWeights(ev.weights), []);
  }
});

test('Neutrale Daten lassen die Startgewichte unverändert', () => {
  const ev = evalX({});
  for (const s of SET.scenarios) assert.ok(Math.abs(ev.weights[s.id] - s.prior) < 1e-12);
});

test('Extreme Signale bleiben begrenzt (Werte jenseits der Grenze ändern nichts mehr)', () => {
  const a = evalX(Object.fromEntries(CFG.indicators.map(i => [i.id, 1])));
  const b = evalX(Object.fromEntries(CFG.indicators.map(i => [i.id, i.transform && i.transform.type === 'linear' ? 5 : 1]))); // Werte weit jenseits der Grenze
  for (const k of M.SC_IDS) assert.ok(Math.abs(a.weights[k] - b.weights[k]) < 1e-12);
  assert.ok(a.weights.B < 0.5 && a.weights.B > 0.4);
});

/* ---------- Determinismus, keine Drift ---------- */
test('Identische Eingaben ergeben identische Gewichte und Hash', () => {
  const xs = { EA_ESI: -0.4, EA_CISS: 0.3, EU_GAS: -0.9 };
  const a = evalX(xs), b = evalX(xs);
  assert.deepEqual(a.weights, b.weights); assert.equal(a.inputHash, b.inputHash);
});

test('Wiederholte Läufe: kein zweiter Wochenstand, keine Drift über Wochen', () => {
  const d = tmpDir(makeStore('2026-10-12T05:20:00.000Z', { EA_ESI: -0.5, EU_GAS: -1 }));
  runAt(d, '2026-10-12T05:20:00.000Z');
  const o2 = runAt(d, '2026-10-12T09:00:00.000Z');
  assert.match(o2, /Kein zweiter Wochenstand/);
  assert.equal(idx(d).snapshots.length, 1);
  const w1 = snap(d, '2026-W42').raw_weights;
  // Folgewoche ohne neue Daten (Tageswerte noch frisch): Status unverändert, identische Gewichte
  runAt(d, '2026-10-19T05:20:00.000Z');
  const s2 = snap(d, '2026-W43');
  assert.equal(s2.status, 'unchanged'); assert.deepEqual(s2.raw_weights, w1);
  assert.deepEqual(s2.change_pp, { A: 0, B: 0, C: 0 });
  assert.match(s2.summary, /keine neuen relevanten Daten/);
  // Weitere Wochen: neue Meldungen mit denselben Werten verschieben nichts (Evidenz wird nicht erneut angewandt)
  for (const t of ['2026-10-26T06:20:00.000Z', '2026-11-02T06:20:00.000Z', '2026-11-09T06:20:00.000Z']) {
    fs.writeFileSync(path.join(d, 'observations.json'), JSON.stringify(makeStore(t, { EA_ESI: -0.5, EU_GAS: -1 })));
    runAt(d, t);
  }
  const ix = idx(d).snapshots;
  assert.equal(ix.length, 5);
  ix.forEach(s => { for (const k of M.SC_IDS) assert.ok(Math.abs(s.raw_weights[k] - w1[k]) < 1e-12, `${s.snapshot_id} ${k}`) });
  assert.deepEqual(snap(d, '2026-W46').change_pp, { A: 0, B: 0, C: 0 });
});

test('Fehlende Daten erhöhen nicht künstlich den Optimismus', () => {
  // Ein fehlender Indikator zählt nicht als 0 oder positiv: Gruppensignal = Mittel der übrigen
  const full = evalX({ EA_CISS: -0.8, EA_HY_OAS: -0.8, US_HY_OAS: -0.8, VIX: -0.8 });
  const miss = evalX({ EA_CISS: -0.8, EA_HY_OAS: null, US_HY_OAS: -0.8, VIX: -0.8 });
  assert.ok(Math.abs(full.groups.find(g => g.id === 'credit').x - miss.groups.find(g => g.id === 'credit').x) < 1e-12);
  assert.deepEqual(full.weights, miss.weights);
  // Ganze nichtkritische Gruppe fehlt: Beitrag 0 (neutral), nie positiv; übrige Gruppen werden nicht hochskaliert
  const noEnergy = evalX({ BRENT_YOY: null, EU_GAS: null });
  for (const s of SET.scenarios) assert.ok(Math.abs(noEnergy.weights[s.id] - s.prior) < 1e-12);
  const neg = evalX({ EA_ESI: -1, EA_GDP_QQ: -1, BRENT_YOY: null, EU_GAS: null });
  const negFull = evalX({ EA_ESI: -1, EA_GDP_QQ: -1 });
  assert.deepEqual(neg.weights, negFull.weights);
});

test('Stark korrelierte Signale werden nicht mehrfach gezählt (mehr Quellen ≠ mehr Evidenz)', () => {
  const cfg2 = clone(CFG);
  cfg2.indicators.push({ ...clone(CFG.indicators.find(i => i.id === 'EA_HY_OAS')), id: 'EA_HY_OAS_COPY' });
  const xs = { EA_CISS: -1, EA_HY_OAS: -1, US_HY_OAS: -1, VIX: -1 };
  const store = makeStore('2026-10-12T05:20:00.000Z', xs);
  store.series.EA_HY_OAS_COPY = clone(store.series.EA_HY_OAS);
  const a = M.evaluate({ config: CFG, set: SET, store: makeStore('2026-10-12T05:20:00.000Z', xs), asOf: '2026-10-12T05:20:00.000Z' });
  const b = M.evaluate({ config: cfg2, set: SET, store, asOf: '2026-10-12T05:20:00.000Z' });
  assert.deepEqual(a.weights, b.weights);
});

test('Ausfall einer kritischen Gruppe bewahrt den letzten gültigen Stand', () => {
  const d = tmpDir(makeStore('2026-10-12T05:20:00.000Z', { EA_ESI: -0.6 }));
  runAt(d, '2026-10-12T05:20:00.000Z');
  const w1 = snap(d, '2026-W42').raw_weights;
  const st = makeStore('2026-10-19T05:20:00.000Z', { EA_ESI: 1, EA_CISS: null, EA_HY_OAS: null, US_HY_OAS: null, VIX: null });
  fs.writeFileSync(path.join(d, 'observations.json'), JSON.stringify(st));
  runAt(d, '2026-10-19T05:20:00.000Z');
  const s2 = snap(d, '2026-W43');
  assert.equal(s2.status, 'kept'); assert.deepEqual(s2.raw_weights, w1);
  assert.deepEqual(s2.data_quality.missing_critical, ['credit']);
  assert.match(s2.summary, /Keine belastbare Neubewertung/);
  assert.ok(s2.last_successful_evaluation_at < s2.generated_at);
});

test('Veraltete Werte zählen nicht, fehlgeschlagene Abrufe nutzen frische Altwerte mit Status', () => {
  const st = makeStore('2026-06-01T00:00:00.000Z', {}); // Tageswerte von Mai: im Oktober zu alt
  const ev = M.evaluate({ config: CFG, set: SET, store: st, asOf: '2026-10-12T05:20:00.000Z' });
  assert.equal(ev.inputs.find(i => i.id === 'EA_CISS').status, 'stale');
  assert.equal(ev.reliable, false);
  const st2 = makeStore('2026-10-12T05:20:00.000Z', { EA_CISS: -0.5 });
  st2.series.EA_CISS.last_fetch_status = 'failed'; st2.series.EA_CISS.last_error = 'HTTP 503';
  const ev2 = M.evaluate({ config: CFG, set: SET, store: st2, asOf: '2026-10-12T05:20:00.000Z' });
  const c = ev2.inputs.find(i => i.id === 'EA_CISS');
  assert.equal(c.status, 'ok_cached'); assert.match(c.issue, /Abruf fehlgeschlagen/);
});

/* ---------- Revision, Methode, Zeitpunkt ---------- */
test('Datenrevisionen und Methodenwechsel bleiben nachvollziehbar', () => {
  const d = tmpDir(makeStore('2026-10-12T05:20:00.000Z', { EA_ESI: -0.2 }));
  runAt(d, '2026-10-12T05:20:00.000Z');
  // Revision eines bereits veröffentlichten Werts in derselben Woche: neue Revision mit Verweis
  const st = JSON.parse(fs.readFileSync(path.join(d, 'observations.json'), 'utf8'));
  const ps = Object.keys(st.series.EA_ESI.obs).sort(), p = ps[ps.length - 1], o = st.series.EA_ESI.obs[p];
  o.v = 95; o.rev = 2; o.history.push({ v: 95, rev: 2, seen_at: '2026-10-12T08:00:00.000Z' });
  fs.writeFileSync(path.join(d, 'observations.json'), JSON.stringify(st));
  runAt(d, '2026-10-12T09:00:00.000Z');
  const r2 = snap(d, '2026-W42-r2');
  assert.equal(r2.revision_of, '2026-W42'); assert.equal(r2.kind, 'revision');
  assert.ok(r2.change_causes.includes('revision'));
  assert.equal(r2.inputs.find(i => i.id === 'EA_ESI').change, 'revision');
  assert.ok(fs.existsSync(path.join(d, 'snapshots/2026-W42.json')), 'Original bleibt erhalten');
  // Methodenwechsel: neue Version, sichtbarer Hinweis
  const cfg = JSON.parse(fs.readFileSync(path.join(d, 'model_config.json'), 'utf8'));
  cfg.beta = 1.2; cfg.model_version = '1.1.0';
  fs.writeFileSync(path.join(d, 'model_config.json'), JSON.stringify(cfg));
  runAt(d, '2026-10-19T05:20:00.000Z');
  const s3 = snap(d, '2026-W43');
  assert.ok(s3.change_causes.includes('method')); assert.match(s3.method_note, /1\.0\.0 → 1\.1\.0/);
  assert.notEqual(s3.config_hash, r2.config_hash);
});

test('Historische Stände enthalten nur damals bekannte Werte und Revisionsstände', () => {
  const ser = { obs: {
    '2026-07': { v: 1, rev: 2, first_seen_at: '2026-08-01T00:00:00Z', history: [{ v: 0.5, rev: 1, seen_at: '2026-08-01T00:00:00Z' }, { v: 1, rev: 2, seen_at: '2026-09-01T00:00:00Z' }] },
    '2026-08': { v: 2, rev: 1, first_seen_at: '2026-09-01T00:00:00Z', history: [{ v: 2, rev: 1, seen_at: '2026-09-01T00:00:00Z' }] } } };
  assert.deepEqual(M.seriesAsOf(ser, '2026-08-15T00:00:00Z').map(o => [o.period, o.v]), [['2026-07', 0.5]]);
  assert.deepEqual(M.seriesAsOf(ser, '2026-09-15T00:00:00Z').map(o => [o.period, o.v]), [['2026-07', 1], ['2026-08', 2]]);
});

/* ---------- Kalender ---------- */
test('Wochen-IDs über den Jahreswechsel und Abstände', () => {
  assert.equal(M.isoWeek('2026-12-31'), '2026-W53');
  assert.equal(M.isoWeek('2027-01-03'), '2026-W53');
  assert.equal(M.isoWeek('2027-01-04'), '2027-W01');
  assert.equal(M.weeksBetween('2026-W52', '2027-W01'), 2);
  assert.equal(M.weekMonday('2026-W41'), '2026-10-05');
  // Montag 00:30 Berliner Zeit ist Sonntag 22:30 UTC: zählt zur neuen Woche
  assert.equal(M.weekIdFor(new Date('2026-10-11T22:30:00Z')), '2026-W42');
});

test('Sommer-/Winterzeit: Montag 07:20 Uhr Berlin', () => {
  assert.equal(M.nextMondayRun(new Date('2026-10-24T12:00:00Z')), '2026-10-26T06:20:00.000Z'); // nach Umstellung auf Winterzeit
  assert.equal(M.nextMondayRun(new Date('2026-10-17T12:00:00Z')), '2026-10-19T05:20:00.000Z'); // Sommerzeit
  assert.equal(M.nextMondayRun(new Date('2027-03-27T12:00:00Z')), '2027-03-29T05:20:00.000Z'); // wieder Sommerzeit
  const d = tmpDir(makeStore('2026-10-26T05:20:00.000Z'));
  assert.match(runAt(d, '2026-10-26T05:20:00.000Z', { GITHUB_EVENT_NAME: 'schedule' }), /zu früh/); // 06:20 Winterzeit
  runAt(d, '2026-10-26T06:20:00.000Z', { GITHUB_EVENT_NAME: 'schedule' });
  assert.equal(idx(d).snapshots.length, 1);
  assert.match(runAt(d, '2026-10-27T06:20:00.000Z', { GITHUB_EVENT_NAME: 'schedule' }), /bereits bewertet/); // verspäteter Zweitlauf
});

test('Startzustand, Lücken und Differenzen aus sichtbaren Werten', () => {
  const d = tmpDir(makeStore('2026-10-12T05:20:00.000Z', { EU_GAS: -1, EA_ESI: -0.6 }));
  runAt(d, '2026-10-12T05:20:00.000Z');
  const s1 = snap(d, '2026-W42');
  assert.equal(s1.compare_to.kind, 'start'); assert.deepEqual(s1.compare_to.display, { A: 50, B: 20, C: 30 });
  assert.equal(s1.previous_snapshot_id, null);
  fs.writeFileSync(path.join(d, 'observations.json'), JSON.stringify(makeStore('2026-11-02T06:20:00.000Z', { EU_GAS: 0.5, EA_ESI: 0.8 })));
  runAt(d, '2026-11-02T06:20:00.000Z');
  const s2 = snap(d, '2026-W45');
  assert.equal(s2.compare_to.gap_weeks, 3); assert.match(s2.summary, /2 Wochen fehlen/);
  for (const k of M.SC_IDS) assert.equal(s2.change_pp[k], s2.display[k] - s1.display[k]);
  assert.ok(s2.change_pp.B > 0 && s2.change_pp.C < 0);
  assert.ok(s2.drivers.B.support.length > 0 && s2.drivers.B.support.length <= 3);
  assert.ok(s2.drivers.C.support.every(r => r.effect < 0));
});

test('Gegenläufige Signale werden ausgewiesen', () => {
  const prev = evalX({});
  const cur = evalX({ EA_ESI: 1, EU_GAS: -0.6 });
  const disp = M.roundTo100(cur.weights), pp = Object.fromEntries(M.SC_IDS.map(s => [s, disp[s] - M.roundTo100(prev.weights)[s]]));
  const dr = M.drivers(prev, cur, pp, M.classifyInputs(prev.inputs, cur.inputs));
  assert.ok(dr.B.support.some(r => r.id === 'EA_ESI'));
  assert.ok(dr.B.against.some(r => r.id === 'EU_GAS'));
});

/* ---------- Adapter (ohne Netz) ---------- */
test('CSV-Parser und Periodennormierung', () => {
  const rows = parseCSV('KEY,TITLE,TIME_PERIOD,OBS_VALUE\r\nX,"a, ""b""",2026-08,2.1\nX,"c",2026-09,\n');
  assert.deepEqual(rows[1], ['X', 'a, "b"', '2026-08', '2.1']);
  assert.deepEqual(normPeriods([{ period: '2026-04-01', v: 1 }, { period: '2026-04-01', v: 2 }], 'Q'), [{ period: '2026-Q2', v: 2 }]);
  assert.deepEqual(normPeriods([{ period: '2026-07-01', v: 1 }], 'M'), [{ period: '2026-07', v: 1 }]);
});

test('Adapter lesen echte Antwortformate (EZB-CSV, Eurostat JSON-stat, FRED-CSV)', async () => {
  const now = new Date('2026-10-12T05:20:00Z');
  const ecbGet = async () => ({ text: 'KEY,FREQ,TIME_PERIOD,OBS_VALUE,TITLE\nICP.M,M,2026-08,2.0,"HICP, overall"\nICP.M,M,2026-09,2.2,"HICP, overall"\n', lastModified: null });
  const e = await ecb({ key: 'ICP/M.U2.N.000000.4.ANR', frequency: 'M' }, ecbGet, now);
  assert.deepEqual(e.obs, [{ period: '2026-08', v: 2 }, { period: '2026-09', v: 2.2 }]);
  const esGet = async url => /geo=EA21/.test(url)
    ? { text: JSON.stringify({ id: ['freq', 'indic', 's_adj', 'geo', 'time'], size: [1, 1, 1, 1, 2], value: { 0: 95.1, 1: 96.4 }, dimension: { time: { category: { index: { '2026-08': 0, '2026-09': 1 } } } }, updated: '2026-09-29T11:00:00+0200' }) }
    : { text: JSON.stringify({ id: ['geo', 'time'], size: [1, 2], value: {}, dimension: { time: { category: { index: { '2026-08': 0, '2026-09': 1 } } } } }) };
  const s = await eurostat({ dataset: 'ei_bssi_m_r2', params: {}, geo: ['EA21', 'EA20'], frequency: 'M' }, esGet, now);
  assert.equal(s.geo_used, 'EA21'); assert.equal(s.obs[1].v, 96.4);
  const frGet = async () => ({ text: 'observation_date,CP\n2025-04-01,3100.5\n2025-07-01,.\n2026-04-01,3300\n' });
  const f = await fred({ series: 'CP', frequency: 'Q' }, frGet, now);
  assert.deepEqual(f.obs, [{ period: '2025-Q2', v: 3100.5 }, { period: '2026-Q2', v: 3300 }]);
});
