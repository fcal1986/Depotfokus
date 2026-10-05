function renderConfirm(){
  const d=D(),un=unresolved(d),nb=noBucket(d),sk=d.positions.filter(p=>p.conf==='skip');
  let h=`<h2>Zuordnungen prüfen</h2>`;
  if(!un.length&&!nb.length&&!sk.length){h+='<p class="hint">Keine offenen Zuordnungen.</p>';$('#confirmCard').innerHTML=h;return}
  h+=un.map(p=>`<div class="conf"><div><b>${esc(p.name)}</b><div class="hint num">${esc(p.symbol||'ohne Symbol')} · ${p.qty!=null?num(p.qty,4)+' Stück':'Stückzahl fehlt'} · Kurs ${p.price!=null?num(p.price,2):'–'} in unbekannter Währung · Marktwert laut Export ${num(p.exportValue,2)}</div>
    <p class="hint" style="margin-top:4px">Der Kurs kann in Dollar notiert sein. Ob der Marktwert trotzdem in Euro angegeben ist, lässt sich aus dem Export nicht erkennen.</p></div>
    <div class="opts"><button class="btn" data-conf="${esc(p.id)}|eur">Marktwert ist in Euro</button><button class="btn" data-conf="${esc(p.id)}|manual">Wert in Euro eintragen</button><button class="btn" data-conf="${esc(p.id)}|skip">Nicht einrechnen</button></div>
    <div class="opts" id="mv_${esc(p.id)}" hidden><label class="field" for="mvi_${esc(p.id)}">Wert in Euro<input class="numin" type="text" inputmode="decimal" id="mvi_${esc(p.id)}" style="width:140px"></label><button class="btn primary" data-confsave="${esc(p.id)}">Übernehmen</button><span class="err" id="mve_${esc(p.id)}"></span></div></div>`).join('');
  h+=nb.map(p=>`<div class="conf"><div><b>${esc(p.name)}</b><div class="hint">Baustein unbekannt: keine Stammdaten für ${esc(p.symbol||'dieses Wertpapier')}</div></div>
    <label class="field" for="bk_${esc(p.id)}">Baustein wählen<select id="bk_${esc(p.id)}" data-bucket="${esc(p.id)}"><option value="">bitte wählen</option>${B.filter(b=>b.id!=='liq').map(b=>`<option value="${b.id}">${b.name}</option>`).join('')}</select></label></div>`).join('');
  if(sk.length)h+=`<p class="hint" style="margin-top:10px">Bewusst nicht eingerechnet: ${sk.map(p=>esc(p.name)).join(', ')}. <button class="link" data-unskip="1">Auswahl zurücksetzen</button></p>`;
  $('#confirmCard').innerHTML=h;
}
function renderExt(){
  const d=D();
  $('#extCard').innerHTML=`<h2>Vermögen außerhalb des Depots</h2>
   <label class="field" for="reserve" style="max-width:320px">Frei verfügbare Reserve (Notgroschen), wird nicht eingerechnet
     <input class="numin" style="width:140px" type="text" inputmode="decimal" id="reserve" value="${d.external.reserve||''}" aria-describedby="resErr"><span class="err" id="resErr"></span></label>
   <h3>Für deine Anlageziele vorgesehen</h3>
   ${d.external.items.map((x,i)=>`<div class="row" style="padding:6px 0"><select data-exttype="${i}" aria-label="Art">${[['tagesgeld','Tagesgeld'],['festgeld','Festgeld'],['bonds','Anleihen oder Anleihefonds']].map(([v,l])=>`<option value="${v}" ${x.type===v?'selected':''}>${l}</option>`).join('')}</select>
     <input class="numin" style="width:130px" type="text" inputmode="decimal" data-extval="${i}" value="${x.value||''}" aria-label="Betrag in Euro"> € <button class="link" data-extdel="${i}" aria-label="Eintrag entfernen">Entfernen</button></div>`).join('')||'<p class="hint">Keine Einträge.</p>'}
   <button class="btn" id="extAdd" style="margin-top:8px">Eintrag hinzufügen</button>
   <p class="hint" style="margin-top:8px">Tagesgeld und Festgeld zählen zum Baustein „Konto & Tagesgeld“, Anleihen zu „Anleihen“. Beides schwankt unterschiedlich und ist nicht risikolos gleichzusetzen.</p>`;
}
function renderImport(){
  const d=D();let h=`<h2>Daten importieren</h2>
   <p>Aus Portfolio Performance als CSV, eine oder mehrere Dateien auf einmal:</p>
   <ol class="steps-list"><li><b>Vermögensaufstellung</b> für Bestand und Werte.</li><li><b>Umsätze</b> (Depot- und Kontoumsätze) für Einstand, Gewinn, Ausschüttungen und Rendite.</li></ol>
   <details><summary>So exportierst du in Portfolio Performance</summary><div class="small muted2 col" style="gap:4px;margin-top:6px"><p>Vermögensaufstellung: Ansicht „Vermögensaufstellung“ öffnen, oben rechts Export › CSV.</p><p>Umsätze: Datei › Exportieren › CSV › „Depotumsätze“ und „Kontoumsätze“ (alle Konten). Beide Dateien kannst du zusammen auswählen; doppelte Buchungen zählen nur einmal.</p><p>Nur Euro-Konten werden ausgewertet.</p></div></details>
   <div class="row" style="margin-top:12px"><label class="btn primary" for="file">Dateien auswählen<input type="file" id="file" accept=".csv,.txt,text/csv" multiple class="sr-only"></label></div>`;
  if(staged){const s=staged;
    if(s.error)h+=`<div class="stage" role="alert"><b class="bad">Import nicht möglich</b><p>${esc(s.error)}</p><p class="hint">Dein bisheriger Bestand bleibt unverändert.</p><div class="row"><button class="btn" id="stDiscard">Schließen</button></div></div>`;
    else{const sum=s.positions.reduce((a,p)=>a+p.exportValue,0)+s.accounts.reduce((a,x)=>a+x.value,0);const un=s.positions.filter(p=>p.valueStatus==='unclear').length,nb=s.positions.filter(p=>!p.bucket).length;
      h+=`<div class="stage"><div><b>Prüfung: ${esc(s.fileName)}</b><p class="hint">Noch nichts übernommen.</p></div>
       <div><span class="lbl">Erkannte Spalten</span><p>${Object.entries(s.cols).map(([k,v])=>`${({name:'Name',value:'Marktwert',qty:'Bestand',symbol:'Symbol',price:'Kurs',isin:'ISIN'})[k]}: „${esc(v)}“`).join(' · ')}</p></div>
       <div><span class="lbl">Positionen</span><p>${s.positions.length} Wertpapiere${un?`, davon ${un} mit unklarer Kurswährung`:''}${nb?`, ${nb} ohne bekannten Baustein`:''}</p></div>
       ${s.accounts.length?`<div><span class="lbl">Mögliche Konten</span>${s.accounts.map((a,i)=>`<label class="row" style="gap:8px;padding:4px 0"><input type="checkbox" data-acc="${i}" ${a.accept?'checked':''}> „${esc(a.name)}“ mit ${eur(a.value,2)} als Verrechnungskonto übernehmen</label>`).join('')}<p class="hint">Zeilen ohne Stückzahl und Symbol. Nicht bestätigte Zeilen werden nicht übernommen.</p></div>`:''}
       <div><span class="lbl">Summenvergleich</span><p>${s.fileSum!=null?`Datei: ${eur(s.fileSum,2)} · erkannt: ${eur(sum,2)} · ${Math.abs(s.fileSum-sum)<0.05?'<span class="ok">stimmt überein</span>':`<span class="bad">Abweichung ${eur(s.fileSum-sum,2)}</span>`}`:'Keine Summenzeile in der Datei.'}</p></div>
       ${s.skipped.length?`<div><span class="lbl">Übersprungene Zeilen</span>${s.skipped.map(x=>`<p class="hint">Zeile ${x.line}: ${esc(x.reason)}</p>`).join('')}</div>`:''}
       <label class="field" for="stDate" style="max-width:240px">Bewertungsstichtag (optional, nicht im Export)<input type="date" id="stDate"></label>
       ${OWN?`<label class="row" style="gap:8px"><input type="checkbox" id="stReplace"> Mir ist klar, dass mein bisheriger eigener Bestand ersetzt wird. Ziele und Bestätigungen gleicher Positionen bleiben erhalten.</label>`:''}
       <div class="row"><button class="btn primary" id="stAccept" ${OWN?'disabled':''}>Bestand übernehmen</button><button class="btn" id="stDiscard">Verwerfen</button></div></div>`}}
  if(stagedTx)h+=txPreview(stagedTx);
  $('#importCard').innerHTML=h;
}
function renderSourceCard(){
  $('#sourceCard').innerHTML=`<h2>Datenquelle und Speicherung</h2>
   <p>${D().kind==='demo'?'Du siehst das <b>Demodepot</b>.':'Du siehst dein <b>eigenes Depot</b>.'} ${OWN?'Ein eigenes Depot ist auf diesem Gerät gespeichert.':'Auf diesem Gerät ist kein eigenes Depot gespeichert.'}</p>
   <div class="row" style="margin-top:10px">${D().kind==='own'?'<button class="btn" data-src="demo">Demodepot ansehen</button>':OWN?'<button class="btn" data-src="own">Mein Depot anzeigen</button>':''}
    ${OWN?(pendingDelete?`<button class="btn danger" id="delConfirm">Endgültig löschen</button><button class="btn" id="delCancel">Abbrechen</button>`:'<button class="btn danger" id="delAsk">Daten auf diesem Gerät löschen</button>'):''}</div>
   <p class="hint" style="margin-top:10px">Eigene Daten werden nur im Speicher dieses Browsers abgelegt. Das ist keine Sicherung: Sie fehlen auf anderen Geräten und gehen verloren, wenn Websitedaten gelöscht werden. Das Demodepot wird nie gespeichert und vermischt sich nicht mit deinen Daten.</p>`;
}

function acceptImport(){
  if(!staged)return;
  const s=staged;if(!s||s.error)return;
  const prev=OWN;const d=newDepot('own');
  d.fileName=s.fileName;d.importedAt=nowStr();
  const dt=$('#stDate')&&$('#stDate').value;d.valuationDate=dt?dt.split('-').reverse().join('.'):null;
  d.positions=s.positions.map(p=>({...p}));d.accounts=s.accounts.filter(a=>a.accept).map(a=>({name:a.name,value:a.value}));
  if(prev){// Ziele, Bestätigungen, Einstellungen erhalten
    d.goals=prev.goals;d.goalsSource=prev.goalsSource;d.maxSingle=prev.maxSingle;d.budget=prev.budget;d.cashMode=prev.cashMode;d.minRate=prev.minRate;d.external=prev.external;d.notify=prev.notify;d.events=prev.events;d.read=prev.read;d.baseline=prev.baseline;d.tx=prev.tx||null;d.txMeta=prev.txMeta||null;
    d.positions.forEach(p=>{const o=prev.positions.find(x=>x.id===p.id);if(o){if(o.conf&&p.valueStatus==='unclear'&&o.exportValue===p.exportValue){p.conf=o.conf;p.manualValue=o.manualValue}if(!p.bucket&&o.bucket){p.bucket=o.bucket;p.bucketSrc=o.bucketSrc}}});
  }
  OWN=d;UI.source='own';saveUI();staged=null;
  addEvent(d,{t:`Bestand importiert: ${d.fileName}`,b:`${d.positions.length} Wertpapiere, ${d.accounts.length} Konten. ${unresolved(d).length?unresolved(d).length+' Zuordnungen offen.':'Keine offenen Zuordnungen.'}`,go:unresolved(d).length?['depot','confirmCard']:['home','wealthCard']});
  evaluateChanges(d,!prev);persist();renderAll();toast('Bestand übernommen');if(stagedTx){location.hash='#daten';rerender()}else setTab('home');
}

let stagedTx=null;
function txPreview(s){
  if(s.error)return `<div class="stage" role="alert"><b class="bad">Umsätze: Import nicht möglich</b><p>${esc(s.error)}</p><div class="row"><button class="btn" id="stTxDiscard">Schließen</button></div></div>`;
  const target=OWN;let match='';
  if(target){const m=txModel({...target,tx:s.tx},true);const held=m.secs.filter(x=>x.held);
    match=`<div><span class="lbl">Abgleich mit deinem Bestand</span><p>${held.filter(x=>x.pos&&!x.mismatch).length} von ${held.length} Wertpapieren passen zu Bestand und Stückzahl.${m.posNoTx.length?` Ohne Umsätze: ${m.posNoTx.map(p=>esc(p.name)).join(', ')}.`:''}</p>${m.issues.length?`<p class="bad small">Abweichungen: ${m.issues.map(x=>esc(x.name||x.symbol||x.isin)+(x.mismatch?` (${num(x.shares,4)} statt ${num(x.pos.qty,4)} Stück)`:x.missingPos?' (nicht im Bestand)':'')).join(', ')}</p>`:''}</div>`}
  const types=Object.entries(s.counts).map(([k,n])=>`${n} × ${TXN[k]}`).join(' · ');
  return `<div class="stage"><div><b>Umsätze prüfen: ${esc(s.fileName)}</b><p class="hint">Noch nichts übernommen.</p></div>
   <div><span class="lbl">Erkannte Spalten</span><p>${Object.entries(s.cols).map(([k,v])=>`${k}: „${esc(v)}“`).join(' · ')}</p></div>
   <div><span class="lbl">Buchungen</span><p>${s.tx.length} vom ${isoToDe(s.from)} bis ${isoToDe(s.to)}: ${types}${s.dupes?`. ${s.dupes} doppelte Buchungen nur einmal gezählt`:''}.</p></div>
   ${match}
   ${s.skipped.length?`<details><summary>${s.skipped.length} Zeilen nicht ausgewertet</summary>${s.skipped.slice(0,40).map(x=>`<p class="hint">${x.file?esc(x.file)+', ':''}Zeile ${x.line}: ${esc(x.reason)}</p>`).join('')}${s.skipped.length>40?`<p class="hint">… und ${s.skipped.length-40} weitere</p>`:''}</details>`:''}
   ${!OWN?'<p class="hint-box">Übernimm zuerst die Vermögensaufstellung. Umsätze werden deinem eigenen Depot zugeordnet.</p>':OWN.tx&&OWN.tx.length?`<p class="hint">Ersetzt die bisherigen ${OWN.tx.length} Umsätze.</p>`:''}
   <div class="row"><button class="btn primary" id="stTxAccept" ${OWN?'':'disabled'}>Umsätze übernehmen</button><button class="btn" id="stTxDiscard">Verwerfen</button></div></div>`;
}
function acceptTx(){
  const s=stagedTx;if(!s||s.error||!OWN)return;
  OWN.tx=s.tx.map(({line,...t})=>t);OWN.txMeta={fileName:s.fileName,importedAt:nowStr(),from:s.from,to:s.to,count:s.tx.length};
  UI.source='own';saveUI();stagedTx=null;_txc.k=null;
  addEvent(OWN,{t:`Umsätze importiert: ${s.tx.length} Buchungen`,b:`Zeitraum ${isoToDe(s.from)} bis ${isoToDe(s.to)}.`,go:['depot','perf']});
  persist();toast('Umsätze übernommen');location.hash='#depot';rerender();
}
function renderTxCard(){
  const d=D(),m=txModel(d),el=$('#txCard');if(!el)return;
  if(!m){el.innerHTML=`<h2>Umsätze</h2><p class="hint">Noch keine Umsätze. Importiere sie oben, um Einstand, Gewinn, Ausschüttungen und Rendite zu sehen.</p>`;return}
  el.innerHTML=`<h2>Umsätze</h2><p>${d.tx.length} Buchungen vom ${isoToDe(m.M.first)} bis ${isoToDe(m.M.last)}${d.txMeta?`, Datei ${esc(d.txMeta.fileName)}, übernommen ${esc(d.txMeta.importedAt)}`:''}.</p>
   <p class="hint" style="margin-top:6px">Einstand nach FIFO wie beim Finanzamt: Verkauft werden zuerst die ältesten Anteile.</p>
   ${d.kind==='own'?`<div class="row" style="margin-top:10px"><button class="btn danger" id="txDelete">Umsätze entfernen</button></div>`:''}`;
}
function renderPrices(){
  const el=$('#pricesCard');if(!el)return;const d=D(),pi=priceInfo(d);
  el.innerHTML=`<h2>Kurse</h2>
   ${pi.avail?`<p>Kurse von ${esc(fmtAsOf(pi.asOf))} für ${pi.n} von ${pi.of} Positionen. Quelle: ${esc(PRICES.source||'Kursdienst')}, verzögert, ohne Gewähr.</p>
     <label class="switch" style="margin-top:6px"><span>Aktuelle Kurse verwenden</span><input type="checkbox" id="liveToggle" ${pi.on?'checked':''}></label>
     <p class="hint">Aus: Werte aus deinem Export. Positionen ohne aktuellen Kurs behalten immer den Exportwert.${PRICES.missing&&PRICES.missing.length?` Ohne Kurs beim letzten Abruf: ${esc(PRICES.missing.join(', '))}.`:''}</p>`
   :'<p>Aktuelle Kurse sind gerade nicht verfügbar. Es gelten die Werte aus deinem Export.</p><p class="hint">Kurse werden Mo–Fr während der Handelszeit etwa alle 15 Minuten abgerufen.</p>'}`;
}
const fmtAsOf=s=>{if(!s)return 'unbekannt';const d=new Date(s);return isNaN(d)?s:d.toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})};
