/* =========================================================
   TÄGLICHE STATUSMELDUNGEN (Kreise oben auf der Übersicht, wie bei WhatsApp)
   Je Position kommen vor die feste Einordnung bis zu vier Tagesmeldungen:
   1. Kurs heute (prices.json)          2. Dividenden-Termin in den nächsten 7 Tagen (Kalender)
   3. Nachricht mit Bezug (data/news)   4. Wissenshappen des Tages (Steckbrief, Fakten, Regeln; wechselt täglich)
   Dazu ein erster Kreis „Heute“ mit Depot, Nachrichten, Terminen und Szenarien.
   Alles wird im Browser berechnet; nichts verlässt das Gerät.
   ========================================================= */
const HEUTE_ID='heute';
const dayNo=()=>Math.floor(Date.parse(todayISO()+'T12:00:00Z')/864e5);
const strHash=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)};
let _kalDay={k:null,v:null};
function kalToday(){const d=D(),k=todayISO()+'|'+(PRICES&&PRICES.asOf)+'|'+(AUTODIV&&AUTODIV.asOf)+'|'+d.kind+'|'+d.positions.length+'|'+(UI.kalMode||'');
  if(_kalDay.k!==k){try{_kalDay={k,v:kalModel(d)}}catch(e){_kalDay={k,v:null}}}return _kalDay.v}
const inDays=iso=>daysBetween(todayISO(),iso);
const whenTxt=iso=>{const n=inDays(iso);return n===0?'heute':n===1?'morgen':n===-1?'gestern':n<0?`am ${isoLong(iso)}`:`am ${isoLong(iso)}`};

/* 1. Kurs heute */
function slidePrice(p){const c=dayChange(p),q=PRICES&&PRICES.quotes&&PRICES.quotes[p.symbol];if(!c||!q)return null;
  const day=q.t?q.t.slice(0,10):null,today=day===todayISO();
  return {lbl:today?'Kurs heute':`Kurs am letzten Handelstag (${deDate(day)})`,kind:'day',tag:'Kurs',price:true,
    t:`${short(p.name)} ${today?'heute':'zuletzt'} ${spct(c.rel,1)}`,
    sub:`Dein Anteil ${sgn(c.abs)} gegenüber dem Vortagesschluss. Kurs ${num(q.p,2)} ${q.ccy==='EUR'?'€':esc(q.ccy)} um ${q.t?new Date(q.t).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}):'–'} Uhr. Tagesschwankungen sagen wenig über die Firma aus.`,
    srcTxt:`${q.src||PRICES.source||'Kursdienst'}, verzögert, ohne Gewähr`}}
/* 2. Dividenden-Termin: Zahltag oder Ex-Tag in den nächsten 7 Tagen */
function slideDividend(p){const K=kalToday();if(!K)return null;
  const x=K.items.find(i=>i.p===p&&inDays(i.pay)>=0&&inDays(i.pay)<=7)||K.items.find(i=>i.p===p&&i.ex&&inDays(i.ex)>=0&&inDays(i.ex)<=7);if(!x)return null;
  const v=kv(x),amt=v!=null?`${x.state==='estimated'?'rund ':'≈ '}${eur(v,2)} ${kalBrutto()?'brutto':'netto'}`:`${num(x.gross,2)} ${ccySym(x.ccy)} brutto`;
  const exSoon=x.ex&&inDays(x.ex)>=0&&inDays(x.ex)<=7&&!(inDays(x.pay)>=0&&inDays(x.pay)<=7);
  return {lbl:'Dividende',kind:'day',tag:x.state==='announced'?'angekündigt':'geschätzt',
    t:exSoon?`Ex-Tag ${whenTxt(x.ex)}: ${num(x.per,4)} ${ccySym(x.ccy)} je Aktie`:`Zahltag ${whenTxt(x.pay)}: ${amt}`,
    sub:exSoon?`Wer die Aktie vor dem Ex-Tag hält, bekommt die Zahlung am ${isoToDe(x.pay)}. Für deinen Bestand: ${amt}.`:`${x.state==='announced'?'Vom Unternehmen erklärt':'Geschätzt nach dem Muster des Vorjahres'}${x.qty?`, für ${num(x.qty,x.qty%1?4:0)} Stück`:''}.`,
    link:{href:'#kalender',label:'Zum Dividendenkalender'}}}
/* 3. Nachricht mit Bezug */
const newsRecent=()=>{if(typeof NEWS==='undefined'||!NEWS)return [];return newsToday().items.filter(a=>newsAge(a)<=3)};
const newsWhen=a=>newsAge(a)===0?'':` · vom ${deDate(a.published_at)}`;
function slideNews(p){const a=newsRecent().find(x=>newsMatch(x,[p]).length);if(!a)return null;
  return {lbl:'Nachricht mit Bezug'+newsWhen(a),kind:'day',tag:'Nachricht',fresh:true,t:a.title,
    sub:`${a.kurzfassung||''} Betrifft die Branche ${esc((a.sectors||[]).filter(s=>(NEWS_SECTORS[p.symbol]||[]).includes(s)).join(', ')||'dieser Position')}; ob und wie stark die Firma selbst betroffen ist, belegt die Meldung nicht.`.trim(),
    srcTxt:`${a.source.name}, ${deDate(a.published_at)}`,link:{href:'#nachricht/'+encodeURIComponent(a.id),label:'Ganze Nachricht lesen'}}}
/* 4. Wissenshappen: täglich wechselnd, jede Aussage aus Steckbrief oder geprüften Fakten */
function knowledgePool(p){const W=typeof WORLD!=='undefined'&&WORLD.companies&&WORLD.companies[p.symbol],I=INFO[p.symbol],pool=[];
  if(W){const ccy=W.currency==='USD'?'$':W.currency==='EUR'?'€':W.currency||'';
    if(W.kid_description_de)pool.push({t:W.kid_description_de,sub:W.examples_de&&W.examples_de.length?`Bekannt sind zum Beispiel ${W.examples_de.slice(0,4).join(', ')}.`:''});
    if(W.everyday_metric)pool.push({t:`${W.everyday_metric.lower?'Mehr als ':''}${num(W.everyday_metric.total,0)} ${W.everyday_metric.unit_de} ${W.everyday_metric.period||''}`.trim(),sub:'So groß ist das Geschäft im Alltag.'});
    if(W.revenue>0&&W.net_income!=null)pool.push({t:`Von 100 ${ccy} Umsatz bleiben ${num(W.net_income/W.revenue*100,1)} ${ccy} Gewinn`,sub:`Gerechnet aus Umsatz und Gewinn im ${W.fiscal_year||'letzten Geschäftsjahr'}. Gewinnmarge heißt: der Anteil des Umsatzes, der als Gewinn übrig bleibt.`});
    (W.trends||[]).forEach(tr=>pool.push({t:`Trend: ${tr.trend_de}`,sub:tr.why_de,tag:{rueckenwind:'Rückenwind',gegenwind:'Gegenwind',gemischt:'gemischt'}[tr.direction]||'Trend',url:tr.source}));
    (W.esg||[]).forEach(e=>pool.push({t:e.fact_de,sub:'Umwelt, Soziales, Führung',url:e.source}))}
  if(I&&!I.etf){(I.facts||[]).forEach(f=>pool.push({t:f.t,srcKey:f.src}));(I.rules||[]).filter(r=>r.status!=='np').forEach(r=>pool.push({t:`Worauf wir achten: ${r.q}`,sub:`${r.metric}: ${r.cond}${r.obs?` · zuletzt ${r.obs}`:''}`,srcKey:r.src}))}
  if(I&&I.etf){const e=I.etf;pool.push({t:`${e.name} bildet den ${e.index} ab`,sub:`Laufende Kosten ${e.ter}. ${e.conc||''}`.trim(),srcKey:e.src})}
  return pool}
function slideKnowledge(p){const pool=knowledgePool(p);if(!pool.length)return null;const k=pool[(dayNo()+strHash(p.symbol))%pool.length];
  return {lbl:'Wissenshappen des Tages',kind:'day',tag:k.tag||'Wissen',t:k.t,sub:k.sub||'',src:k.srcKey&&S[k.srcKey]?k.srcKey:null,url:k.url||null}}
function dailySlides(p){return [slidePrice(p),slideDividend(p),slideNews(p),slideKnowledge(p)].filter(Boolean)}

/* Kreis „Heute“ */
function heuteSlides(){const d=D(),sl=[],T=typeof NEWS!=='undefined'&&NEWS?newsToday():{items:[]};
  const dt=dayTotal(d),tt=totals(d);
  sl.push({lbl:new Date().toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'}),kind:'day',tag:'Dein Depot',price:true,
    t:dt?`Dein Depot ${PRICES&&PRICES.asOf&&PRICES.asOf.slice(0,10)===todayISO()?'heute':'zuletzt'} ${sgn(dt.abs)} (${spct(dt.rel,2)})`:`Dein Vermögen: ${eur(tt.sum)}`,
    sub:dt?`${dt.n} Positionen mit Tageskurs. Vermögen ${eur(tt.sum)}.`:'Tageskurse sind gerade nicht verfügbar.',srcTxt:PRICES&&PRICES.asOf?`Kurse von ${fmtAsOf(PRICES.asOf)}`:null});
  const R=newsRecent();
  if(R.length)R.slice(0,3).forEach(a=>sl.push({lbl:'Wirtschaft'+(newsAge(a)===0?' heute':newsWhen(a)),kind:'day',tag:(a.categories||[]).map(c=>NEWS_CAT[c])[0]||'Nachricht',fresh:true,t:a.title,sub:a.kurzfassung||'',srcTxt:`${a.source.name}, ${deDate(a.published_at)}`,link:{href:'#nachricht/'+encodeURIComponent(a.id),label:'Ganze Nachricht lesen'}}));
  else if(typeof NEWS!=='undefined'&&NEWS&&NEWS.latest)sl.push({lbl:'Wirtschaft',kind:'day',tag:'Nachrichten',t:T.none&&NEWS.latest.date===todayISO()?'Heute keine neue relevante Entwicklung':'Noch keine neuen Nachrichten',sub:T.none&&NEWS.latest.date===todayISO()?'Die geprüften amtlichen Quellen haben nichts Wesentliches veröffentlicht.':`Die Tagesauswahl kommt im Lauf des Vormittags. Letzte Auswahl vom ${deDate(NEWS.latest.date)}.`,link:{href:'#nachrichten',label:'Zu den Nachrichten'}});
  const K=kalToday();if(K){const wk=K.items.filter(i=>inDays(i.pay)>=0&&inDays(i.pay)<=7);if(wk.length){const s=wk.reduce((a,x)=>a+(kv(x)||0),0);
    sl.push({lbl:'Dividenden diese Woche',kind:'day',tag:'Dividende',t:`${wk.length} ${wk.length>1?'Zahlungen':'Zahlung'}, rund ${eur(s,2)} ${kalBrutto()?'brutto':'netto'}`,sub:wk.slice(0,4).map(x=>`${short(x.name)} ${isoShort(x.pay)}`).join(' · '),link:{href:'#kalender',label:'Zum Dividendenkalender'}})}}
  if(typeof SCEN!=='undefined'&&SCEN&&SCEN.latest){const L=SCEN.latest,age=daysBetween(L.generated_at.slice(0,10),todayISO());if(age<=7){const ch=['A','B','C'].filter(k=>L.change_pp[k]);
    sl.push({lbl:`Szenarien ${weekLbl(L.week_id)}`,kind:'day',tag:'Modellschätzung',t:`A ${L.display.A} % · B ${L.display.B} % · C ${L.display.C} %`,sub:ch.length?L.summary:'Unverändert gegenüber dem letzten Stand.',link:{href:'#szenarien',label:'Zu den Szenarien'}})}}
  return sl}

/* Schlüssel für „gesehen“: je Tag und Inhalt; Kursänderungen im Tagesverlauf machen einen Kreis nicht wieder neu */
const dailyKey=sl=>todayISO()+'#'+strHash(sl.filter(s=>!s.price).map(s=>s.t).join('|')).toString(36);
