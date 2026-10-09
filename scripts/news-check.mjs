// Nachrichten: Prüfregeln (rein, ohne Netz). Jede veröffentlichte Tatsache braucht ein wörtliches Zitat
// aus der tatsächlich abgerufenen Quelle, und jede Zahl der Aussage muss in diesem Zitat stehen.
// Einordnungen (Alltag, Finanzwirkung, nächster Punkt) dürfen nur belegte Zahlen enthalten,
// müssen bedingt formuliert sein und keine Empfehlungen oder Pauschalurteile enthalten.
import crypto from 'node:crypto';

export const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
export const norm = s => String(s || '').toLowerCase().replace(/[ \s]+/g, ' ').replace(/[’‘`´]/g, "'").replace(/[“”„«»]/g, '"').replace(/[–—−‑]/g, '-').trim();

export function quoteOk(quote, text) {
  const q = norm(quote), t = norm(text);
  if (q.length < 12 || q.length > 400) return false;
  const parts = q.split(/\s*(?:\.\.\.|…)\s*/).filter(x => x.length >= 8);
  return parts.length > 0 && parts.every(p => t.includes(p));
}
// Zahlen: deutsch (1.234,5) im Text, deutsch oder englisch (1,234.5) im Zitat
export const deNums = s => (String(s).match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g) || []).map(x => parseFloat(x.replace(/\./g, '').replace(',', '.')));
export const enNums = s => (String(s).match(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g) || []).map(x => parseFloat(x.replace(/,/g, '')));
// Prüfpflichtig sind alle Zahlen außer Jahreszahlen und kleinen Zählwörtern ohne Einheit (z. B. „drei Monate“ als 3)
const UNIT = /^\s?(%|prozent|percent|pp|mrd|mio|bn|billion|million|milliard|euro|€|\$|dollar|cent|basis)/i;
export function numbersIn(t) {
  const out = [], s = String(t), re = /\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g; let m;
  while ((m = re.exec(s))) {
    const n = parseFloat(m[0].replace(/\./g, '').replace(',', '.')), after = s.slice(m.index + m[0].length, m.index + m[0].length + 12);
    if (Number.isInteger(n) && n >= 1990 && n <= 2100 && !UNIT.test(after)) continue;
    if (Number.isInteger(n) && n <= 31 && !UNIT.test(after)) continue;
    out.push(n);
  }
  return out;
}
export function numbersOk(t, pool) {
  const q = enNums(pool).concat(deNums(pool));
  const miss = numbersIn(t).filter(n => !q.some(x => Math.abs(x - n) <= Math.max(0.005, Math.abs(n) * 0.005)));
  return { ok: !miss.length, miss };
}

const NEG = /(^|[^\w])[-−]\s?\d|minus|declin|decreas|fell|fall|lower|down|drop|contract|weniger|rückgang|gesunken|sank|sinkt|gefallen|niedriger|minus/i;
const RX = {
  advice: /\b(kaufen|verkaufen|kaufsignal|verkaufssignal|kursziel|garantiert|sicherer gewinn|empfehl|jetzt einsteigen|zugreifen)\w*/i,
  blanket: /(höhere|steigende) preise (bedeuten|bringen|heißen) (mehr|höhere) gewinn|sinkende zinsen (lassen|bringen) (die )?aktien|(aktien|kurse) werden (steigen|fallen)|gewinner sind|verlierer sind/i,
  conditional: /\b(kann|können|könnte|könnten|würde|würden|falls|wenn|sofern|hängt davon ab|abhängig|möglicherweise|unter umständen)\b/i,
  pricesFall: /(preise|preisniveau|lebenshaltungskosten)\s+(sinken|sanken|fallen|fielen|sind gesunken|gehen zurück)/i,
  deflationEvidence: /deflation|prices (fell|declined|decreased)|negative (inflation|rate)|preise (sanken|sind gesunken|gingen zurück)|[-−]\d+(\.\d+)?\s*%/i,
  expectWords: /\b(erwart|prognos|analyst|konsens|schätzung)/i,
  expectEvidence: /expect|forecast|projection|outlook|consensus|estimate|erwart|prognos|schätz|projektion|ausblick/i,
  pp: /prozentpunkt/i,
  ppEvidence: /percentage point|prozentpunkt|\bpp\b|basis point|basispunkt/i,
  divClaim: /dividende\w*\s+(\w+\s+){0,4}(angekündigt|beschlossen|erhöht|gesenkt|gestrichen|ausgesetzt)|(angekündigt|beschlossen)\w*\s+(\w+\s+){0,3}dividende/i,
  divEvidence: /dividend|ausschüttung|distribution|payout/i,
  divDecl: /declar|announc|approv|beschl|angekündigt|board .* (raised|increased|cut)/i
};

/* Prüft eine Modellantwort gegen die Quelle. Gibt den Artikelinhalt und die Prüfprotokolle zurück. */
export function checkArticle(out, evidence, enums) {
  const log = [], ev = evidence.text;
  const facts = [];
  for (const f of out.facts || []) {
    if (!quoteOk(f.quote, ev)) { log.push({ part: 'Fakt', text: f.text, why: 'Zitat nicht in der Quelle gefunden' }); continue; }
    const n = numbersOk(f.text, f.quote);
    if (!n.ok) { log.push({ part: 'Fakt', text: f.text, why: `Zahl nicht im Zitat: ${n.miss.join(', ')}` }); continue; }
    if (RX.pp.test(f.text) && !RX.ppEvidence.test(f.quote)) { log.push({ part: 'Fakt', text: f.text, why: 'Prozentpunkte, aber Quelle nennt keine Prozentpunkte' }); continue; }
    if (/[-−]\s?\d/.test(f.text) && !NEG.test(f.quote)) { log.push({ part: 'Fakt', text: f.text, why: 'Negatives Vorzeichen ohne Beleg' }); continue; }
    if (RX.expectWords.test(f.text) && !RX.expectEvidence.test(f.quote)) { log.push({ part: 'Fakt', text: f.text, why: 'Erwartung oder Prognose ohne Beleg' }); continue; }
    if (RX.advice.test(f.text)) { log.push({ part: 'Fakt', text: f.text, why: 'Empfehlungssprache' }); continue; }
    facts.push({ text: f.text.trim(), quote: f.quote.trim() });
  }
  const numbers = [];
  for (const x of out.numbers || []) {
    if (!quoteOk(x.quote, ev) || !Number.isFinite(+x.value) || !enNums(x.quote).concat(deNums(x.quote)).some(q => Math.abs(q - Math.abs(+x.value)) <= Math.max(0.005, Math.abs(+x.value) * 0.005)) || !x.unit || !x.period) { log.push({ part: 'Zahl', text: `${x.value} ${x.unit || ''}`, why: 'Zahl, Einheit oder Zeitraum nicht belegt' }); continue; }
    if (+x.value < 0 && !NEG.test(x.quote)) { log.push({ part: 'Zahl', text: String(x.value), why: 'Vorzeichen nicht belegt' }); continue; }
    if (/prozentpunkt|percentage point/i.test(x.unit) && !RX.ppEvidence.test(x.quote)) { log.push({ part: 'Zahl', text: String(x.value), why: 'Einheit Prozentpunkte nicht belegt' }); continue; }
    numbers.push({ value: +x.value, unit: x.unit, period: x.period, quote: x.quote });
  }
  const pool = facts.map(f => f.text + ' ' + f.quote).concat(numbers.map(x => `${x.value} ${x.quote}`)).join(' ');
  // Einordnung: nur belegte Zahlen, bedingt, keine Empfehlungen und Pauschalurteile
  const interpErr = [];
  const parts = { alltag: out.alltag || '', finanzwirkung: out.finanzwirkung || '', naechstes: (out.naechstes && out.naechstes.text) || '' };
  for (const [k, t] of Object.entries(parts)) {
    if (!t.trim()) { interpErr.push(`${k} fehlt`); continue; }
    const n = numbersOk(t, pool + ' ' + ((k === 'naechstes' && out.naechstes.quote && quoteOk(out.naechstes.quote, ev)) ? out.naechstes.quote : ''));
    if (!n.ok) interpErr.push(`${k}: Zahl ohne Beleg (${n.miss.join(', ')})`);
    if (RX.advice.test(t)) interpErr.push(`${k}: Empfehlungssprache`);
    if (RX.blanket.test(t)) interpErr.push(`${k}: Pauschalaussage`);
    if (RX.pricesFall.test(t) && !RX.deflationEvidence.test(pool)) interpErr.push(`${k}: „Preise sinken“ ohne Beleg (sinkende Inflationsrate heißt langsamer steigende Preise)`);
    if (RX.divClaim.test(t) && !(out.dividend && out.dividend.status === 'angekündigt' && quoteOk(out.dividend.quote, ev) && RX.divEvidence.test(out.dividend.quote) && RX.divDecl.test(out.dividend.quote))) interpErr.push(`${k}: Dividendenaussage ohne Ankündigung in der Quelle`);
  }
  if (parts.finanzwirkung && !RX.conditional.test(parts.finanzwirkung)) interpErr.push('finanzwirkung: nicht bedingt formuliert');
  if (out.naechstes && out.naechstes.quote && !quoteOk(out.naechstes.quote, ev)) interpErr.push('naechstes: Zitat nicht in der Quelle');
  // Dividende: angekündigt nur mit Beleg
  let dividend = { status: 'nicht erwähnt' };
  if (out.dividend && out.dividend.status && out.dividend.status !== 'nicht erwähnt') {
    const okDecl = out.dividend.status === 'angekündigt' && quoteOk(out.dividend.quote, ev) && RX.divEvidence.test(out.dividend.quote) && RX.divDecl.test(out.dividend.quote);
    const okExp = out.dividend.status === 'erwartet' && quoteOk(out.dividend.quote, ev) && RX.divEvidence.test(out.dividend.quote);
    if (okDecl || okExp) dividend = { status: out.dividend.status, quote: out.dividend.quote };
    else log.push({ part: 'Dividende', text: out.dividend.status, why: 'Status nicht durch die Quelle belegt' });
  }
  const kern = out.kernaussage && numbersOk(out.kernaussage, pool).ok && !RX.advice.test(out.kernaussage) && !(RX.pricesFall.test(out.kernaussage) && !RX.deflationEvidence.test(pool)) ? out.kernaussage.trim() : (facts[0] ? facts[0].text : '');
  const title = out.title && numbersOk(out.title, pool).ok && !RX.advice.test(out.title) && out.title.length <= 110 ? out.title.trim() : null;
  const glossary = (out.glossary || []).filter(g => g.term && g.def && !numbersIn(g.def).length && g.def.length <= 220).slice(0, 4);
  const companies = (out.companies || []).filter(c => c.name && (norm(ev).includes(norm(c.name)) || (c.ticker && new RegExp(`\\b${c.ticker.replace(/[^\w.]/g, '')}\\b`).test(ev)) || (c.isin && ev.includes(c.isin))));
  const pick = (arr, allowed) => (arr || []).filter(x => allowed.includes(x));
  const scen = out.scenario_link && ['A', 'B', 'C'].includes(out.scenario_link.scenario) && out.scenario_link.why && numbersOk(out.scenario_link.why, pool).ok && !RX.advice.test(out.scenario_link.why) ? { scenario: out.scenario_link.scenario, why: out.scenario_link.why } : null;
  const words = [...facts.map(f => f.text), parts.alltag, parts.finanzwirkung, parts.naechstes].join(' ').split(/\s+/).filter(Boolean).length;
  const interpOk = !interpErr.length && facts.length > 0;
  interpErr.forEach(e => log.push({ part: 'Einordnung', why: e }));
  return {
    publishable: facts.length > 0 && !!title,
    interpOk,
    article: {
      title, kurzfassung: kern, facts, numbers,
      alltag: interpOk ? parts.alltag.trim() : null, finanzwirkung: interpOk ? parts.finanzwirkung.trim() : null,
      naechstes: interpOk ? { text: parts.naechstes.trim(), date: out.naechstes.date || null, quote: out.naechstes.quote && quoteOk(out.naechstes.quote, ev) ? out.naechstes.quote : null } : null,
      categories: pick(out.categories, enums.categories), regions: pick(out.regions, enums.regions), sectors: pick(out.sectors, enums.sectors),
      companies, dividend, glossary: interpOk ? glossary : [], scenario_link: interpOk ? scen : null,
      event_date: /^\d{4}-\d{2}-\d{2}$/.test(out.event_date || '') ? out.event_date : null,
      words, length_ok: words >= 70 && words <= 220
    },
    log
  };
}
