/* =========================================================
   UMSÄTZE: Import aus Portfolio Performance, Einstand, Rendite
   ========================================================= */
const TXT=[
 ['buy',/^(kauf|buy)$/i],['sell',/^(verkauf|sell)$/i],
 ['in',/^(einlieferung|delivery \(inbound\)|inbound delivery)$/i],['out',/^(auslieferung|delivery \(outbound\)|outbound delivery)$/i],
 ['div',/^(dividende|dividend|dividends|ausschüttung|ertrag)$/i],['int',/^(zinsen|interest)$/i],
 ['dep',/^(einlage|deposit)$/i],['wd',/^(entnahme|removal|withdrawal)$/i],
 ['fee',/^(gebühren|fees|gebühr)$/i],['feeref',/^(gebührenerstattung|fees refund)$/i],
 ['tax',/^(steuern|taxes)$/i],['taxref',/^(steuerrückerstattung|tax refund)$/i],
 ['intchg',/^(zinsbelastung|interest charge)$/i],['xfer',/^(umbuchung|transfer|transfer \(inbound\)|transfer \(outbound\))$/i]];
const TXN={buy:'Kauf',sell:'Verkauf',in:'Einlieferung',out:'Auslieferung',div:'Dividende',int:'Zinsen',dep:'Einlage',wd:'Entnahme',fee:'Gebühren',feeref:'Gebührenerstattung',tax:'Steuern',taxref:'Steuererstattung',intchg:'Zinsbelastung',xfer:'Umbuchung'};
const SECT=['buy','sell','in','out','div'];
const normName=s=>String(s||'').toLowerCase().replace(/\(.*?\)/g,' ').replace(/\b(inc|corp|corporation|plc|ag|se|sa|nv|co|ltd|the|class|cl|reg|registered|shares?|aktie[n]?)\b\.?/g,' ').replace(/[^a-z0-9äöüß]+/g,' ').trim();
function parseDate(s){s=String(s||'').trim();let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return `${m[1]}-${m[2]}-${m[3]}`;
  m=s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);if(m){const y=m[3].length===2?'20'+m[3]:m[3];return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`}return null}
const isoToDe=s=>s?s.split('-').reverse().join('.'):'';
const todayISO=()=>new Date().toISOString().slice(0,10);
const daysBetween=(a,b)=>(Date.parse(b)-Date.parse(a))/864e5;
const secKey=t=>t.isin||t.symbol||('n:'+normName(t.name));

function analyzeTx(nonEmpty,d,head,fileName){
  const st={fileName,error:null,cols:{},tx:[],skipped:[],kind:'transactions',dupes:0,counts:{},from:null,to:null};
  const low=head.map(x=>x.toLowerCase().trim());const col=re=>low.findIndex(x=>re.test(x));
  const ci={date:col(/^datum|^date/),type:col(/^typ|^type/),
    value:[/^wert$/,/^value$/,/^gesamtpreis$/,/^betrag$/,/^amount$/].map(col).find(i=>i>=0)??-1,
    shares:col(/^stück|^shares|^anzahl/),fees:col(/^gebühren|^fees/),taxes:col(/^steuern|^taxes/),
    isin:col(/isin/),symbol:col(/ticker|symbol/),name:col(/wertpapiername|^wertpapier$|security name|^security$/),
    ccy:col(/buchungswährung|transaction currency|^währung$|^currency$/)};
  const L={date:'Datum',type:'Typ',value:'Wert',shares:'Stück',fees:'Gebühren',taxes:'Steuern',isin:'ISIN',symbol:'Symbol',name:'Wertpapier',ccy:'Währung'};
  Object.entries(ci).forEach(([k,i])=>{if(i>=0)st.cols[L[k]]=head[i]});
  if(ci.value<0){st.error='Spalte „Wert“ (oder „Betrag“) nicht gefunden. Erwartet wird ein Umsatz-Export aus Portfolio Performance.';return st}
  const seen=new Map();
  nonEmpty.slice(1).forEach(({l,i})=>{
    const r=splitL(l,d);const g=k=>ci[k]>=0?(r[ci[k]]||'').trim():'';
    const date=parseDate(g('date'));if(!date){st.skipped.push({line:i,reason:'Datum nicht lesbar'});return}
    const rawT=g('type');const ty=(TXT.find(([,re])=>re.test(rawT))||[])[0];
    if(!ty){st.skipped.push({line:i,reason:`Typ „${rawT||'leer'}“ wird nicht ausgewertet`});return}
    if(ty==='xfer'){st.skipped.push({line:i,reason:'Umbuchung zwischen Konten, für die Auswertung ohne Bedeutung'});return}
    const ccy=g('ccy').toUpperCase();if(ccy&&ccy!=='EUR'){st.skipped.push({line:i,reason:`Buchungswährung ${ccy}: bisher nur Euro-Konten`});return}
    const v=Math.abs(parseNum(g('value')));if(!Number.isFinite(v)){st.skipped.push({line:i,reason:'Wert nicht lesbar'});return}
    const sh=Math.abs(parseNum(g('shares')));const t={date,type:ty,value:Math.round(v*100)/100,shares:Number.isFinite(sh)&&sh>0?sh:null,
      fees:Math.abs(parseNum(g('fees')))||0,taxes:Math.abs(parseNum(g('taxes')))||0,isin:g('isin')||null,symbol:g('symbol')||null,name:g('name')||null,line:i};
    if(SECT.includes(ty)&&!t.isin&&!t.symbol&&!t.name){st.skipped.push({line:i,reason:`${TXN[ty]} ohne Wertpapier`});return}
    if(['buy','sell','in','out'].includes(ty)&&!t.shares){st.skipped.push({line:i,reason:`${TXN[ty]} ohne Stückzahl (vermutlich Kontobuchung; die Depotbuchung zählt)`});return}
    t.sk=SECT.includes(ty)?secKey(t):null;
    const key=[date,ty,t.sk||'',t.value.toFixed(2)].join('|');
    if(seen.has(key)){st.dupes++;const o=seen.get(key);if(!o.shares&&t.shares)Object.assign(o,t);return}
    seen.set(key,t);st.tx.push(t);
  });
  st.tx.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:a.line-b.line);
  st.tx.forEach(t=>st.counts[t.type]=(st.counts[t.type]||0)+1);
  if(st.tx.length){st.from=st.tx[0].date;st.to=st.tx[st.tx.length-1].date}
  else st.error='Keine auswertbaren Umsätze gefunden.';
  return st;
}
/* Mehrere Umsatzdateien (Depot- und Kontoumsätze) zusammenführen, doppelte Buchungen nur einmal */
function mergeTx(a,b){
  if(!a)return b;if(!b||b.error)return a;
  const out={...a,fileName:a.fileName+', '+b.fileName,skipped:a.skipped.concat(b.skipped.map(s=>({...s,file:b.fileName}))),dupes:a.dupes+b.dupes,counts:{}};
  const m=new Map(a.tx.map(t=>[[t.date,t.type,t.sk||'',t.value.toFixed(2)].join('|'),t]));
  b.tx.forEach(t=>{const k=[t.date,t.type,t.sk||'',t.value.toFixed(2)].join('|');if(m.has(k)){out.dupes++;const o=m.get(k);if(!o.shares&&t.shares)m.set(k,t)}else m.set(k,t)});
  out.tx=[...m.values()].sort((x,y)=>x.date<y.date?-1:x.date>y.date?1:0);
  out.tx.forEach(t=>out.counts[t.type]=(out.counts[t.type]||0)+1);out.from=out.tx[0]?.date||null;out.to=out.tx[out.tx.length-1]?.date||null;
  return out;
}
function matchPos(d,s){return d.positions.find(p=>(s.isin&&p.isin&&p.isin===s.isin)||(s.symbol&&p.symbol&&p.symbol.toUpperCase()===s.symbol.toUpperCase()))
  ||d.positions.find(p=>s.name&&normName(p.name)&&normName(p.name)===normName(s.name))||null}

/* Interner Zinsfuß (Geldgewichtete Rendite p. a.) per Bisektion */
function xirr(flows){
  if(flows.length<2)return null;const t0=flows[0][0];
  const f=r=>flows.reduce((a,[d,c])=>a+c/Math.pow(1+r,daysBetween(t0,d)/365),0);
  let lo=-0.99,hi=10,flo=f(lo),fhi=f(hi);if(!Number.isFinite(flo)||!Number.isFinite(fhi)||flo*fhi>0)return null;
  for(let i=0;i<200;i++){const mid=(lo+hi)/2,fm=f(mid);if(Math.abs(fm)<1e-7)return mid;if(fm*flo<0){hi=mid}else{lo=mid;flo=fm}}
  return (lo+hi)/2;
}

let _txc={k:null,v:null};
function txModel(d,nocache){
  if(!d||!d.tx||!d.tx.length)return null;
  const ck=d.kind+'|'+d.tx.length+'|'+d.positions.map(p=>p.id+':'+posValue(p)).join(',')+'|'+(d.txMeta&&d.txMeta.importedAt);
  if(!nocache&&_txc.k===ck)return _txc.v;
  const today=todayISO(),y1=new Date(Date.now()-365*864e5).toISOString().slice(0,10);
  const S={},M={dep:0,wd:0,fees:0,taxes:0,int:0,div:0,div12:0,first:d.tx[0].date,last:d.tx[d.tx.length-1].date};
  for(const t of d.tx){
    if(t.type==='dep')M.dep+=t.value;else if(t.type==='wd')M.wd+=t.value;
    else if(t.type==='fee'||t.type==='intchg')M.fees+=t.value;else if(t.type==='feeref')M.fees-=t.value;
    else if(t.type==='tax')M.taxes+=t.value;else if(t.type==='taxref')M.taxes-=t.value;else if(t.type==='int')M.int+=t.value;
    if(!t.sk)continue;
    const s=S[t.sk]||(S[t.sk]={sk:t.sk,name:t.name,isin:t.isin,symbol:t.symbol,lots:[],shares:0,cost:0,realized:0,div:0,div12:0,buys:0,sells:0,flows:[],first:t.date,unknownCost:false,oversold:false,fees:0,taxes:0});
    if(t.name&&!s.name)s.name=t.name;s.fees+=t.fees||0;s.taxes+=t.taxes||0;
    if(t.type==='buy'||t.type==='in'){const c=t.value;if(!(c>0))s.unknownCost=true;s.lots.push({sh:t.shares,c,date:t.date});s.shares+=t.shares;s.cost+=c;s.buys+=c;s.flows.push([t.date,-c])}
    else if(t.type==='sell'||t.type==='out'){let rem=t.shares,cs=0;
      while(rem>1e-9&&s.lots.length){const lot=s.lots[0],take=Math.min(rem,lot.sh),part=lot.sh>0?lot.c*take/lot.sh:0;cs+=part;lot.sh-=take;lot.c-=part;rem-=take;if(lot.sh<1e-9)s.lots.shift()}
      if(rem>1e-6)s.oversold=true;s.shares=Math.max(0,s.shares-t.shares);s.cost=Math.max(0,s.cost-cs);
      const pr=t.type==='sell'?t.value:(t.value>0?t.value:cs);if(t.type==='out'&&!(t.value>0))s.unknownCost=true;
      s.realized+=pr-cs;s.sells+=pr;s.flows.push([t.date,pr])}
    else if(t.type==='div'){s.div+=t.value;M.div+=t.value;if(t.date>=y1){s.div12+=t.value;M.div12+=t.value}s.flows.push([t.date,t.value])}
  }
  const secs=Object.values(S);const used=new Set();
  secs.sort((x,y)=>(y.shares>0)-(x.shares>0));
  secs.forEach(s=>{if(s.shares<1e-6)s.shares=0;s.held=s.shares>0;s.pos=matchPos(d,s);if(s.held){if(s.pos&&used.has(s.pos.id))s.pos=null;if(s.pos)used.add(s.pos.id)}
    s.value=s.held&&s.pos?posValue(s.pos):null;
    s.mismatch=!!(s.held&&s.pos&&s.pos.qty!=null&&Math.abs(s.shares-s.pos.qty)>1e-4);
    s.missingPos=s.held&&!s.pos;s.soldOut=!s.held;
    s.avg=s.held&&s.shares?s.cost/s.shares:null;
    s.ok=!s.unknownCost&&!s.oversold&&!s.mismatch&&!s.missingPos&&(!s.held||s.value!=null);
    s.unreal=s.held&&s.value!=null?s.value-s.cost:null;
    s.result=s.ok?(s.held?s.value:0)+s.sells+s.div-s.buys:null;
    s.irr=s.ok&&daysBetween(s.first,today)>=365?xirr(s.flows.concat(s.held?[[today,s.value]]:[])):null;
  });
  const posNoTx=d.positions.filter(p=>isIncluded(p)&&!secs.some(s=>s.pos===p&&s.held));
  const okS=secs.filter(s=>s.ok);
  const flows=okS.flatMap(s=>s.flows.concat(s.held?[[today,s.value]]:[])).sort((a,b)=>a[0]<b[0]?-1:1);
  const span=flows.length?daysBetween(flows[0][0],today):0;
  const buys=okS.reduce((a,s)=>a+s.buys,0),result=okS.reduce((a,s)=>a+s.result,0);
  const v={secs,M,posNoTx,okCount:okS.length,heldOk:okS.filter(s=>s.held).length,heldAll:secs.filter(s=>s.held).length,
    buys,result,simple:buys?result/buys:null,irr:span>=365?xirr(flows):null,span,since:flows.length?flows[0][0]:null,
    issues:secs.filter(s=>!s.ok&&(s.held||s.oversold||s.unknownCost)),unrealized:okS.filter(s=>s.held).reduce((a,s)=>a+s.unreal,0),realized:okS.reduce((a,s)=>a+s.realized,0)};
  if(!nocache)_txc={k:ck,v};return v;
}
const secFor=(d,p)=>{const m=txModel(d);return m?m.secs.find(s=>s.pos===p&&s.held)||null:null};
const sgn=(v,d=0)=>(v>0?'+':v<0?'−':'')+eur(Math.abs(v),d);
const spct=(v,d=1)=>(v>0?'+':v<0?'−':'')+pct(Math.abs(v),d);

/* Steuerschätzung bei Verkauf der ganzen Position (FIFO, vereinfacht) */
function taxEstimate(p,s){
  if(!s||!s.ok||s.unreal==null)return null;
  const eqFund=p.fund===true&&p.bucket&&BN[p.bucket]&&BN[p.bucket].eq;
  const tf=eqFund?0.3:0,taxable=s.unreal*(1-tf);
  return {gain:s.unreal,tf,taxable,tax:Math.max(0,taxable)*TAX};
}

/* =========================================================
   TAGESKURSE (prices.json, beim Veröffentlichen abgerufen)
   ========================================================= */
let PRICES=null;
function quoteFor(p){
  if(!PRICES||!PRICES.quotes||!p.symbol)return null;const q=PRICES.quotes[p.symbol];if(!q||!(q.p>0))return null;
  if(q.t&&daysBetween(q.t.slice(0,10),todayISO())>10)return null;
  let ccy=q.ccy,px=q.p;if(ccy==='GBp'||ccy==='GBX'){px/=100;ccy='GBP'}
  let eurPx;if(ccy==='EUR')eurPx=px;else{const r=PRICES.fx&&PRICES.fx[ccy];if(!(r>0))return null;eurPx=px/r}
  return {eurPx,px,ccy,t:q.t,src:q.src||PRICES.source||'Kursdienst',alt:q.alt||null};
}
function liveValue(p){if(UI.live===false||p.qty==null)return null;const q=quoteFor(p);return q?p.qty*q.eurPx:null}
function priceInfo(d){const inc=d.positions.filter(p=>p.conf!=='skip');const live=inc.filter(p=>liveValue(p)!=null);
  return {n:live.length,of:inc.length,asOf:PRICES&&PRICES.asOf,on:UI.live!==false,avail:!!(PRICES&&PRICES.quotes&&Object.keys(PRICES.quotes).length)}}
function loadPrices(){
  if(typeof fetch!=='function')return;
  fetch('prices.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(j=>{
    if(!j||!j.quotes)return;PRICES=j;_txc.k=null;evaluateChanges(DEMO,true);if(OWN)evaluateChanges(OWN);persist();rerender()}).catch(()=>{});
}
