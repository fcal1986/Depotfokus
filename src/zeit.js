/* =========================================================
   ZEITREISE: monatliche Dividende in 20 Jahren, drei Szenarien
   Keine Prognose, sondern eine Rechnung mit offenen, änderbaren Annahmen.
   ========================================================= */
const Z_H=240;                       // Monate
const Z_SC=[{k:'vors',n:'vorsichtig',f:-1},{k:'mit',n:'mittel',f:0},{k:'gut',n:'gut',f:1}];
const Z_SPREAD={liq:0,bonds:1,core:4,hdy:4,single:5,bdc:5,ndq:6};
const Z_INFL=0.02;
function zcfg(d){
  if(!d.zeit)d.zeit={assume:{},reinvest:true,save:true,real:false,cuts:{}};
  const z=d.zeit;z.cuts=z.cuts||{};
  B.forEach(b=>{if(!z.assume[b.id])z.assume[b.id]={g:ASSUME[b.id][0],y:ASSUME[b.id][1],s:Z_SPREAD[b.id]}});
  return z;
}
function zResetAssume(d){const z=zcfg(d);z.assume={};zcfg(d)}

/* Startbestand: eingerechnete Positionen mit Baustein, Konto/Tagesgeld, Anleihen außerhalb, leere Ziel-Bausteine */
function zItems(d){
  const items=d.positions.filter(p=>isIncluded(p)&&p.bucket).map(p=>({key:p.id,name:p.name,sym:p.symbol,b:p.bucket,v:posValue(p)}));
  const liq=(d.cashMode==='exclude'?0:d.accounts.reduce((a,x)=>a+x.value,0))+d.external.items.filter(x=>x.type!=='bonds').reduce((a,x)=>a+(+x.value||0),0);
  if(liq>0)items.push({key:'_liq',name:'Konto & Tagesgeld',b:'liq',v:liq});
  const bo=d.external.items.filter(x=>x.type==='bonds').reduce((a,x)=>a+(+x.value||0),0);
  if(bo>0)items.push({key:'_bonds',name:'Anleihen außerhalb',b:'bonds',v:bo});
  if(goalState(d).ok)B.forEach(b=>{if(d.goals[b.id]>0&&!items.some(i=>i.b===b.id))items.push({key:'_neu_'+b.id,name:'Neu: '+b.name,b:b.id,v:0})});
  return items;
}

/* Monatliche Simulation. Ergebnis: Summen und Einzelwerte (Dividende brutto je Monat) für jedes Szenario und jeden Monat. */
function zSim(d){
  const z=zcfg(d),items=zItems(d),n=items.length,gs=goalState(d);
  const budget=z.save?Math.max(0,+d.budget||0):0;
  const res={items,tot:[],per:[],val:[],budget,reinvest:z.reinvest};
  for(const sc of Z_SC){
    const v=items.map(i=>i.v),tot=new Float64Array(Z_H+1),val=new Float64Array(Z_H+1),per=[],vper=[];
    const gm=items.map(i=>{const a=z.assume[i.b];return Math.pow(1+Math.max(-0.5,(a.g+sc.f*a.s)/100),1/12)});
    const y=items.map(i=>Math.max(0,z.assume[i.b].y)/100/12);
    for(let m=0;m<=Z_H;m++){
      const div=new Float64Array(n);let s=0,vs=0;
      for(let i=0;i<n;i++){const c=z.cuts[items[i].key];const cut=c&&c.pct&&m>=c.from*12?1-c.pct/100:1;div[i]=v[i]*y[i]*cut;s+=div[i];vs+=v[i]}
      tot[m]=s;val[m]=vs;per.push(div);vper.push(Float64Array.from(v));
      if(m===Z_H)break;
      for(let i=0;i<n;i++){v[i]*=gm[i];if(z.reinvest)v[i]+=div[i]*(1-TAX)}
      if(budget>0){
        // Sparrate wie im Plan: zuerst Bausteine unter Ziel, sonst nach Zielquote; ohne Ziele nach heutiger Gewichtung
        const V={};B.forEach(b=>V[b.id]=0);items.forEach((it,i)=>V[it.b]+=v[i]);const T=vs+budget;
        const w={};let ws=0;
        if(gs.ok){B.forEach(b=>{w[b.id]=Math.max(0,d.goals[b.id]/100*T-V[b.id]);ws+=w[b.id]});if(ws<1e-9){B.forEach(b=>{w[b.id]=d.goals[b.id]/100});ws=1}}
        else{B.forEach(b=>{w[b.id]=V[b.id];ws+=V[b.id]})}
        if(ws>0)B.forEach(b=>{const amt=budget*w[b.id]/ws;if(amt<=0)return;const idx=items.map((it,i)=>it.b===b.id?i:-1).filter(i=>i>=0);if(!idx.length)return;
          const bv=idx.reduce((a,i)=>a+v[i],0);idx.forEach(i=>v[i]+=bv>0?amt*v[i]/bv:amt/idx.length)});
      }
    }
    res.tot.push(tot);res.per.push(per);res.val.push(val);(res.vper=res.vper||[]).push(vper);
  }
  return res;
}
const zDefl=(d,m)=>zcfg(d).real?Math.pow(1+Z_INFL,m/12):1;
const zYear=m=>new Date().getFullYear()+Math.round(m/12*10)/10;
const zYearOf=m=>new Date().getFullYear()+Math.round(m/12);
const zYearLbl=m=>m===0?'heute':`in ${num(m/12,m%12?1:0)} Jahren · ${zYearOf(m)}`;

/* Kandidaten für Weichen: Positionen mit nicht erfüllter Bedingung oder eingetretenem Risiko */
function zRiskItems(d,items){return items.filter(it=>{const I=INFO[it.sym];return I&&I.rules&&I.rules.some(r=>r.status==='not_met'||r.status==='occurred')})}

/* ---------- Ansicht ---------- */
let zState={m:120,sel:null,sim:null,simKey:null};
function zGetSim(d){const key=JSON.stringify([d.kind,d.zeit,d.budget,d.goals,d.positions.map(p=>[p.id,posValue(p)]),d.accounts,d.external,d.cashMode]);
  if(zState.simKey!==key){zState.sim=zSim(d);zState.simKey=key}return zState.sim}
function vZeit(){
  const d=D(),z=zcfg(d),S=zGetSim(d),m=zState.m;
  const risk=zRiskItems(d,S.items),tm=txModel(d);
  const act=tm&&tm.M.div12?tm.M.div12/12:null;
  return `
  <div class="row" style="gap:6px"><a href="#plan" class="icon-btn" aria-label="Zurück zum Plan">${ICON.back}</a><div class="col"><span class="lbl">Zeitreise</span><h1 class="big" style="font-size:24px">Deine monatliche Dividende</h1></div></div>
  ${d.kind==='demo'?'<span class="chip-demo" style="align-self:flex-start">Musterdepot</span>':''}
  <section class="dark col" style="gap:4px" id="zHead">${zHeadHTML(d,S,m)}</section>
  <section class="card col" style="gap:6px">
    <div class="zchart" id="zChart">${zChartSVG(d,S,m)}</div>
    <label class="sr" for="zRange">Zeitpunkt</label>
    <input type="range" id="zRange" min="0" max="${Z_H}" step="1" value="${m}" aria-valuetext="${esc(zAria(d,S,m))}">
    <div class="row between small muted2"><span>heute</span><span>+10 Jahre</span><span>+20 Jahre</span></div>
  </section>
  <section class="card col" style="gap:8px"><div class="row between"><h2 class="h2" style="margin:0">Je Position</h2><span class="small muted2" id="zColYear">${zYearLbl(m)}</span></div>
    <div class="zcols" id="zCols">${zColsHTML(d,S,m)}</div><div class="small muted2" id="zSel">${zSelHTML(d,S,m)}</div></section>
  <section class="card col" style="gap:4px"><h2 class="h2">Was einfließt</h2>
    <label class="switch"><span>Sparplan ${eur(+d.budget||0)} im Monat <a class="link" href="#plan">ändern</a></span><input type="checkbox" data-z="save" ${z.save?'checked':''}></label>
    <label class="switch"><span>Dividenden wiederanlegen (nach Steuern)</span><input type="checkbox" data-z="reinvest" ${z.reinvest?'checked':''}></label>
    <label class="switch"><span>In heutiger Kaufkraft (2 % Inflation)</span><input type="checkbox" data-z="real" ${z.real?'checked':''}></label>
    ${!goalState(d).ok&&z.save?'<p class="hint">Ohne gültige Zielverteilung geht die Sparrate nach heutiger Gewichtung ins Depot.</p>':''}</section>
  <section class="card col" style="gap:8px"><h2 class="h2" style="margin:0">Weichen</h2>
    <p class="small muted2">Was wäre, wenn eine Dividende gekürzt wird? Vorgeschlagen sind Positionen, bei denen eine deiner Regeln gerade nicht erfüllt ist.</p>
    ${(risk.length?risk:[]).map(it=>zCutRow(z,it,true)).join('')}
    <details><summary>Weitere Position wählen</summary>${S.items.filter(it=>!risk.includes(it)&&!it.key.startsWith('_')).map(it=>zCutRow(z,it,false)).join('')}</details></section>
  <details class="card"><summary class="strong">Annahmen je Baustein</summary>
    <p class="small muted2" style="margin:8px 0">Kursentwicklung pro Jahr (mittel), Spanne nach unten und oben für „vorsichtig“ und „gut“, Dividendenrendite brutto. Die Dividende wächst mit dem Wert der Position.</p>
    <div class="zass"><span></span><span class="small muted2">Kurs %</span><span class="small muted2">± %</span><span class="small muted2">Rendite %</span>
    ${B.map(b=>{const a=z.assume[b.id];return `<span class="small strong"><i class="dot" style="background:var(${b.c})"></i> ${b.name}</span>${['g','s','y'].map(k=>`<input class="numin" type="text" inputmode="decimal" data-za="${b.id}|${k}" value="${num(a[k],1)}" aria-label="${b.name} ${k==='g'?'Kursentwicklung':k==='s'?'Spanne':'Dividendenrendite'}">`).join('')}`}).join('')}</div>
    <button class="link" id="zReset" type="button" style="margin-top:8px">Standardwerte</button></details>
  ${zTipHTML(d)}
  <p class="hint">Keine Prognose und keine Anlageberatung: eine Rechnung mit deinen Annahmen. „Vorsichtig“ bis „gut“ ist eine Spanne, keine Wahrscheinlichkeit. Dividenden brutto vor Steuern${act!=null?`; tatsächlich erhalten hast du in den letzten zwölf Monaten rund ${eur(act)} im Monat netto`:''}.</p>`;
}
function zAt(S,sc,m,d){return S.tot[sc][m]/zDefl(d,m)}
function zHeadHTML(d,S,m){
  const lo=zAt(S,0,m,d),mid=zAt(S,1,m,d),hi=zAt(S,2,m,d),now=S.tot[1][0];
  return `<span class="lbl">Monatliche Dividende ${m===0?'heute':'im Jahr '+zYearOf(m)}</span>
   <span class="big" style="font-size:34px">${eur(mid)}</span>
   <span class="small muted-night">Spanne ${eur(lo)} bis ${eur(hi)} · heute ${eur(now)}${zcfg(d).real?' · in heutiger Kaufkraft':''}</span>
   <span class="small muted-night">Depotwert dann ${eur(S.val[1][m]/zDefl(d,m))} (${eur(S.val[0][m]/zDefl(d,m))} bis ${eur(S.val[2][m]/zDefl(d,m))})</span>`;
}
const zAria=(d,S,m)=>`${zYearLbl(m)}: ${eur(zAt(S,1,m,d))} im Monat, Spanne ${eur(zAt(S,0,m,d))} bis ${eur(zAt(S,2,m,d))}`;
function zChartSVG(d,S,m){
  const W=340,H=190,L=44,R=8,T=10,Bm=22,w=W-L-R,h=H-T-Bm;
  const max=Math.max(1,...Array.from({length:Z_H+1},(_,i)=>zAt(S,2,i,d)))*1.05;
  const X=i=>L+i/Z_H*w,Y=v=>T+h-v/max*h;
  const pts=sc=>Array.from({length:Z_H/3+1},(_,k)=>k*3).map(i=>`${X(i).toFixed(1)},${Y(zAt(S,sc,i,d)).toFixed(1)}`);
  const band=`M${pts(2).join(' L')} L${pts(0).reverse().join(' L')} Z`;
  const ticks=[0,0.5,1].map(f=>max/1.05*f);
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Monatliche Dividende über 20 Jahre, Spanne von vorsichtig bis gut">
   ${ticks.map(t=>`<line x1="${L}" x2="${W-R}" y1="${Y(t)}" y2="${Y(t)}" class="zgrid"/><text x="${L-6}" y="${Y(t)+4}" class="zax" text-anchor="end">${num(t,0)} €</text>`).join('')}
   ${[0,5,10,15,20].map(yr=>`<text x="${X(yr*12)}" y="${H-6}" class="zax" text-anchor="middle">${yr?'+'+yr:'heute'}</text>`).join('')}
   <path d="${band}" class="zband"/>
   <polyline points="${pts(1).join(' ')}" class="zmid"/>
   <line id="zCur" x1="${X(m)}" x2="${X(m)}" y1="${T}" y2="${T+h}" class="zcur"/>
   <circle id="zDot" cx="${X(m)}" cy="${Y(zAt(S,1,m,d))}" r="5" class="zdot"/>
   <rect id="zHit" x="${L}" y="0" width="${w}" height="${H}" fill="transparent"/>
  </svg>`;
}
function zColsHTML(d,S,m){
  const items=S.items.map((it,i)=>({it,i,now:S.per[1][0][i]})).filter(x=>x.now>0.005||S.per[1][Z_H][x.i]>0.5).sort((a,b)=>b.now-a.now);
  // Wurzelskala über den ganzen Zeitraum: heutige Werte bleiben sichtbar, Wachstum ist trotzdem zu sehen
  const max=Math.max(1,...items.map(x=>S.per[2][Z_H][x.i]/zDefl(d,Z_H)),...items.map(x=>S.per[2][m][x.i]/zDefl(d,m)));const sq=v=>Math.sqrt(Math.max(0,v)/max)*100;
  return items.map(x=>{const lo=S.per[0][m][x.i]/zDefl(d,m),mid=S.per[1][m][x.i]/zDefl(d,m),hi=S.per[2][m][x.i]/zDefl(d,m);const b=BN[x.it.b];
    const cut=zcfg(d).cuts[x.it.key];
    return `<button type="button" class="zcol${zState.sel===x.it.key?' on':''}" data-zsel="${esc(x.it.key)}" aria-label="${esc(x.it.name)}: ${eur(mid)} im Monat">
      <span class="zv">${num(mid,0)}</span>
      <span class="zbar"><i class="zwh" style="bottom:${sq(lo)}%;height:${Math.max(0,sq(hi)-sq(lo))}%"></i><i class="zfill" style="height:${sq(mid)}%;background:var(${b.c})"></i></span>
      <span class="zlab">${esc(x.it.key.startsWith('_')?(x.it.key==='_liq'?'KT':'+'):initials(x.it.name))}${cut&&cut.pct?'<b class="zcut">✂</b>':''}</span></button>`}).join('');
}
function zSelHTML(d,S,m){
  const k=zState.sel;const i=S.items.findIndex(x=>x.key===k);
  if(i<0)return 'Tippe auf eine Säule für Details. Höhe: mittel, grauer Bereich: Spanne (Wurzelskala).';
  const it=S.items[i],lo=S.per[0][m][i]/zDefl(d,m),mid=S.per[1][m][i]/zDefl(d,m),hi=S.per[2][m][i]/zDefl(d,m),tot=zAt(S,1,m,d);
  return `<b>${esc(it.name)}</b>: ${eur(mid)} im Monat (${eur(lo)} bis ${eur(hi)}), ${tot?pct(mid/tot,0):'–'} deiner Dividende · ${BN[it.b].name}${!it.key.startsWith('_')?` · <a class="link" href="#pos/${encodeURIComponent(it.key)}">Position</a>`:''}`;
}
function zCutRow(z,it,suggest){const c=z.cuts[it.key]||{pct:0,from:1};const I=INFO[it.sym];const r=I&&I.rules?I.rules.find(x=>x.status==='not_met'||x.status==='occurred'):null;
  return `<div class="zcutrow"><div class="col zcutname" style="min-width:0"><span class="strong small">${esc(it.name)}</span>${suggest&&r?`<span class="small muted2">${esc(r.q.replace(/\?$/,''))}: ${esc(STATUS[r.type][r.status])}</span>`:''}</div>
   <select data-zcut="${esc(it.key)}" aria-label="Dividende ${esc(it.name)} kürzen">${[0,10,20,30,50,100].map(p=>`<option value="${p}" ${c.pct===p?'selected':''}>${p?'−'+p+' %':'keine Kürzung'}</option>`).join('')}</select>
   <select data-zfrom="${esc(it.key)}" aria-label="ab Jahr" ${c.pct?'':'disabled'}>${[1,2,3,5].map(y=>`<option value="${y}" ${c.from===y?'selected':''}>ab Jahr ${y}</option>`).join('')}</select></div>`}

/* Schnelles Neuzeichnen beim Schieben, ohne die Seite neu aufzubauen */
function zUpdate(m){
  const d=D(),S=zGetSim(d);zState.m=m;
  const set=(id,html)=>{const el=document.getElementById(id);if(el)el.innerHTML=html};
  set('zHead',zHeadHTML(d,S,m));set('zCols',zColsHTML(d,S,m));set('zSel',zSelHTML(d,S,m));set('zColYear',zYearLbl(m));
  const W=340,L=44,R=8,T=10,Bm=22,w=W-L-R,h=190-T-Bm;const max=Math.max(1,...Array.from({length:Z_H+1},(_,i)=>zAt(S,2,i,d)))*1.05;
  const x=L+m/Z_H*w,y=T+h-zAt(S,1,m,d)/max*h;const c=document.getElementById('zCur'),dt=document.getElementById('zDot');
  if(c){c.setAttribute('x1',x);c.setAttribute('x2',x)}if(dt){dt.setAttribute('cx',x);dt.setAttribute('cy',y)}
  const r=document.getElementById('zRange');if(r){if(+r.value!==m)r.value=m;r.setAttribute('aria-valuetext',zAria(d,S,m))}
}
let zDrag=false;
function zFromPointer(e){const svg=document.querySelector('#zChart svg');if(!svg)return;const rc=svg.getBoundingClientRect();const sx=340/rc.width;
  const x=(e.clientX-rc.left)*sx;const m=Math.round(Math.max(0,Math.min(1,(x-44)/(340-52)))*Z_H);zUpdate(m)}
document.addEventListener('pointerdown',e=>{if(e.target.closest&&e.target.closest('#zChart')){zDrag=true;try{e.target.setPointerCapture&&e.target.setPointerCapture(e.pointerId)}catch(_){}zFromPointer(e)}});
document.addEventListener('pointermove',e=>{if(zDrag)zFromPointer(e)});
['pointerup','pointercancel'].forEach(t=>document.addEventListener(t,()=>{zDrag=false}));
document.addEventListener('input',e=>{if(e.target.id==='zRange')zUpdate(+e.target.value)});
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-zsel]');if(b){zState.sel=zState.sel===b.dataset.zsel?null:b.dataset.zsel;zUpdate(zState.m);return}
  if(e.target.closest&&e.target.closest('#zReset')){zResetAssume(D());persist();zState.simKey=null;rerender();return}});
document.addEventListener('change',e=>{const el=e.target,d=D();if(!el.closest||!el.closest('#view'))return;const z=zcfg(d);let ch=false;
  if(el.dataset.z){z[el.dataset.z]=el.checked;ch=true}
  else if(el.dataset.zcut){const c=z.cuts[el.dataset.zcut]||{pct:0,from:1};c.pct=+el.value;z.cuts[el.dataset.zcut]=c;if(!c.pct)delete z.cuts[el.dataset.zcut];ch=true}
  else if(el.dataset.zfrom){const c=z.cuts[el.dataset.zfrom];if(c){c.from=+el.value;ch=true}}
  else if(el.dataset.za){const [b,k]=el.dataset.za.split('|');const v=parseInput(el.value);
    const ok=v!=null&&Number.isFinite(v)&&(k==='y'?v>=0&&v<=20:k==='s'?v>=0&&v<=20:v>=-20&&v<=20);
    if(!ok){el.setAttribute('aria-invalid','true');toast(k==='y'?'Rendite zwischen 0 und 20 %':k==='s'?'Spanne zwischen 0 und 20 %':'Kursentwicklung zwischen −20 und 20 %');return}
    el.removeAttribute('aria-invalid');z.assume[b][k]=v;ch=true}
  if(ch){zState.simKey=null;persist();rerender()}});

/* ---------- Tipp-Modus: Kurs in zwölf Monaten, später gewertet ---------- */
function zTipHTML(d){
  const cands=d.positions.filter(p=>isIncluded(p)&&quoteFor(p));
  if(!cands.length)return `<section class="card col" style="gap:6px"><h2 class="h2" style="margin:0">Dein Tipp</h2><p class="small muted2">Tipps gehen nur mit aktuellem Kurs; der ist gerade nicht verfügbar.</p></section>`;
  const sel=zState.tipSym&&cands.find(p=>p.symbol===zState.tipSym)||cands[0];const q=quoteFor(sel);const v=zState.tipPct??0;
  const a=zcfg(d).assume[sel.bucket||'single'];const open=(FUN.tips||[]).filter(t=>!t.res&&t.sym===sel.symbol);
  return `<section class="card col" style="gap:8px"><div class="row between"><h2 class="h2" style="margin:0">Dein Tipp: Kurs in 12 Monaten</h2><span class="chip-soon">Liga</span></div>
   <label class="field" for="tipSym">Position<select id="tipSym">${cands.map(p=>`<option value="${esc(p.symbol)}" ${p===sel?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label>
   <div class="ztip"><input type="range" id="tipPct" min="-50" max="50" step="5" value="${v}" aria-label="Erwartete Kursveränderung in Prozent" aria-valuetext="${v>0?'+':''}${v} %">
    <div class="col" style="gap:4px"><span class="big" style="font-size:28px" id="tipVal">${v>0?'+':''}${v} %</span><span class="small muted2" id="tipPx">Kurs heute ${num(q.eurPx,2)} € → ${num(q.eurPx*(1+v/100),2)} €</span>
    <span class="small muted2">Zum Vergleich deine Annahme für ${esc(BN[sel.bucket]?BN[sel.bucket].name:'den Baustein')}: ${num(a.g-a.s,0)} bis ${num(a.g+a.s,0)} % im Jahr</span></div></div>
   <button class="btn solid" id="tipSave" type="button" ${open.length?'disabled':''}>${open.length?`Tipp läuft bis ${deDate(open[0].due)}`:'Tipp abgeben'}</button>
   <p class="hint">Nach zwölf Monaten wird mit dem dann aktuellen Kurs gewertet: je näher, desto mehr Punkte. Ein Tipp je Position gleichzeitig.</p></section>`;
}
document.addEventListener('input',e=>{if(e.target.id!=='tipPct')return;const v=+e.target.value;zState.tipPct=v;const d=D();const p=d.positions.find(x=>x.symbol===(zState.tipSym||(document.getElementById('tipSym')||{}).value));const q=p&&quoteFor(p);
  const tv=document.getElementById('tipVal');if(tv)tv.textContent=(v>0?'+':'')+v+' %';const tp=document.getElementById('tipPx');if(tp&&q)tp.textContent=`Kurs heute ${num(q.eurPx,2)} € → ${num(q.eurPx*(1+v/100),2)} €`;
  e.target.setAttribute('aria-valuetext',(v>0?'+':'')+v+' %')});
document.addEventListener('change',e=>{if(e.target.id==='tipSym'){zState.tipSym=e.target.value;zState.tipPct=0;rerender()}});
document.addEventListener('click',e=>{if(!(e.target.closest&&e.target.closest('#tipSave')))return;const d=D();const sym=zState.tipSym||document.getElementById('tipSym').value;const p=d.positions.find(x=>x.symbol===sym);const q=p&&quoteFor(p);if(!q)return;
  FUN.tips=FUN.tips||[];const now=new Date(),due=new Date(now.getTime()+365*864e5);
  FUN.tips.push({sym,name:p.name,kind:d.kind,pct:zState.tipPct??0,price:q.eurPx,date:now.toISOString().slice(0,10),due:due.toISOString().slice(0,10)});
  FUN.points+=2;touchDay();saveFun();toast('Tipp gespeichert · in 12 Monaten gewertet');rerender()});
/* Fällige Tipps mit aktuellem Kurs werten */
function resolveTips(){let ch=false;const today=todayISO();(FUN.tips||[]).forEach(t=>{if(t.res||t.due>today||!PRICES||!PRICES.quotes)return;
  const p={symbol:t.sym,qty:1};const q=quoteFor(p);if(!q)return;const act=q.eurPx/t.price-1,err=Math.abs(act-t.pct/100);
  t.res={act,err,pts:Math.max(0,Math.round(20*(1-err/0.4))),at:today};FUN.points+=t.res.pts;ch=true});if(ch)saveFun()}
function tipsHTML(){const tips=(FUN.tips||[]).filter(t=>t.kind===D().kind);if(!tips.length)return '';
  return `<section class="card"><h2 class="h2">Deine Kurstipps</h2>${tips.slice().reverse().map(t=>`<div class="fact"><span class="strong">${esc(t.name)}: ${t.pct>0?'+':''}${t.pct} % in 12 Monaten</span>
   <span class="small muted2">abgegeben ${deDate(t.date)} bei ${num(t.price,2)} € · ${t.res?`<b class="${t.res.pts>=10?'pos-text':'neg-text'}">tatsächlich ${spct(t.res.act,1)} · +${t.res.pts} Punkte</b>`:`gewertet am ${deDate(t.due)}`}</span></div>`).join('')}</section>`}
