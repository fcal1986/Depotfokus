/* =========================================================
   OBERFLÄCHE (Vision) – nutzt die geprüfte Logik oben
   ========================================================= */
const STATUS={goal:{met:'Erfüllt',not_met:'Nicht erfüllt',open:'Noch offen',np:'Nicht prüfbar'},risk:{occurred:'Eingetreten',not_occurred:'Nicht eingetreten',open:'Noch offen',np:'Nicht prüfbar'}};
const MOOD=new Proxy({},{get:(_,k)=>INFO[k]&&INFO[k].mood||undefined});
const MOODTXT={pos:'Rückenwind',warn:'Beobachten',neg:'Gegenwind',neutral:'Unverändert'};
const FUN_KEY='depotfokus-v5-fun';
let FUN=Object.assign({seen:[],understood:[],days:[],points:0,preds:{},notes:[]},load(FUN_KEY)||{});
function saveFun(){store(FUN_KEY,FUN)}
function streak(){const ds=new Set(FUN.days);let n=0;const d=new Date();for(;;){const k=d.toISOString().slice(0,10);if(ds.has(k)){n++;d.setDate(d.getDate()-1)}else break}return n}
function touchDay(){const k=new Date().toISOString().slice(0,10);if(!FUN.days.includes(k)){FUN.days.push(k);FUN.days=FUN.days.slice(-400)}}
function renderAll(){route()}
/* Neue Berichte (Stufe 1) und Vorschläge (Stufe 2) aus reports.json */
let REPORTS=null;
function loadReports(){if(typeof fetch!=='function')return;fetch('reports.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(j=>{if(j&&j.positions){REPORTS=j;rerender()}}).catch(()=>{})}
const deDate=s=>s&&/^\d{4}-\d{2}-\d{2}/.test(s)?s.slice(0,10).split('-').reverse().join('.'):s||'';
function newReports(sym){const r=REPORTS&&REPORTS.positions&&REPORTS.positions[sym],I=INFO[sym];if(!r||!I)return [];const since=I.assessedFrom&&I.assessedFrom.date>I.checked?I.assessedFrom.date:I.checked;return (r.new||[]).filter(f=>f.date>since)}
const proposalFor=sym=>REPORTS&&(REPORTS.proposals||[]).find(x=>x.sym===sym)||null;
const methodTxt=I=>I&&I.method==='claude'?'von Claude eingeordnet, von dir freigegeben':'manuell geprüft';
const storyKey=p=>{const n=newReports(p.symbol)[0];return p.id+'@'+(INFO[p.symbol]&&INFO[p.symbol].checked||'')+(n?'#'+n.acc:'')};
const ICON_EXT='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';
function newsLine(sym){const n=newReports(sym)[0];if(!n)return '';const pr=proposalFor(sym);
  return pr?`Ein Vorschlag zur neuen Einordnung liegt zur Freigabe bereit (Pull Request #${pr.number}).`:REPORTS&&REPORTS.assessEnabled?'Die automatische Einordnung folgt beim nächsten Lauf; danach gibst du sie frei.':'Noch nicht eingeordnet.'}
function setTab(t){location.hash=t==='home'?'#heute':'#'+t}
const ICON={
 back:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
 close:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 gear:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></svg>',
 pause:'<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
 play:'<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5l12 7-12 7z"/></svg>',
 contrast:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',
 bars:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 20V14M10 20V9M16 20V5M22 20H2"/></svg>'
};
function weather(kind){
  const sun='<circle cx="18" cy="18" r="8" stroke="#E0A100"/><path d="M18 4v3M18 29v3M4 18h3M29 18h3M8 8l2 2M26 26l2 2M8 28l2-2M26 10l2-2" stroke="#E0A100"/>';
  const cloud='<path d="M20 40h18a7 7 0 0 0 0-14 9 9 0 0 0-17 3 6 6 0 0 0-1 11z" stroke="#4A5070" fill="#fff"/>';
  const rain='<path d="M22 44l-2 3M30 44l-2 3M38 44l-2 3" stroke="#1F5FD1"/>';
  const q='<circle cx="24" cy="24" r="16" stroke="#6B7090" stroke-dasharray="4 4"/>';
  const body=kind==='sun'?sun:kind==='cloud'?sun+cloud:kind==='rain'?cloud+rain:q;
  return `<svg width="48" height="48" style="flex:none" viewBox="0 0 48 48" fill="none" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">${body}</svg>`;
}
const posById=id=>D().positions.find(p=>p.id===id);
const hasStory=p=>{const I=INFO[p.symbol];return I&&!I.etf&&isIncluded(p)};
function storyPositions(){const d=D();return d.positions.filter(hasStory).sort((a,b)=>posValue(b)-posValue(a))}
function srcText(k){const s=S[k];return s?`${esc(s.org)}, ${esc(s.doc)}, ${esc(s.per)}, ${esc(s.date)}`:'Quelle nicht verfügbar'}
function srcLink(k){const s=S[k];return s?`<a class="src" href="${s.url}" target="_blank" rel="noopener">${srcText(k)}</a>`:'<span class="src">Quelle nicht verfügbar</span>'}
const kindTag=k=>`<span class="kind ${k}">${k==='metric'?'Kennzahl':k==='company'?'Unternehmensangabe':'Einordnung'}</span>`;

/* ---------------- Routing ---------------- */
const TABFOR={heute:'heute',story:'heute',daten:'heute',stand:'heute',depot:'depot',pos:'depot',check:'depot',haus:'depot',kalender:'einkommen',plan:'einkommen',zeit:'einkommen',szenarien:'welt',berichte:'welt',nachrichten:'welt',nachricht:'welt',liga:'liga'};
/* Bereiche mit Unterseiten: Einkommen (Dividenden, Plan, Zeitreise) und Welt (Szenarien, Berichte) */
const HUBS={einkommen:{t:'Einkommen',sub:[['kalender','Dividenden'],['plan','Plan'],['zeit','Zeitreise']]},welt:{t:'Welt',sub:[['nachrichten','Nachrichten'],['szenarien','Szenarien'],['berichte','Berichte']]}};
function hubHead(hub,cur,extra=''){const H=HUBS[hub];return `<div class="row between"><h1 class="h1" style="font-size:28px">${H.t}</h1><a href="#daten" class="icon-btn" aria-label="Einstellungen, Daten und Import">${ICON.gear}</a></div>
  <nav class="hubseg" aria-label="${H.t}">${H.sub.map(([k,l])=>`<a href="#${k}"${k===cur?' aria-current="page"':''}>${l}</a>`).join('')}</nav>${extra}`}
function parse(){const h=decodeURIComponent((location.hash||'#heute').slice(1));const [r,...a]=h.split('/');return {r:r||'heute',a}}
function route(){
  const {r,a}=parse();const v=$('#view');let html='';
  try{
    if(r==='story')html=vStory(a[0]);
    else if(r==='depot')html=vDepot();
    else if(r==='pos')html=vPos(a[0]);
    else if(r==='check')html=vCheck(a[0],a[1]);
    else if(r==='plan')html=vPlan();
    else if(r==='liga')html=vLiga();
    else if(r==='daten')html=vDaten();
    else if(r==='stand')html=vStand();
    else if(r==='zeit')html=vZeit();
    else if(r==='haus')html=vHaus(a[0]);
    else if(r==='kalender')html=vKalender();
    else if(r==='szenarien')html=vSzen(a[0]);
    else if(r==='berichte')html=vBerichte();
    else if(r==='nachrichten')html=vNachrichten(a[0]);
    else if(r==='nachricht')html=vNachricht(a[0]);
    else if(r==='einkommen')html=(location.replace('#'+((UI.hub&&UI.hub.einkommen)||'kalender')),'');
    else if(r==='welt')html=(location.replace('#'+((UI.hub&&UI.hub.welt)||'nachrichten')),'');
    else html=vHeute();
  }catch(e){html=`<div class="card"><b>Diese Ansicht konnte nicht geladen werden.</b><p class="hint">${esc(e.message)}</p><a class="btn" href="#heute">Zum Start</a></div>`;console.error(e)}
  const ss0=document.getElementById('stadtScroll'),sl0=ss0?ss0.scrollLeft:null;
  v.innerHTML=html;v.className=r==='story'?'story':'screen';
  const full=r==='story'||r==='check';$('#tabs').hidden=full;v.classList.toggle('sub',full);
  const tab=TABFOR[r]||'heute';
  if(HUBS[tab]&&HUBS[tab].sub.some(([k])=>k===r)){UI.hub=Object.assign({},UI.hub,{[tab]:r});saveUI()}
  document.querySelectorAll('#tabs a').forEach(x=>{if(x.dataset.tab===tab)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current');if(HUBS[x.dataset.tab])x.setAttribute('href','#'+((UI.hub&&UI.hub[x.dataset.tab])||HUBS[x.dataset.tab].sub[0][0]))});
  updateBadges();
  if(r==='daten'){renderSourceCard();renderImport();renderTxCard();renderPrices();renderConfirm();renderExt()}
  if(r==='plan')renderGoalSum2();
  if(r==='story')armStory();else stopStory();
  if(r==='depot'&&UI.depotView==='stadt'){const ss=document.getElementById('stadtScroll');if(route.keep&&sl0!=null&&ss)ss.scrollLeft=sl0;else stadtCenter()}
  if(!route.keep){window.scrollTo(0,0);const h=v.querySelector('h1');if(h){h.setAttribute('tabindex','-1');h.focus({preventScroll:true})}}
  route.keep=false;
}
function rerender(){route.keep=true;const y=window.scrollY;route();window.scrollTo(0,y)}
window.addEventListener('hashchange',route);

/* ---------------- Heute ---------------- */
function vHeute(){
  const d=D(),tt=totals(d),c=checkModel(d),now=new Date(),hr=now.getHours();
  const greet=hr<11?'Guten Morgen':hr<18?'Guten Tag':'Guten Abend';
  const st=storyPositions();
  const crit=c.dev.filter(x=>x.lvl==='crit'),warn=c.dev.filter(x=>x.lvl==='warn');
  const rank={neg:0,warn:1,pos:2,neutral:3};
  const fresh=st.filter(p=>newReports(p.symbol).length);
  const changes=st.filter(p=>!fresh.includes(p)&&INFO[p.symbol].changes.items.length).sort((a,b)=>(rank[MOOD[a.symbol]||'neutral']-rank[MOOD[b.symbol]||'neutral'])||posValue(b)-posValue(a)).slice(0,Math.max(1,3-fresh.length));
  return `
  <div class="row between">
    <div class="col" style="gap:2px"><span class="small strong muted2">${now.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'})}</span><h1 class="h1">${greet}</h1></div>
    <div class="row" style="gap:6px">
      <a href="#liga" class="chip-btn" aria-label="Lernserie: ${streak()} Tage, ${FUN.points} Wissenspunkte">${ICON.bars}<span>${streak()} ${streak()===1?'Tag':'Tage'}</span></a>
      <a href="#daten" class="icon-btn" aria-label="Einstellungen, Daten und Import">${ICON.gear}</a>
    </div>
  </div>
  ${d.kind==='demo'?`<a href="#daten" class="demo-bar"><span class="chip-demo">Musterdepot</span><span>Erfundene Bestände. Tippe hier, um dein eigenes Depot zu importieren.</span></a>`:''}
  ${st.length?`<div class="stories" aria-label="Neuigkeiten zu deinen Positionen">${st.map(p=>`<a href="#story/${encodeURIComponent(p.id)}" class="story-b"><span class="ring ${FUN.seen.includes(storyKey(p))?'seen':''}${newReports(p.symbol).length?' fresh':''}"><span class="av">${esc(initials(p.name))}</span></span><span class="n">${esc(short(p.name))}</span></a>`).join('')}</div>`:''}
  <section class="dark col" style="gap:6px">
    <div class="row between"><span class="lbl">Dein Vermögen</span>${d.kind==='demo'?'<span class="chip-demo">Muster</span>':''}</div>
    <div class="row" style="align-items:baseline;gap:8px;flex-wrap:wrap"><span class="big" style="font-size:34px">${eur(tt.sum)}</span>${tt.open?'<span class="warn-text">unvollständig</span>':''}</div>
    ${dayLine(d)}
    ${perfLine(d)}
    <span class="small muted-night">${tt.open?`${tt.open>1?tt.open+' Positionen mit ungeklärtem Wert fehlen':'1 Position mit ungeklärtem Wert fehlt'}. `:''}${valLine(d)}</span>
  </section>
  ${eventsHTML(d)}
  ${newsTeaser()}
  ${c.incomplete?`<a href="#daten" class="banner"><b>Zuordnungen prüfen</b><span>Ohne Bestätigung ${(tt.open+noBucket(d).length)===1?'fehlt 1 Position':'fehlen '+(tt.open+noBucket(d).length)+' Positionen'} in Gewichten und Zielvergleich.</span></a>`:''}
  <section class="col" style="gap:8px">
    <div class="row between"><h2 class="h2" style="margin:0">Was sich geändert hat</h2><a class="link" href="#berichte">Alle Berichte →</a></div>
    ${fresh.map(p=>{const n=newReports(p.symbol)[0];return `<a href="#pos/${encodeURIComponent(p.id)}" class="card col change"><span class="row between"><span class="t">${esc(p.name)}</span><span class="tag new">Neuer Bericht</span></span><span class="d">${esc(n.label)} vom ${deDate(n.date)}. ${esc(newsLine(p.symbol))}</span><span class="src">Erkannt bei der SEC am ${esc(deDate(REPORTS.checkedAt))}</span></a>`}).join('')}
    ${changes.length?changes.map(p=>{const I=INFO[p.symbol],m=MOOD[p.symbol]||'neutral';return `<a href="#story/${encodeURIComponent(p.id)}" class="card col change"><span class="row between"><span class="t">${esc(p.name)}</span><span class="tag ${m}">${MOODTXT[m]}</span></span><span class="d">${esc(I.changes.items[0].t)}</span><span class="src">${esc(I.changes.cmp)} · Stand ${deDate(I.checked)}</span></a>`}).join(''):fresh.length?'':'<p class="hint">Für deine Positionen liegen noch keine geprüften Veränderungen vor.</p>'}
  </section>
  ${scenTeaser()}
  <p class="hint">Keine Anlageberatung.</p>`;
}
function valLine(d){const pi=priceInfo(d);const exp=d.kind==='demo'?'Exportwerte vom 04.10.2026':`Exportwerte aus ${esc(d.fileName)}${d.valuationDate?', Stichtag '+esc(d.valuationDate):''}`;
  if(pi.avail&&pi.on&&pi.n)return `Kurse von ${esc(fmtAsOf(pi.asOf))} für ${pi.n} von ${pi.of} Positionen${pi.n<pi.of?`, übrige: ${exp}`:''}. Verzögert, ohne Gewähr.`;
  return exp+'.'}
function dayLine(d){const t=dayTotal(d);if(!t)return '';const pi=priceInfo(d);
  return `<div class="dayline"><b class="${t.abs>=0?'up':'down'}">${sgn(t.abs)} (${spct(t.rel,2)})</b><span class="muted-night small">heute${t.n<pi.of?`, ${t.n} von ${pi.of} Positionen`:''}</span></div>`}
function perfLine(d){const m=txModel(d);if(!m||!m.okCount)return '';
  return `<div class="perf"><span><b class="${m.result>=0?'up':'down'}">${sgn(m.result)}</b> <span style="white-space:nowrap">${m.irr!=null?`· ${spct(m.irr)} p. a.`:`· ${spct(m.simple)} gesamt`}</span><br><span class="muted-night small">Ergebnis seit ${isoToDe(m.since)}, inkl. Ausschüttungen</span></span><span><b>${eur(m.M.div12)}</b><br><span class="muted-night small">Ausschüttungen 12 Monate</span></span></div>`}
function eventsHTML(d){const ev=d.events.filter(e=>!d.read.includes(e.id)).slice(0,3);if(!ev.length)return '';
  return `<section class="card col" style="gap:8px"><div class="row between"><span class="lbl">Neu auf diesem Gerät</span><button class="link" id="evRead" type="button">Gelesen</button></div>${ev.map(e=>`<div class="col" style="gap:2px"><span class="strong">${esc(e.t)}</span><span class="small muted2">${esc(e.b||'')} · ${esc(e.at)}</span></div>`).join('')}</section>`}
const initials=n=>{const w=n.replace(/[^A-Za-zÄÖÜäöü ]/g,' ').split(/\s+/).filter(x=>x.length>1);return (w.length>1?w[0][0]+w[1][0]:(w[0]||'?').slice(0,2)).toUpperCase()};
const short=n=>{const w=n.split(/[\s(]+/)[0];return w.length>9?w.slice(0,8)+'.':w};

/* ---------------- Story (wie WhatsApp-Status) ----------------
   Läuft automatisch weiter; rechts tippen = weiter, links = zurück, halten = Pause.
   Nach dem letzten Teil folgt die Story der nächsten Position. */
let storyIdx=0,storyId=null,storyT=null,storyRem=0,storyStart=0,storyPaused=false,storySpeed=1,tapDown=0,tapLong=false;
const reducedMotion=()=>!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
function storySlides(p){const I=INFO[p.symbol];const sl=[];
  const n=newReports(p.symbol)[0];if(n)sl.push({lbl:'Bei der SEC erkannt',kind:'news',t:`Neuer Bericht: ${n.label} vom ${deDate(n.date)}.`,sub:newsLine(p.symbol)+` Die folgende Einordnung ist vom ${deDate(I.checked)}.`,url:n.url,src:null});
  sl.push({lbl:'Einordnung',kind:'interp',t:I.interp,src:null});
  I.changes.items.forEach(c=>sl.push({lbl:'Was sich verändert hat · '+I.changes.cmp,kind:c.kind,t:c.t,src:c.src[0]}));
  if(I.facts[0])sl.push({lbl:'Fakt aus dem Bericht',kind:I.facts[0].kind,t:I.facts[0].t,src:I.facts[0].src});
  const r=I.rules[0];if(r)sl.push({lbl:'Worauf wir achten',kind:'rule',t:r.q,rule:r,src:r.src});
  return sl}
const slideDur=s=>Math.round(Math.min(14000,Math.max(6000,3500+(s.t.length+(s.rule?140:0)+(s.sub?s.sub.length:0))*45))*storySpeed);
function vStory(id){
  const p=posById(id);if(!p||!hasStory(p))return `<div class="col" style="gap:14px"><h1 class="big" style="font-size:26px">Keine Story verfügbar</h1><p>Für diese Position liegt noch keine geprüfte Einordnung vor.</p><a class="btn light" href="#heute">Zurück</a></div>`;
  if(storyId!==id){storyId=id;storyIdx=0}
  {const sk=storyKey(p);if(!FUN.seen.includes(sk)){FUN.seen.push(sk);FUN.seen=FUN.seen.slice(-300);saveFun()}}
  const sl=storySlides(p);storyIdx=Math.min(storyIdx,sl.length-1);const s=sl[storyIdx],tt=totals(D());
  const list=storyPositions(),k=list.findIndex(x=>x.id===id);
  const und=FUN.understood.includes(id);
  return `
  <div class="prog" role="progressbar" aria-label="Teil ${storyIdx+1} von ${sl.length}" aria-valuemin="1" aria-valuemax="${sl.length}" aria-valuenow="${storyIdx+1}">${sl.map((_,i)=>`<span class="${i<storyIdx?'done':i===storyIdx?'cur':''}"><i></i></span>`).join('')}</div>
  <div class="row">
    <span class="av light">${esc(initials(p.name))}</span>
    <div class="col" style="flex:1;min-width:0"><span class="strong">${esc(p.name)}</span><span class="small muted-night">${pct(posValue(p)/tt.sum)} ${D().kind==='demo'?'des Musterdepots':'deines Depots'} · Stand ${deDate(INFO[p.symbol].checked)}, ${methodTxt(INFO[p.symbol])}</span></div>
    <button type="button" class="icon-btn night" id="storyPause" aria-label="${reducedMotion()?'Automatisch weiter':'Pause'}">${reducedMotion()?ICON.play:ICON.pause}</button>
    <a href="#heute" class="icon-btn night" aria-label="Story schließen">${ICON.close}</a>
  </div>
  ${!FUN.storyHint?'<p class="story-hint">Tippe rechts für weiter, links für zurück. Halten pausiert.</p>':''}
  <div class="story-stage">
    <button type="button" class="tap prev" data-story="prev" aria-label="Vorheriger Teil"></button>
    <button type="button" class="tap next" data-story="next" aria-label="${storyIdx<sl.length-1?'Nächster Teil':k<list.length-1?'Nächste Story: '+esc(list[k+1].name):'Stories beenden'}"></button>
    <span class="lbl night">${esc(s.lbl)}</span>
    ${s.kind==='news'?'<span class="tag new" style="align-self:flex-start">Neuer Bericht</span>':s.kind!=='rule'&&s.kind!=='interp'?`<span>${kindTag(s.kind)}</span>`:''}
    <h1 class="big story-h">${esc(s.t)}</h1>
    ${s.rule?`<div class="story-box"><div class="row between"><span>Stand ${esc(s.rule.per)}</span><span class="st ${stCls(s.rule)}">${STATUS[s.rule.type][s.rule.status]}</span></div><span class="small muted-night">${esc(s.rule.metric)}: ${esc(s.rule.cond)}${s.rule.obs?` · beobachtet ${esc(s.rule.obs)}`:''}</span><span class="small muted-night">Nächste Prüfung: ${esc(s.rule.next)}</span></div>`:''}
    ${s.kind==='news'?`<span class="small muted-night">${esc(s.sub)}</span><a class="story-link" href="${esc(s.url)}" target="_blank" rel="noopener">Bericht bei der SEC öffnen ${ICON_EXT}</a>`:''}
    ${s.src?`<span class="small muted-night">Quelle: ${srcText(s.src)}</span>`:s.kind==='interp'?'<span class="small muted-night">Interpretation von Depotfokus auf Basis der Quellen</span>':''}
  </div>
  <div class="col" style="gap:10px">
    <span class="small muted-night center">${k>=0?`Story ${k+1} von ${list.length}`:''}${k<list.length-1?` · danach ${esc(list[k+1].name)}`:''}</span>
    <a href="#pos/${encodeURIComponent(id)}" class="btn light">Tiefer einsteigen</a>
    <button type="button" class="btn ghost-dark" data-understood="${esc(id)}">${und?'Verstanden ✓':'Verstanden · +10 Wissen'}</button>
  </div>`;
}
function stopStory(){clearTimeout(storyT);storyT=null}
function armStory(){
  stopStory();const p=posById(storyId);if(!p||!hasStory(p))return;const sl=storySlides(p);
  storyRem=slideDur(sl[storyIdx]);storyPaused=false;const v=$('#view');v.classList.remove('paused');
  const bar=v.querySelector('.prog .cur i');if(bar)bar.style.animationDuration=storyRem+'ms';
  if(reducedMotion()){storyPaused=true;v.classList.add('paused','manual');return}
  storyStart=Date.now();storyT=setTimeout(()=>storyStep(1),storyRem);
}
function pauseStory(){if(storyPaused)return;storyPaused=true;if(storyT){clearTimeout(storyT);storyT=null;storyRem-=Date.now()-storyStart}$('#view').classList.add('paused');pauseBtn()}
function resumeStory(){if(!storyPaused)return;storyPaused=false;const v=$('#view');v.classList.remove('paused','manual');storyStart=Date.now();storyT=setTimeout(()=>storyStep(1),Math.max(400,storyRem));pauseBtn()}
function pauseBtn(){const b=$('#storyPause');if(b){b.innerHTML=storyPaused?ICON.play:ICON.pause;b.setAttribute('aria-label',storyPaused?'Weiter abspielen':'Pause')}}
function storyStep(dir){
  if(parse().r!=='story')return;
  if(!FUN.storyHint){FUN.storyHint=true;saveFun()}
  const list=storyPositions(),p=posById(storyId);if(!p)return;const sl=storySlides(p),k=list.findIndex(x=>x.id===storyId);
  const i=storyIdx+dir;stopStory();
  if(i>=sl.length){const n=list[k+1];if(n)location.replace('#story/'+encodeURIComponent(n.id));else location.replace('#heute');return}
  if(i<0){const pr=list[k-1];if(pr)location.replace('#story/'+encodeURIComponent(pr.id));else{storyIdx=0;rerender()}return}
  storyIdx=i;rerender();
}
document.addEventListener('pointerdown',e=>{const t=e.target.closest&&e.target.closest('.tap');if(!t)return;tapDown=Date.now();tapLong=false;pauseStory()});
['pointerup','pointercancel','pointerleave'].forEach(ev=>document.addEventListener(ev,e=>{if(!tapDown)return;const held=Date.now()-tapDown;tapDown=0;if(held>350){tapLong=true;resumeStory()}},true));
document.addEventListener('keydown',e=>{const tg=e.target&&e.target.nodeType===1?e.target:document.body;if(parse().r!=='story'||tg.matches('input,select,textarea'))return;
  if(e.key==='ArrowRight'){e.preventDefault();storyStep(1)}else if(e.key==='ArrowLeft'){e.preventDefault();storyStep(-1)}
  else if(e.key==='Escape'){location.hash='#heute'}else if(e.key===' '&&!tg.closest('button,a')){e.preventDefault();storyPaused?resumeStory():pauseStory()}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&parse().r==='story')pauseStory()});
const stCls=r=>({met:'yes',not_met:'no',occurred:'no',not_occurred:'yes',open:'open',np:'np'})[r.status];

/* ---------------- Depot ---------------- */
function itemRow(x){return `<div class="item"><span class="mark ${x.lvl}" aria-hidden="true">${({warn:'!',crit:'!!',info:'i',good:'✓',na:'?'})[x.lvl]}</span><div class="col" style="min-width:0"><span class="sr">${({warn:'Hinweis',crit:'Deutliche Abweichung',info:'Information',good:'Unauffällig',na:'Nicht beurteilbar'})[x.lvl]}: </span><span class="strong">${esc(x.t)}</span>${x.d?`<details><summary>Details</summary><p class="small muted2">${esc(x.d)}</p></details>`:''}</div>${x.go?`<a class="link" href="${x.go[0]==='pos'?'#pos/'+encodeURIComponent(x.go[1]):x.go[0]==='plan'?'#plan':x.go[0]==='depot'?(x.go[1]==='posCard'?'#depot':'#daten'):'#'+x.go[0]}">${esc(x.act||'Ansehen')} →</a>`:'<span></span>'}</div>`}
function vDepot(){
  const d=D(),tt=totals(d),c=checkModel(d),T=tt.sum;
  let list='';
  B.forEach(b=>{const ps=d.positions.filter(p=>isIncluded(p)&&p.bucket===b.id).sort((x,y)=>posValue(y)-posValue(x));if(!ps.length)return;const s=ps.reduce((a,p)=>a+posValue(p),0);
    list+=`<div class="grph"><span class="row" style="gap:8px"><i class="dot" style="background:var(${b.c})"></i>${b.name}</span><span class="num">${pct(s/T,0)}</span></div>`+ps.map(p=>posRow(p,T)).join('')});
  const nb=noBucket(d);if(nb.length)list+=`<div class="grph"><span>Ohne Baustein</span></div>`+nb.map(p=>posRow(p,T)).join('');
  const out=d.positions.filter(p=>!isIncluded(p));if(out.length)list+=`<div class="grph"><span>Nicht eingerechnet</span></div>`+out.map(p=>posRow(p,T)).join('');
  if(d.accounts.length)list+=`<div class="grph"><span class="row" style="gap:8px"><i class="dot" style="background:var(--s6)"></i>Verrechnungskonto</span><span class="num">${eur(tt.acct)}</span></div>`;
  const stadt=UI.depotView==='stadt',w=depotWeather(d,c);
  return `
  <div class="row between"><h1 class="h1" style="font-size:28px">Dein Depot</h1><a href="#daten" class="icon-btn" aria-label="Einstellungen, Daten und Import">${ICON.gear}</a></div>
  ${d.kind==='demo'?'<span class="chip-demo" style="align-self:flex-start">Musterdepot</span>':''}
  <a href="${w.go}" class="card row" style="gap:14px">${weather(w.k)}<div class="col" style="gap:2px;min-width:0"><span class="lbl">Depot-Wetter</span><span class="h3">${esc(w.t)}</span><span class="small muted2">${esc(w.d)}</span></div></a>
  <div class="seg view-seg" role="group" aria-label="Ansicht"><button type="button" data-depview="liste" aria-pressed="${!stadt}">Liste</button><button type="button" data-depview="stadt" aria-pressed="${stadt}">Stadt</button></div>
  ${stadt?stadtHTML(d):`<section class="card"><h2 class="h2">Positionen</h2>${list}</section>`}
  ${perfCard(d)}
  <section class="card"><h2 class="h2">Abweichungen von deinen Vorgaben</h2>${c.dev.map(itemRow).join('')}</section>
  <section class="card"><h2 class="h2">Offene Datenfragen</h2>${c.data.map(itemRow).join('')||'<p class="hint">Keine.</p>'}</section>
  <section class="card"><h2 class="h2">Gut zu wissen</h2>${c.info.map(itemRow).join('')}</section>
  ${stadt?`<section class="card"><h2 class="h2">Positionen</h2>${list}</section>`:''}`;
}
function depotWeather(d,c){const gs=goalState(d),crit=c.dev.filter(x=>x.lvl==='crit'),warn=c.dev.filter(x=>x.lvl==='warn');let w;
  if(!gs.ok)w={k:'none',t:'Noch kein Wetterbericht',d:'Lege unter Einkommen › Plan deine Zielverteilung fest, dann vergleichen wir dein Depot damit.',go:'#plan'};
  else if(crit.length)w={k:'rain',t:'Wechselhaft',d:crit[0].t+(crit.length>1?` und ${crit.length-1} weitere deutliche Abweichung${crit.length>2?'en':''}`:'')+'.',go:'#depot'};
  else if(warn.length)w={k:'cloud',t:'Leicht bewölkt',d:warn[0].t+'.',go:'#depot'};
  else w={k:'sun',t:'Heiter',d:'Dein Depot liegt nah an deinen Vorgaben.',go:'#depot'};
  if(c.incomplete&&gs.ok)w.d+=' Vorläufig, weil Positionen fehlen.';return w}
function perfCard(d){const m=txModel(d);
  if(!m)return `<section class="card col" style="gap:8px" id="perf"><h2 class="h2">Wertentwicklung</h2><div class="empty">Für Gewinn, Ausschüttungen und Rendite braucht Depotfokus deine Umsätze aus Portfolio Performance.</div><a class="btn" href="#daten">Umsätze importieren</a></section>`;
  const kp=(l,v,c='')=>`<div class="kpi"><span class="small muted2">${l}</span><span class="num strong ${c}">${v}</span></div>`;
  return `<section class="card col" style="gap:10px" id="perf"><div class="row between"><h2 class="h2" style="margin:0">Wertentwicklung</h2>${d.kind==='demo'?'<span class="chip-demo">Musterumsätze</span>':''}</div>
   <div class="kpis">${kp('Ergebnis gesamt',m.okCount?sgn(m.result):'–',m.result>=0?'pos-text':'neg-text')}${kp(m.irr!=null?'Rendite p. a.':'Rendite gesamt',m.irr!=null?spct(m.irr):m.simple!=null?spct(m.simple):'–')}
   ${kp('Ausschüttungen 12 Monate',eur(m.M.div12))}${kp('Ausschüttungen gesamt',eur(m.M.div))}
   ${kp('Kursgewinn offen',sgn(m.unrealized))}${kp('Gewinn realisiert',sgn(m.realized))}
   ${kp('Einzahlungen netto',eur(m.M.dep-m.M.wd))}${kp('Gebühren und Steuern',eur(m.M.fees+m.M.taxes+m.secs.reduce((a,s)=>a+s.fees+s.taxes,0)))}</div>
   <p class="hint">Seit ${isoToDe(m.since)}. Berechnet für ${m.heldOk} von ${m.heldAll} gehaltenen Wertpapieren${m.secs.some(s=>s.soldOut)?' plus verkaufte':''}; Kontoguthaben zählt nicht. Rendite p. a. als interner Zinsfuß (geldgewichtet)${m.irr==null?', erst ab zwölf Monaten Historie':''}. Ausschüttungen netto nach Steuern, wie gebucht.</p>
   ${m.issues.length?`<a class="banner" href="#depot"><b>${m.issues.length} ${m.issues.length>1?'Positionen':'Position'} nicht eingerechnet</b><span>Details unter „Offene Datenfragen“.</span></a>`:''}</section>`}
function posRow(p,T){const v=posValue(p),I=INFO[p.symbol],m=MOOD[p.symbol];
  const sub=!I?'Noch keine geprüfte Einordnung':I.etf?'ETF-Profil':I.changes.items[0]?I.changes.items[0].t:I.interp;
  return `<a class="prow" href="#pos/${encodeURIComponent(p.id)}"><span class="nm">${esc(p.name)}</span><span class="num r">${v!=null?eur(v):p.conf==='skip'?'nicht eingerechnet':'Wert ungeklärt'}</span>
   <span class="sub">${v!=null&&T?pct(v/T)+' · ':''}${(()=>{const s=secFor(D(),p);return s&&s.ok&&s.unreal!=null?`<b class="${s.unreal>=0?'pos-text':'neg-text'}">${spct(s.cost?s.unreal/s.cost:0,0)}</b> · `:''})()}${(()=>{const dc=dayChange(p);return dc?`<b class="${dc.rel>=0?'pos-text':'neg-text'}">heute ${spct(dc.rel,1)}</b> · `:''})()}${m?`<b class="mood ${m}">${MOODTXT[m]}</b> · `:''}${esc(sub)}</span></a>`}

/* ---------------- Position / Kompass ---------------- */
function vPos(id){
  const d=D(),p=posById(id);if(!p)return `<h1 class="h1">Nicht gefunden</h1><a class="btn" href="#depot">Zum Depot</a>`;
  const I=INFO[p.symbol],tt=totals(d),v=posValue(p);
  let h=`<div class="row" style="gap:6px"><a href="#depot" class="icon-btn" aria-label="Zurück zum Depot">${ICON.back}</a><div class="col"><h1 class="big" style="font-size:24px">${esc(p.name)}</h1><span class="small muted2">${p.bucket?BN[p.bucket].name:'ohne Baustein'} · ${v!=null?eur(v)+' · '+pct(v/tt.sum)+(d.kind==='demo'?' des Musterdepots':' deines Depots'):'Wert ungeklärt'}</span></div></div>`;
  {const n=I&&!I.etf?newReports(p.symbol)[0]:null;if(n){const pr=proposalFor(p.symbol);h+=`<div class="banner info"><b>Neuer Bericht: ${esc(n.label)} vom ${deDate(n.date)}</b><span>Die Einordnung unten ist vom ${deDate(I.checked)} und berücksichtigt ihn noch nicht. ${esc(newsLine(p.symbol))}</span><span class="row" style="gap:14px;margin-top:4px"><a class="link" href="${esc(n.url)}" target="_blank" rel="noopener">Bericht öffnen ${ICON_EXT}</a>${pr?`<a class="link" href="${esc(pr.url)}" target="_blank" rel="noopener">Vorschlag prüfen ${ICON_EXT}</a>`:''}</span></div>`}}
  if(v==null&&p.conf!=='skip')h+=`<a href="#daten" class="banner"><b>Wert ungeklärt</b><span>Die Kurswährung ist nicht erkennbar. Bitte zuerst bestätigen.</span></a>`;
  h+=myPosCard(d,p);
  if(!I){h+=`<section class="card"><p>Für diese Position liegt noch keine geprüfte Einordnung vor.</p></section>`;return h+checkButtons(p)}
  if(I.etf){const e=I.etf;
    h+=`<section class="card col" style="gap:8px"><span class="lbl">ETF-Profil</span><dl class="kv"><dt>Fonds</dt><dd>${esc(e.name)} · ${esc(e.isin)}</dd><dt>Index</dt><dd>${esc(e.index)}</dd><dt>Kosten</dt><dd>${esc(e.ter)}</dd><dt>Konzentration</dt><dd>${esc(e.conc)}</dd><dt>Ausschüttung</dt><dd>${esc(e.dist)}</dd><dt>Überschneidungen</dt><dd>nicht verfügbar</dd><dt>Stand</dt><dd>${esc(e.stand)}</dd></dl>${srcLink(e.terSrc||e.src)}${e.terSrc?srcLink(e.src):''}</section>`;
    return h+checkButtons(p)}
  const pro=[],con=[];I.rules.forEach(r=>{const t=`${r.q.replace(/\?$/,'')}: ${STATUS[r.type][r.status]}${r.obs?` (${r.obs})`:''}`;if(r.status==='met'||r.status==='not_occurred')pro.push(t);else if(r.status==='not_met'||r.status==='occurred')con.push(t)});
  I.facts.filter(f=>f.kind==='metric').slice(0,1).forEach(f=>pro.length<3&&pro.push(f.t));
  const nextR=I.rules.find(r=>r.status!=='np')||I.rules[0];
  h+=`<section class="card col" style="gap:6px"><div class="row between">${kindTag('interp')}<span class="small muted2">Stand ${deDate(I.checked)}</span></div><p class="lead">${esc(I.interp)}</p><span class="hint">${I.method==='claude'?`Von Claude (${esc(I.model||'')}) aus dem Bericht abgeleitet; jede Zahl ist durch ein Zitat belegt und wurde von dir freigegeben.`:'Manuell recherchiert und geprüft.'}</span></section>
  <section class="card col" style="gap:10px">
    <div class="row between"><span class="lbl">Kompass</span><span class="chip-soon">im Aufbau</span></div>
    <p class="small muted2">Wahrscheinlichkeiten zeigen wir erst, wenn genug Prognosen aufgelöst sind und die Trefferquote öffentlich ist. Bis dahin zählen die geprüften Bedingungen und Risiken.</p>
    <div class="grid2"><div class="pc"><span class="strong pos-text">Dafür spricht</span><ul>${pro.map(x=>`<li>${esc(x)}</li>`).join('')||'<li>Keine geprüften Punkte</li>'}</ul></div><div class="pc"><span class="strong neg-text">Dagegen spricht</span><ul>${con.map(x=>`<li>${esc(x)}</li>`).join('')||'<li>Kein geprüfter Punkt eingetreten</li>'}${I.themes.map(t=>`<li class="muted2">Offen: ${esc(t.t)}</li>`).join('')}</ul></div></div>
  </section>
  ${nextR?`<section class="dark col" style="gap:4px"><span class="lbl">Was als Nächstes zählt</span><span class="strong">${esc(nextR.next)}: ${esc(nextR.q)}</span></section>`:''}
  <section class="card"><h2 class="h2">Belegte Fakten</h2>${I.facts.map(f=>`<div class="fact">${kindTag(f.kind)}${esc(f.t)}${f.quote?`<details><summary>Zitat aus dem Bericht</summary><blockquote class="quote">${esc(f.quote)}</blockquote></details>`:''}${srcLink(f.src)}</div>`).join('')}</section>
  <section class="card"><h2 class="h2">Was wir beobachten</h2>${I.rules.map(r=>`<div class="rule"><div class="row between" style="align-items:flex-start;gap:8px"><span class="strong">${esc(r.q)} <span class="small muted2">${r.type==='goal'?'Bedingung':'Risiko'}</span></span><span class="st ${stCls(r)}">${STATUS[r.type][r.status]}</span></div><details><summary>Regel und Quelle</summary><dl class="kv"><dt>Kennzahl</dt><dd>${esc(r.metric)}</dd><dt>Bedingung</dt><dd>${esc(r.cond)}</dd><dt>Periode</dt><dd>${esc(r.per)}</dd><dt>Beobachtet</dt><dd>${r.obs?esc(r.obs):'nicht verfügbar'}${r.prev?' · Vorperiode '+esc(r.prev):''}</dd><dt>Nächste Prüfung</dt><dd>${esc(r.next)}</dd><dt>Bedeutung</dt><dd>${esc(r.why)}</dd></dl>${r.src?srcLink(r.src):''}</details></div>`).join('')}</section>`;
  return h+checkButtons(p);
}
function myPosCard(d,p){const m=txModel(d),s=secFor(d,p),q=liveValue(p)!=null?quoteFor(p):null;
  const dc=dayChange(p);const src=q?`Kurs ${num(q.px,2)} ${esc(q.ccy)}${dc?` (heute ${spct(dc.rel,2)})`:''}${q.alt?' an der US-Börse':''} vom ${esc(fmtAsOf(q.t))}${q.ccy!=='EUR'?', umgerechnet in Euro':''} (${esc(q.src)})`:'Wert aus dem Export';
  if(!m)return `<section class="card col" style="gap:4px"><span class="lbl">Deine Position</span><span class="small muted2">${p.qty!=null?num(p.qty,4)+' Stück · ':''}${src}. Einstand und Gewinn nach dem Umsatz-Import.</span></section>`;
  if(!s)return `<section class="card col" style="gap:4px"><span class="lbl">Deine Position</span><span class="small muted2">${src}. Keine Umsätze zu dieser Position gefunden; Einstand und Gewinn sind deshalb nicht bekannt.</span></section>`;
  const row=(l,v,c='')=>`<dt>${l}</dt><dd class="num ${c}">${v}</dd>`;
  return `<section class="card col" style="gap:6px"><div class="row between"><span class="lbl">Deine Position</span>${d.kind==='demo'?'<span class="chip-demo">Muster</span>':''}</div>
   ${!s.ok?`<p class="hint-box">${s.value==null&&!s.mismatch&&!s.unknownCost?'Wert ungeklärt: Bestätige zuerst die Währung unter Daten & Import.':s.mismatch?`Laut Umsätzen ${num(s.shares,4)} Stück, im Bestand ${num(p.qty,4)}. Gewinn und Rendite werden erst gezeigt, wenn beides übereinstimmt.`:s.unknownCost?'Einstand unbekannt: Einlieferung ohne Wert.':'Die Umsätze sind unvollständig.'}</p>`:''}
   <dl class="kv">${row('Stück',num(s.shares,4))}${row('Einstand (FIFO)',eur(s.cost,2))}${row('Ø Kaufkurs',s.avg!=null?eur(s.avg,2):'–')}
   ${s.ok?row('Kursgewinn',`${sgn(s.unreal,2)} (${spct(s.cost?s.unreal/s.cost:0)})`,s.unreal>=0?'pos-text':'neg-text'):''}
   ${row('Ausschüttungen erhalten',`${eur(s.div,2)}${s.div12?` · 12 Monate ${eur(s.div12,2)}`:''}`)}
   ${s.realized?row('Realisiert',sgn(s.realized,2)):''}
   ${s.ok?row('Ergebnis gesamt',sgn(s.result,2),s.result>=0?'pos-text':'neg-text'):''}${s.irr!=null?row('Rendite p. a.',spct(s.irr)):''}
   ${row('Erster Kauf',isoToDe(s.first))}</dl><span class="hint">${src}. Ausschüttungen netto nach Steuern.</span></section>`}
function checkButtons(p){return `<div class="grid2" style="margin-top:4px"><a href="#check/${encodeURIComponent(p.id)}/kauf" class="btn">Kauf überlegen</a><a href="#check/${encodeURIComponent(p.id)}/verkauf" class="btn solid">Verkauf überlegen</a></div><p class="hint center">Depotfokus führt keine Orders aus.</p>`}

/* ---------------- Entscheidungs-Check ---------------- */
let chk={reason:null,sleep:true,id:null};
function vCheck(id,intent){
  const d=D(),p=posById(id);if(!p)return `<h1 class="h1">Nicht gefunden</h1><a class="btn" href="#depot">Zum Depot</a>`;
  if(chk.id!==id+intent)chk={reason:null,sleep:true,id:id+intent};
  const buy=intent==='kauf',I=INFO[p.symbol],V=bucketVals(d),T=tot(V),gs=goalState(d);
  let plan,planOk=null;
  if(!p.bucket)plan='Die Position hat keinen Baustein; ein Vergleich mit deinem Plan ist nicht möglich.';
  else if(!gs.ok)plan='Du hast noch keine gültige Zielverteilung. Lege sie im Plan fest, dann prüfen wir das hier.';
  else{const w=V[p.bucket]/T,g=d.goals[p.bucket]/100,under=w<g-0.005;planOk=buy?under:!under;
    plan=`${BN[p.bucket].name}: ${pct(w)} heute, dein Ziel ${fz(d.goals[p.bucket])} %. Ein ${buy?'Kauf':'Verkauf'} bringt dich ${planOk?'näher an':'weiter weg von'} deinem Ziel.`;
    const v=posValue(p);if(d.maxSingle!=null&&v!=null&&(p.bucket==='single'||p.bucket==='bdc')){const pw=v/tt0();if(buy&&pw>=d.maxSingle/100)plan+=` Die Position liegt mit ${pct(pw)} schon über deiner Grenze von ${fz(d.maxSingle)} %.`}}
  const cost=p.fund?(p.ter!=null?`Laufende Fondskosten ${num(p.ter,2)} % pro Jahr. `:'Laufende Kosten nicht bekannt. '):'';
  const R=[['plan','Weg vom Ziel'],['news','Neue Information'],['drop',buy?'Kurs ist gefallen':'Kurs ist gefallen'],['tip','Tipp von anderen']];
  const rule=I&&I.rules?I.rules.find(r=>r.status!=='np'):null;
  let score=0;if(chk.reason){score=chk.reason==='plan'||chk.reason==='news'?2:1;if(planOk===true)score++;if(planOk===false)score--;if(chk.sleep)score++}score=Math.max(0,Math.min(4,score));
  const qual=chk.reason?['Schwach begründet','Schwach begründet','Ausbaufähig','Gut begründet','Sehr gut begründet'][score]:'Wähle einen Grund';
  return `
  <div class="row" style="gap:6px"><a href="#pos/${encodeURIComponent(id)}" class="icon-btn" aria-label="Zurück">${ICON.back}</a><div class="col"><span class="lbl">Entscheidungs-Check</span><h1 class="big" style="font-size:22px">${buy?'Kauf':'Verkauf'}: ${esc(p.name)}</h1></div></div>
  <section class="card step"><span class="num-c c1" aria-hidden="true">1</span><div class="col" style="gap:3px"><span class="strong">Passt es zu deinem Plan?</span><span class="small muted2">${esc(plan)}</span>${!gs.ok?'<a class="link" href="#plan">Zum Plan →</a>':''}</div></section>
  ${(()=>{const mo=motivesFor(d,p);return `<a class="card row why-line" href="#haus/${encodeURIComponent(id)}"><span class="strong small">Dein Warum:</span><span>${mo.list.map(k=>MOTIVE[k].e+' '+MOTIVE[k].t).join(' · ')}</span>${mo.own?'':'<span class="small muted2">(Vorschlag)</span>'}</a>`})()}
  <section class="card step"><span class="num-c c2" aria-hidden="true">2</span><div class="col" style="gap:3px"><span class="strong">Was kostet es?</span><span class="small muted2">${esc(cost)}${buy?'Ordergebühr laut deinem Broker.':esc(sellCost(d,p))}</span>${!buy&&!txModel(d)?'<a class="link" href="#daten">Umsätze importieren →</a>':''}</div></section>
  <section class="card col" style="gap:10px"><div class="step"><span class="num-c c3" aria-hidden="true">3</span><span class="strong" id="whyLbl" style="padding-top:3px">Warum gerade jetzt?</span></div>
    <div class="reasons" role="group" aria-labelledby="whyLbl">${R.map(([k,l])=>`<button type="button" data-reason="${k}" aria-pressed="${chk.reason===k}">${l}</button>`).join('')}</div>
    ${chk.reason==='drop'?`<p class="hint-box">Ein gefallener Kurs allein ist selten ein guter Grund. Was hat sich am Geschäft geändert?${!buy&&motivesFor(d,p).list.includes('einkommen')?' Du hast diese Position wegen des Einkommens: Die Dividende hängt nicht am Kurs, sondern an den Erträgen der Firma.':''}</p>`:''}
    ${chk.reason==='tip'?'<p class="hint-box">Tipps von anderen kennen deinen Plan nicht. Prüfe Schritt 1 besonders genau.</p>':''}</section>
  <section class="card step"><span class="num-c c4" aria-hidden="true">4</span><div class="col" style="gap:3px"><span class="strong">Was würde dich umstimmen?</span><span class="small muted2">${rule?`Zum Beispiel: ${esc(rule.metric)} – ${esc(rule.cond)} (${esc(rule.next)}).`:'Überlege dir eine konkrete Bedingung, bevor du handelst.'}</span></div></section>
  <section class="dark row between"><div class="col" style="gap:2px"><span class="lbl">Entscheidungsqualität</span><span class="big" style="font-size:20px" id="qual" aria-live="polite">${qual}</span></div><div class="meter" aria-hidden="true">${[1,2,3,4].map(i=>`<span class="${chk.reason&&i<=score?'on':''}"></span>`).join('')}</div></section>
  <label class="switch"><span>24 Stunden drüber schlafen</span><input type="checkbox" id="sleep" ${chk.sleep?'checked':''}></label>
  <button type="button" class="btn solid" id="saveNote" ${chk.reason?'':'disabled'}>Entscheidungsnotiz speichern</button>
  <p class="hint center">Punkte gibt es für die Begründung, nicht für den Trade. Umsetzen kannst du nur bei deinem Broker.</p>`;
}
const tt0=()=>totals(D()).sum;
function sellCost(d,p){const s=secFor(d,p),te=taxEstimate(p,s);
  if(!te)return txModel(d)?'Steuer nicht schätzbar: Für diese Position fehlen vollständige Umsätze. Dazu die Ordergebühr.':'Steuer auf einen Gewinn hängt von deinem Kaufkurs ab; dafür braucht Depotfokus deine Umsätze. Dazu die Ordergebühr.';
  if(te.gain<=0)return `Bei Verkauf der ganzen Position: Verlust ${eur(-te.gain)} gegenüber dem Einstand, also keine Steuer. Der Verlust kann mit späteren Gewinnen verrechnet werden (Aktienverluste nur mit Aktiengewinnen). Dazu die Ordergebühr.`;
  return `Bei Verkauf der ganzen Position: Kursgewinn rund ${eur(te.gain)}${te.tf?`, davon ${eur(te.taxable)} steuerpflichtig (Teilfreistellung 30 % für Aktienfonds)`:''}, Steuer rund ${eur(te.tax)} (26,375 %, ohne Kirchensteuer, vor Sparerpauschbetrag und Verlustverrechnung). Bei Teilverkauf zählen zuerst die ältesten Anteile. Dazu die Ordergebühr.`}

/* ---------------- Plan ---------------- */
function vPlan(){
  const d=D(),V=bucketVals(d),T=tot(V),gs=goalState(d);
  let goals;
  if(!d.goals)goals=`<div class="empty">Du hast noch keine Zielverteilung. Ohne Ziele gibt es keinen Vergleich und keine Verteilung der Sparrate.</div><div class="row" style="margin-top:10px;flex-wrap:wrap"><button class="btn solid" id="goalsFromNow" type="button">Heutige Verteilung übernehmen</button><button class="btn" id="goalsEmpty" type="button">Leer beginnen</button></div>`;
  else goals=B.map(b=>{const raw=goalRaw[b.id];return `<div class="goal"><i class="dot" style="background:var(${b.c})" aria-hidden="true"></i><label for="g_${b.id}" class="col"><span class="strong">${b.name}</span><span class="small muted2 num">heute ${T?pct(V[b.id]/T,1):'–'}</span></label><span class="row" style="gap:6px;flex-wrap:nowrap"><input class="numin" type="text" inputmode="decimal" id="g_${b.id}" data-goal="${b.id}" value="${esc(raw?raw.v:d.goals[b.id])}" ${raw?'aria-invalid="true"':''} aria-describedby="ge_${b.id}"> %</span><span class="err" id="ge_${b.id}">${raw?esc(raw.msg):''}</span></div>`}).join('')+`<div class="row between" style="margin-top:8px"><span id="goalSum" class="num" role="status"></span><button class="link" id="goalsFromNow" type="button">Heutige Verteilung</button></div>`;
  return `
  ${hubHead('einkommen','plan')}
  <section class="card col" style="gap:6px"><div class="row between"><h2 class="h2">1. Meine Zielverteilung</h2>${d.goalsSource==='example'?'<span class="chip-demo">Beispiel</span>':''}</div>${goals}
    <label class="field" for="maxSingle" style="margin-top:10px">Grenze je Einzelwert in % (leer = keine)<input class="numin" type="text" inputmode="decimal" id="maxSingle" value="${d.maxSingle??''}"><span class="err" id="maxErr"></span></label>
    <p class="hint">Zur Orientierung: Stiftung Warentest beschreibt im Pantoffel-Portfolio Mischungen mit 25, 50 oder 75 % Aktien. Keine Empfehlung für dich.</p></section>
  <section class="card col" style="gap:10px"><h2 class="h2">2. Meine monatliche Einzahlung</h2>
    <div class="grid2"><label class="field" for="budget">Betrag in €<input class="numin" type="text" inputmode="decimal" id="budget" value="${budgetRaw!=null?'':num(d.budget||0,2)}"><span class="err" id="budgetErr">${budgetRaw?esc(budgetRaw):''}</span></label>
    <label class="field" for="cashMode">Verrechnungskonto<select id="cashMode"><option value="keep" ${d.cashMode==='keep'?'selected':''}>bleibt unverändert</option><option value="invest" ${d.cashMode==='invest'?'selected':''}>einmalig mitverteilen</option><option value="exclude" ${d.cashMode==='exclude'?'selected':''}>nicht zur Zielverteilung</option></select></label></div></section>
  <section class="card col" style="gap:6px" id="allocBox">${allocHTML()}</section>
  <details class="card"><summary class="strong">4. So wird gerechnet</summary><div class="col small muted2" style="gap:6px;margin-top:8px"><p>Für jeden Baustein wird geprüft, wie viel Geld bei unveränderten Kursen fehlt, damit er seine Zielquote erreicht, ohne dass etwas verkauft wird.</p><p>Die Einzahlung wird im Verhältnis dieser Fehlbeträge verteilt, auf den Cent genau. Ist nichts zu verteilen, gilt das Verhältnis der Zielquoten.</p><p>Die Dauer ist eine Rechnung bei unveränderten Kursen. Kursbewegungen und Ausschüttungen verändern sie.</p></div></details>`;
}
function allocHTML(){
  const d=D(),gs=goalState(d),bs=budgetState(d);
  if(!gs.ok||!bs.ok){const why=!d.goals?'Lege zuerst eine Zielverteilung fest.':gs.reason==='sum'?`Deine Ziele ergeben ${fz(gs.sum)} % statt 100 %.`:gs.reason==='invalid'?'Mindestens eine Zielquote ist ungültig.':bs.msg;
    return `<h2 class="h2">3. Rechnerische Verteilung</h2><div class="empty">Keine Berechnung: ${esc(why)}</div><button class="btn solid" disabled aria-describedby="cw">Verteilung kopieren</button><span class="hint" id="cw">Nicht möglich: ${esc(why)}</span>`}
  const al=allocate(d),am=al.amounts,p=pathFor(d,al,am),M=+d.budget||0;
  const rows=B.map(b=>{const t=d.goals[b.id],held=al.V[b.id]>0.5;if(!t&&!held&&!am[b.id])return '';
    const why=!t?(held?'Ziel 0 %: keine Einzahlung, der Bestand bleibt.':'Ziel 0 %.'):al.need[b.id]>0.5?`Unter Ziel: bis ${fz(t)} % fehlen rund ${eur(al.need[b.id])}.`:al.ns===0?`Verteilung nach deinem Ziel von ${fz(t)} %.`:`Hat ${fz(t)} % erreicht oder überschritten.`;
    return `<div class="alloc"><i class="dot" style="background:var(${b.c})" aria-hidden="true"></i><span class="strong">${b.name}</span><span class="num">${eur(am[b.id],2)}</span><span class="why">${esc(why)}</span></div>`}).join('');
  const dur=p.blocked.length?'ohne Verkauf nicht erreichbar':p.theo===0?'erreicht':p.theo==null?'–':`frühestens nach ${p.theo} Monaten`;
  return `<h2 class="h2">3. Rechnerische Verteilung</h2>${rows}
   <div class="result"><span>Ziel erreicht</span><span class="num strong">${dur}</span>${al.cash>0?`<span>Einmalig aus dem Konto</span><span class="num">${eur(al.cash,2)}</span>`:''}</div>
   ${p.blocked.length?`<p class="neg-text small">${esc(p.blocked.map(b=>b.name).join(', '))}: Ziel 0 %, aber Bestand vorhanden.</p>`:''}${M===0?'<p class="hint">Bei 0 € Einzahlung ändert sich die Verteilung nicht.</p>':''}
   <div class="bars"><div class="barlab"><span>Heute</span><div class="bar">${barHTML(al.V)}</div></div><div class="barlab"><span>Ziel</span><div class="bar">${barHTML(d.goals)}</div></div></div>
   <button class="btn solid" id="btnCopy" type="button">Verteilung kopieren</button><p class="hint">Bei unveränderten Kursen. Welche Wertpapiere du kaufst, entscheidest du.</p>`;
}
function barHTML(W){const T=tot(W)||1;return B.filter(b=>W[b.id]>0).map(b=>`<span title="${b.name}" style="width:${W[b.id]/T*100}%;background:var(${b.c})"></span>`).join('')}
function renderGoalSum2(){const d=D(),el=$('#goalSum');if(!el||!d.goals)return;const gs=goalState(d),sum=B.reduce((a,b)=>a+(d.goals[b.id]||0),0);
  el.textContent=gs.reason==='invalid'?'Ungültige Eingabe korrigieren':`Summe ${fz(sum)} %${Math.abs(sum-100)>0.05?` – es fehlen ${fz(100-sum)} Punkte`:' ✓'}`;el.className='num '+(gs.ok?'pos-text':'neg-text')}

/* ---------------- Liga ---------------- */
/* Auflösungen offener Prognosen: wird ergänzt, sobald ein neuer Bericht geprüft ist. Schlüssel = Fragen-ID. */
const RESOLVED=RESOLVED_DATA;
const yesOf=r=>(r.type==='goal'&&r.status==='met')||(r.type==='risk'&&r.status==='occurred');
function questions(){const retro=[],open=[];
  D().positions.filter(hasStory).sort((a,b)=>posValue(b)-posValue(a)).forEach(p=>INFO[p.symbol].rules.filter(r=>r.status!=='np'&&r.status!=='open').forEach(r=>{
    retro.push({id:`r|${p.symbol}|${r.per}|${r.q}`,p,r,kind:'retro',outcome:yesOf(r)?1:0,
      text:`${r.per}: ${r.q.replace(/\?$/,'')}?`});
    open.push({id:`o|${p.symbol}|${r.next}|${r.q}`,p,r,kind:'open',text:r.q})}));
  return {retro,open}}
function score(pr,outcome){const p=(pr.c||70)/100,pj=pr.a==='ja'?p:1-p,b=(pj-outcome)**2;return {outcome,brier:b,hit:(pr.a==='ja')===(outcome===1),pts:Math.max(0,Math.round(20*(1-2*b)))}}
function resolveOpen(){let ch=false;Object.entries(FUN.preds).forEach(([id,pr])=>{const r=RESOLVED[id];if(r&&pr.a&&!pr.res){pr.res=score(pr,r.outcome);FUN.points+=pr.res.pts;ch=true}});if(ch)saveFun()}
function calib(){const res=Object.values(FUN.preds).filter(x=>x.res);if(!res.length)return null;
  const hits=res.filter(x=>x.res.hit).length,conf=res.reduce((a,x)=>a+(x.c||70),0)/res.length,brier=res.reduce((a,x)=>a+x.res.brier,0)/res.length;
  return {n:res.length,hits,conf,rate:hits/res.length*100,brier}}
function qButtons(q,pr,locked){return `<div class="grid2 yn" role="group" aria-label="Antwort">${['ja','nein'].map(a=>`<button type="button" data-pred="${esc(q.id)}" data-ans="${a}" aria-pressed="${pr.a===a}" ${locked?'disabled':''}>${a==='ja'?'Ja':'Nein'}</button>`).join('')}</div>
    <div class="conf-g" role="group" aria-label="Wie sicher bist du?">${[50,60,70,80,90].map(c=>`<button type="button" data-pred="${esc(q.id)}" data-conf="${c}" aria-pressed="${(pr.c||70)===c}" ${locked?'disabled':''}>${c} %</button>`).join('')}</div>`}
function vLiga(){
  resolveOpen();resolveTips();const {retro,open}=questions(),notes=FUN.notes.filter(n=>n.kind===D().kind),cb=calib();
  const last=FUN.lastRes&&FUN.preds[FUN.lastRes]&&FUN.preds[FUN.lastRes].res?retro.find(q=>q.id===FUN.lastRes):null;
  const next=retro.find(q=>!(FUN.preds[q.id]&&FUN.preds[q.id].res));const done=retro.filter(q=>FUN.preds[q.id]&&FUN.preds[q.id].res).length;
  let quiz;
  if(last){const pr=FUN.preds[last.id],r=last.r;quiz=`<section class="dark col" style="gap:10px"><span class="lbl">${esc(last.p.name)} · Rückblick</span><span class="h3" style="color:#fff">${esc(last.text)}</span>
    <span class="res ${pr.res.hit?'hit':'miss'}">${pr.res.hit?'Richtig':'Daneben'} · +${pr.res.pts} Punkte</span>
    <span class="small muted-night">Antwort: ${last.outcome?'Ja':'Nein'}. ${esc(r.metric)}: ${esc(r.obs||'–')} (Bedingung: ${esc(r.cond)}). Du hast ${pr.a==='ja'?'Ja':'Nein'} mit ${pr.c||70} % getippt.</span>
    <span class="small muted-night">Quelle: ${srcText(r.src)}</span><span class="small muted-night">${esc(r.why)}</span>
    <button type="button" class="btn light" id="qNext">${next?'Nächste Frage':'Fertig'}</button></section>`}
  else if(next){const pr=FUN.preds[next.id]||{};quiz=`<section class="dark col" style="gap:10px"><div class="row between"><span class="lbl">${esc(next.p.name)} · Rückblick</span><span class="small muted-night">${done+1} von ${retro.length}</span></div>
    <span class="h3" style="color:#fff">${esc(next.text)}</span><span class="small muted-night">${esc(next.r.metric)}: ${esc(next.r.cond)}. Die Antwort steht im letzten Bericht.</span>
    ${qButtons(next,pr,false)}<button type="button" class="btn light" data-resolve="${esc(next.id)}" ${pr.a?'':'disabled'}>Auflösen</button></section>`}
  else quiz=`<section class="card"><p>Alle ${retro.length} Rückblick-Fragen beantwortet. Neue kommen mit dem nächsten geprüften Bericht.</p></section>`;
  return `
  <div class="row between" style="align-items:baseline"><h1 class="h1" style="font-size:28px">Lernen</h1><span class="small strong muted2">${FUN.points} Punkte · ${streak()} ${streak()===1?'Tag':'Tage'}</span></div>
  <p class="small muted2">Punkte gibt es für gut kalibrierte Einschätzungen, nicht für Käufe oder Verkäufe.</p>
  <section class="card col" style="gap:6px"><span class="strong">Deine Treffsicherheit</span>
   ${cb?`<div class="kpis">${[['Aufgelöst',cb.n],['Richtig',`${cb.hits} (${num(cb.rate,0)} %)`],['Ø Sicherheit',num(cb.conf,0)+' %'],['Brier-Wert',num(cb.brier,3)]].map(([l,v])=>`<div class="kpi"><span class="small muted2">${l}</span><span class="num strong">${v}</span></div>`).join('')}</div>
   <p class="small muted2">${Math.abs(cb.rate-cb.conf)<=10?'Gut kalibriert: Deine Sicherheit passt zu deiner Trefferquote.':cb.conf>cb.rate?`Du bist im Schnitt sicherer (${num(cb.conf,0)} %), als deine Trefferquote (${num(cb.rate,0)} %) hergibt.`:`Du triffst öfter (${num(cb.rate,0)} %), als du dir zutraust (${num(cb.conf,0)} %).`} Brier-Wert: 0 ist perfekt, 0,25 entspricht Raten.</p>`
   :'<p class="small muted2">Noch nichts aufgelöst. Starte mit dem Rückblick-Quiz: Wer 70 % sagt, sollte in 7 von 10 Fällen richtig liegen.</p>'}</section>
  <h2 class="h2" style="margin:4px 0 0">Rückblick-Quiz</h2>${quiz}
  <h2 class="h2" style="margin:4px 0 0">Offene Prognosen</h2><p class="small muted2">Aufgelöst wird mit dem nächsten geprüften Bericht.</p>
  ${open.slice(0,4).map(q=>{const pr=FUN.preds[q.id]||{};return `<section class="card col" style="gap:8px"><span class="lbl">${esc(q.p.name)} · ${esc(q.r.next)}</span><span class="strong">${esc(q.text)}</span><span class="small muted2">${esc(q.r.metric)}: ${esc(q.r.cond)} · zuletzt ${esc(q.r.obs||'nicht verfügbar')} (${esc(q.r.per)})</span>
    <div class="light-q">${qButtons(q,pr,!!pr.res)}</div><span class="small ${pr.res?(pr.res.hit?'pos-text':'neg-text'):'muted2'}">${pr.res?`${pr.res.hit?'Richtig':'Daneben'} · +${pr.res.pts} Punkte`:pr.a?`Getippt: ${pr.a==='ja'?'Ja':'Nein'} mit ${pr.c||70} %. Offen bis zur Auflösung.`:'Noch nicht getippt.'}</span></section>`}).join('')||'<p class="hint">Für deine Positionen gibt es noch keine prüfbaren Fragen.</p>'}
  ${tipsHTML()}
  <section class="card"><h2 class="h2">Deine Entscheidungsnotizen</h2>${notes.length?notes.slice().reverse().map(n=>`<div class="fact"><span class="strong">${esc(n.intent==='kauf'?'Kauf':'Verkauf')} ${esc(n.name)}</span><span class="small muted2"> · ${esc(n.date)} · ${esc(n.quality)}</span><div class="small muted2">Grund: ${esc(n.reasonTxt)}${n.sleep?' · mit Bedenkzeit':''}</div></div>`).join(''):'<p class="hint">Noch keine. Notizen entstehen im Entscheidungs-Check.</p>'}</section>
  <p class="hint">Familien-Rangliste und Taschengeld-Depot brauchen Benutzerkonten und sind deshalb nicht Teil dieser Version.</p>`;
}

/* ---------------- Daten ---------------- */
function vDaten(){return `
  <div class="row" style="gap:6px"><a href="#heute" class="icon-btn" aria-label="Zurück">${ICON.back}</a><h1 class="h1" style="font-size:26px">Einstellungen</h1></div>
  <div class="card" id="sourceCard"></div>
  <div class="card" id="importCard" tabindex="-1"></div>
  <div class="card" id="txCard"></div>
  <div class="card" id="pricesCard"></div>
  <div class="card" id="confirmCard" tabindex="-1"></div>
  <div class="card" id="extCard"></div>
  <section class="card col" style="gap:8px"><h2 class="h2" style="margin:0">Darstellung</h2><div class="seg theme-seg" role="group" aria-label="Design">${[['system','System'],['light','Hell'],['dark','Dunkel']].map(([k,l])=>`<button type="button" data-themeset="${k}" aria-pressed="${(UI.theme||'system')===k}">${l}</button>`).join('')}</div><p class="hint">„System“ folgt der Einstellung deines Geräts. Gilt nur auf diesem Gerät.</p></section>
  <a class="card row between" href="#stand"><span class="col" style="gap:2px"><span class="strong">Datenstand und Ablauf</span><span class="small muted2">Was automatisch läuft, was manuell geprüft ist und wann</span></span><span aria-hidden="true">→</span></a>`}

/* ---------------- Datenstand ---------------- */
const STAND={info:'04.10.2026',infoMethod:'manuell recherchiert und geprüft'};
// Nächster Termin für Cron-Ausdrücke (UTC), mehrere mit | getrennt; unterstützt Stern, Schrittweite, Bereiche und Listen
function cronField(f,min,max){const out=new Set();String(f).split(',').forEach(part=>{let [r,st]=part.split('/');st=+st||1;let a=min,b=max;if(r!=='*'){const [x,y]=r.split('-').map(Number);a=x;b=y!=null?y:(part.includes('/')?max:x)}for(let v=a;v<=b;v+=st)out.add(v)});return out}
function cronNext(cron,from=new Date()){let best=null;
  String(cron||'').split('|').forEach(c=>{const m=c.trim().split(/\s+/);if(m.length<5)return;const M=cronField(m[0],0,59),H=cronField(m[1],0,23),W=cronField(m[4],0,6);
    const t=new Date(Math.floor(from.getTime()/6e4)*6e4+6e4);for(let i=0;i<8*1440;i++){const d=new Date(t.getTime()+i*6e4);if(M.has(d.getUTCMinutes())&&H.has(d.getUTCHours())&&W.has(d.getUTCDay())){if(!best||d<best)best=d;break}}});
  return best}
const PRICE_CRON='*/15 6-20 * * 1-5|37 21 * * 1-5';
const fmtWhen=d=>d?d.toLocaleString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+' Uhr':'unbekannt';
function priceStatus(){const pi=priceInfo(D()),cron=(PRICES&&PRICES.schedule)||PRICE_CRON,next=cronNext(cron);
  const last=PRICES&&PRICES.asOf?new Date(PRICES.asOf):null,age=last?(Date.now()-last)/864e5:null;
  return {pi,next,last,stale:age!=null&&age>4,n:PRICES&&PRICES.quotes?Object.keys(PRICES.quotes).length:0,src:PRICES&&PRICES.source}}
function reportStatus(){const pos=storyPositions().map(p=>({p,I:INFO[p.symbol],n:newReports(p.symbol),pr:proposalFor(p.symbol)}));
  const nNew=pos.filter(x=>x.n.length).length,claude=pos.filter(x=>x.I.method==='claude').length;
  const last=pos.map(x=>x.I.checked).sort().pop();
  return {pos,nNew,claude,last,checkedAt:REPORTS&&REPORTS.checkedAt,auto:!!(REPORTS&&REPORTS.assessEnabled),model:REPORTS&&REPORTS.model,props:(REPORTS&&REPORTS.proposals)||[],errs:REPORTS?Object.keys(REPORTS.errors||{}).length:0,uaBlocked:!!(REPORTS&&Object.values(REPORTS.errors||{}).some(e=>/Undeclared Automated Tool/i.test(e)))}}
function zTeaser(d){try{const S=zGetSim(d),m=120;const lo=zAt(S,0,m,d),mid=zAt(S,1,m,d),hi=zAt(S,2,m,d);
  return `<a class="card zteaser" href="#zeit"><span class="col" style="gap:2px;min-width:0"><span class="lbl">Zeitreise</span><span class="strong">In 10 Jahren rund ${eur(mid)} Dividende im Monat</span><span class="small muted2">Spanne ${eur(lo)} bis ${eur(hi)} · mit deinen Annahmen durchspielen</span></span><svg class="zspark" viewBox="0 0 60 36" aria-hidden="true"><path d="M2 32 C20 30 34 22 58 6 L58 16 C34 26 20 31 2 33 Z" fill="var(--pos-bg)"/><path d="M2 32 C20 29 36 20 58 10" fill="none" stroke="var(--pos)" stroke-width="2.4"/></svg></a>`}catch(e){return ''}}
function standTeaser(){const ps=priceStatus(),rs=reportStatus();
  return `<a class="card stand-t" href="#stand"><span class="lbl">Datenstand</span>
   <span class="stand-l"><i class="dot ${ps.last&&!ps.stale?'ok':'warn'}"></i><span>Kurse ${ps.last?'von '+esc(fmtAsOf(PRICES.asOf)):'nicht verfügbar'}</span><span class="muted2">automatisch</span></span>
   <span class="stand-l"><i class="dot ${rs.checkedAt?(rs.nNew?'warn':'ok'):'off'}"></i><span>${rs.uaBlocked?'Berichte: Abruf blockiert, Einrichtung nötig':rs.checkedAt?(rs.nNew?`${rs.nNew} ${rs.nNew>1?'neue Berichte':'neuer Bericht'}`:'Keine neuen Berichte'):'Berichte noch nicht geprüft'}</span><span class="muted2">automatisch</span></span>
   <span class="stand-l"><i class="dot ${AUTODIV&&AUTODIV.asOf?'ok':'off'}"></i><span>${AUTODIV&&AUTODIV.asOf?`Dividenden von ${esc(fmtAsOf(AUTODIV.asOf))}`:'Dividenden noch nicht gesammelt'}</span><span class="muted2">automatisch</span></span>
   <span class="stand-l"><i class="dot man"></i><span>Einordnungen vom ${deDate(rs.last)}</span><span class="muted2">${rs.auto?'Claude + Freigabe':'manuell'}</span></span>
   ${SCEN?`<span class="stand-l"><i class="dot ${scStatusDot(SCEN.latest)}"></i><span>${SCEN.latest?`Szenarien ${weekLbl(SCEN.latest.week_id)}${SCEN.latest.status==='kept'?', nicht neu bewertet':''}`:'Szenarien noch nicht bewertet'}</span><span class="muted2">wöchentlich</span></span>`:''}</a>`}
function vStand(){const d=D(),ps=priceStatus(),rs=reportStatus(),m=txModel(d);
  const chip=(k,t)=>`<span class="mode ${k}">${t}</span>`;
  const ext=(u,t)=>`<a class="link" href="${esc(u)}" target="_blank" rel="noopener">${t} ${ICON_EXT}</a>`;
  return `
  <div class="row" style="gap:6px"><a href="#heute" class="icon-btn" aria-label="Zurück">${ICON.back}</a><h1 class="h1" style="font-size:26px">Datenstand und Ablauf</h1></div>
  <p class="small muted2">Was Depotfokus automatisch erledigt, was von Hand geprüft ist und wann es sich das nächste Mal ändert.</p>
  <section class="card col" style="gap:8px"><div class="row between"><h2 class="h2" style="margin:0">Kurse</h2>${chip('auto','automatisch')}</div>
   <dl class="kv"><dt>Letzter Abruf</dt><dd>${ps.last?esc(fmtAsOf(PRICES.asOf)):'noch keiner'}${ps.stale?' <b class="neg-text">veraltet</b>':''}</dd>
   <dt>Ergebnis</dt><dd>${ps.n} Kurse${PRICES&&PRICES.missing&&PRICES.missing.length?`, fehlend: ${esc(PRICES.missing.join(', '))}`:''}</dd>
   <dt>Quelle</dt><dd>${esc(ps.src||'–')}, Euro, verzögert</dd>
   <dt>Zeitplan</dt><dd>Mo–Fr während der Handelszeit etwa alle 15 Minuten (Tradegate 8–22 Uhr), dazu Schlusskurse am Abend; die App sieht alle 5 Minuten nach</dd>
   <dt>Nächster Abruf</dt><dd>${fmtWhen(ps.next)} (geplant; GitHub startet geplante Läufe teils mit Verspätung)</dd>
   <dt>Genutzt für</dt><dd>${ps.pi.n} von ${ps.pi.of} deiner Positionen${ps.pi.on?'':' (abgeschaltet)'}</dd></dl></section>
  <section class="card col" style="gap:8px"><div class="row between"><h2 class="h2" style="margin:0">Dividenden sammeln</h2>${chip('auto','automatisch')}</div>
   <dl class="kv"><dt>Letzter Abruf</dt><dd>${AUTODIV&&AUTODIV.asOf?esc(fmtAsOf(AUTODIV.asOf)):'noch keiner'}</dd>
   <dt>Ergebnis</dt><dd>${AUTODIV&&AUTODIV.items?Object.keys(AUTODIV.items).length:0} Wertpapiere${AUTODIV&&AUTODIV.missing&&AUTODIV.missing.length?`, fehlend: ${esc(AUTODIV.missing.join(', '))}`:''}</dd>
   <dt>Quelle</dt><dd>${esc(AUTODIV&&AUTODIV.source||'–')}: Nasdaq für US-Aktien mit erklärten Zahltagen, sonst Yahoo Finance mit Ex-Tagen</dd>
   <dt>Zeitplan</dt><dd>beim Veröffentlichen, höchstens einmal am Tag; manuell über Actions › GitHub Pages › „Dividenden jetzt neu abrufen“</dd></dl>
   <a class="link" href="#kalender">Zum Dividendenkalender →</a></section>
  <section class="card col" style="gap:8px"><div class="row between"><h2 class="h2" style="margin:0">Neue Berichte erkennen</h2>${chip('auto','automatisch')}</div>
   <dl class="kv"><dt>Quelle</dt><dd>SEC EDGAR: Ergebnismeldungen (8-K), Quartals- und Jahresberichte, Mitteilungen (6-K)</dd>
   <dt>Letzte Prüfung</dt><dd>${rs.checkedAt?esc(fmtAsOf(rs.checkedAt)):'noch keine'}${rs.errs?` · ${rs.errs} Abrufe fehlgeschlagen`:''}</dd>
   ${rs.uaBlocked?'<dt>Hinweis</dt><dd class="neg-text">Die SEC verlangt eine Kontaktadresse. Auf GitHub unter Settings › Secrets and variables › Actions › Variables die Variable SEC_USER_AGENT anlegen, z. B. „Depotfokus deine@mail.de“.</dd>':''}
   <dt>Zeitplan</dt><dd>mit jedem Kursabruf, also werktags abends</dd></dl>
   ${rs.pos.map(x=>{const n=x.n[0],r=(x.I.rules||[]).find(y=>y.status!=='np');return `<div class="stand-up"><span class="row between"><span class="strong small">${esc(x.p.name)}</span>${n?'<span class="tag new">neu</span>':''}</span>
     <span class="muted2 small">${n?`${esc(n.label)} vom ${deDate(n.date)} · ${x.pr?`Vorschlag #${x.pr.number} wartet auf Freigabe`:rs.auto?'Einordnung folgt beim nächsten Lauf':'noch nicht eingeordnet'}`:`Erwartet: ${esc(r?r.next:'–')}`}</span>
     ${n?`<span class="row" style="gap:14px">${ext(n.url,'Bericht')}${x.pr?ext(x.pr.url,'Vorschlag prüfen'):''}</span>`:''}</div>`}).join('')}
   <p class="hint">Gelesen werden nur offizielle Pflichtmitteilungen der Unternehmen, keine Presseartikel oder Foren. ETFs haben keine solchen Berichte.</p></section>
  <section class="card col" style="gap:8px"><div class="row between"><h2 class="h2" style="margin:0">Einordnen</h2>${rs.auto?chip('auto','Claude + Freigabe'):chip('man','manuell')}</div>
   <dl class="kv"><dt>Verfahren</dt><dd>${rs.auto?`Claude (${esc(rs.model||'')}) liest den neuen Bericht und schlägt Einordnung, Fakten und Regelstatus vor. Jede Zahl braucht ein wörtliches Zitat aus dem Bericht; das prüft ein Skript, sonst wird die Aussage verworfen. Erst wenn du den Vorschlag auf GitHub freigibst, ändert sich die App.`:'Automatische Einordnung ist nicht eingerichtet. Einordnungen werden manuell gepflegt.'}</dd>
   <dt>Zeitplan</dt><dd>${rs.auto?'täglich morgens, höchstens drei Berichte je Lauf':'–'}</dd>
   <dt>Offene Vorschläge</dt><dd>${rs.props.length?rs.props.map(x=>ext(x.url,'#'+x.number+' '+esc(x.sym))).join(' · '):'keine'}</dd>
   <dt>Stand</dt><dd>${rs.pos.length} Positionen, ${rs.claude} davon automatisch eingeordnet, zuletzt ${deDate(rs.last)}</dd></dl>
   <p class="hint">Liga-Prognosen werden aufgelöst, sobald die neue Einordnung freigegeben ist.</p></section>
  ${SCEN?`<section class="card col" style="gap:8px"><div class="row between"><h2 class="h2" style="margin:0">Szenario-Monitor</h2>${chip('auto','automatisch')}</div>
   <dl class="kv"><dt>Quellen</dt><dd>EZB, Eurostat, FRED (BEA, IWF, ICE BofA, Cboe); nur öffentliche Wirtschaftsdaten, keine Depotdaten</dd>
   <dt>Letzter Stand</dt><dd>${SCEN.latest?`${weekLbl(SCEN.latest.week_id)} · ${esc(SCEN.latest.status_text)}`:'noch keiner'}</dd>
   <dt>Letzter Prüfversuch</dt><dd>${SCEN.status&&SCEN.status.last_attempt_at?esc(fmtAsOf(SCEN.status.last_attempt_at)):'–'}</dd>
   <dt>Zeitplan</dt><dd>Montag 07:20 Uhr, nächster Lauf ${fmtWhen(scNext())}; manuell über Actions › Szenario-Monitor › Run workflow</dd>
   <dt>Verfahren</dt><dd>feste Regeln, ohne Sprachmodell; Prozentwerte sind eine Modellschätzung ohne Trefferquote</dd></dl>
   <a class="link" href="#szenarien">Zu Wirtschaft & Szenarien →</a></section>`:''}
  <section class="card col" style="gap:8px"><div class="row between"><h2 class="h2" style="margin:0">Deine Daten</h2>${chip('dev','nur dieses Gerät')}</div>
   <dl class="kv"><dt>Bestand</dt><dd>${d.kind==='demo'?'Musterdepot (erfunden)':`${esc(d.fileName)}, übernommen ${esc(d.importedAt||'–')}`}</dd>
   <dt>Umsätze</dt><dd>${m?`${d.tx.length} Buchungen bis ${isoToDe(m.M.last)}`:'keine'}</dd>
   <dt>Berechnung</dt><dd>bei jedem Öffnen im Browser: Werte, Rendite, Zielvergleich, Plan</dd></dl></section>
  <section class="card col" style="gap:4px"><h2 class="h2">Ablauf</h2>
   ${[['Kurse laden','auto','GitHub, werktags'],['Neue Berichte erkennen','auto','SEC EDGAR, werktags'],['Bericht lesen und Fakten mit Zitat erfassen',rs.auto?'auto':'man',rs.auto?'Claude, täglich':'von Hand'],['Zitate und Zahlen prüfen',rs.auto?'auto':'man',rs.auto?'Skript, ohne Zitat kein Eintrag':'von Hand'],['Freigeben','man','du, per Pull Request'],['Rechnen und filtern','auto','in deinem Browser'],['Wahrscheinlichkeiten','off','erst mit öffentlicher Trefferquote']].map(([t,k,dd],i)=>`<div class="flow"><span class="n">${i+1}</span><span class="col"><span class="strong">${t}</span><span class="small muted2">${dd}</span></span>${chip(k,{auto:'automatisch',man:k==='man'&&t==='Freigeben'?'du':'manuell',off:'noch nicht'}[k])}</div>`).join('')}</section>`}

/* ---------------- Ereignisse ---------------- */
document.addEventListener('click',e=>{
  const t=e.target;
  const kt=t.closest('[data-ktab]');if(kt){KAL.tab=kt.dataset.ktab;rerender();return}
  const km=t.closest('[data-kmonth]');if(km){const el=document.getElementById('km-'+km.dataset.kmonth);if(el){el.scrollIntoView({behavior:reducedMotion()?'auto':'smooth',block:'start'});const n=el.nextElementSibling;if(n&&n.matches('details'))n.querySelector('summary').focus({preventScroll:true})}else toast('In diesem Monat ist nichts angekündigt oder geschätzt.');return}
  const dv=t.closest('[data-depview]');if(dv){UI.depotView=dv.dataset.depview;saveUI();rerender();if(UI.depotView==='stadt')stadtCenter();return}
  const ts=t.closest('[data-themeset]');if(ts){UI.theme=ts.dataset.themeset;saveUI();applyTheme();rerender();return}
  if(t.closest('#themeToggle')){UI.theme=isDark()?'light':'dark';saveUI();applyTheme();rerender();toast(UI.theme==='dark'?'Dunkles Design':'Helles Design');return}
  const sb=t.closest('[data-story]');if(sb){if(tapLong){tapLong=false;return}storyStep(sb.dataset.story==='next'?1:-1);return}
  if(t.closest('#storyPause')){storyPaused?resumeStory():pauseStory();return}
  const un=t.closest('[data-understood]');if(un){const id=un.dataset.understood;if(!FUN.understood.includes(id)){FUN.understood.push(id);FUN.points+=10;touchDay();saveFun();toast('+10 Wissenspunkte')}rerender();return}
  const rb=t.closest('[data-reason]');if(rb){chk.reason=rb.dataset.reason;rerender();return}
  if(t.closest('#saveNote')){const {a}=parse();const p=posById(a[0]);const RT={plan:'Weg vom Ziel',news:'Neue Information',drop:'Kurs ist gefallen',tip:'Tipp von anderen'};
    const q=$('#qual').textContent;
    FUN.notes.push({kind:D().kind,id:p.id,name:p.name,intent:a[1],reasonTxt:RT[chk.reason],sleep:chk.sleep,quality:q,date:new Date().toLocaleDateString('de-DE')});FUN.points+=5;touchDay();saveFun();toast('Notiz gespeichert · +5 Punkte');location.hash='#liga';return}
  const rs=t.closest('[data-resolve]');if(rs){const id=rs.dataset.resolve,q=questions().retro.find(x=>x.id===id),pr=FUN.preds[id];if(!q||!pr||!pr.a||pr.res)return;pr.res=score(pr,q.outcome);FUN.points+=pr.res.pts;FUN.lastRes=id;touchDay();saveFun();rerender();return}
  if(t.closest('#qNext')){FUN.lastRes=null;saveFun();rerender();return}
  if(t.closest('#evRead')){const d=D();d.events.forEach(e=>{if(!d.read.includes(e.id))d.read.push(e.id)});d.read=d.read.slice(-200);persist();rerender();return}
  if(t.closest('#stTxAccept')){acceptTx();return}
  if(t.closest('#stTxDiscard')){stagedTx=null;renderImport();return}
  if(t.closest('#txDelete')){if(OWN){OWN.tx=null;OWN.txMeta=null;_txc.k=null;persist();rerender();toast('Umsätze entfernt')}return}
  const pb=t.closest('[data-pred]');if(pb){if(pb.disabled)return;const pr0=FUN.preds[pb.dataset.pred];if(pr0&&pr0.res)return;const id=pb.dataset.pred;const pr=FUN.preds[id]||{c:70};if(pb.dataset.ans)pr.a=pb.dataset.ans;if(pb.dataset.conf)pr.c=+pb.dataset.conf;pr.at=new Date().toISOString();FUN.preds[id]=pr;touchDay();saveFun();rerender();return}
  if(t.closest('#goalsFromNow')){const d=D(),V=bucketVals(d),T=tot(V);if(!T){toast('Ohne Bestand gibt es keine heutige Verteilung.');return}const g={};B.forEach(b=>g[b.id]=Math.round(V[b.id]/T*1000)/10);const diff=Math.round((100-B.reduce((a,b)=>a+g[b.id],0))*10)/10;const big=B.reduce((a,b)=>g[b.id]>g[a.id]?b:a,B[0]);g[big.id]=Math.round((g[big.id]+diff)*10)/10;d.goals=g;d.goalsSource='current';goalRaw={};changed();toast('Heutige Verteilung übernommen');return}
  if(t.closest('#goalsEmpty')){const d=D();d.goals=Object.fromEntries(B.map(b=>[b.id,0]));d.goalsSource='own';goalRaw={};changed();return}
  if(t.closest('#btnCopy')){const d=D(),al=allocate(d);if(!al)return;const txt=['Depotfokus · rechnerische Verteilung',...B.filter(b=>al.amounts[b.id]>0).map(b=>`${eur(al.amounts[b.id],2)} → ${b.name} (Ziel ${fz(d.goals[b.id])} %)`)].join('\n');(navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>toast('Verteilung kopiert')).catch(()=>toast('Kopieren nicht möglich'));return}
  // Daten (aus der App übernommen)
  const src=t.closest('[data-src]');if(src){UI.source=src.dataset.src;saveUI();goalRaw={};budgetRaw=null;rerender();toast(UI.source==='demo'?'Musterdepot wird angezeigt':'Dein Depot wird angezeigt');return}
  const cf=t.closest('[data-conf]');if(cf&&cf.dataset.conf.includes('|')){const [id,how]=cf.dataset.conf.split('|');const p=posById(id);if(!p)return;if(how==='manual'){const box=document.getElementById('mv_'+id);box.hidden=false;document.getElementById('mvi_'+id).focus();return}p.conf=how;changed();toast(how==='eur'?`${p.name} wird eingerechnet`:`${p.name} wird nicht eingerechnet`);return}
  const cs=t.closest('[data-confsave]');if(cs){const id=cs.dataset.confsave;const p=posById(id);const v=parseInput(document.getElementById('mvi_'+id).value);if(!(v>=0)||v>1e9){document.getElementById('mve_'+id).textContent='Bitte einen Betrag ab 0 € eingeben.';return}p.conf='manual';p.manualValue=v;changed();return}
  if(t.closest('[data-unskip]')){D().positions.forEach(p=>{if(p.conf==='skip')p.conf=null});changed();return}
  if(t.closest('#extAdd')){D().external.items.push({type:'tagesgeld',value:0});changed();return}
  const xd=t.closest('[data-extdel]');if(xd){D().external.items.splice(+xd.dataset.extdel,1);changed();return}
  if(t.closest('#stDiscard')){staged=null;renderImport();return}
  if(t.closest('#stAccept')){acceptImport();return}
  if(t.closest('#delAsk')){pendingDelete=true;renderSourceCard();return}
  if(t.closest('#delCancel')){pendingDelete=false;renderSourceCard();return}
  if(t.closest('#delConfirm')){store(OWN_KEY,null);OWN=null;pendingDelete=false;UI.source='demo';saveUI();rerender();toast('Eigene Daten auf diesem Gerät gelöscht');return}
});
document.addEventListener('change',e=>{
  const el=e.target,d=D();
  if(el.id==='sleep'){chk.sleep=el.checked;rerender();return}
  if(el.id==='cashMode'){d.cashMode=el.value;changed();return}
  if(el.id==='maxSingle'){const v=parseInput(el.value);if(v!=null&&!(v>0&&v<=100)){$('#maxErr').textContent='Wert über 0 und höchstens 100, oder leer lassen.';el.setAttribute('aria-invalid','true');return}d.maxSingle=v;changed();return}
  if(el.id==='file'){const fs=[...(el.files||[])];if(!fs.length)return;stagedTx=null;
    Promise.all(fs.map(f=>new Promise(res=>{const r=new FileReader();r.onload=()=>res([f.name,r.result]);r.onerror=()=>res([f.name,'']);r.readAsText(f)}))).then(list=>{handleFiles(list)});el.value='';return}
  if(el.id==='liveToggle'){UI.live=el.checked;saveUI();_txc.k=null;rerender();toast(el.checked?'Aktuelle Kurse werden verwendet':'Werte aus dem Export werden verwendet');return}
  if(el.dataset.acc!=null&&staged){staged.accounts[+el.dataset.acc].accept=el.checked;return}
  if(el.id==='stReplace'){$('#stAccept').disabled=!el.checked;return}
  if(el.dataset.bucket){const p=posById(el.dataset.bucket);if(p&&el.value){p.bucket=el.value;p.bucketSrc='user';changed()}return}
  if(el.dataset.exttype!=null){d.external.items[+el.dataset.exttype].type=el.value;changed();return}
  if(el.dataset.extval!=null){const v=parseInput(el.value);if(v==null||!(v>=0)){el.setAttribute('aria-invalid','true');return}d.external.items[+el.dataset.extval].value=v;changed();return}
  if(el.id==='reserve'){const v=parseInput(el.value);if(v!=null&&!(v>=0)){$('#resErr').textContent='Bitte einen Betrag ab 0 € eingeben.';return}d.external.reserve=v||0;changed();return}
});
document.addEventListener('input',e=>{
  const el=e.target,d=D();
  if(el.dataset.goal){const k=el.dataset.goal,v=parseInput(el.value);
    if(v==null||!Number.isFinite(v)||v<0||v>100){goalRaw[k]={v:el.value,msg:v==null?'Wert 0 bis 100 eingeben.':!Number.isFinite(v)?'Keine gültige Zahl.':v<0?'Nicht negativ.':'Höchstens 100.'};el.setAttribute('aria-invalid','true');$('#ge_'+k).textContent=goalRaw[k].msg}
    else{delete goalRaw[k];d.goals[k]=Math.round(v*100)/100;el.removeAttribute('aria-invalid');$('#ge_'+k).textContent=''}
    d.goalsSource='own';d.manual=null;renderGoalSum2();$('#allocBox').innerHTML=allocHTML();if(goalState(d).ok)persist();return}
  if(el.id==='budget'){const v=parseInput(el.value);
    if(v==null||!Number.isFinite(v)||v<0||v>1e7){budgetRaw=v==null?'Bitte einen Betrag eingeben, mindestens 0 €.':!Number.isFinite(v)?'Keine gültige Zahl.':v<0?'Nicht negativ.':'Höchstens 10 Mio. €.';el.setAttribute('aria-invalid','true')}
    else{budgetRaw=null;d.budget=Math.round(v*100)/100;el.removeAttribute('aria-invalid');persist()}
    $('#budgetErr').textContent=budgetRaw||'';$('#allocBox').innerHTML=allocHTML();return}
});
function handleFiles(list){let h=0,t=0,err=0;
  list.forEach(([name,text])=>{const a=analyzeCSV(text,name);if(a.kind==='transactions'){t++;stagedTx=stagedTx&&!stagedTx.error?mergeTx(stagedTx,a):a}else{h++;staged=a}if(a.error)err++});
  renderImport();toast(err?'Mindestens eine Datei ist nicht lesbar':`${h?'Bestand':''}${h&&t?' und ':''}${t?'Umsätze':''} geprüft, bitte kontrollieren`)}
function changed(){const d=D();evaluateChanges(d);persist();rerender()}

/* ---------------- Design: Hell, Dunkel oder wie das System ---------------- */
const darkMQ=window.matchMedia?window.matchMedia('(prefers-color-scheme: dark)'):null;
function isDark(){const t=UI.theme||'system';return t==='dark'||(t==='system'&&!!(darkMQ&&darkMQ.matches))}
function applyTheme(){const r=document.documentElement,t=UI.theme||'system';if(t==='system')delete r.dataset.theme;else r.dataset.theme=t;
  const m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',getComputedStyle(r).getPropertyValue('--ground').trim()||'#F5F6FA')}
function themeBtn(){const dk=isDark();return `<button type="button" class="icon-btn" id="themeToggle" aria-label="${dk?'Zu hellem Design wechseln':'Zu dunklem Design wechseln'}">${ICON.contrast}</button>`}
if(darkMQ&&darkMQ.addEventListener)darkMQ.addEventListener('change',()=>{if((UI.theme||'system')==='system'){applyTheme();rerender()}});
applyTheme();

/* ---------------- Welt › Berichte ---------------- */
function vBerichte(){const rs=reportStatus();
  const rows=rs.pos.slice().sort((a,b)=>(b.n.length-a.n.length)||((INFO[a.p.symbol].checked<INFO[b.p.symbol].checked)?1:-1));
  return hubHead('welt','berichte')+`
  <p class="small muted2">Neue Pflichtmitteilungen der Unternehmen (SEC) und die geprüften Veränderungen je Position. ${rs.checkedAt?`Zuletzt geprüft ${esc(fmtAsOf(rs.checkedAt))}.`:'Noch nicht geprüft.'}</p>
  ${rows.map(x=>{const I=x.I,n=x.n[0],m=MOOD[x.p.symbol]||'neutral',ch=I.changes.items[0],r=(I.rules||[]).find(y=>y.status!=='np');
    return `<a href="#${n?'pos':'story'}/${encodeURIComponent(x.p.id)}" class="card col change"><span class="row between"><span class="t">${esc(x.p.name)}</span>${n?'<span class="tag new">Neuer Bericht</span>':`<span class="tag ${m}">${MOODTXT[m]}</span>`}</span>
     <span class="d">${n?`${esc(n.label)} vom ${deDate(n.date)}. ${esc(newsLine(x.p.symbol))}`:ch?esc(ch.t):esc(I.interp)}</span>
     <span class="src">Einordnung vom ${deDate(I.checked)} · ${methodTxt(I)}${r&&!n?` · erwartet: ${esc(r.next)}`:''}</span></a>`}).join('')||'<p class="hint">Für deine Positionen gibt es noch keine geprüften Einordnungen.</p>'}
  <a class="card row between" href="#stand"><span class="col" style="gap:2px"><span class="strong">Datenstand und Ablauf</span><span class="small muted2">Was automatisch läuft und wann</span></span><span aria-hidden="true">→</span></a>`}
/* Badge am Tab „Welt“: neue Berichte */
function updateBadges(){const b=document.getElementById('badge-welt');if(!b)return;let r=0,m=0;try{r=reportStatus().nNew}catch(e){}
  try{const T=newsToday();if(!T.none&&!T.old)m=T.items.filter(x=>!newsOld(x)&&!(UI.newsRead||[]).includes(x.id)).length}catch(e){}
  const n=r+m;b.hidden=!n;b.textContent=n>9?'9+':String(n);const a=b.closest('a');if(a)a.setAttribute('aria-label',n?`Welt, ${[m?`${m} ungelesene ${m>1?'Nachrichten':'Nachricht'}`:'',r?`${r} ${r>1?'neue Berichte':'neuer Bericht'}`:''].filter(Boolean).join(', ')}`:'Welt')}

/* Start */
evaluateChanges(DEMO,true);if(OWN&&OWN.baseline==null)evaluateChanges(OWN,true);
touchDay();saveFun();route();loadPrices();loadReports();loadAutoDivs();
