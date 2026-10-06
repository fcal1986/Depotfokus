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
const ccySym=c=>({USD:'$',EUR:'€',DKK:'DKK',GBP:'£',CHF:'CHF'})[c]||c;

function kalModel(d){
  const today=todayISO(),end=isoYears(today,1),start=isoYears(today,-1);
  const m=txModel(d),items=[];
  const held=d.positions.filter(p=>p.qty!=null&&p.qty>0&&p.conf!=='skip');
  // 1. Angekündigt (mit Quelle)
  ((typeof DIVS!=='undefined'&&DIVS.items)||[]).forEach(x=>{
    const p=held.find(q=>q.symbol===x.sym);if(!p||x.pay<today||x.pay>end)return;
    const r=fxRate(x.ccy),gross=x.amount*p.qty,eurGross=r?gross/r:null;
    items.push({state:'announced',p,name:p.name,pay:x.pay,ex:x.ex,per:x.amount,ccy:x.ccy,qty:p.qty,gross,eurGross,net:eurGross!=null?eurGross*(1-TAX):null,label:x.label,src:x.src});
  });
  // 2. Geschätzt aus den Umsätzen
  if(m)m.secs.filter(s=>s.held&&s.pos).forEach(s=>{
    const p=s.pos,qty=p.qty!=null?p.qty:s.shares;
    d.tx.filter(t=>t.type==='div'&&t.sk===s.sk&&t.date>start&&t.date<=today).forEach(t=>{
      const pay=isoYears(t.date,1);if(pay<=today||pay>end)return;
      if(items.some(i=>i.p===p&&i.state==='announced'&&Math.abs(daysBetween(i.pay,pay))<=20))return;
      const net=t.shares&&qty?t.value/t.shares*qty:t.value;
      items.push({state:'estimated',p,name:p.name,pay,ex:null,net,qty,basis:t});
    });
  });
  items.sort((a,b)=>a.pay<b.pay?-1:a.pay>b.pay?1:a.name.localeCompare(b.name));
  // 3. Erhalten
  const got=m?d.tx.filter(t=>t.type==='div'&&t.date>start&&t.date<=today).map(t=>{const s=m.secs.find(x=>x.sk===t.sk);
    return {state:'paid',name:s&&s.pos?s.pos.name:(s&&s.name)||t.name||'Unbekanntes Wertpapier',pay:t.date,net:t.value,qty:t.shares,t}}).sort((a,b)=>a.pay<b.pay?1:a.pay>b.pay?-1:0):[];
  const sum=l=>l.reduce((a,x)=>a+(x.net||0),0);
  const months=[];for(let i=0;i<12;i++){const dt=new Date();dt.setDate(1);dt.setMonth(dt.getMonth()+i);const k=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
    months.push({k,label:MONAT[dt.getMonth()],v:sum(items.filter(x=>x.pay.slice(0,7)===k))})}
  return {items,got,months,hasTx:!!m,total:sum(items),totalGot:sum(got),noEur:items.filter(x=>x.net==null).length,
    nAnn:items.filter(x=>x.state==='announced').length,nEst:items.filter(x=>x.state==='estimated').length,today};
}

function kalRow(x){
  const tag=x.state==='announced'?'<span class="tag pos">angekündigt</span>':x.state==='estimated'?'<span class="tag warn">geschätzt</span>':'<span class="tag neutral">erhalten</span>';
  const amt=x.net!=null?eur(x.net,2):`${num(x.gross,2)} ${ccySym(x.ccy)}`;
  let det='';
  if(x.state==='announced')det=`<dl class="kv"><dt>Ex-Tag</dt><dd class="num">${isoToDe(x.ex)}</dd><dt>Zahltag</dt><dd class="num">${isoToDe(x.pay)}</dd>
    <dt>Je Aktie</dt><dd class="num">${num(x.per,3)} ${ccySym(x.ccy)}</dd><dt>Stück</dt><dd class="num">${num(x.qty,x.qty%1?4:0)}</dd>
    <dt>Brutto</dt><dd class="num">${num(x.gross,2)} ${ccySym(x.ccy)}${x.eurGross!=null&&x.ccy!=='EUR'?` ≈ ${eur(x.eurGross,2)}`:''}</dd>
    <dt>Netto</dt><dd class="num">${x.net!=null?'≈ '+eur(x.net,2):'Devisenkurs fehlt'}</dd></dl>
    <p class="hint">${esc(x.label)}. Netto nach 26,375 % Steuer, ohne Kirchensteuer und Sparerpauschbetrag${x.ccy!=='EUR'?', zum heutigen Devisenkurs':''}.</p>${srcLink(x.src)}`;
  else if(x.state==='estimated')det=`<dl class="kv"><dt>Zahltag</dt><dd>um den ${isoToDe(x.pay)}</dd><dt>Ex-Tag</dt><dd>noch nicht bekannt</dd>
    <dt>Grundlage</dt><dd>Buchung vom ${isoToDe(x.basis.date)}: ${eur(x.basis.value,2)} netto${x.basis.shares?` für ${num(x.basis.shares,x.basis.shares%1?4:0)} Stück`:''}</dd>
    <dt>Hochgerechnet</dt><dd>${x.basis.shares?`auf ${num(x.qty,x.qty%1?4:0)} Stück heute`:'ohne Stückzahl, Betrag wie gebucht'}</dd></dl>
    <p class="hint">Noch nicht angekündigt. Termin und Höhe wie vor einem Jahr; Erhöhungen, Kürzungen und Kursschwankungen der Währung sind nicht eingerechnet.</p>`;
  else det=`<dl class="kv"><dt>Gebucht am</dt><dd class="num">${isoToDe(x.pay)}</dd><dt>Netto</dt><dd class="num">${eur(x.net,2)}</dd>${x.t.taxes?`<dt>Steuern</dt><dd class="num">${eur(x.t.taxes,2)}</dd>`:''}${x.qty?`<dt>Stück</dt><dd class="num">${num(x.qty,x.qty%1?4:0)}</dd>`:''}</dl><p class="hint">Aus deinen Umsätzen.</p>`;
  return `<details class="card krow ${x.state==='estimated'?'est':''}"><summary><span class="kav" aria-hidden="true">${esc(initials(x.name))}</span>
    <span class="col" style="min-width:0"><span class="kn">${esc(x.name)}</span><span class="small muted2">${isoLong(x.pay)}</span></span>
    <span class="kamt"><span class="num strong">${amt}</span>${tag}</span></summary><div class="kdet">${det}</div></details>`;
}

function vKalender(){
  const d=D(),K=kalModel(d),up=KAL.tab==='kommend',list=up?K.items:K.got;
  const max=Math.max(1,...K.months.map(x=>x.v)),now=K.today.slice(0,7);
  const groups=[];list.forEach(x=>{const k=x.pay.slice(0,7);let g=groups[groups.length-1];if(!g||g.k!==k){g={k,items:[]};groups.push(g)}g.items.push(x)});
  const head=`<div class="row" style="gap:6px"><a href="#heute" class="icon-btn" aria-label="Zurück">${ICON.back}</a><h1 class="h1" style="font-size:26px">Dividendenkalender</h1></div>
   ${d.kind==='demo'?'<span class="chip-demo" style="align-self:flex-start">Musterdepot und Musterumsätze</span>':''}`;
  const sum=`<section class="dark col" style="gap:10px">
    <div class="row between"><span class="lbl">${up?'Nächste 12 Monate':'Letzte 12 Monate'}</span><span class="small muted-night">netto</span></div>
    <span class="big" style="font-size:32px">${up?'rund ':''}${eur(up?K.total:K.totalGot)}</span>
    <span class="small muted-night">${up?`${K.nAnn} angekündigt, ${K.nEst} geschätzt${K.noEur?` · ${K.noEur} ohne Euro-Wert`:''} · im Monat Ø ${eur(K.total/12)}`:`${K.got.length} Buchungen aus deinen Umsätzen`}</span>
    ${up?`<div class="kbars" role="group" aria-label="Dividenden je Monat">${K.months.map(x=>`<button type="button" data-kmonth="${x.k}" class="${x.k===now?'now':''}" aria-label="${x.label}: ${eur(x.v)}"><span class="kv0">${x.v>=1?num(x.v,0):''}</span><i style="height:${Math.max(2,x.v/max*58)}px"></i><span>${x.label.slice(0,3)}</span></button>`).join('')}</div>`:''}
  </section>`;
  const seg=`<div class="seg" role="group" aria-label="Ansicht"><button type="button" data-ktab="kommend" aria-pressed="${up}">Kommend</button><button type="button" data-ktab="erhalten" aria-pressed="${!up}">Erhalten</button></div>`;
  let body;
  if(!list.length)body=up?`<div class="empty">Für deine Positionen ist in den nächsten 12 Monaten noch keine Zahlung angekündigt.${K.hasTx?' In deinen Umsätzen der letzten 12 Monate stehen keine Dividenden, aus denen sich etwas schätzen ließe.':' Mit deinen Umsätzen schätzt Depotfokus die kommenden Zahlungen aus den letzten 12 Monaten.'}</div>${K.hasTx?'':'<a class="btn" href="#daten">Umsätze importieren</a>'}`
    :`<div class="empty">${K.hasTx?'In den letzten 12 Monaten ist keine Dividende gebucht.':'Erhaltene Dividenden stehen in deinen Umsätzen. Importiere sie aus Portfolio Performance.'}</div>${K.hasTx?'':'<a class="btn" href="#daten">Umsätze importieren</a>'}`;
  else body=groups.map(g=>{const [y,mo]=g.k.split('-');const s=g.items.reduce((a,x)=>a+(x.net||0),0);
    return `<h2 class="kmon" id="km-${g.k}"><span>${MONAT[+mo-1]} ${y}</span><span class="num">${eur(s,2)}</span></h2>${g.items.map(kalRow).join('')}`}).join('');
  const foot=up?`<p class="hint">Angekündigt heißt: vom Unternehmen erklärt, mit Quelle. Geschätzt heißt: gleicher Termin und gleiche Höhe wie die Buchung vor einem Jahr, auf deinen heutigen Bestand hochgerechnet. ${K.hasTx?'':'Ohne Umsätze gibt es keine Schätzungen. '}Keine Anlageberatung.</p>`:'<p class="hint">Beträge netto, wie in Portfolio Performance gebucht.</p>';
  return head+sum+seg+(up&&!K.hasTx&&list.length?'<a class="banner info" href="#daten"><b>Nur angekündigte Zahlungen</b><span>Importiere deine Umsätze, dann schätzt Depotfokus auch die übrigen Termine.</span></a>':'')+body+foot;
}

/* Kachel für Heute und Depot */
function kalTeaser(d){try{const K=kalModel(d),n=K.items[0];if(!n&&!K.hasTx)return '';
  const max=Math.max(1,...K.months.map(x=>x.v));
  const spark=`<svg class="zspark" viewBox="0 0 60 36" aria-hidden="true">${K.months.map((x,i)=>{const h=Math.max(1.5,x.v/max*30);return `<rect x="${i*5}" y="${34-h}" width="3.4" height="${h}" rx="1" fill="${i===0?'var(--accent)':'var(--pos)'}"/>`}).join('')}</svg>`;
  return `<a class="card zteaser" href="#kalender"><span class="col" style="gap:2px;min-width:0"><span class="lbl">Dividendenkalender</span>
    <span class="strong">${n?`Nächste: ${esc(short(n.name))} am ${isoShort(n.pay)}`:'Keine Zahlung in Sicht'}</span>
    <span class="small muted2">${n?`${n.net!=null?(n.state==='estimated'?'rund ':'≈ ')+eur(n.net,2):num(n.gross,2)+' '+ccySym(n.ccy)}, ${n.state==='announced'?'angekündigt':'geschätzt'} · `:''}12 Monate rund ${eur(K.total)}</span></span>${spark}</a>`}catch(e){console.error(e);return ''}}
