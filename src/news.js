/* =========================================================
   WELT › NACHRICHTEN (#nachrichten, #nachricht/ID)
   Daten: NEWS (beim Build aus data/news/ eingebettet). Ältere Tage lädt die App
   bei Bedarf aus data/news/archive/. Die Zuordnung zu deinen Positionen
   passiert nur hier im Browser; nichts davon wird übertragen.
   ========================================================= */
const NX={cache:{},gl:null,day:null};
const NEWS_CAT={lebensmittel:'Lebensmittel & Konsum',energie:'Energie & Rohstoffe',preise:'Inflation & Arbeit',zinsen:'Zinsen & Banken',industrie:'Industrie, Handel & KI',unternehmen:'Unternehmen & Finanzierung'};
const NEWS_STATUS={'geprüft':['pos','Daten geprüft'],'nur_fakten':['warn','Nur Fakten geprüft'],'kurzmeldung':['neutral','Kurzmeldung ohne Einordnung']};
/* Branchen je bekannter Position (Stammdaten); eigene Positionen zusätzlich über Ticker/ISIN in der Meldung */
const NEWS_SECTORS={'PEP.DE':['Lebensmittel','Konsumgüter'],'CCC3.DE':['Lebensmittel','Konsumgüter'],'PRG.DE':['Konsumgüter'],'JNJ.DE':['Gesundheit'],'NOV.DE':['Gesundheit'],
  'MSF.DE':['Technologie'],'GOOG':['Technologie'],'AAPL':['Technologie','Halbleiter'],'3V64.DE':['Zahlungsverkehr'],'MA':['Zahlungsverkehr'],'9A2.F':['Kreditfonds','Banken'],'13M.F':['Kreditfonds','Banken'],
  'WX4.F':['Immobilien','Gesundheit'],'RY6.F':['Immobilien','Einzelhandel'],'IQQW.DE':['Breiter Markt'],'K0MR.DE':['Breiter Markt'],'EQQQ.DE':['Technologie','Breiter Markt']};
const newsAll=()=>{if(!NEWS||!NEWS.latest)return [];const L=NEWS.latest;return (L.items||[]).concat(L.previous&&L.previous.items||[])};
const newsAge=a=>Math.floor((Date.now()-Date.parse(a.published_at))/864e5);
const newsOld=a=>newsAge(a)>=2;
function newsToday(){if(!NEWS||!NEWS.latest)return {items:[],old:false,date:null};const L=NEWS.latest;
  const ord=xs=>xs.map((x,i)=>[x,i]).sort((a,b)=>(newsOld(a[0])-newsOld(b[0]))||a[1]-b[1]).map(x=>x[0]);
  if(L.items&&L.items.length)return {items:ord(L.items),old:L.date!==new Date().toISOString().slice(0,10)&&newsOld(L.items[0]),date:L.date};
  return {items:L.previous?L.previous.items:[],old:true,date:L.previous?L.previous.date:null,none:true,noneDate:L.date}}
/* Lokale Zuordnung: nur Branche/Ticker/ISIN, keine Beträge; verlässt das Gerät nicht */
function newsMatch(a,positions){const sec=new Set(a.sectors||[]),co=a.companies||[];
  return positions.filter(p=>{const s=NEWS_SECTORS[p.symbol]||[];const isin=(STAMM[p.symbol]||{}).isin||p.isin;
    return s.some(x=>sec.has(x))||co.some(c=>(c.isin&&c.isin===isin)||(c.ticker&&p.symbol&&p.symbol.split('.')[0].toUpperCase()===String(c.ticker).toUpperCase()))})}
function newsCard(a,compact){const st=NEWS_STATUS[a.status]||['neutral',''],old=newsOld(a);
  return `<a class="card col news-card" href="#nachricht/${encodeURIComponent(a.id)}" style="gap:5px">
   <span class="row between" style="gap:8px;flex-wrap:nowrap"><span class="small strong muted2">${esc((a.categories||[]).map(c=>NEWS_CAT[c]).filter(Boolean)[0]||'Wirtschaft')}</span>${old?`<span class="tag neutral">älter · ${deDate(a.published_at)}</span>`:!(UI.newsRead||[]).includes(a.id)?'<span class="tag new">neu</span>':''}</span>
   <span class="strong news-title">${esc(a.title)}</span>
   ${a.kurzfassung&&!compact?`<span class="small muted2">${esc(a.kurzfassung)}</span>`:''}
   <span class="src">${esc(a.source.short)} · ${deDate(a.published_at)}${a.revision>1?` · Revision ${a.revision}`:''} · <span class="mood ${st[0]}">${esc(st[1])}</span></span></a>`}

/* Übersicht: bis zu drei Meldungen */
function newsTeaser(){if(!NEWS)return '';const T=newsToday();
  if(!T.items.length)return `<section class="col" style="gap:8px"><div class="row between"><h2 class="h2" style="margin:0">Wirtschaft heute</h2><a class="link" href="#nachrichten">Nachrichten →</a></div><p class="hint">${NEWS.latest&&NEWS.latest.result==='none'?'Keine neue relevante Entwicklung in den geprüften Quellen.':'Noch keine geprüften Nachrichten.'}</p></section>`;
  return `<section class="col" style="gap:8px"><div class="row between"><h2 class="h2" style="margin:0">Wirtschaft heute</h2><a class="link" href="#nachrichten">Alle ${T.items.length} →</a></div>
   ${T.none?`<p class="hint">Heute keine neue relevante Entwicklung. Zuletzt vom ${deDate(T.date)}:</p>`:''}
   ${T.items.slice(0,3).map(a=>newsCard(a,true)).join('')}</section>`}

function newsStatusLine(){const S=NEWS.status||{},L=NEWS.latest;
  const res={items:'Meldungen ausgewählt',none:'keine neue relevante Entwicklung',failed:'Abruf fehlgeschlagen, letzte gültige Ausgabe bleibt'}[S.last_result]||'–';
  return `<details class="card"><summary>Stand, Quellen und Prüfung</summary><dl class="kv">
   <dt>Ausgabe</dt><dd>${L?`vom ${deDate(L.date)}, erstellt ${esc(fmtAsOf(L.generated_at))}`:'noch keine'}</dd>
   <dt>Letzter Lauf</dt><dd>${S.last_run_at?esc(fmtAsOf(S.last_run_at))+' · '+esc(res):'–'}</dd>
   <dt>Letzter Erfolg</dt><dd>${S.last_success_at?esc(fmtAsOf(S.last_success_at)):'–'}</dd>
   <dt>Aufbereitung</dt><dd>${S.llm==='aktiv'?`Claude (${esc(S.model||'')}), danach automatische Belegprüfung`:'ohne Sprachmodell: nur Originaltitel und wörtliche Sätze'}</dd>
   <dt>Zeitplan</dt><dd>täglich gegen 8:20 Uhr; manuell über Actions › Nachrichten › Run workflow</dd>
   <dt>Quellen</dt><dd>${Object.entries(S.sources||{}).map(([k,v])=>`<span class="nowrap"><i class="dot ${v.ok?'ok':'warn'}"></i> ${esc(k.toUpperCase())}</span>`).join(' ')}</dd>
   ${(S.held||[]).length?`<dt>Zurückgehalten</dt><dd>${S.held.map(h=>`${esc(h.title)} – ${esc(h.why)}`).join('<br>')}</dd>`:''}</dl>
   <p class="small muted2"><b>Daten geprüft</b> heißt: Jede Tatsache ist durch ein wörtliches Zitat aus der abgerufenen Quelle belegt, und jede Zahl steht in diesem Zitat. Die Einordnung ist als solche gekennzeichnet; daraus folgt keine Kursprognose. Nur amtliche Quellen (EZB, Eurostat, Destatis, Bundesbank, Fed, BEA, EIA, IWF, FAO).</p></details>`}

function vNachrichten(day){
  if(!NEWS)return hubHead('welt','nachrichten')+'<div class="empty">Nachrichten fehlen in dieser Version.</div>';
  let items,head='';
  if(day&&/^\d{4}-\d{2}-\d{2}$/.test(day)){const c=NX.cache[day];if(!c)newsLoadDay(day);
    items=c&&c.items||[];head=`<div class="banner info"><b>Archiv vom ${deDate(day)}</b><span>${c?c.error?'Nicht verfügbar ('+esc(c.error)+'). Offline sind nur bereits geöffnete Tage gespeichert.':`${items.length} Meldungen`:'wird geladen …'}</span><a class="link" href="#nachrichten">Zur aktuellen Auswahl</a></div>`}
  else{const T=newsToday();items=T.items;
    if(T.none)head=`<div class="banner"><b>Heute keine neue relevante Entwicklung</b><span>Die geprüften Quellen haben am ${deDate(T.noneDate)} nichts Wesentliches veröffentlicht. Darunter die letzte Auswahl vom ${deDate(T.date)}.</span></div>`;
    else if(NEWS.status&&NEWS.status.last_result==='failed')head=`<div class="banner"><b>Letzter Abruf fehlgeschlagen</b><span>Gezeigt wird die letzte gültige Ausgabe vom ${deDate(NEWS.latest.date)}.</span></div>`;
    else if(T.old)head=`<div class="banner"><b>Ältere Ausgabe</b><span>Diese Auswahl stammt vom ${deDate(T.date)}.</span></div>`}
  const days=(NEWS.days||[]).filter(x=>x.date!==(NEWS.latest&&NEWS.latest.date)).slice(0,14);
  return hubHead('welt','nachrichten',`<p class="small muted2">Höchstens fünf wichtige Entwicklungen am Tag, einfach erklärt, jede Tatsache mit Beleg aus der Originalquelle. An ruhigen Tagen weniger.</p>`)+head+
   (items.length?items.map(a=>newsCard(a,false)).join(''):'<div class="empty">Noch keine geprüften Nachrichten.</div>')+
   newsStatusLine()+
   (days.length?`<details class="card"><summary>Frühere Tage</summary><div class="chips" style="margin-top:6px">${days.map(x=>`<a class="mchip" style="display:inline-flex;align-items:center" href="#nachrichten/${x.date}">${deDate(x.date)} · ${x.count}</a>`).join('')}</div></details>`:'')+
   `<p class="hint">Keine Anlageberatung. Allgemeine Wirtschaftsnachrichten sind getrennt von Unternehmensberichten (Berichte) und den Modellwerten (Szenarien); sie verändern keine Szenario-Wahrscheinlichkeiten.</p>`}
function newsLoadDay(day){if(NX.cache[day]||typeof fetch!=='function')return;NX.cache[day]={loading:true};
  fetch(`data/news/archive/${day}.json`,{cache:'no-cache'}).then(r=>r.ok?r.json():Promise.reject(new Error('HTTP '+r.status))).then(j=>{NX.cache[day]=j;rerender()}).catch(e=>{NX.cache[day]={error:e.message};rerender()})}

/* Glossar: Begriffe im Text antippbar */
function glText(t,a){let h=esc(t);(a.glossary||[]).forEach((g,i)=>{const re=new RegExp(`(${g.term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'i');h=h.replace(re,`<button type="button" class="gl" data-gl="${i}" aria-expanded="${NX.gl===i}">$1</button>`)});return h}
function glBox(a){if(NX.gl==null||!a.glossary||!a.glossary[NX.gl])return '';const g=a.glossary[NX.gl];return `<div class="gl-box" role="note"><b>${esc(g.term)}:</b> ${esc(g.def)}</div>`}
function vNachricht(id){
  const a=newsAll().find(x=>x.id===id)||Object.values(NX.cache).flatMap(c=>c&&c.items||[]).find(x=>x.id===id);
  const back=`<div class="row" style="gap:6px"><a href="#nachrichten" class="icon-btn" aria-label="Zurück zu den Nachrichten">${ICON.back}</a><span class="lbl">Nachricht</span></div>`;
  if(!a)return back+'<div class="empty">Diese Meldung ist nicht mehr in der aktuellen Auswahl. Ältere Tage findest du unter „Frühere Tage“.</div>';
  if(!(UI.newsRead||[]).includes(a.id)){UI.newsRead=[...(UI.newsRead||[]),a.id].slice(-200);saveUI();updateBadges()}
  const st=NEWS_STATUS[a.status]||['neutral',''],mine=newsMatch(a,D().positions.filter(isIncluded));
  const fact=f=>`<li>${f.text?esc(f.text):'<span class="muted2">Wörtlich aus der Quelle:</span>'}<details><summary>Beleg</summary><blockquote class="quote">${esc(f.quote)}</blockquote></details></li>`;
  const tag=t=>`<span class="kind ${t==='Fakt'?'metric':'interp'}">${t}</span>`;
  return back+`
  <article class="col" style="gap:12px">
   <div class="col" style="gap:6px"><span class="small strong muted2">${esc((a.categories||[]).map(c=>NEWS_CAT[c]).filter(Boolean).join(' · ')||'Wirtschaft')}${(a.regions||[]).length?' · '+esc(a.regions.join(', ')):''}</span>
    <h1 class="big" style="font-size:24px;line-height:1.2">${esc(a.title)}</h1>
    ${a.title_is_original?'<span class="small muted2">Originaltitel der Quelle</span>':''}
    ${a.kurzfassung?`<p class="lead">${esc(a.kurzfassung)}</p>`:''}
    <span class="src">${esc(a.source.name)} · veröffentlicht ${deDate(a.published_at)}${a.event_date&&a.event_date!==a.published_at.slice(0,10)?` · Ereignis ${deDate(a.event_date)}`:''}${newsOld(a)?' · <b>ältere Meldung</b>':''}</span>
    <span class="row" style="gap:8px"><span class="tag ${st[0]}">${esc(st[1])}</span>${a.revision>1?`<span class="tag warn">Revision ${a.revision}</span>`:''}</span></div>
   ${a.revision>1&&a.revision_note?`<p class="hint-box">${esc(a.revision_note)} Stand ${esc(fmtAsOf(a.revised_at))}.</p>`:''}
   <section class="card col" style="gap:6px"><div class="row between"><h2 class="h2" style="margin:0">Was ist passiert?</h2>${tag('Fakt')}</div><ul class="sc-ul news-facts">${(a.facts||[]).map(fact).join('')}</ul></section>
   ${a.alltag?`<section class="card col" style="gap:6px"><div class="row between"><h2 class="h2" style="margin:0">Warum betrifft uns das?</h2>${tag('Einordnung')}</div><p>${glText(a.alltag,a)}</p>${glBox(a)}</section>`:''}
   ${a.finanzwirkung?`<section class="card col" style="gap:6px"><div class="row between"><h2 class="h2" style="margin:0">Was könnte es für Unternehmen, Aktien und Dividenden bedeuten?</h2>${tag('Einordnung')}</div><p>${glText(a.finanzwirkung,a)}</p>
     ${a.dividend&&a.dividend.status!=='nicht erwähnt'?`<p class="small"><b>Dividende:</b> ${a.dividend.status==='angekündigt'?'in der Quelle angekündigt':'in der Quelle nur erwartet, nicht angekündigt'}.</p>`:''}
     <p class="hint">Mögliche Wirkung, keine Prognose. Unternehmen und Aktienkurse können sich unterschiedlich entwickeln.</p></section>`:''}
   ${a.naechstes&&a.naechstes.text?`<section class="card col" style="gap:6px"><div class="row between"><h2 class="h2" style="margin:0">Was beobachten wir als Nächstes?</h2>${tag('Einordnung')}</div><p>${glText(a.naechstes.text,a)}</p>${a.naechstes.date?`<span class="small strong">Termin laut Quelle: ${deDate(a.naechstes.date)}</span>`:''}</section>`:''}
   ${!a.alltag?`<div class="empty">${a.status==='kurzmeldung'?'Kurzmeldung: Eine verständliche Einordnung fehlt, weil das Sprachmodell nicht verfügbar war. Gezeigt werden nur Originaltitel und ein wörtlicher Satz aus der Quelle.':'Die Einordnung hat die automatische Prüfung nicht bestanden und wird deshalb nicht gezeigt. Die Fakten oben sind belegt.'}</div>`:''}
   ${(a.glossary||[]).length?`<details class="card"><summary>Begriffe einfach erklärt (${a.glossary.length})</summary>${a.glossary.map(g=>`<p class="small"><b>${esc(g.term)}:</b> ${esc(g.def)}</p>`).join('')}</details>`:''}
   ${mine.length?`<section class="card col" style="gap:4px"><span class="lbl">${D().kind==='demo'?'Im Musterdepot':'In deinem Depot'} möglicherweise berührt</span><span class="small">${mine.map(p=>esc(p.name)).join(', ')}</span><span class="hint">Zuordnung nur nach Branche oder Kennung, berechnet auf diesem Gerät. Ob und wie stark diese Firmen betroffen sind, belegt die Meldung nicht.</span></section>`:''}
   ${a.scenario_link?`<section class="card col" style="gap:4px"><span class="lbl">Bezug zu den Szenarien (qualitativ)</span><span class="small"><a class="link" href="#szenarien">Szenario ${esc(a.scenario_link.scenario)}</a>: ${esc(a.scenario_link.why)}</span><span class="hint">Nachrichten ändern die Szenario-Wahrscheinlichkeiten nicht. Der Szenario-Rechner verarbeitet nur seine festen Datenreihen.</span></section>`:''}
   <section class="card col" style="gap:6px"><h2 class="h2" style="margin:0">Quelle und Prüfung</h2>
    <a class="src" href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.source.name)}: ${esc(a.original_title)}</a>
    ${(a.also||[]).map(x=>`<a class="src" href="${esc(x.url)}" target="_blank" rel="noopener">auch: ${esc(x.title)}</a>`).join('')}
    ${(a.numbers||[]).length?`<dl class="kv">${a.numbers.map(n=>`<dt>${esc(num(n.value,Number.isInteger(n.value)?0:2))} ${esc(n.unit)}</dt><dd>${esc(n.period)}</dd>`).join('')}</dl>`:''}
    <p class="small muted2">${esc(a.check_note||'')}</p>
    <span class="small muted2">Abgerufen ${esc(fmtAsOf(a.retrieved_at))} · erstellt ${esc(fmtAsOf(a.created_at))}${a.model?` · Modell ${esc(a.model)}`:''} · Ablauf ${esc(a.pipeline_version)} · Nutzung: ${esc(a.source.license)}</span></section>
  </article>`}
document.addEventListener('click',e=>{const g=e.target.closest('[data-gl]');if(g){const i=+g.dataset.gl;NX.gl=NX.gl===i?null:i;rerender();return}});
window.addEventListener('hashchange',()=>{NX.gl=null});
