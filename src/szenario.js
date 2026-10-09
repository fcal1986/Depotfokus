/* =========================================================
   WIRTSCHAFT & SZENARIEN – Szenario-Wahrscheinlichkeit, Modellschätzung
   Daten: SCEN (beim Build aus data/scenarios/ eingebettet). Die App rechnet
   die Gewichte nicht selbst; sie zeigt die gespeicherten Wochenstände.
   Ältere Wochen lädt sie bei Bedarf aus data/scenarios/snapshots/.
   ========================================================= */
const SC_COL={A:'var(--sc-a)',B:'var(--sc-b)',C:'var(--sc-c)'};
const SC_TONE={A:'neutral',B:'good',C:'bad'};
const SC_LABEL='Szenario-Wahrscheinlichkeit – Modellschätzung';
const SCX={range:'26',week:null,cache:{},demo:false};
const scSet=()=>SCEN&&SCEN.set;
const scName=id=>{const s=scSet()&&scSet().scenarios.find(x=>x.id===id);return s?s.name:id};
const ppTxt=v=>v===0?'unverändert':`${v>0?'+':'−'}${Math.abs(v)} ${Math.abs(v)===1?'Prozentpunkt':'Prozentpunkte'}`;
const ppShort=v=>v===0?'±0 Pp.':`${v>0?'+':'−'}${Math.abs(v)} Pp.`;
/* Farbe nach Bedeutung, nicht nach Vorzeichen: steigender Stress (C) ist nie grün */
function ppCls(id,v){if(!v||SC_TONE[id]==='neutral')return 'sc-flat';const good=SC_TONE[id]==='good'?v>0:v<0;return good?'sc-good':'sc-bad'}
const weekLbl=w=>w?`KW ${+w.slice(-2)}/${w.slice(0,4)}`:'';
const scDate=s=>s?deDate(String(s).slice(0,10)):'–';
/* Beispiel ausschließlich als UI-Testdaten (#szenarien/demo), nie als Live-Verlauf */
function scDemo(){if(!SCEN)return null;const base=SCEN.latest||{};const mk=(id,w,d,cmp,sum)=>({snapshot_id:id,week_id:w,revision:1,status:'ok',status_text:'Beispieldaten (UI-Test)',display:d,raw_weights:{A:d.A/100,B:d.B/100,C:d.C/100},compare_to:cmp,change_pp:{A:d.A-cmp.display.A,B:d.B-cmp.display.B,C:d.C-cmp.display.C},summary:sum,drivers:{A:{support:[],against:[]},B:{support:[{name:'Beispiel: Wirtschaftsstimmung schwächer',text:'Beispiel: Wirtschaftsstimmung schwächer (erfunden)',kind:'new'}],against:[]},C:{support:[{name:'Beispiel: Risikoaufschläge höher',text:'Beispiel: Risikoaufschläge höher (erfunden)',kind:'new'}],against:[{name:'Beispiel: Ölpreis niedriger',text:'Beispiel: Ölpreis niedriger (erfunden)',kind:'new'}]}},generated_at:'2026-10-19T05:20:00Z',input_as_of:'2026-10-19T05:20:00Z',model_version:base.model_version||'1.0.0',scenario_definition_version:'1.0.0',data_quality:{coverage:1,groups:[],issues:[],not_covered:[]},inputs:[],sources:[],change_causes:['new_data'],demo:true});
  const s1=mk('DEMO-1','2026-W42',{A:50,B:20,C:30},{kind:'start',date:'2026-10-09',display:{A:50,B:20,C:30}},'Beispieldaten: Startzustand.');
  const s2=mk('DEMO-2','2026-W43',{A:48,B:17,C:35},{kind:'snapshot',snapshot_id:'DEMO-1',week_id:'2026-W42',date:'2026-10-12',display:{A:50,B:20,C:30},gap_weeks:1},'Beispieldaten: C steigt um 5 Prozentpunkte auf 35 %; B sinkt um 3; A sinkt um 2 seit der Vorwoche.');
  return {index:[s1,s2],latest:s2,full:{'DEMO-1':s1,'DEMO-2':s2}}}
function scData(){if(SCX.demo)return scDemo();if(!SCEN)return null;const ix=(SCEN.index||[]).slice().sort((a,b)=>a.week_id<b.week_id?-1:a.week_id>b.week_id?1:a.revision-b.revision);
  return {index:ix,latest:SCEN.latest,full:Object.assign({},SCEN.latest?{[SCEN.latest.snapshot_id]:SCEN.latest}:{},SCX.cache)}}
/* je Woche nur die jüngste Revision für den Verlauf */
const scWeeks=ix=>{const m=new Map();ix.forEach(s=>m.set(s.week_id,s));return [...m.values()]};
function scLoad(id){if(SCX.cache[id]||SCX.demo||typeof fetch!=='function')return;SCX.cache[id]={loading:true};
  fetch(`data/scenarios/snapshots/${encodeURIComponent(id)}.json`,{cache:'no-cache'}).then(r=>r.ok?r.json():Promise.reject(new Error('HTTP '+r.status))).then(j=>{SCX.cache[id]=j;rerender()}).catch(e=>{SCX.cache[id]={error:e.message};rerender()})}
function scNext(){const st=SCEN&&SCEN.status;if(st&&st.next_scheduled_run&&new Date(st.next_scheduled_run)>new Date())return new Date(st.next_scheduled_run);
  // Montag 07:20 Uhr Berliner Zeit: 05:20 UTC im Sommer, 06:20 UTC im Winter
  const c=[cronNext('20 5 * * 1'),cronNext('20 6 * * 1')].filter(Boolean).filter(d=>+d.toLocaleString('de-DE',{timeZone:'Europe/Berlin',hour:'2-digit',hour12:false})===7);return c.sort((a,b)=>a-b)[0]||null}
function scStatusDot(s){return !s?'off':s.status==='kept'?'warn':s.status==='partial'?'warn':'ok'}
function scCmpTxt(s){const c=s.compare_to||{};if(c.kind==='start')return `Startannahme vom ${scDate(c.date)}`;if(c.gap_weeks>1)return `letzter verfügbarer Stand vom ${scDate(c.date)} (${weekLbl(c.week_id)}); ${c.gap_weeks-1} ${c.gap_weeks-1===1?'Woche fehlt':'Wochen fehlen'}`;return `Vorwoche (${weekLbl(c.week_id)})`}
function scDataTxt(s){if(!s)return '';return s.data_latest_period?`Daten bis ${scDate(s.data_latest_period)}, abgerufen ${scDate(s.input_as_of)}`:`abgerufen ${scDate(s.input_as_of)}`}

/* ---------- Karte auf „Heute“ ---------- */
function scenTeaser(){
  if(!SCEN)return '';const L=SCEN.latest;
  if(!L)return `<a class="card col sc-teaser" href="#szenarien" style="gap:4px"><span class="row between"><span class="lbl">Wirtschaft & Szenarien</span><span class="chip-soon">Modellschätzung</span></span><span class="strong">Noch kein Wochenstand</span><span class="small muted2">Erste Neubewertung ${fmtWhen(scNext())}. Startannahme: A ${pct(scSet().scenarios[0].prior,0)}, B ${pct(scSet().scenarios[1].prior,0)}, C ${pct(scSet().scenarios[2].prior,0)}.</span></a>`;
  const lead=['A','B','C'].reduce((a,b)=>L.display[b]>L.display[a]?b:a,'A'),pp=L.change_pp[lead];
  return `<a class="card col sc-teaser" href="#szenarien" style="gap:6px" aria-label="Wirtschaft und Szenarien: führend ${esc(scName(lead))} mit ${L.display[lead]} Prozent, ${ppTxt(pp)} gegenüber ${esc(scCmpTxt(L))}">
   <span class="row between"><span class="lbl">Wirtschaft & Szenarien</span><span class="chip-soon">Modellschätzung</span></span>
   <span class="row" style="gap:10px;align-items:baseline;flex-wrap:wrap"><span class="big" style="font-size:28px">${L.display[lead]} %</span><span class="strong">${lead} · ${esc(scName(lead))}</span></span>
   <span class="sc-mini" aria-hidden="true">${['A','B','C'].map(k=>`<i style="width:${L.display[k]}%;background:${SC_COL[k]}"></i>`).join('')}</span>
   <span class="small"><b class="${ppCls(lead,pp)}">${ppTxt(pp)}</b> <span class="muted2">gegenüber ${esc(scCmpTxt(L))}</span></span>
   <span class="stand-l" style="min-height:0"><i class="dot ${scStatusDot(L)}"></i><span class="small muted2">${L.status==='kept'?'Keine belastbare Neubewertung · ':''}${esc(scDataTxt(L))}</span><span></span></span></a>`}

/* ---------- Detailansicht #szenarien ---------- */
function vSzen(arg){
  SCX.demo=arg==='demo';
  const back=hubHead('welt','szenarien',`<span class="small strong muted2">${SC_LABEL}</span>`);
  if(!SCEN)return back+'<div class="empty">Szenariodaten fehlen in dieser Version.</div>';
  const set=scSet(),D0=scData(),L=D0.latest;
  const head=`${back}${SCX.demo?'<a href="#szenarien" class="demo-bar"><span class="chip-demo">UI-Testdaten</span><span>Erfundene Beispielwerte, kein Live-Verlauf. Zur echten Ansicht.</span></a>':''}
   <p class="small muted2">Drei feste Szenarien für ${scDate(set.horizon.start)} bis ${scDate(set.horizon.target_date)}, wöchentlich aus amtlichen Wirtschaftsdaten neu gerechnet. ${esc(set.prior_note)}</p>`;
  if(!L)return head+`<section class="card col" style="gap:8px"><h2 class="h2" style="margin:0">Startzustand</h2><p class="small muted2">Noch kein Wochenstand. Bis zur ersten Neubewertung gelten die Startannahmen. Erste Neubewertung: ${fmtWhen(scNext())}.</p>${set.scenarios.map(s=>`<div class="sc-row"><i class="dot" style="background:${SC_COL[s.id]}"></i><span class="strong">${s.id} · ${esc(s.name)}</span><span class="num">${pct(s.prior,0)}</span></div>`).join('')}</section>`+scMethod()+scCalc(null);
  const selId=SCX.week;let sel=null;
  if(selId){const m=D0.index.find(s=>s.snapshot_id===selId);if(m){sel=D0.full[selId];if(!sel)scLoad(selId)}}
  return head+scBanner(L)+scCards(L)+scChanged(L)+scChart(D0,selId)+(selId?scWeekDetail(D0,selId,sel):'')+scQuality(L)+scInputs(L)+scCalc(L)+scMethod()+`<p class="hint">Keine Anlageberatung. Die Prozentwerte sind eine heuristische Modellrechnung mit festen Regeln, keine Prognose einer Institution und keine geprüfte Trefferquote.</p>`}

function scBanner(L){
  if(L.status==='kept')return `<div class="banner"><b>Keine belastbare Neubewertung</b><span>Wichtige Quellen fehlen oder sind veraltet (${esc((L.data_quality.missing_critical||[]).map(g=>(L.data_quality.groups.find(x=>x.id===g)||{}).name||g).join(', ')||'Abdeckung zu gering')}). Gezeigt werden die letzten gültigen Gewichte vom ${scDate(L.last_successful_evaluation_at)}.</span></div>`;
  if(L.status==='partial')return `<div class="banner"><b>Neubewertung mit Lücken</b><span>${L.data_quality.indicators_ok} von ${L.data_quality.indicators_total} Indikatoren gültig. Fehlende Werte zählen weder als Entspannung noch als Belastung.</span></div>`;
  if(L.method_note)return `<div class="banner info"><b>Neue Methode</b><span>${esc(L.method_note)}. Ein Teil der Veränderung ist methodisch bedingt.</span></div>`;
  return ''}

function scCards(L){const set=scSet(),c=L.compare_to||{};
  return `<section class="col" style="gap:8px" aria-label="Aktuelle Szenario-Wahrscheinlichkeiten"><div class="row between"><h2 class="h2" style="margin:0">Stand ${weekLbl(L.week_id)}</h2><span class="small muted2">${L.revision>1?`Revision ${L.revision} · `:''}Modell ${esc(L.model_version)}</span></div>
   ${set.scenarios.map(s=>{const v=L.display[s.id],pv=c.display?c.display[s.id]:null,pp=L.change_pp[s.id];
    return `<article class="card col sc-card" style="gap:6px;border-left:5px solid ${SC_COL[s.id]}">
     <div class="row between" style="align-items:flex-start;flex-wrap:nowrap"><span class="col" style="gap:2px;min-width:0"><span class="strong">${s.id} · ${esc(s.name)}</span><span class="small muted2">${esc(s.short)}</span></span><span class="big sc-pct">${v} %</span></div>
     <span class="sc-bar" aria-hidden="true"><i style="width:${v}%;background:${SC_COL[s.id]}"></i>${pv!=null?`<b style="left:${pv}%" title="vorher"></b>`:''}</span>
     <span class="small">${pv!=null?`${c.kind==='start'?'Start':'Vorher'} ${pv} % · `:''}<b class="${ppCls(s.id,pp)}">${ppTxt(pp)}</b>${pp?` <span class="sr">${s.id==='C'?(pp>0?'(höheres Stressrisiko)':'(geringeres Stressrisiko)'):''}</span>`:''}</span>
     <details><summary>Definition und Auflösung</summary><p class="small muted2">${esc(s.definition)}</p><p class="small muted2"><b>Auflösung am ${scDate(set.resolution.evaluated_on)}:</b> ${esc(scRes(s.id))}</p></details></article>`}).join('')}
   <p class="hint">Differenzen in Prozentpunkten, berechnet aus den angezeigten ganzen Prozenten. Vergleich mit ${esc(scCmpTxt(L))}.</p></section>`}
function scRes(id){const r=scSet().resolution.rules.find(x=>x.scenario===id);return r?(r.any_of?'Trifft zu, wenn eines gilt: ':'Trifft zu, wenn alles gilt: ')+(r.any_of||r.all_of).join(' '):''}

function scDrv(list,cls){return list.map(r=>`<li class="sc-drv ${cls}"><span>${esc(r.text||r.name)}</span>${r.url?` <a class="src" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.source||'Quelle')}</a>`:''}</li>`).join('')}
function scChanged(L){const ch=['A','B','C'].filter(k=>L.change_pp[k]!==0),cause={new_data:'neue Daten',revision:'Datenrevisionen',method:'neue Methode',data_status:'veränderte Datenverfügbarkeit',start:'erste Bewertung gegenüber der Startannahme',none:'keine neuen relevanten Daten'};
  return `<section class="card col" style="gap:8px"><h2 class="h2" style="margin:0">Was hat sich verändert?</h2><p>${esc(L.summary)}</p>
   <p class="small muted2">Ursache: ${esc((L.change_causes||[]).map(c=>cause[c]||c).join(', '))}.</p>
   ${ch.length?ch.map(k=>{const d=L.drivers[k]||{support:[],against:[]};return `<div class="col sc-drvbox" style="gap:4px"><span class="strong"><i class="dot" style="background:${SC_COL[k]}"></i> ${k} · ${esc(scName(k))} <b class="${ppCls(k,L.change_pp[k])}">${ppShort(L.change_pp[k])}</b></span>
     ${k==='A'?'<span class="small muted2">A ist der Referenzfall ohne eigenes Signal und verändert sich nur über die Normierung, wenn B oder C stärker werden.</span>':''}
     ${d.support.length?`<span class="small strong muted2">Treiber</span><ul class="sc-ul">${scDrv(d.support,'sup')}</ul>`:''}
     ${d.against.length?`<span class="small strong muted2">Gegenläufig</span><ul class="sc-ul">${scDrv(d.against,'agt')}</ul>`:''}
     ${!d.support.length&&!d.against.length?'<span class="small muted2">Keine einzelnen Treiber zuordenbar (Rundung oder Normierung).</span>':''}</div>`}).join(''):'<p class="small muted2">Alle drei Gewichte sind unverändert.</p>'}</section>`}

/* Verlauf: drei Linien, 0–100 %, feste Farben, Lücken sichtbar */
function scChart(D0,selId){
  const all=scWeeks(D0.index);const n=SCX.range==='all'?Infinity:+SCX.range;
  const lastW=all.length?all[all.length-1].week_id:null;
  const pts=all.filter(s=>n===Infinity||scWB(s.week_id,lastW)<n);
  const span=pts.length?Math.max(1,scWB(pts[0].week_id,lastW)):1;
  const W=360,H=200,l=34,r=10,t=10,b=26,iw=W-l-r,ih=H-t-b;
  const X=s=>pts.length<2&&span<=1?l+iw/2:l+iw*(scWB(pts[0].week_id,s.week_id)/span),Y=v=>t+ih*(1-v/100);
  let lines='',gaps='';
  ['A','B','C'].forEach(k=>{let d='';pts.forEach((s,i)=>{const cont=i>0&&scWB(pts[i-1].week_id,s.week_id)===1;d+=`${cont?'L':'M'}${X(s).toFixed(1)} ${Y(s.display[k]).toFixed(1)} `});
    lines+=`<path d="${d}" fill="none" stroke="${SC_COL[k]}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
    lines+=pts.map(s=>`<circle cx="${X(s).toFixed(1)}" cy="${Y(s.display[k]).toFixed(1)}" r="${s.snapshot_id===selId?5:3}" fill="${SC_COL[k]}" stroke="var(--card)" stroke-width="1.5"/>`).join('')});
  pts.forEach((s,i)=>{if(i>0&&scWB(pts[i-1].week_id,s.week_id)>1){const x0=X(pts[i-1]),x1=X(s);gaps+=`<rect x="${x0+3}" y="${t}" width="${Math.max(0,x1-x0-6)}" height="${ih}" fill="var(--line-soft)" opacity=".7"/><text x="${(x0+x1)/2}" y="${t+12}" text-anchor="middle" class="zax">Lücke</text>`}});
  const hit=pts.map(s=>`<rect x="${X(s)-10}" y="${t}" width="20" height="${ih}" fill="transparent" data-scweek="${esc(s.snapshot_id)}" style="cursor:pointer"/>`).join('');
  const grid=[0,25,50,75,100].map(v=>`<line class="zgrid" x1="${l}" x2="${W-r}" y1="${Y(v)}" y2="${Y(v)}"/><text class="zax" x="${l-6}" y="${Y(v)+3}" text-anchor="end">${v} %</text>`).join('');
  const xl=pts.length?[pts[0],pts[pts.length-1]].filter((s,i,a)=>i===0||s!==a[0]).map((s,i)=>`<text class="zax" x="${X(s)}" y="${H-8}" text-anchor="${pts.length===1?'middle':i===0?'start':'end'}">${weekLbl(s.week_id)}</text>`).join(''):'';
  const sel=selId&&pts.find(s=>s.snapshot_id===selId);const selLine=sel?`<line x1="${X(sel)}" x2="${X(sel)}" y1="${t}" y2="${t+ih}" class="zcur"/>`:'';
  const aria=pts.length?`Verlauf von ${weekLbl(pts[0].week_id)} bis ${weekLbl(lastW)}: aktuell A ${pts[pts.length-1].display.A} %, B ${pts[pts.length-1].display.B} %, C ${pts[pts.length-1].display.C} %.`:'Noch kein Verlauf.';
  const missing=all.length>1?all.slice(1).reduce((a,s,i)=>a+Math.max(0,scWB(all[i].week_id,s.week_id)-1),0):0;
  return `<section class="card col" style="gap:8px"><div class="row between"><h2 class="h2" style="margin:0">Verlauf</h2><span class="small muted2">${all.length} ${all.length===1?'Woche':'Wochen'}${missing?`, ${missing} fehlend`:''}</span></div>
   <div class="seg sc-seg" role="group" aria-label="Zeitraum">${[['13','13 W.'],['26','26 W.'],['52','52 W.'],['all','Alles']].map(([k,lb])=>`<button type="button" data-scrange="${k}" aria-pressed="${SCX.range===k}">${lb}</button>`).join('')}</div>
   <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(aria)}" class="sc-chart">${grid}${gaps}${selLine}${lines}${hit}${xl}</svg>
   <div class="row sc-legend" style="gap:12px">${['A','B','C'].map(k=>`<span class="small"><i class="dot" style="background:${SC_COL[k]}"></i> ${k} ${esc(scName(k))}</span>`).join('')}</div>
   ${all.length===1?'<p class="hint">Der Verlauf beginnt mit diesem ersten Wochenstand. Frühere Wochen gibt es nicht; es werden keine Werte nachträglich ergänzt.</p>':''}
   <div class="sc-weeks" role="group" aria-label="Woche wählen">${pts.slice().reverse().map(s=>`<button type="button" class="mchip" data-scweek="${esc(s.snapshot_id)}" aria-pressed="${s.snapshot_id===selId}">${weekLbl(s.week_id)}${s.status==='kept'?' ⚠':''}</button>`).join('')}</div></section>`}
function scWB(a,b){const m=w=>{const [y,k]=w.split('-W').map(Number);const j=new Date(Date.UTC(y,0,4)),wd=j.getUTCDay()||7;return j.getTime()+((k-1)*7-(wd-1))*864e5};return Math.round((m(b)-m(a))/(7*864e5))}

function scWeekDetail(D0,id,s){
  const meta=D0.index.find(x=>x.snapshot_id===id);if(!meta)return '';
  const close=`<button type="button" class="link" data-scweek="">Schließen</button>`;
  if(!s||s.loading)return `<section class="card col" style="gap:6px" aria-live="polite"><div class="row between"><h2 class="h2" style="margin:0">${weekLbl(meta.week_id)}</h2>${close}</div><p class="small muted2">A ${meta.display.A} %, B ${meta.display.B} %, C ${meta.display.C} % · Details werden geladen …</p></section>`;
  if(s.error)return `<section class="card col" style="gap:6px"><div class="row between"><h2 class="h2" style="margin:0">${weekLbl(meta.week_id)}</h2>${close}</div><p class="small">A ${meta.display.A} %, B ${meta.display.B} %, C ${meta.display.C} %</p><p class="hint-box">Details nicht verfügbar (${esc(s.error)}). Offline sind nur bereits geöffnete Wochen gespeichert.</p></section>`;
  return `<section class="card col sc-week" style="gap:8px" aria-live="polite"><div class="row between"><h2 class="h2" style="margin:0">${weekLbl(s.week_id)}${s.revision>1?` · Revision ${s.revision}`:''}</h2>${close}</div>
   <div class="kpis">${['A','B','C'].map(k=>`<div class="kpi" style="border-left:4px solid ${SC_COL[k]}"><span class="small muted2">${k} · ${esc(scName(k))}</span><span class="num strong">${s.display[k]} % <span class="${ppCls(k,s.change_pp[k])}" style="font-size:12px">${ppShort(s.change_pp[k])}</span></span></div>`).join('')}</div>
   <p class="small">${esc(s.summary)}</p>
   <dl class="kv"><dt>Status</dt><dd>${esc(s.status_text||s.status)}</dd><dt>Datenstand</dt><dd>${esc(scDataTxt(s))}</dd><dt>Vergleich</dt><dd>${esc(scCmpTxt(s))}</dd><dt>Modell</dt><dd>${esc(s.model_version)} · Szenarien ${esc(s.scenario_definition_version)}${s.config_hash?` · ${esc(s.config_hash)}`:''}</dd>${s.revision_of?`<dt>Korrigiert</dt><dd>${esc(s.revision_of)}</dd>`:''}</dl>
   ${['A','B','C'].filter(k=>s.change_pp[k]).map(k=>{const d=s.drivers[k];return d&&(d.support.length||d.against.length)?`<div class="small"><b>${k}:</b><ul class="sc-ul">${scDrv(d.support,'sup')}${scDrv(d.against,'agt')}</ul></div>`:''}).join('')}
   ${s.sources&&s.sources.length?`<details><summary>Quellen (${s.sources.length})</summary><ul class="sc-ul">${s.sources.map(q=>`<li><a class="src" href="${esc(q.url)}" target="_blank" rel="noopener">${esc(q.name)}</a></li>`).join('')}</ul></details>`:''}</section>`}

function scQuality(L){const st=SCEN.status||{},q=L.data_quality||{};
  const gl=(q.groups||[]).map(g=>`<div class="sc-grp"><span class="small strong">${esc(g.name)}</span><span class="small muted2">${g.used}/${g.total} · Gewicht ${Math.round(g.weight*100)} %</span>${scSig(g.x)}</div>`).join('');
  return `<section class="card col" style="gap:8px"><div class="row between"><h2 class="h2" style="margin:0">Datenqualität und Ablauf</h2><span class="mode ${L.status==='kept'?'off':'auto'}">${L.status==='kept'?'beibehalten':'automatisch'}</span></div>
   <dl class="kv"><dt>Status</dt><dd>${esc(L.status_text)}</dd>
   <dt>Abdeckung</dt><dd>${Math.round((q.coverage||0)*100)} % der Gruppengewichte · ${q.indicators_ok}/${q.indicators_total} Indikatoren gültig</dd>
   <dt>Datenstand</dt><dd>${esc(scDataTxt(L))}${L.data_oldest_period?`; ältester genutzter Wert ${scDate(L.data_oldest_period)}`:''}</dd>
   <dt>Letzte Neubewertung</dt><dd>${scDate(L.last_successful_evaluation_at||st.last_successful_evaluation_at)}</dd>
   <dt>Letzter Prüfversuch</dt><dd>${st.last_attempt_at?esc(fmtAsOf(st.last_attempt_at))+' · '+esc({new_snapshot:'neuer Wochenstand',revision:'Korrektur gespeichert',idempotent:'ohne neue Eingaben',failed:'fehlgeschlagen'}[st.last_attempt_result]||st.last_attempt_result||''):'–'}</dd>
   <dt>Nächster Lauf</dt><dd>${fmtWhen(scNext())} (geplant, Montag 07:20 Uhr; GitHub startet teils verspätet)</dd></dl>
   <div class="col" style="gap:2px">${gl}</div>
   ${(q.issues||[]).length?`<div class="col" style="gap:4px"><span class="small strong">Hinweise</span>${q.issues.map(i=>`<span class="small"><span class="st ${i.status==='context'?'np':'open'}">${esc({failed:'Abruf fehlgeschlagen',missing:'fehlt',stale:'veraltet',invalid:'ungültig',ok_cached:'Altwert',context:'Kontext'}[i.status]||i.status)}</span> ${esc(i.name)}: ${esc(i.issue)}</span>`).join('')}</div>`:''}
   ${(q.not_covered||[]).length?`<details><summary>Nicht abgedeckt (${q.not_covered.length})</summary>${q.not_covered.map(n=>`<p class="small muted2"><b>${esc(n.name)}:</b> ${esc(n.reason)}</p>`).join('')}</details>`:''}</section>`}
function scSig(x){if(x==null)return '<span class="sc-sig na small muted2">kein Signal</span>';const p=Math.abs(x)*50;return `<span class="sc-sig" role="img" aria-label="Signal ${num(x,2)}: ${x>0.05?'Entspannung':x<-0.05?'Belastung':'neutral'}"><i class="${x>=0?'up':'dn'}" style="width:${p}%;${x>=0?'left:50%':'right:50%'}"></i><b></b></span>`}
function scInputs(L){
  return `<details class="card"><summary>Indikatoren und Regeln (${(L.inputs||[]).length})</summary>${(L.inputs||[]).map(i=>`<div class="sc-inp"><div class="row between" style="align-items:flex-start;gap:8px;flex-wrap:nowrap"><span class="small strong">${esc(i.name)}</span><span class="st ${['ok','ok_cached'].includes(i.status)?'yes':i.status==='context'?'np':'open'}">${esc({ok:'gültig',ok_cached:'Altwert',stale:'veraltet',missing:'fehlt',failed:'Fehler',invalid:'ungültig',context:'Kontext'}[i.status]||i.status)}</span></div>
    <span class="small">${i.value!=null?`<b class="num">${esc(scVal(i))}</b> · ${esc(scPer(i.period))}`:'kein Wert'}${i.revision>1?` · Revision ${i.revision}`:''}${i.geo_used?` · ${esc(i.geo_used)}`:''}</span>
    ${i.role==='signal'?scSig(i.x):''}
    <span class="small muted2">${esc(i.rule_text||'')}</span>
    <span class="small muted2">${esc(i.region)} · ${esc({D:'täglich',M:'monatlich',Q:'quartalsweise'}[i.frequency]||i.frequency)} · ${esc(i.unit)}${i.first_seen_at?` · erstmals gesehen ${scDate(i.first_seen_at)}`:''}</span>
    <a class="src" href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.source)}</a></div>`).join('')}</details>`}
const scVal=i=>{const pctLike=/^%|als %/.test(i.unit||'');const d=Math.abs(i.value)<1&&!pctLike?3:1;return num(i.value,d)+(pctLike?' %':/Prozentpunkte/.test(i.unit||'')?' Pp.':/Mio\. BTU/.test(i.unit||'')?' $/MMBtu':'')};
function scPer(p){if(!p)return '–';let m=/^(\d{4})-(\d{2})$/.exec(p);if(m)return ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'][+m[2]-1]+' '+m[1];m=/^(\d{4})-Q([1-4])$/.exec(p);if(m)return `${m[2]}. Quartal ${m[1]}`;return deDate(p)}

/* Gesonderte Modellrechnung: editierbare Renditeannahmen, nicht mit der Zeitreise verknüpft */
function scCalc(L){const R=Object.assign({A:20,B:45,C:-25},UI.scenRet||{}),set=scSet();
  const w=L?L.display:Object.fromEntries(set.scenarios.map(s=>[s.id,Math.round(s.prior*100)]));
  const tot=['A','B','C'].reduce((a,k)=>a+w[k]/100*R[k],0);
  const yrs=(Date.parse(set.horizon.target_date)-Date.now())/(365.25*864e5);
  return `<section class="card col" style="gap:8px"><div class="row between"><h2 class="h2" style="margin:0">Gesonderte Modellrechnung</h2><span class="chip-soon">Annahmen</span></div>
   <p class="small muted2">Gewichtete Gesamtrendite bis ${scDate(set.horizon.target_date)} aus deinen Renditeannahmen je Szenario. Eine Rechnung mit Annahmen, kein erwarteter oder garantierter Ertrag und nicht aus dem BIP abgeleitet. Die Zeitreise bleibt davon unberührt.</p>
   <div class="col" style="gap:6px">${['A','B','C'].map(k=>`<label class="row between sc-ret"><span class="small"><i class="dot" style="background:${SC_COL[k]}"></i> ${k} · ${esc(scName(k))} (${w[k]} %)</span><span class="row" style="gap:4px;flex-wrap:nowrap"><input class="numin" inputmode="decimal" data-scret="${k}" value="${esc(String(R[k]).replace('.',','))}" aria-label="Renditeannahme ${k} in Prozent über den Gesamtzeitraum"><span class="small">%</span></span></label>`).join('')}</div>
   <div class="result"><span>Gewichtet über ${num(Math.max(0,yrs),1)} Jahre</span><b class="num">${num(tot,1)} %</b></div>
   <p class="hint">Beispiel mit den Startgewichten 50/20/30 und +20/+45/−25 %: 11,5 %.${yrs<2.9?' Der Resthorizont ist kürzer als drei Jahre: Passe die Renditeannahmen an die verbleibende Zeit an.':''} <button type="button" class="link" id="scRetReset">Annahmen zurücksetzen</button></p></section>`}

function scMethod(){const set=scSet(),cf=SCEN.config;
  return `<details class="card"><summary>Methode, Startannahmen und Auflösung</summary>
   <p class="small"><b>${esc(SC_LABEL)}.</b> ${esc(cf.method_label)}</p>
   <p class="small num" style="font-size:12px;margin-top:6px">${esc(cf.formula)}</p>
   <dl class="kv"><dt>Sensitivität</dt><dd>beta = ${num(cf.beta,2)}. ${esc(cf.beta_reason)}</dd><dt>Ladungen</dt><dd>${esc(cf.loadings_reason)}</dd><dt>Signale</dt><dd>begrenzt auf −1 bis +1. ${esc(cf.signal_direction)}</dd>
   <dt>Gruppen</dt><dd>${cf.groups.map(g=>`${esc(g.name)} ${Math.round(g.weight*100)} %`).join(' · ')}</dd>
   <dt>Korrelation</dt><dd>${esc(cf.correlation_rule)}</dd><dt>Lücken</dt><dd>${esc(cf.missing_rule)}</dd><dt>Ausfall</dt><dd>${esc(cf.critical_rule)}</dd>
   <dt>Startgewichte</dt><dd>${set.scenarios.map(s=>`${s.id} ${pct(s.prior,0)}`).join(', ')}. ${esc(set.prior_note)}</dd>
   <dt>Horizont</dt><dd>${scDate(set.horizon.start)} bis ${scDate(set.horizon.target_date)}. ${esc(set.rolling_note)}</dd>
   <dt>Kalibrierung</dt><dd>${esc(set.calibration.note)}</dd></dl>
   <p class="small"><b>Auflösung:</b> ${esc(set.resolution.order)} ${esc(set.resolution.return_note)}</p>
   <p class="small muted2">Kein Sprachmodell: Begründungen entstehen aus festen Regeln. Rohdaten im Repository unter data/scenarios/.</p></details>`}

/* Ereignisse */
document.addEventListener('click',e=>{const t=e.target;
  const r=t.closest('[data-scrange]');if(r){SCX.range=r.dataset.scrange;rerender();return}
  const w=t.closest('[data-scweek]');if(w){const id=w.dataset.scweek;SCX.week=id&&id!==SCX.week?id:null;if(SCX.week&&!SCX.demo&&!(SCEN.latest&&SCEN.latest.snapshot_id===SCX.week))scLoad(SCX.week);rerender();return}
  if(t.closest('#scRetReset')){delete UI.scenRet;saveUI();rerender();return}});
document.addEventListener('change',e=>{const el=e.target;if(el.dataset&&el.dataset.scret){const v=parseInput(el.value);if(v==null||!Number.isFinite(v)||v<-100||v>1000){el.setAttribute('aria-invalid','true');toast('Bitte eine Zahl von −100 bis 1000 eingeben.');return}
  UI.scenRet=Object.assign({A:20,B:45,C:-25},UI.scenRet||{},{[el.dataset.scret]:v});saveUI();rerender()}});
