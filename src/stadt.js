/* =========================================================
   DEPOT-STADT: jede Position ein Gebäude. Höhe = Wert, leuchtende Fenster = Dividende,
   Sonne/Wolke = Rückenwind/Gegenwind aus belegten Trends. Mit dem Zeitregler wächst die Stadt.
   Steckbrief je Gebäude: Was macht die Firma, was gehört mir, wohin geht mein Geld,
   wohin geht die Welt, macht die Firma es gut, und mein Warum.
   ========================================================= */
const MOTIVE={
  einkommen:{e:'💶',t:'Einkommen',l:'Regelmäßiges Einkommen'},
  wachstum:{e:'🌱',t:'Wachstum',l:'Wachstum über die Jahre'},
  gut:{e:'🌍',t:'Gute Firma',l:'Firmen, die es gut machen'},
  verstehen:{e:'🔍',t:'Verstehen',l:'Verstehen, was ich besitze'},
  sicher:{e:'🛡️',t:'Sicherheit',l:'Ruhe und Sicherheit'}
};
const PROFILE_KEYS=['einkommen','wachstum','gut','verstehen'];
const SCENE_BY_BUCKET={core:'welt',hdy:'welt',ndq:'techpark',single:'buero',bdc:'bank',liq:'schwein',bonds:'tresor'};
const SCENE_NAME={cloud:'Rechenzentrum',tech:'Technik-Turm',karte:'Bezahl-Zentrale',getraenk:'Getränkefabrik',snack:'Snackfabrik',drogerie:'Drogerie',labor:'Labor',bank:'Kreditbank',pflege:'Pflegeheim',laden:'Ladenzeile',welt:'Weltviertel',techpark:'Technikpark',buero:'Bürohaus',schwein:'Sparschwein',tresor:'Tresor'};
const DKK_EUR=7.46; // Krone ist an den Euro gebunden (Leitkurs 7,46038)
const W_=s=>WORLD.companies[s]||null;
function whyOf(d){if(!d.why)d.why={profile:null,pos:{}};d.why.pos=d.why.pos||{};return d.why}
function motivesFor(d,p){const w=whyOf(d);if(w.pos[p.id])return {list:w.pos[p.id],own:true};
  const b=p.bucket;const s=b==='bdc'||b==='hdy'?['einkommen']:b==='core'?['sicher']:b==='ndq'?['wachstum']:b==='liq'||b==='bonds'?['sicher']:['wachstum'];return {list:s,own:false}}
function sceneOf(p){const w=W_(p.symbol);return w&&w.scene||SCENE_BY_BUCKET[p.bucket]||'buero'}
function weatherOf(sym){const w=W_(sym);if(!w||!w.trends||!w.trends.length)return null;let r=0,g=0;w.trends.forEach(t=>{if(t.direction==='rueckenwind')r++;else if(t.direction==='gegenwind')g++});return r>g?'sun':g>r?'rain':'mix'}

/* ---------- Zeichnen ---------- */
const PAL={cloud:['#8EC5FF','#5A9BE6'],tech:['#B9C3D9','#7C88A8'],karte:['#C9B8F2','#8D74D9'],getraenk:['#FF9C8A','#E2584A'],snack:['#FFD07A','#E9A23B'],drogerie:['#9FE0D0','#3FB49A'],labor:['#E8F1FF','#9DB5DA'],bank:['#F2E3C3','#C9A764'],pflege:['#FFC9D6','#E8879F'],laden:['#FFE08A','#E5B53A'],welt:['#A8E6A3','#4DB065'],techpark:['#9AD7F0','#4BA7CC'],buero:['#D7DBE8','#9AA1B8'],schwein:['#FFB3C7','#E9799A'],tresor:['#C5CBD6','#8A93A6']};
function windows(x,y,w,h,cols,rows,lit,seed){let s='',n=cols*rows,k=Math.round(n*lit),r=seed;const on=new Set();
  const order=Array.from({length:n},(_,i)=>i).sort((a,b)=>((a*9301+r*49297)%233)-((b*9301+r*49297)%233));order.slice(0,k).forEach(i=>on.add(i));
  const cw=w/cols,rh=h/rows;for(let i=0;i<n;i++){const c=i%cols,ro=Math.floor(i/cols);s+=`<rect x="${(x+c*cw+cw*0.22).toFixed(1)}" y="${(y+ro*rh+rh*0.22).toFixed(1)}" width="${(cw*0.56).toFixed(1)}" height="${(rh*0.5).toFixed(1)}" rx="1.5" fill="${on.has(i)?'#FFD66B':'rgba(20,23,46,.18)'}"/>`}return s}
function building(scene,w,h,lit,seed){
  const [c1,c2]=PAL[scene]||PAL.buero;const top=-h;let g='';
  const body=(x,wd,ht,col,rx=4)=>`<rect x="${x}" y="${-ht}" width="${wd}" height="${ht}" rx="${rx}" fill="${col}" stroke="#14172E" stroke-width="1.6"/>`;
  const rows=Math.max(1,Math.floor((h-26)/16)),door=`<rect x="${w/2-6}" y="-16" width="12" height="16" rx="2" fill="#14172E" opacity=".8"/>`;
  switch(scene){
    case 'cloud':g=body(4,w-8,h,c1,6)+windows(8,top+8,w-16,h-30,3,rows,lit,seed)+door+`<path d="M${w/2-16} ${top-2} a8 8 0 0 1 8-10 a10 10 0 0 1 18-2 a7 7 0 0 1 6 12 z" fill="#fff" stroke="#14172E" stroke-width="1.4"/>`;break;
    case 'tech':g=body(8,w-16,h,c1,5)+windows(12,top+8,w-24,h-30,2,rows,lit,seed)+door+`<line x1="${w/2}" y1="${top}" x2="${w/2}" y2="${top-14}" stroke="#14172E" stroke-width="2"/><circle cx="${w/2}" cy="${top-16}" r="3" fill="${c2}" stroke="#14172E"/>`;break;
    case 'karte':g=body(4,w-8,h,c1)+windows(8,top+22,w-16,h-44,3,Math.max(1,rows-1),lit,seed)+door+`<rect x="${w/2-14}" y="${top+5}" width="28" height="16" rx="3" fill="#fff" stroke="#14172E" stroke-width="1.2"/><rect x="${w/2-14}" y="${top+9}" width="28" height="4" fill="${c2}"/>`;break;
    case 'getraenk':case 'snack':g=body(4,w-8,h,c1,2)+`<path d="M4 ${top} l${(w-8)/3} -10 v10 l${(w-8)/3} -10 v10 l${(w-8)/3} -10 v10 z" fill="${c2}" stroke="#14172E" stroke-width="1.4"/><rect x="${w-18}" y="${top-24}" width="8" height="18" fill="${c2}" stroke="#14172E" stroke-width="1.2"/>`+windows(8,top+22,w-16,h-44,3,Math.max(1,rows-1),lit,seed)+door+
      (scene==='getraenk'?`<path d="M${w/2-4} ${top+4} h8 v3 q4 2 4 7 v8 h-16 v-8 q0 -5 4 -7 z" fill="#fff" stroke="#14172E" stroke-width="1.1"/>`:`<path d="M${w/2-8} ${top+5} h16 l-2 16 h-12 z" fill="#fff" stroke="#14172E" stroke-width="1.1"/>`);break;
    case 'drogerie':case 'laden':g=body(4,w-8,h,c1,3)+windows(8,top+8,w-16,h-44,3,Math.max(1,rows-2),lit,seed)+`<path d="M2 -30 h${w-4} l-4 9 h-${w-12} z" fill="${scene==='laden'?'#E2584A':c2}" stroke="#14172E" stroke-width="1.3"/>`+`<path d="M8 -30 l2 9 M18 -30 l1 9 M28 -30 v9 M38 -30 l-1 9 M48 -30 l-2 9" stroke="#fff" stroke-width="2.5" opacity=".8"/>`+door+
      (scene==='drogerie'?`<circle cx="${w-12}" cy="${top-6}" r="5" fill="#fff" stroke="#3FB49A"/><circle cx="${w-4}" cy="${top-14}" r="3" fill="#fff" stroke="#3FB49A"/>`:'');break;
    case 'labor':g=body(4,w-8,h,c1)+windows(8,top+22,w-16,h-44,3,Math.max(1,rows-1),lit,seed)+door+`<circle cx="${w/2}" cy="${top+12}" r="8" fill="#fff" stroke="#14172E" stroke-width="1.2"/><path d="M${w/2-2} ${top+7} h4 v3 h3 v4 h-3 v3 h-4 v-3 h-3 v-4 h3 z" fill="#E2584A"/>`;break;
    case 'bank':{const cols=3,cw=(w-16)/cols;g=`<path d="M2 ${top+14} L${w/2} ${top} L${w-2} ${top+14} z" fill="${c2}" stroke="#14172E" stroke-width="1.4"/>`+body(6,w-12,h-14,c1,1)+windows(10,top+20,w-20,h-46,3,Math.max(1,rows-1),lit,seed);
      for(let i=0;i<=cols;i++)g+=`<rect x="${8+i*cw-2}" y="-26" width="4" height="26" fill="#fff" stroke="#14172E" stroke-width=".8"/>`;g+=`<circle cx="${w/2}" cy="${top+8}" r="4" fill="#FFD66B" stroke="#14172E"/>`;break}
    case 'pflege':g=`<path d="M0 ${top+18} L${w/2} ${top} L${w} ${top+18} z" fill="${c2}" stroke="#14172E" stroke-width="1.4"/>`+body(6,w-12,h-18,c1,2)+windows(10,top+24,w-20,h-46,3,Math.max(1,rows-1),lit,seed)+door+`<path d="M${w/2} ${top+15} c-6 -6 -12 1 0 8 c12 -7 6 -14 0 -8 z" fill="#E2584A"/>`;break;
    case 'welt':case 'techpark':{const pc=[[0,0.62],[0.34,1],[0.68,0.78]];g=pc.map(([fx,fh],i)=>{const bw=(w-4)/3,bh=Math.max(22,h*fh);return `<g transform="translate(${2+fx*(w-4)},0)">${scene==='welt'?`<path d="M0 ${-bh+8} L${bw/2} ${-bh} L${bw} ${-bh+8} z" fill="${c2}" stroke="#14172E" stroke-width="1.2"/>`:''}<rect x="1" y="${-bh+(scene==='welt'?8:0)}" width="${bw-2}" height="${bh-(scene==='welt'?8:0)}" rx="3" fill="${c1}" stroke="#14172E" stroke-width="1.4"/>${windows(3,-bh+12,bw-6,bh-18,2,Math.max(1,Math.floor((bh-20)/14)),lit,seed+i)}</g>`}).join('')+
      (scene==='welt'?`<circle cx="${w-8}" cy="${top-6}" r="8" fill="#8EC5FF" stroke="#14172E" stroke-width="1.2"/><path d="M${w-14} ${top-8} q6 -4 12 0 M${w-14} ${top-3} q6 3 12 0 M${w-8} ${top-14} v16" stroke="#14172E" stroke-width=".9" fill="none"/>`:'');break}
    case 'schwein':g=`<ellipse cx="${w/2}" cy="${-h*0.45}" rx="${w/2-4}" ry="${h*0.42}" fill="${c1}" stroke="#14172E" stroke-width="1.6"/><rect x="${w/2-8}" y="${-h*0.88}" width="16" height="3" rx="1.5" fill="#14172E"/><circle cx="${w-14}" cy="${-h*0.5}" r="2" fill="#14172E"/><ellipse cx="${w-5}" cy="${-h*0.4}" rx="5" ry="6" fill="${c2}" stroke="#14172E"/><rect x="12" y="-8" width="7" height="8" fill="${c2}" stroke="#14172E"/><rect x="${w-20}" y="-8" width="7" height="8" fill="${c2}" stroke="#14172E"/>`;break;
    default:g=body(6,w-12,h,c1)+windows(10,top+8,w-20,h-30,3,rows,lit,seed)+door;
  }
  return g;
}
function weatherIcon(k,x,y){
  const sun=`<circle cx="${x}" cy="${y}" r="7" fill="#FFD66B" stroke="#E0A100" stroke-width="1.4"/>`+[0,45,90,135,180,225,270,315].map(a=>{const r=a*Math.PI/180;return `<line x1="${(x+Math.cos(r)*10).toFixed(1)}" y1="${(y+Math.sin(r)*10).toFixed(1)}" x2="${(x+Math.cos(r)*13).toFixed(1)}" y2="${(y+Math.sin(r)*13).toFixed(1)}" stroke="#E0A100" stroke-width="1.6" stroke-linecap="round"/>`}).join('');
  const cloud=(cx,cy)=>`<path d="M${cx-11} ${cy+5} a6 6 0 0 1 2-11 a8 8 0 0 1 15-1 a6 6 0 0 1 5 12 z" fill="#fff" stroke="#6B7090" stroke-width="1.3"/>`;
  if(k==='sun')return sun;if(k==='rain')return cloud(x,y)+`<path d="M${x-6} ${y+9} l-2 4 M${x} ${y+9} l-2 4 M${x+6} ${y+9} l-2 4" stroke="#1F5FD1" stroke-width="1.6" stroke-linecap="round"/>`;
  if(k==='mix')return `<g transform="translate(-4,-3)">${sun}</g>`+cloud(x+5,y+3);return '';
}

/* ---------- Stadt ---------- */
let stadtM=0;
function stadtItems(d){
  const S=zGetSim(d);const n=S.items.length;
  return S.items.map((it,i)=>({it,i,p:d.positions.find(p=>p.id===it.key)||null})).filter(x=>x.p||x.it.key==='_liq'||x.it.key==='_bonds');
}
function stadtSVG(d,m){
  const S=zGetSim(d),items=stadtItems(d);if(!items.length)return '';
  const vmax=Math.max(1,...items.map(x=>S.vper[1][Z_H][x.i]));
  const dmax=Math.max(0.01,...items.map(x=>S.per[1][m][x.i]));
  const order=items.slice().sort((a,b)=>S.vper[1][0][b.i]-S.vper[1][0][a.i]);
  // größte Gebäude in die Mitte, kleinere an die Ränder
  const arr=[];order.forEach((x,k)=>{if(k%2)arr.unshift(x);else arr.push(x)});
  const GW=66,GAP=12,H=250,base=212;let x=10,out='';
  arr.forEach((o,k)=>{const sc=o.p?sceneOf(o.p):(o.it.key==='_liq'?'schwein':'tresor');const wide=sc==='welt'||sc==='techpark'?GW+18:GW;
    const v=S.vper[1][m][o.i],h=Math.round(36+150*Math.sqrt(Math.max(0,v)/vmax));
    const lit=Math.min(1,S.per[1][m][o.i]/dmax);const wx=o.p?weatherOf(o.p.symbol):null;
    const mot=o.p?motivesFor(d,o.p):null;const name=o.p?short(o.p.name):(o.it.key==='_liq'?'Konto':'Anleihen');
    const href=o.p?`#haus/${encodeURIComponent(o.p.id)}`:null;
    out+=`<g class="haus" transform="translate(${x},${base})"${href?` data-href="${href}" tabindex="0" role="link" aria-label="${esc(o.p.name)}: ${SCENE_NAME[sc]}, Wert ${eur(v)}, Dividende ${eur(S.per[1][m][o.i])} im Monat"`:''}>
      ${building(sc,wide,h,lit,k+3)}
      ${wx?weatherIcon(wx,wide-10,-h-22):''}
      ${mot&&mot.own?`<g transform="translate(6,${-h-20})"><circle r="9" cx="7" cy="7" fill="#fff" stroke="#14172E" stroke-width="1.2"/><text x="7" y="11.5" font-size="11" text-anchor="middle">${MOTIVE[mot.list[0]].e}</text></g>`:''}
      <text x="${wide/2}" y="18" text-anchor="middle" class="hlab">${esc(name)}</text>
    </g>`;x+=wide+GAP});
  const W=x+10;
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="stadt-svg" role="img" aria-label="Deine Depot-Stadt ${m?'in '+num(m/12,0)+' Jahren':'heute'}">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sky1)"/><stop offset="1" style="stop-color:var(--sky2)"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    <ellipse cx="${W*0.2}" cy="${base+40}" rx="${W*0.4}" ry="40" style="fill:var(--hill1)"/><ellipse cx="${W*0.8}" cy="${base+42}" rx="${W*0.45}" ry="44" style="fill:var(--hill2)"/>
    <rect y="${base}" width="${W}" height="${H-base}" style="fill:var(--grass)"/><rect y="${base}" width="${W}" height="4" style="fill:var(--grass-edge)"/>
    ${out}</svg>`;
}
function stadtHTML(d){
  const w=whyOf(d);const S=zGetSim(d);const m=stadtM;
  const prof=w.profile?MOTIVE[w.profile]:null;
  return `<section class="stadt card">
    <div class="row between" style="padding:0 2px"><div class="col" style="gap:0"><span class="lbl">Deine Depot-Stadt</span><span class="small muted2" id="stadtYear">${m?`in ${num(m/12,0)} Jahren (mittel)`:'heute'}</span></div>
      ${prof?`<button type="button" class="chip-btn" id="profEdit" aria-label="Was dir wichtig ist ändern">${prof.e} ${prof.t}</button>`:''}</div>
    ${!w.profile?`<div class="prof-ask"><span class="strong">Was ist dir beim Anlegen am wichtigsten?</span><div class="prof-grid">${PROFILE_KEYS.map(k=>`<button type="button" data-prof="${k}"><span class="pe">${MOTIVE[k].e}</span><span>${MOTIVE[k].l}</span></button>`).join('')}</div></div>`:''}
    <div class="stadt-scroll" id="stadtScroll">${stadtSVG(d,m)}</div>
    <input type="range" id="stadtRange" min="0" max="${Z_H}" step="12" value="${m}" aria-label="Zeit" aria-valuetext="${m?'in '+num(m/12,0)+' Jahren':'heute'}">
    <div class="row between small muted2"><span>heute</span><span>+10 Jahre</span><span>+20 Jahre</span></div>
    <p class="hint">Höhe = Wert, gelbe Fenster = Dividende, ☀️ Rückenwind, 🌧️ Gegenwind aus belegten Trends. Tippe auf ein Gebäude für den Steckbrief. Zukunft = mittleres Szenario der <a class="link" href="#zeit">Zeitreise</a>, keine Vorhersage.</p>
  </section>`;
}
function stadtUpdate(m){stadtM=m;const d=D();const el=document.getElementById('stadtScroll');if(!el)return;const sl=el.scrollLeft;el.innerHTML=stadtSVG(d,m);el.scrollLeft=sl;
  const y=document.getElementById('stadtYear');if(y)y.textContent=m?`in ${num(m/12,0)} Jahren (mittel)`:'heute';const r=document.getElementById('stadtRange');if(r)r.setAttribute('aria-valuetext',m?'in '+num(m/12,0)+' Jahren':'heute')}
function stadtCenter(){const el=document.getElementById('stadtScroll');if(el&&el.scrollWidth>el.clientWidth)el.scrollLeft=(el.scrollWidth-el.clientWidth)/2}

/* ---------- Steckbrief (#haus/ID) ---------- */
const big=(v,cur)=>{const a=Math.abs(v);const f=a>=1e9?[1e9,'Mrd.']:a>=1e6?[1e6,'Mio.']:null;const s=f?num(v/f[0],1).replace(/,0$/,'')+' '+f[1]:num(v,a<10?2:0);return cur?`${s} ${cur}`:s};
function moneyOf(w,amt){if(w.currency==='DKK')return {v:amt/DKK_EUR,c:'€',note:'umgerechnet aus Kronen'};return {v:amt,c:'$',note:null}}
function pieceHTML(w,q){
  const share=w.shares_outstanding?q/w.shares_outstanding:null;const em=w.everyday_metric;let h='';
  if(share)h+=`<p class="lead">Du besitzt <b>${num(q,q<10?2:0)}</b> von ${big(w.shares_outstanding)} Aktien. Das ist <b>1 von ${big(1/share)}</b> Teilen der Firma.</p>`;
  if(em&&em.total){const mine=em.total*share;
    h+=`<div class="piece"><span class="pe">${w.scene==='getraenk'?'🥤':w.scene==='snack'?'🍿':w.scene==='karte'?'💳':w.scene==='pflege'?'🏥':w.scene==='laden'?'🏪':w.scene==='bank'?'🏦':w.scene==='labor'?'💊':w.scene==='cloud'?'🖥️':w.scene==='drogerie'?'🧴':'🌐'}</span><span class="col" style="gap:2px"><span class="strong">${em.lower?'über ':''}${big(em.total)} ${esc(em.unit_de)} ${em.period!=='insgesamt'?esc(em.period):''}</span>
      ${share&&mine>=0.05?`<span>Rechnerisch deins: <b>${num(mine,mine<10?1:0)}</b> ${esc(em.unit_de)} ${em.period!=='insgesamt'?esc(em.period):''}</span>`:''}</span></div>`}
  if(w.area_m2&&share){const m2=w.area_m2*share;const cmp=m2<0.05?'so groß wie eine Postkarte':m2<0.3?'so groß wie eine Fußmatte':m2<1.5?'so groß wie ein Badvorleger':m2<4?'so groß wie ein Bett':m2<10?'so groß wie ein kleines Bad':'so groß wie ein Kinderzimmer';
    h+=`<div class="piece"><span class="pe">📐</span><span class="col" style="gap:2px"><span>Von der vermieteten Fläche gehören dir rechnerisch <b>${num(m2,2)} m²</b>.</span><span class="small muted2">Das ist ${cmp}.</span></span></div>`}
  return h||'<p class="small muted2">Für diese Position liegen noch keine belegten Angaben vor.</p>';
}
function flowHTML(w,q){
  if(!w.revenue||!w.shares_outstanding)return '<p class="small muted2">Noch keine belegten Zahlen.</p>';
  const per=x=>x/w.shares_outstanding*q;const rev=moneyOf(w,per(w.revenue)),ni=moneyOf(w,per(w.net_income)),dv=moneyOf(w,(w.dividends_per_share||0)*q);
  const keep=ni.v-dv.v;const max=Math.max(rev.v,ni.v,dv.v,1);const bar=(v,col)=>`<span class="fbar"><i style="width:${Math.max(1.5,Math.abs(v)/max*100)}%;background:${col}"></i></span>`;
  const reit=w.kind==='reit',bdc=w.kind==='bdc';
  return `<p class="small muted2">Dein Anteil für ein Geschäftsjahr (${esc(w.fiscal_year)}), gerechnet mit deinen ${num(q,q<10?2:0)} Aktien${rev.note?', '+rev.note:''}.</p>
   <div class="flow2">
    <span>${bdc?'Zins- und Beteiligungserträge':reit?'Mieteinnahmen und Erträge':'Umsatz'}</span>${bar(rev.v,'#B9C3D9')}<b class="num">${num(rev.v,2)} ${rev.c}</b>
    <span>Gewinn</span>${bar(ni.v,'#7DDBB8')}<b class="num">${num(ni.v,2)} ${ni.c}</b>
    <span>💶 an dich (Dividende)</span>${bar(dv.v,'#FFD66B')}<b class="num">${num(dv.v,2)} ${dv.c}</b>
    ${keep>0.005?`<span>🏗️ bleibt in der Firma</span>${bar(keep,'#8EC5FF')}<b class="num">${num(keep,2)} ${ni.c}</b>`:''}
   </div>
   ${keep<=0.005?`<p class="hint-box">${reit?'Die Firma zahlt mehr aus, als der Buchgewinn zeigt. Bei Immobilienfirmen ist das üblich, weil Abschreibungen den Gewinn kleiner rechnen, als das Geld ist, das wirklich hereinkommt.':bdc?'Die Firma zahlt fast alles aus, was sie verdient. Das ist bei Kreditfirmen (BDC) so vorgeschrieben; für Wachstum leiht sie sich Geld oder gibt neue Aktien aus.':'Die Firma zahlt mehr aus, als sie im Jahr verdient hat.'}</p>`:''}
   ${w.reinvest&&w.reinvest.amount?`<div class="piece"><span class="pe">🏗️</span><span>Die Firma steckt viel Geld in <b>${esc(w.reinvest.label)}</b>: ${big(moneyOf(w,w.reinvest.amount).v,moneyOf(w,w.reinvest.amount).c)} im Jahr.</span></div>`:''}
   ${w.buybacks?`<div class="piece"><span class="pe">🔁</span><span>Sie kauft eigene Aktien zurück (${big(moneyOf(w,w.buybacks).v,moneyOf(w,w.buybacks).c)}). Dadurch wird dein Anteil an der Firma ein kleines bisschen größer.</span></div>`:''}
   ${w.dpsNote?`<p class="hint">Dividende ${esc(w.dpsNote)}.</p>`:''}`;
}
const dirIcon={rueckenwind:'☀️',gegenwind:'🌧️',gemischt:'⛅'},dirTxt={rueckenwind:'Rückenwind',gegenwind:'Gegenwind',gemischt:'gemischt'};
const esgIcon={umwelt:'🌱',soziales:'🤝',governance:'🏛️',kontroverse:'⚠️'},esgTxt={umwelt:'Umwelt',soziales:'Soziales',governance:'Führung',kontroverse:'Streitpunkt'};
const extLink=(u,t='Quelle')=>u?`<a class="src" href="${esc(u)}" target="_blank" rel="noopener">${t}</a>`:'';
function stadtDiv(d,p){try{const S=zGetSim(d);const i=S.items.findIndex(x=>x.key===p.id);return i<0?'':` · rund ${eur(S.per[1][0][i])} Dividende im Monat`}catch(e){return ''}}
function vHaus(id){
  const d=D(),p=posById(id);if(!p)return `<h1 class="h1">Nicht gefunden</h1><a class="btn" href="#depot">Zur Stadt</a>`;
  const w=W_(p.symbol),I=INFO[p.symbol],sc=sceneOf(p),mot=motivesFor(d,p),prof=whyOf(d).profile;
  const q=p.qty;const v=posValue(p);
  const sec={
    was:`<section class="card col" style="gap:8px"><h2 class="h2" style="margin:0">🏭 Was macht die Firma?</h2><p class="lead">${esc(w?w.kid_description_de:'Für diese Position gibt es noch keinen Steckbrief.')}</p>
      ${w&&w.examples_de&&w.examples_de.length?`<div class="chips">${w.examples_de.map(x=>`<span class="pill">${esc(x)}</span>`).join('')}</div>`:''}</section>`,
    stueck:w&&!w.etf&&q?`<section class="card col" style="gap:8px"><h2 class="h2" style="margin:0">🧩 Was gehört dir?</h2>${pieceHTML(w,q)}<span class="hint">${extLink(w.sources&&w.sources.alltag)} · ${esc(w.fiscal_year||'')}</span></section>`:'',
    geld:w&&!w.etf&&q?`<section class="card col" style="gap:8px"><h2 class="h2" style="margin:0">💸 Wohin geht dein Geld?</h2>${flowHTML(w,q)}<span class="hint">${extLink(w.sources&&w.sources.finanzen,'Zahlen')} · ${extLink(w.sources&&w.sources.dividende,'Dividende')}</span></section>`:'',
    welt:w&&w.trends&&w.trends.length?`<section class="card col" style="gap:8px"><h2 class="h2" style="margin:0">🧭 Wohin geht die Welt?</h2>
      ${w.trends.map(t=>`<div class="trend"><span class="te">${dirIcon[t.direction]||'⛅'}</span><span class="col" style="gap:2px"><span class="strong">${esc(t.trend_de)} <span class="small muted2">${dirTxt[t.direction]||''}</span></span><span class="small">${esc(t.why_de)}</span>${t.source?extLink(t.source):''}</span></div>`).join('')}
      <p class="hint">Trends sind Kräfte, keine Vorhersagen. Wie stark sie wirken, zeigt sich in den nächsten Berichten.</p></section>`:'',
    gut:`<section class="card col" style="gap:8px"><h2 class="h2" style="margin:0">🌍 Macht die Firma es gut?</h2>
      ${I&&I.rules&&I.rules.length?`<span class="strong small">Geschäft</span>${I.rules.filter(r=>r.status!=='np').map(r=>`<div class="row" style="gap:8px;align-items:flex-start"><span class="st ${stCls(r)}">${STATUS[r.type][r.status]}</span><span class="small">${esc(r.q)}</span></div>`).join('')}`:''}
      ${w&&w.esg&&w.esg.length?`<span class="strong small" style="margin-top:6px">Umwelt, Soziales, Führung</span>${w.esg.map(e=>`<div class="trend"><span class="te">${esgIcon[e.kind]||'•'}</span><span class="col" style="gap:2px"><span class="small"><b>${esgTxt[e.kind]||''}:</b> ${esc(e.fact_de)}</span><span class="hint">${esc(e.date||'')} ${extLink(e.source)}</span></span></div>`).join('')}`:'<p class="small muted2">Noch keine belegten Angaben zu Umwelt und Sozialem.</p>'}
      <p class="hint">Belegte Fakten zum Selbstbewerten, keine Gesamtnote.</p></section>`
  };
  const orderBy={einkommen:['geld','stueck','was','welt','gut'],wachstum:['welt','geld','was','stueck','gut'],gut:['gut','was','welt','stueck','geld'],verstehen:['was','stueck','welt','geld','gut']};
  const order=orderBy[prof]||['was','stueck','geld','welt','gut'];
  const W=Math.max(1,v||1);
  return `
  <div class="row" style="gap:6px"><a href="#depot" class="icon-btn" aria-label="Zurück zur Stadt">${ICON.back}</a><div class="col"><span class="lbl">${esc(SCENE_NAME[sc])}</span><h1 class="big" style="font-size:24px">${esc(p.name)}</h1></div></div>
  <section class="haus-hero"><svg viewBox="-10 -230 120 250" width="120" height="250" aria-hidden="true">${building(sc,sc==='welt'||sc==='techpark'?100:80,170,0.6,7)}${weatherIcon(weatherOf(p.symbol),70,-200)}</svg>
    <div class="col" style="gap:4px;min-width:0;align-self:center"><span class="big" style="font-size:22px">${v!=null?eur(v):'Wert ungeklärt'}</span><span class="small muted2">${q!=null?`${num(q,q<10?2:0)} Stück`:''}${stadtDiv(d,p)}</span></div>
    <div class="col hero-why" style="gap:6px"><span class="strong">Warum hast du das?</span>
      <div class="chips" role="group" aria-label="Dein Warum">${Object.entries(MOTIVE).map(([k,m])=>`<button type="button" class="mchip" data-mot="${k}" aria-pressed="${mot.list.includes(k)}">${m.e} ${m.t}</button>`).join('')}</div>
      <span class="hint">${mot.own?'Gespeichert. Höchstens zwei Gründe.':'Vorschlag nach Baustein. Tippe, um selbst zu wählen.'}</span></div></section>
  ${order.map(k=>sec[k]).join('')}
  <div class="grid2"><a class="btn" href="#pos/${encodeURIComponent(p.id)}">Einordnung</a><a class="btn" href="#zeit">Zeitreise</a></div>
  <p class="hint">${w&&w.fiscal_year?`Zahlen aus dem Geschäftsjahr ${esc(w.fiscal_year)}, recherchiert am ${deDate(WORLD.meta.asOf)}. `:''}Keine Anlageberatung.</p>`;
}

/* ---------- Ereignisse ---------- */
document.addEventListener('input',e=>{if(e.target.id==='stadtRange')stadtUpdate(+e.target.value)});
document.addEventListener('click',e=>{const t=e.target;if(!t.closest)return;
  const h=t.closest('.haus[data-href]');if(h){location.hash=h.dataset.href;return}
  const pf=t.closest('[data-prof]');if(pf){const d=D();whyOf(d).profile=pf.dataset.prof;persist();rerender();toast(`${MOTIVE[pf.dataset.prof].e} Gemerkt. Die Steckbriefe zeigen das zuerst.`);return}
  if(t.closest('#profEdit')){const d=D();whyOf(d).profile=null;persist();rerender();return}
  const mc=t.closest('[data-mot]');if(mc){const d=D();const {a}=parse();const p=posById(a[0]);if(!p)return;const w=whyOf(d);let l=w.pos[p.id]?w.pos[p.id].slice():[];const k=mc.dataset.mot;
    if(l.includes(k))l=l.filter(x=>x!==k);else{l.push(k);if(l.length>2)l.shift()}if(l.length)w.pos[p.id]=l;else delete w.pos[p.id];persist();FUN.points+=w.pos[p.id]&&!FUN.why?.[p.id]?3:0;FUN.why=FUN.why||{};FUN.why[p.id]=1;saveFun();rerender();return}});
document.addEventListener('keydown',e=>{const h=e.target.closest&&e.target.closest('.haus[data-href]');if(h&&(e.key==='Enter'||e.key===' ')){e.preventDefault();location.hash=h.dataset.href}});
