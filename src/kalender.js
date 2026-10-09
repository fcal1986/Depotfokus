/* =========================================================
   DIVIDENDENKALENDER (#kalender)
   Angekündigt: data/dividends.json, jede Zahlung mit Quelle.
   Geschätzt:   aus deinen Umsätzen der letzten 12 Monate, gleicher Termin ein Jahr später,
                hochgerechnet auf deinen heutigen Bestand. Höhe wie zuletzt gebucht (netto).
   Erhalten:    gebuchte Dividenden der letzten 12 Monate.
   ========================================================= */
const KAL={tab:'kommend'};
const MONAT=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
// ISO-Datum um Jahre verschieben; 29.02. wird zum 28.02.
function isoYears(iso,y){const [a,b,c]=iso.split('-');return `${+a+y}-${b}-${b==='02'&&c==='29'?'28':c}`}
const isoLong=iso=>new Date(iso+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});
const isoShort=iso=>new Date(iso+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'});
function fxRate(ccy){if(ccy==='EUR')return 1;const r=PRICES&&PRICES.fx&&PRICES.fx[ccy];return r>0?r:null}
const isWeekend=iso=>{const w=new Date(iso+'T12:00:00Z').getUTCDay();return w===0||w===6};
const prevBizDay=iso=>{let x=iso;while(isWeekend(x))x=isoDays(x,-1);return x};
const nextBizDay=iso=>{let x=iso;while(isWeekend(x))x=isoDays(x,1);return x};
/* Zahltag ein Jahr später schätzen, nach dem Muster des Unternehmens:
   fester Monatstag (z. B. der 15.; fällt er aufs Wochenende, der Werktag davor) oder fester Wochentag (52 Wochen später). */
function nextPayEstimate(a,basisPay){const pays=(a&&a.ev||[]).map(e=>e.pay).filter(Boolean).slice(-8);
  const dom={};pays.forEach(p=>{const k=+p.slice(8,10);dom[k]=(dom[k]||0)+1});
  const [best,cnt]=Object.entries(dom).sort((x,y)=>y[1]-x[1])[0]||[null,0];
  if(pays.length>=3&&cnt/pays.length>=0.5){const [y,m]=isoYears(basisPay,1).split('-').map(Number);const last=new Date(Date.UTC(y,m,0)).getUTCDate();
    // Wochenende: Richtung wie bisher bei diesem Unternehmen (früher oder später gezahlt), sonst Werktag davor
    const dev=pays.map(p=>+p.slice(8,10)-best).filter(x=>x&&Math.abs(x)<=4),fwd=dev.filter(x=>x>0).length>dev.filter(x=>x<0).length;
    const t=`${y}-${String(m).padStart(2,'0')}-${String(Math.min(+best,last)).padStart(2,'0')}`;return fwd?nextBizDay(t):prevBizDay(t)}
  return isoDays(basisPay,364)}
/* Stück am Ex-Tag aus den Umsätzen: nur Käufe/Verkäufe vor dem Ex-Tag zählen. Ohne passende Umsätze: heutiger Bestand. */
function sharesAt(d,p,ex){if(!ex)return null;const s=secFor(d,p);if(!s||s.mismatch||s.unknownCost&&!s.ok)return null;
  let n=0;d.tx.forEach(t=>{if(t.sk!==s.sk||!(t.date<ex)||!t.shares)return;if(t.type==='buy'||t.type==='in')n+=t.shares;else if(t.type==='sell'||t.type==='out')n-=t.shares});
  return n>1e-6?Math.round(n*1e6)/1e6:0}
const ccySym=c=>({USD:'$',EUR:'€',DKK:'DKK',GBP:'£',CHF:'CHF'})[c]||c;

/* Automatisch gesammelte Dividenden (dividends.json, von der GitHub Action beim Veröffentlichen) */
let AUTODIV=null;
function loadAutoDivs(){if(typeof fetch!=='function')return;fetch('dividends.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(j=>{if(j&&j.items){AUTODIV=j;rerender()}}).catch(()=>{})}
const isoDays=(iso,n)=>{const t=new Date(iso+'T12:00:00Z');t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10)};
// Typischer Abstand Ex-Tag → Zahltag aus den Daten, sonst 14 Tage
function payLag(a){const l=a.ev.filter(e=>e.pay&&e.ex).map(e=>daysBetween(e.ex,e.pay)).filter(x=>x>=0&&x<120).sort((x,y)=>x-y);return l.length?Math.round(l[Math.floor(l.length/2)]):14}
const autoSrc=a=>({org:a.src,doc:'Dividendenhistorie',url:a.url,date:AUTODIV&&AUTODIV.asOf?fmtAsOf(AUTODIV.asOf):''});

function kalModel(d){
  const today=todayISO(),end=isoYears(today,1),start=isoYears(today,-1);
  const m=txModel(d),items=[];
  const held=d.positions.filter(p=>p.qty!=null&&p.qty>0&&p.conf!=='skip');
  const money=(per,ccy,qty)=>{const r=fxRate(ccy),gross=per*qty,eurGross=r?gross/r:null;return {gross,eurGross,net:eurGross!=null?eurGross*(1-TAX):null,fx:r}};
  // Stück: am Ex-Tag laut Umsätzen, sonst heutiger Bestand (Käufe nach dem Ex-Tag bekommen diese Zahlung nicht)
  const qtyFor=(p,ex)=>{if(ex&&ex<=today){const n=sharesAt(d,p,ex);if(n!=null)return {qty:n,qtyBasis:'ex'}}return {qty:p.qty,qtyBasis:'heute'}};
  const near=(p,pay,days,st)=>items.some(i=>i.p===p&&(!st||i.state===st)&&Math.abs(daysBetween(i.pay,pay))<=days);
  // 1. Angekündigt, von Hand geprüft (data/dividends.json)
  ((typeof DIVS!=='undefined'&&DIVS.items)||[]).forEach(x=>{
    const p=held.find(q=>q.symbol===x.sym);if(!p||x.pay<today||x.pay>end)return;
    const q=qtyFor(p,x.ex);if(!(q.qty>0))return;
    items.push({state:'announced',p,name:p.name,pay:x.pay,ex:x.ex,per:x.amount,ccy:x.ccy,...q,...money(x.amount,x.ccy,q.qty),label:x.label,src:S[x.src]?{key:x.src}:null});
  });
  const auto=new Set();
  held.forEach(p=>{const a=AUTODIV&&AUTODIV.items&&AUTODIV.items[p.symbol];if(!a)return;auto.add(p);if(!a.ev||!a.ev.length||!a.ccy)return;
    const lag=payLag(a),last=a.ev[a.ev.length-1];
    // 2. Automatisch gesammelt: vom Unternehmen erklärt, Zahltag noch offen
    a.ev.filter(e=>e.pay&&e.pay>=today&&e.pay<=end).forEach(e=>{if(near(p,e.pay,10,'announced'))return;const q=qtyFor(p,e.ex);if(!(q.qty>0))return;
      items.push({state:'announced',p,name:p.name,pay:e.pay,ex:e.ex,per:e.amount,ccy:a.ccy,...q,...money(e.amount,a.ccy,q.qty),
        label:`${e.decl?`Erklärt am ${isoToDe(e.decl)}`:'Erklärt'}, laut ${a.src}`,auto:a})});
    // 3. Ex-Tag schon gewesen, Zahltag unbekannt und noch nicht vorbei
    a.ev.filter(e=>!e.pay&&e.ex<=today&&isoDays(e.ex,lag)>=today).forEach(e=>{const pay=isoDays(e.ex,lag);if(near(p,pay,20))return;const q=qtyFor(p,e.ex);if(!(q.qty>0))return;
      items.push({state:'estimated',kind:'exknown',p,name:p.name,pay,ex:e.ex,per:e.amount,ccy:a.ccy,...q,...money(e.amount,a.ccy,q.qty),auto:a,lag})});
    // 4. Geschätzt: Termine der letzten 12 Monate ein Jahr später, Höhe wie zuletzt
    a.ev.filter(e=>e.ex>start&&e.ex<=today).forEach(e=>{const pay=nextPayEstimate(a,e.pay||isoDays(e.ex,lag));if(pay<=today||pay>end||near(p,pay,20))return;
      items.push({state:'estimated',kind:'auto',p,name:p.name,pay,ex:null,per:last.amount,ccy:a.ccy,qty:p.qty,qtyBasis:'heute',...money(last.amount,a.ccy,p.qty),auto:a,basis:e,lastEv:last})});
  });
  // 5. Geschätzt aus den Umsätzen, nur für Positionen ohne gesammelte Daten
  if(m)m.secs.filter(s=>s.held&&s.pos&&!auto.has(s.pos)).forEach(s=>{
    const p=s.pos,qty=p.qty!=null?p.qty:s.shares;
    d.tx.filter(t=>t.type==='div'&&t.sk===s.sk&&t.date>start&&t.date<=today).forEach(t=>{
      const pay=prevBizDay(isoYears(t.date,1));if(pay<=today||pay>end||near(p,pay,20))return;
      const net=t.shares&&qty?t.value/t.shares*qty:t.value;
      items.push({state:'estimated',kind:'tx',p,name:p.name,pay,ex:null,net,qty,basis:t});
    });
  });
  items.sort((a,b)=>a.pay<b.pay?-1:a.pay>b.pay?1:a.name.localeCompare(b.name));
  // Erhalten
  const got=m?d.tx.filter(t=>t.type==='div'&&t.date>start&&t.date<=today).map(t=>{const s=m.secs.find(x=>x.sk===t.sk);
    return {state:'paid',name:s&&s.pos?s.pos.name:(s&&s.name)||t.name||'Unbekanntes Wertpapier',pay:t.date,net:t.value,qty:t.shares,t}}).sort((a,b)=>a.pay<b.pay?1:a.pay>b.pay?-1:0):[];
  const sum=l=>l.reduce((a,x)=>a+(x.net||0),0);
  const months=[];for(let i=0;i<12;i++){const dt=new Date();dt.setDate(1);dt.setMonth(dt.getMonth()+i);const k=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
    months.push({k,label:MONAT[dt.getMonth()],v:sum(items.filter(x=>x.pay.slice(0,7)===k))})}
  const noData=held.filter(p=>!auto.has(p)&&!(m&&m.secs.some(s=>s.pos===p&&s.held&&s.div12>0))&&!items.some(i=>i.p===p));
  return {items,got,months,hasTx:!!m,auto:auto.size,held:held.length,noData,total:sum(items),totalGot:sum(got),noEur:items.filter(x=>x.net==null).length,
    noFx:[...new Set(items.filter(x=>x.net==null&&x.ccy).map(x=>x.ccy))],gross:Object.entries(items.filter(x=>x.net==null&&x.ccy).reduce((o,x)=>(o[x.ccy]=(o[x.ccy]||0)+x.gross,o),{})),
    nAnn:items.filter(x=>x.state==='announced').length,nEst:items.filter(x=>x.state==='estimated').length,today};
}

function autoLink(a){return a?`<a class="src" href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.src)}, Dividendenhistorie ${esc(a.ref)}, abgerufen ${esc(AUTODIV&&AUTODIV.asOf?fmtAsOf(AUTODIV.asOf):'')}</a>`:''}
function kalRow(x){
  const tag=x.state==='announced'?'<span class="tag pos">angekündigt</span>':x.state==='estimated'?'<span class="tag warn">geschätzt</span>':'<span class="tag neutral">erhalten</span>';
  const amt=x.net!=null?eur(x.net,2):`${num(x.gross,2)} ${ccySym(x.ccy)}`;
  const qn=q=>num(q,q%1?4:0);
  const money=()=>`<dt>Brutto</dt><dd class="num strong">${num(x.gross,2)} ${ccySym(x.ccy)}${x.eurGross!=null&&x.ccy!=='EUR'?` <span class="muted2">≈ ${eur(x.eurGross,2)}</span>`:''}</dd>
    <dt>Je Aktie</dt><dd class="num">${num(x.per,4)} ${ccySym(x.ccy)}</dd><dt>Stück</dt><dd class="num">${qn(x.qty)} <span class="muted2">${x.qtyBasis==='ex'?'am Ex-Tag laut Umsätzen':'heutiger Bestand'}</span></dd>
    <dt>Netto</dt><dd class="num">${x.net!=null?'≈ '+eur(x.net,2):'Devisenkurs fehlt'}</dd>${x.fx&&x.ccy!=='EUR'?`<dt>Devisenkurs</dt><dd class="num">1 € = ${num(x.fx,4)} ${ccySym(x.ccy)}${PRICES&&PRICES.fxSrc&&PRICES.fxSrc[x.ccy]?` (${esc(PRICES.fxSrc[x.ccy])})`:''}</dd>`:''}`;
  const taxNote=`Netto nach 26,375 % Steuer, ohne Kirchensteuer und Sparerpauschbetrag${x.ccy&&x.ccy!=='EUR'?', zum heutigen Devisenkurs':''}.`;
  let det='';
  const exWarn=x.ex&&x.ex<=todayISO()&&x.qtyBasis==='heute'?`<p class="hint-box">Ex-Tag war am ${isoToDe(x.ex)}. Gerechnet ist mit deinem heutigen Bestand; Käufe nach dem Ex-Tag (z. B. Sparplan) bekommen diese Zahlung nicht. Mit importierten Umsätzen rechnet Depotfokus mit dem Bestand am Ex-Tag.</p>`:'';
  if(x.state==='announced')det=`<dl class="kv"><dt>Ex-Tag</dt><dd class="num">${x.ex?isoToDe(x.ex):'–'}</dd><dt>Zahltag</dt><dd class="num">${isoToDe(x.pay)}</dd>${money()}</dl>${exWarn}
    <p class="hint">${esc(x.label)}. ${taxNote}</p>${x.auto?autoLink(x.auto):x.src?srcLink(x.src.key):''}`;
  else if(x.kind==='exknown')det=`<dl class="kv"><dt>Ex-Tag</dt><dd class="num">${isoToDe(x.ex)}</dd><dt>Zahltag</dt><dd>um den ${isoToDe(x.pay)} (geschätzt)</dd>${money()}</dl>
    <p class="hint">Ex-Tag und Betrag stehen fest, der Zahltag ist geschätzt: ${x.lag} Tage nach dem Ex-Tag wie bisher üblich. ${taxNote}</p>${autoLink(x.auto)}`;
  else if(x.kind==='auto')det=`<dl class="kv"><dt>Zahltag</dt><dd>um den ${isoToDe(x.pay)}</dd><dt>Ex-Tag</dt><dd>noch nicht bekannt</dd>${money()}
    <dt>Grundlage</dt><dd>Termin wie ${x.basis.pay?'Zahlung am '+isoToDe(x.basis.pay):'Ex-Tag '+isoToDe(x.basis.ex)} vor einem Jahr, Höhe wie zuletzt (Ex-Tag ${isoToDe(x.lastEv.ex)})</dd></dl>
    <p class="hint">Noch nicht erklärt. Erhöhungen, Kürzungen und Sonderzahlungen sind nicht eingerechnet. ${taxNote}</p>${autoLink(x.auto)}`;
  else if(x.state==='estimated')det=`<dl class="kv"><dt>Zahltag</dt><dd>um den ${isoToDe(x.pay)}</dd><dt>Ex-Tag</dt><dd>noch nicht bekannt</dd>
    <dt>Grundlage</dt><dd>Buchung vom ${isoToDe(x.basis.date)}: ${eur(x.basis.value,2)} netto${x.basis.shares?` für ${qn(x.basis.shares)} Stück`:''}</dd>
    <dt>Hochgerechnet</dt><dd>${x.basis.shares?`auf ${qn(x.qty)} Stück heute`:'ohne Stückzahl, Betrag wie gebucht'}</dd></dl>
    <p class="hint">Aus deinen Umsätzen, weil für dieses Wertpapier keine gesammelten Dividendendaten vorliegen. Termin und Höhe wie vor einem Jahr.</p>`;
  else det=`<dl class="kv"><dt>Gebucht am</dt><dd class="num">${isoToDe(x.pay)}</dd><dt>Netto</dt><dd class="num">${eur(x.net,2)}</dd>${x.t.taxes?`<dt>Steuern</dt><dd class="num">${eur(x.t.taxes,2)}</dd>`:''}${x.qty?`<dt>Stück</dt><dd class="num">${qn(x.qty)}</dd>`:''}</dl><p class="hint">Aus deinen Umsätzen.</p>`;
  return `<details class="card krow ${x.state==='estimated'?'est':''}"><summary><span class="kav" aria-hidden="true">${esc(initials(x.name))}</span>
    <span class="col" style="min-width:0"><span class="kn">${esc(x.name)}</span><span class="small muted2">${isoLong(x.pay)}</span></span>
    <span class="kamt"><span class="num strong">${amt}</span>${tag}</span></summary><div class="kdet">${det}</div></details>`;
}

function vKalender(){
  const d=D(),K=kalModel(d),up=KAL.tab==='kommend',list=up?K.items:K.got;
  const max=Math.max(1,...K.months.map(x=>x.v)),now=K.today.slice(0,7);
  const groups=[];list.forEach(x=>{const k=x.pay.slice(0,7);let g=groups[groups.length-1];if(!g||g.k!==k){g={k,items:[]};groups.push(g)}g.items.push(x)});
  const head=`${hubHead('einkommen','kalender')}
   ${d.kind==='demo'?'<span class="chip-demo" style="align-self:flex-start">Musterdepot und Musterumsätze</span>':''}`;
  const sum=`<section class="dark col" style="gap:10px">
    <div class="row between"><span class="lbl">${up?'Nächste 12 Monate':'Letzte 12 Monate'}</span><span class="small muted-night">netto</span></div>
    ${up&&K.noFx.length&&!K.total?`<span class="big" style="font-size:26px">${K.gross.map(([c,v])=>`${num(v,0)} ${ccySym(c)}`).join(' + ')} brutto</span><span class="small sun-text">Devisenkurs ${esc(K.noFx.join(', '))} fehlt, Euro-Werte folgen mit dem nächsten Kursabruf.</span>`:`<span class="big" style="font-size:32px">${up?'rund ':''}${eur(up?K.total:K.totalGot)}</span>`}
    <span class="small muted-night">${up?`${K.nAnn} angekündigt, ${K.nEst} geschätzt${K.noEur?` · ${K.noEur} ohne Euro-Wert`:''} · im Monat Ø ${eur(K.total/12)}`:`${K.got.length} Buchungen aus deinen Umsätzen`}</span>
    ${up?`<div class="kbars" role="group" aria-label="Dividenden je Monat">${K.months.map(x=>`<button type="button" data-kmonth="${x.k}" class="${x.k===now?'now':''}" aria-label="${x.label}: ${eur(x.v)}"><span class="kv0">${x.v>=1?num(x.v,0):''}</span><i style="height:${Math.max(2,x.v/max*58)}px"></i><span>${x.label.slice(0,3)}</span></button>`).join('')}</div>`:''}
  </section>`;
  const seg=`<div class="seg" role="group" aria-label="Ansicht"><button type="button" data-ktab="kommend" aria-pressed="${up}">Kommend</button><button type="button" data-ktab="erhalten" aria-pressed="${!up}">Erhalten</button></div>`;
  let body;
  const noAuto=!AUTODIV||!AUTODIV.asOf;
  if(!list.length)body=up?`<div class="empty">${noAuto?'Die gesammelten Dividendendaten sind noch nicht geladen. Sie entstehen beim Veröffentlichen der Seite auf GitHub und werden einmal am Tag aktualisiert.':'Für deine Positionen ist in den nächsten 12 Monaten keine Zahlung erklärt oder aus den letzten 12 Monaten zu erwarten.'}</div>`
    :`<div class="empty">${K.hasTx?'In den letzten 12 Monaten ist keine Dividende gebucht.':'Erhaltene Dividenden stehen in deinen Umsätzen. Importiere sie aus Portfolio Performance.'}</div>${K.hasTx?'':'<a class="btn" href="#daten">Umsätze importieren</a>'}`;
  else body=groups.map(g=>{const [y,mo]=g.k.split('-');const s=g.items.reduce((a,x)=>a+(x.net||0),0);
    return `<h2 class="kmon" id="km-${g.k}"><span>${MONAT[+mo-1]} ${y}</span><span class="num">${eur(s,2)}</span></h2>${g.items.map(kalRow).join('')}`}).join('');
  const foot=up?`<p class="hint">Angekündigt heißt: vom Unternehmen erklärt, mit Quelle. Geschätzt heißt: Termin nach dem Muster des Vorjahres (fester Monatstag oder Wochentag, Wochenende → Werktag davor), Höhe wie zuletzt, für deinen heutigen Bestand. Stückzahl bei bekanntem Ex-Tag: dein Bestand am Ex-Tag laut Umsätzen. Daten ${noAuto?'noch nicht geladen':`von ${esc(AUTODIV.source)}, abgerufen ${esc(fmtAsOf(AUTODIV.asOf))}, für ${K.auto} von ${K.held} Positionen`}. Keine Anlageberatung.</p>`:'<p class="hint">Beträge netto, wie in Portfolio Performance gebucht.</p>';
  const gap=up&&K.noData.length?`<div class="banner"><b>Ohne Dividendendaten: ${esc(K.noData.map(p=>short(p.name)).join(', '))}</b><span>Für diese Positionen fehlen gesammelte Daten${K.hasTx?'':' und Umsätze'}. Trage sie in symbols.txt ein (Symbol, ISIN und für US-Aktien den US-Ticker), dann sammelt die Action sie beim nächsten Lauf.</span></div>`:'';
  return head+sum+seg+gap+body+foot;
}

/* Kachel für Heute und Depot */
function kalTeaser(d){try{const K=kalModel(d),n=K.items[0];if(!n&&!K.hasTx&&!AUTODIV)return '';
  const max=Math.max(1,...K.months.map(x=>x.v));
  const spark=`<svg class="zspark" viewBox="0 0 60 36" aria-hidden="true">${K.months.map((x,i)=>{const h=Math.max(1.5,x.v/max*30);return `<rect x="${i*5}" y="${34-h}" width="3.4" height="${h}" rx="1" fill="${i===0?'var(--accent)':'var(--pos)'}"/>`}).join('')}</svg>`;
  return `<a class="card zteaser" href="#kalender"><span class="col" style="gap:2px;min-width:0"><span class="lbl">Dividendenkalender</span>
    <span class="strong">${n?`Nächste: ${esc(short(n.name))} am ${isoShort(n.pay)}`:'Keine Zahlung in Sicht'}</span>
    <span class="small muted2">${n?`${n.net!=null?(n.state==='estimated'?'rund ':'≈ ')+eur(n.net,2):num(n.gross,2)+' '+ccySym(n.ccy)}, ${n.state==='announced'?'angekündigt':'geschätzt'} · `:''}12 Monate rund ${eur(K.total)}</span></span>${spark}</a>`}catch(e){console.error(e);return ''}}
