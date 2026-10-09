// Szenario-Monitor: wöchentlicher Lauf.
// Quellen abrufen → Beobachtungen validieren und deduplizieren → Gewichte berechnen →
// Änderungen erklären → Snapshot validieren → dauerhaft speichern (data/scenarios/).
// Veröffentlichen übernimmt der Workflow (Commit + Pages-Workflow per workflow_dispatch).
//
// Umgebungsvariablen:
//   SCEN_DIR      Datenordner (Standard data/scenarios)
//   SCEN_NOW      fester Zeitpunkt (ISO), nur für Tests
//   SCEN_OFFLINE  1 = nichts abrufen, nur vorhandene Beobachtungen auswerten (Tests)
//   SCEN_DRY      1 = nichts schreiben, Ergebnis nur ausgeben
//   SCEN_FORCE    1 = Zeitfenster-Prüfung für geplante Läufe überspringen
//   GITHUB_EVENT_NAME  bei "schedule" läuft nur, wer in Berlin nach 7 Uhr startet
import fs from 'node:fs';
import path from 'node:path';
import * as M from './scenario-model.mjs';
import { ADAPTERS, makeFetcher } from './scenario-sources.mjs';

const DIR = process.env.SCEN_DIR || 'data/scenarios';
const NOW = process.env.SCEN_NOW ? new Date(process.env.SCEN_NOW) : new Date();
const NOW_ISO = NOW.toISOString();
const DRY = process.env.SCEN_DRY === '1', OFFLINE = process.env.SCEN_OFFLINE === '1';
const rd = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) } catch (e) { if (d !== undefined) return d; throw e } };
const wr = (f, v) => { if (DRY) return; const p = path.join(DIR, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v, null, 1) + '\n') };
const out = (k, v) => { if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`) };
const log = s => console.log(s);
const TRIM = { D: 90, M: 48, Q: 20 };

export async function run() {
  const set = rd('scenario_set.json'), config = rd('model_config.json');
  const cErr = M.validateConfig(config, set);
  if (cErr.length) { console.error('Konfiguration ungültig:\n- ' + cErr.join('\n- ')); return { code: 2 } }
  const cfgHash = M.configHash(config, set);
  const store = rd('observations.json', { series: {} });
  const index = rd('snapshots/index.json', { scenario_set_id: set.scenario_set_id, snapshots: [] });
  const status = rd('status.json', {});
  const weekId = M.weekIdFor(NOW), bl = M.berlinDate(NOW);

  if (NOW.toISOString().slice(0, 10) > set.horizon.target_date) { log(`Ziel ${set.horizon.target_date} überschritten: neuer Szenariosatz nötig.`); return { code: 0, result: 'expired' } }
  // Geplante Läufe: zwei Cron-Zeiten (Sommer/Winter); es zählt der erste nach 7 Uhr Berliner Zeit.
  const sameWeek = index.snapshots.filter(s => s.week_id === weekId);
  if (process.env.GITHUB_EVENT_NAME === 'schedule' && process.env.SCEN_FORCE !== '1') {
    if (bl.hour < 7) { log(`Geplanter Lauf um ${bl.hour} Uhr Berliner Zeit: zu früh (Winterzeit), der spätere Lauf übernimmt.`); out('changed', 'false'); return { code: 0, result: 'early' } }
    if (sameWeek.some(s => s.status !== 'kept')) { log(`Woche ${weekId} ist bereits bewertet; geplanter Zweitlauf endet ohne Änderung.`); out('changed', 'false'); return { code: 0, result: 'skipped' } }
  }

  // 1. Quellen abrufen
  const srcStatus = {};
  if (!OFFLINE) {
    const get = makeFetcher({ timeoutMs: config.limits.timeout_ms, retries: config.limits.retries, maxRequests: config.limits.max_requests });
    for (const ind of config.indicators) {
      const ser = store.series[ind.id] = store.series[ind.id] || { adapter: ind.adapter, ref: ind.series || ind.key || ind.dataset, frequency: ind.frequency, obs: {} };
      try {
        const r = await ADAPTERS[ind.adapter](ind, get, NOW);
        const ch = mergeObs(ser, r.obs, ind.frequency);
        Object.assign(ser, { source_url: r.url, source_updated_at: r.source_updated_at || ser.source_updated_at || null, geo_used: r.geo_used, last_success_at: NOW_ISO, last_fetch_status: 'ok', last_error: null });
        srcStatus[ind.id] = { status: 'ok', new: ch.added, revised: ch.revised, latest: r.obs[r.obs.length - 1].period };
        log(`${ind.id}: ok, letzte Periode ${r.obs[r.obs.length - 1].period}, neu ${ch.added}, revidiert ${ch.revised}`);
      } catch (e) {
        Object.assign(ser, { last_fetch_status: 'failed', last_error: String(e.message).slice(0, 200), last_failure_at: NOW_ISO });
        srcStatus[ind.id] = { status: 'failed', error: String(e.message).slice(0, 200) };
        log(`${ind.id}: FEHLER ${e.message}`);
      }
    }
  }

  // 2. Bewerten (immer aus denselben Startgewichten)
  const ev = M.evaluate({ config, set, store, asOf: NOW_ISO });
  const ordered = [...index.snapshots].sort((a, b) => a.week_id < b.week_id ? -1 : a.week_id > b.week_id ? 1 : a.revision - b.revision);
  const prevMeta = [...ordered].reverse().find(s => s.week_id < weekId) || null;
  const prev = prevMeta ? rd(`snapshots/${prevMeta.snapshot_id}.json`) : null;
  const validMeta = [...ordered].reverse().find(s => s.status !== 'kept' && s.week_id <= weekId) || null;
  const lastValid = validMeta ? rd(`snapshots/${validMeta.snapshot_id}.json`) : null;
  const priorW = Object.fromEntries(set.scenarios.map(s => [s.id, s.prior]));

  let st, raw;
  if (!ev.reliable) { st = 'kept'; raw = lastValid ? lastValid.raw_weights : priorW }
  else if (lastValid && lastValid.input_hash === ev.inputHash && lastValid.config_hash === cfgHash) { st = 'unchanged'; raw = ev.weights }
  else { st = ev.inputs.some(i => i.role === 'signal' && !['ok', 'ok_cached'].includes(i.status)) ? 'partial' : 'ok'; raw = ev.weights }

  // Idempotenz: gleiche Woche, gleiche Eingaben, gleiche Methode => kein neuer Stand
  const latestSame = sameWeek.sort((a, b) => b.revision - a.revision)[0];
  if (latestSame) {
    const s0 = rd(`snapshots/${latestSame.snapshot_id}.json`);
    if (s0.input_hash === ev.inputHash && s0.config_hash === cfgHash) {
      log(`Woche ${weekId}: Eingaben unverändert (${ev.inputHash}). Kein zweiter Wochenstand.`);
      finishStatus({ status, result: 'idempotent', note: `Wiederholung ohne neue Eingaben, Stand ${latestSame.snapshot_id} bleibt`, srcStatus, ev, st, set });
      wr('status.json', status); wr('observations.json', store);
      out('changed', 'true'); out('snapshot_id', latestSame.snapshot_id); // nur Prüfstatus und Beobachtungen
      return { code: 0, result: 'idempotent', snapshot_id: latestSame.snapshot_id };
    }
  }

  // 3. Vergleich und Erklärung
  const display = M.roundTo100(raw);
  const compare = prev
    ? { kind: 'snapshot', snapshot_id: prev.snapshot_id, week_id: prev.week_id, date: prev.generated_at.slice(0, 10), display: prev.display, gap_weeks: M.weeksBetween(prev.week_id, weekId) }
    : { kind: 'start', snapshot_id: null, week_id: null, date: set.horizon.start, display: M.roundTo100(priorW), gap_weeks: null };
  const changePP = Object.fromEntries(M.SC_IDS.map(s => [s, display[s] - compare.display[s]]));
  const baseline = lastValid; // Treiber gegen den letzten gültigen Stand (bei 'kept' gibt es keine)
  const classes = M.classifyInputs(baseline ? baseline.inputs : null, ev.inputs);
  const causes = [];
  if (baseline && baseline.config_hash !== cfgHash) causes.push('method');
  if (classes.some(c => c.kind === 'new')) causes.push('new_data');
  if (classes.some(c => c.kind === 'revision')) causes.push('revision');
  if (classes.some(c => c.kind === 'status' || c.kind === 'added')) causes.push('data_status');
  if (!baseline) causes.push('start');
  if (!causes.length) causes.push('none');
  const drv = st === 'kept' ? { A: { support: [], against: [] }, B: { support: [], against: [] }, C: { support: [], against: [] } } : M.drivers(baseline, ev, changePP, classes);
  const gapNote = compare.gap_weeks > 1 ? `Stand vom ${M.fmtPeriod(compare.date)}, KW ${compare.week_id.slice(-2)}; ${compare.gap_weeks - 1} ${compare.gap_weeks - 1 === 1 ? 'Woche fehlt' : 'Wochen fehlen'}` : null;
  const summary = M.summarize({ set, display, compare, changePP, causes, status: st, drv, gapNote });

  const rev = latestSame ? latestSame.revision + 1 : 1;
  const sid = rev > 1 ? `${weekId}-r${rev}` : weekId;
  const used = ev.inputs.filter(i => i.period && ['ok', 'ok_cached'].includes(i.status));
  const signalInputs = ev.inputs.filter(i => i.role === 'signal');
  const snap = {
    snapshot_id: sid, week_id: weekId, revision: rev, revision_of: rev > 1 ? sameWeek.find(s => s.revision === 1)?.snapshot_id || null : null,
    kind: rev > 1 ? 'revision' : 'regular',
    scenario_set_id: set.scenario_set_id, scenario_definition_version: set.scenario_definition_version,
    model_version: config.model_version, config_hash: cfgHash, target_date: set.horizon.target_date,
    generated_at: NOW_ISO, published_at: NOW_ISO, input_as_of: NOW_ISO,
    data_latest_period: used.map(i => M.periodEnd(i.period)).sort().pop() || null,
    data_oldest_period: used.map(i => M.periodEnd(i.period)).sort()[0] || null,
    last_successful_evaluation_at: st === 'kept' ? (lastValid ? lastValid.last_successful_evaluation_at : null) : NOW_ISO,
    previous_snapshot_id: prev ? prev.snapshot_id : null,
    status: st,
    status_text: { ok: 'Neubewertung mit allen Quellen', partial: 'Neubewertung mit Lücken (siehe Datenqualität)', unchanged: 'Unverändert: keine neuen relevanten Daten', kept: 'Keine belastbare Neubewertung: letzte gültige Gewichte beibehalten' }[st],
    data_quality: {
      coverage: round(ev.coverage, 4), reliable: ev.reliable, missing_critical: ev.missingCritical,
      indicators_ok: signalInputs.filter(i => ['ok', 'ok_cached'].includes(i.status)).length, indicators_total: signalInputs.length,
      groups: ev.groups.map(g => ({ id: g.id, name: g.name, weight: g.weight, x: g.x == null ? null : round(g.x, 4), used: g.used, total: g.total })),
      issues: ev.inputs.filter(i => i.issue).map(i => ({ id: i.id, name: i.name, status: i.status, issue: i.issue })),
      not_covered: config.not_covered
    },
    raw_weights: Object.fromEntries(M.SC_IDS.map(s => [s, raw[s]])),
    computed_weights: ev.reliable ? Object.fromEntries(M.SC_IDS.map(s => [s, ev.weights[s]])) : null,
    display, compare_to: compare, change_pp: changePP, change_causes: causes,
    method_note: causes.includes('method') ? `Methode geändert: Modell ${baseline.model_version} → ${config.model_version}` : null,
    summary, drivers: drv,
    inputs: ev.inputs.map(i => ({ ...i, value: i.value == null ? null : round(i.value, 6), x: i.x == null ? null : round(i.x, 6), share: i.share == null ? null : round(i.share, 6), contrib: i.contrib ? Object.fromEntries(Object.entries(i.contrib).map(([k, v]) => [k, round(v, 6)])) : null, change: (classes.find(c => c.id === i.id) || {}).kind || null })),
    sources: [...new Map(ev.inputs.filter(i => i.status !== 'missing' && i.status !== 'failed').map(i => [i.url, { name: i.source, url: i.url }])).values()],
    input_hash: ev.inputHash,
    llm: { used: false, note: 'Regelbasierte Erklärung ohne Sprachmodell.' }
  };

  // 4. Snapshot validieren
  const vErr = validateSnapshot(snap, set);
  if (vErr.length) {
    console.error('Snapshot ungültig, nichts gespeichert:\n- ' + vErr.join('\n- '));
    finishStatus({ status, result: 'failed', note: 'Snapshot-Prüfung fehlgeschlagen: ' + vErr.join('; '), srcStatus, ev, st, set });
    wr('status.json', status); out('changed', 'true');
    return { code: 2 };
  }

  // 5. Dauerhaft speichern (historische Snapshots werden nie überschrieben)
  if (!DRY && fs.existsSync(path.join(DIR, `snapshots/${sid}.json`))) { console.error(`${sid} existiert bereits, wird nicht überschrieben`); return { code: 2 } }
  wr(`snapshots/${sid}.json`, snap);
  index.scenario_set_id = set.scenario_set_id;
  index.snapshots.push({ snapshot_id: sid, week_id: weekId, revision: rev, revision_of: snap.revision_of, status: st, display, raw_weights: snap.raw_weights, generated_at: NOW_ISO, model_version: config.model_version, config_hash: cfgHash });
  wr('snapshots/index.json', index);
  finishStatus({ status, result: rev > 1 ? 'revision' : 'new_snapshot', note: summary, srcStatus, ev, st, set, sid });
  wr('status.json', status); wr('observations.json', store);
  if (DRY) ev.inputs.forEach(i => log(`  ${i.id.padEnd(16)} ${String(i.status).padEnd(9)} ${i.period || '–'} ${i.value != null ? M.fmtValue(i) : ''} ${i.x != null ? 'x=' + i.x.toFixed(2) : ''} ${i.geo_used || ''} ${i.issue || ''}`));
  log(`\n${sid} (${st}): A ${display.A} %, B ${display.B} %, C ${display.C} % · ${summary}`);
  out('changed', 'true'); out('snapshot_id', sid);
  return { code: 0, result: snap.kind, snapshot_id: sid, snap };
}

function mergeObs(ser, obs, freq) {
  let added = 0, revised = 0;
  for (const o of obs) {
    const e = ser.obs[o.period];
    if (!e) { ser.obs[o.period] = { v: o.v, rev: 1, first_seen_at: NOW_ISO, history: [{ v: o.v, rev: 1, seen_at: NOW_ISO }] }; added++ }
    else if (Math.abs(e.v - o.v) > 1e-12 * Math.max(1, Math.abs(o.v))) { e.rev = (e.rev || 1) + 1; e.v = o.v; e.history = [...(e.history || []), { v: o.v, rev: e.rev, seen_at: NOW_ISO }].slice(-6); revised++ }
  }
  const keep = Object.keys(ser.obs).sort().slice(-(TRIM[freq] || 48));
  ser.obs = Object.fromEntries(keep.map(k => [k, ser.obs[k]]));
  return { added, revised };
}

function finishStatus({ status, result, note, srcStatus, ev, st, set, sid }) {
  Object.assign(status, {
    scenario_set_id: set.scenario_set_id,
    last_attempt_at: NOW_ISO, last_attempt_result: result, last_attempt_note: note,
    last_attempt_snapshot_id: sid || status.last_attempt_snapshot_id || null,
    last_successful_evaluation_at: ['ok', 'partial', 'unchanged'].includes(st) && result !== 'failed' ? NOW_ISO : status.last_successful_evaluation_at || null,
    next_scheduled_run: M.nextMondayRun(NOW),
    schedule: 'Montag 07:20 Uhr (Europe/Berlin); manuell über Actions › Szenario-Monitor › Run workflow',
    sources: OFFLINE ? status.sources || {} : srcStatus,
    reliable: ev.reliable
  });
}

export function validateSnapshot(s, set) {
  const e = [];
  ['snapshot_id', 'week_id', 'scenario_set_id', 'scenario_definition_version', 'model_version', 'config_hash', 'target_date', 'generated_at', 'published_at', 'input_as_of', 'status', 'data_quality', 'raw_weights', 'display', 'change_pp', 'drivers', 'sources', 'input_hash'].forEach(k => { if (s[k] == null) e.push(`Feld ${k} fehlt`) });
  if (!('previous_snapshot_id' in s) || !('last_successful_evaluation_at' in s)) e.push('Verweisfelder fehlen');
  e.push(...M.checkWeights(s.raw_weights));
  const ds = M.SC_IDS.reduce((a, k) => a + s.display[k], 0);
  if (ds !== 100) e.push(`Anzeige summiert sich zu ${ds}`);
  M.SC_IDS.forEach(k => { if (!Number.isInteger(s.display[k]) || s.display[k] < 0 || s.display[k] > 100) e.push(`Anzeige ${k} ungültig`); if (s.change_pp[k] !== s.display[k] - s.compare_to.display[k]) e.push(`Differenz ${k} passt nicht zu den sichtbaren Werten`) });
  if (s.target_date !== set.horizon.target_date) e.push('Zieldatum weicht ab');
  if (!/^\d{4}-W\d{2}$/.test(s.week_id)) e.push('week_id ungültig');
  return e;
}
const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then(r => process.exit(r.code)).catch(e => { console.error(e); process.exit(1) });
}
