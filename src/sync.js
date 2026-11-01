/* =========================================================
   EXPORT-ORDNER UND NACHRICHTEN-KNOPF
   1. Export-Ordner: Du wählst einmal einen Ordner auf diesem Gerät (z. B. den
      synchronisierten Google-Drive-Ordner). Depotfokus merkt sich den Zugriff
      (IndexedDB, nur dieses Gerät) und sieht beim Öffnen und alle 5 Minuten nach,
      ob dort eine neue CSV-Datei liegt. Neue Dateien werden erst nach deiner
      Bestätigung über die bekannte Importprüfung übernommen. Nichts wird hochgeladen.
      Voraussetzung: Chrome oder Edge (Desktop) bzw. Chrome ab Version 132 (Android).
   2. Nachrichten-Knopf: startet den GitHub-Workflow „Nachrichten“ mit einem Token,
      das nur auf diesem Gerät liegt, verfolgt den Lauf und lädt danach neu.
   ========================================================= */
const FOLDER_KEY='depotfokus-folder',GH_KEY='depotfokus-gh';
const FOLDER=Object.assign({name:null,seen:{},lastScan:null,found:[],error:null,perm:null,busy:false,pending:null},load(FOLDER_KEY)||{},{found:[],error:null,perm:null,busy:false,pending:null});
const saveFolder=()=>store(FOLDER_KEY,{name:FOLDER.name,seen:FOLDER.seen,lastScan:FOLDER.lastScan});
const canFolder=()=>typeof window!=='undefined'&&'showDirectoryPicker' in window&&window.isSecureContext!==false;
let folderHandle=null;
const fileKey=f=>`${f.name}|${f.lastModified}|${f.size}`;

/* Ordnerzugriff in IndexedDB (nur Handles lassen sich dort speichern, nicht in localStorage) */
function idb(){return new Promise((res,rej)=>{if(!window.indexedDB)return rej(new Error('kein IndexedDB'));const r=indexedDB.open('depotfokus',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function idbSet(k,v){const db=await idb();return new Promise((res,rej)=>{const tx=db.transaction('kv','readwrite');v==null?tx.objectStore('kv').delete(k):tx.objectStore('kv').put(v,k);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
async function idbGet(k){const db=await idb();return new Promise((res,rej)=>{const tx=db.transaction('kv','readonly'),q=tx.objectStore('kv').get(k);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})}

async function folderConnect(){
  if(!canFolder()){toast('Dieser Browser kann keine Ordner lesen. Nutze Chrome oder Edge.');return}
  try{const h=await window.showDirectoryPicker({id:'depotfokus-exporte',mode:'read'});
    folderHandle=h;FOLDER.name=h.name;FOLDER.seen=FOLDER.seen||{};FOLDER.perm='granted';
    try{await idbSet('folder',h)}catch(e){/* Handle nicht speicherbar: gilt nur bis zum Schließen */}
    saveFolder();await folderScan(true);
  }catch(e){if(e&&e.name==='AbortError')return;FOLDER.error=e.message;rerender()}}
async function folderForget(){folderHandle=null;FOLDER.name=null;FOLDER.seen={};FOLDER.found=[];FOLDER.lastScan=null;try{await idbSet('folder',null)}catch(e){}saveFolder();rerender();toast('Ordner getrennt')}
async function folderRestore(){if(folderHandle||!canFolder()||!FOLDER.name)return;try{folderHandle=await idbGet('folder')}catch(e){folderHandle=null}}
/* Berechtigung: im Hintergrund nur abfragen; erneuern braucht einen Tipp (Browser-Regel) */
async function folderPerm(ask){if(!folderHandle)return 'none';try{let p=await folderHandle.queryPermission({mode:'read'});if(p!=='granted'&&ask)p=await folderHandle.requestPermission({mode:'read'});return p}catch(e){return 'denied'}}

/* Ordner durchsehen: CSV-Dateien (auch eine Ebene tiefer), neueste zuerst; neu = noch nicht übernommen */
async function folderScan(ask){
  await folderRestore();if(!folderHandle||FOLDER.busy)return;
  FOLDER.perm=await folderPerm(ask);if(FOLDER.perm!=='granted'){rerender();return}
  FOLDER.busy=true;FOLDER.error=null;
  try{const files=[];
    const walk=async(dir,prefix,depth)=>{for await(const [name,h] of dir.entries()){
      if(h.kind==='file'&&/\.(csv|txt)$/i.test(name)){const f=await h.getFile();files.push({name:prefix+name,file:f,key:fileKey({name:prefix+name,lastModified:f.lastModified,size:f.size}),mod:f.lastModified})}
      else if(h.kind==='directory'&&depth<1&&!name.startsWith('.'))await walk(h,prefix+name+'/',depth+1)}};
    await walk(folderHandle,'',0);
    files.sort((a,b)=>b.mod-a.mod);
    const first=!Object.keys(FOLDER.seen).length&&!FOLDER.lastScan;
    FOLDER.found=files.filter(x=>!FOLDER.seen[x.key]).slice(0,12);
    // Erste Verbindung: nur die neueste Datei je Art vorschlagen, ältere gelten als bekannt
    if(first&&FOLDER.found.length){const pick=await folderNewestPerKind(FOLDER.found);files.forEach(x=>{if(!pick.includes(x))FOLDER.seen[x.key]=Date.now()});FOLDER.found=pick}
    FOLDER.total=files.length;FOLDER.lastScan=new Date().toISOString();saveFolder();
  }catch(e){FOLDER.error=e.message||String(e)}
  FOLDER.busy=false;rerender();updateBadges()}
async function folderNewestPerKind(list){const out=[],kinds=new Set();
  for(const x of list){let k='unbekannt';try{const a=analyzeCSV(await x.file.text(),x.name);k=a.error?'fehler':a.kind==='transactions'?'tx':'bestand'}catch(e){k='fehler'}
    x.kind=k;if(k==='fehler'||kinds.has(k))continue;kinds.add(k);out.push(x)}
  return out}
/* Gefundene Dateien in die Importprüfung geben (wie „Dateien auswählen“) */
async function folderReview(){if(!FOLDER.found.length)return;
  const list=await Promise.all(FOLDER.found.map(async x=>[x.name.split('/').pop(),await x.file.text()]));
  FOLDER.pending=FOLDER.found.map((x,i)=>{let k='bestand';try{const a=analyzeCSV(list[i][1],list[i][0]);k=a.kind==='transactions'?'tx':'bestand'}catch(e){}return {key:x.key,kind:k}});staged=null;stagedTx=null;
  location.hash='#daten';setTimeout(()=>{handleFiles(list);const c=document.getElementById('importCard');if(c)c.scrollIntoView({block:'start'})},60)}
/* Nach Übernahme oder „Ignorieren“: Dateien als bekannt merken */
/* Übernommen: nur die Dateien dieser Art als bekannt merken (Bestand bzw. Umsätze) */
function folderAccepted(kind){if(!FOLDER.pending)return;const done=FOLDER.pending.filter(x=>x.kind===kind);folderMarkSeen(done.map(x=>x.key));FOLDER.pending=(FOLDER.pending||[]).filter(x=>x.kind!==kind);if(!FOLDER.pending.length)FOLDER.pending=null}
function folderMarkSeen(keys){(keys||[]).forEach(k=>FOLDER.seen[k]=Date.now());const ks=Object.entries(FOLDER.seen).sort((a,b)=>b[1]-a[1]).slice(0,300);FOLDER.seen=Object.fromEntries(ks);
  FOLDER.found=FOLDER.found.filter(x=>!FOLDER.seen[x.key]);saveFolder()}

function folderBanner(){if(!FOLDER.name)return '';
  if(FOLDER.perm==='prompt')return `<div class="banner info"><b>Export-Ordner „${esc(FOLDER.name)}“</b><span>Der Browser fragt nach jedem Neustart erneut nach dem Zugriff.</span><button type="button" class="btn" id="folderAllow" style="margin-top:6px;min-height:44px">Ordner prüfen</button></div>`;
  if(!FOLDER.found.length)return '';
  const n=FOLDER.found.length,f=FOLDER.found[0];
  return `<div class="banner info" role="status"><b>${n>1?`${n} neue Exporte`:'Neuer Export'} im Ordner „${esc(FOLDER.name)}“</b><span>${esc(FOLDER.found.map(x=>x.name.split('/').pop()).join(', '))} · zuletzt geändert ${esc(new Date(f.mod).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}))}</span>
   <span class="row" style="gap:10px;margin-top:6px"><button type="button" class="btn primary" id="folderReview" style="min-height:44px">Prüfen und übernehmen</button><button type="button" class="link" id="folderIgnore">Ignorieren</button></span></div>`}

function folderCard(){
  if(!canFolder())return `<section class="card col" style="gap:6px"><h2 class="h2" style="margin:0">Export-Ordner</h2><p class="small muted2">Dieser Browser kann keine Ordner lesen (Safari und Firefox unterstützen das nicht). In Chrome oder Edge auf dem PC und in Chrome auf Android erkennt Depotfokus neue Exporte automatisch. Hier kannst du Dateien weiter oben wie gewohnt auswählen.</p></section>`;
  return `<section class="card col" style="gap:8px"><div class="row between"><h2 class="h2" style="margin:0">Export-Ordner</h2><span class="mode dev">nur dieses Gerät</span></div>
   ${FOLDER.name?`<dl class="kv"><dt>Ordner</dt><dd>${esc(FOLDER.name)}</dd><dt>Zugriff</dt><dd>${FOLDER.perm==='granted'?'erlaubt':FOLDER.perm==='prompt'?'muss nach dem Neustart bestätigt werden':FOLDER.perm==='denied'?'abgelehnt':'wird geprüft'}</dd>
     <dt>Zuletzt geprüft</dt><dd>${FOLDER.lastScan?esc(fmtAsOf(FOLDER.lastScan)):'–'}${FOLDER.total!=null?` · ${FOLDER.total} CSV-Dateien`:''}</dd>
     <dt>Neu</dt><dd>${FOLDER.found.length?esc(FOLDER.found.map(x=>x.name).join(', ')):'keine neuen Dateien'}</dd></dl>
     ${FOLDER.error?`<p class="err">${esc(FOLDER.error)}</p>`:''}
     <div class="row" style="gap:8px"><button type="button" class="btn" id="folderCheck">Jetzt prüfen</button>${FOLDER.found.length?'<button type="button" class="btn primary" id="folderReview">Prüfen und übernehmen</button>':''}<button type="button" class="link" id="folderForget">Ordner trennen</button></div>`
   :`<p class="small">Wähle den Ordner, in den du die Exporte aus Portfolio Performance legst. Depotfokus sieht beim Öffnen nach, ob dort eine neue Datei liegt, und fragt dann, ob du sie übernehmen willst.</p>
     <button type="button" class="btn primary" id="folderConnect">Ordner auswählen</button>`}
   <details><summary>Google Drive einrichten</summary><div class="small muted2 col" style="gap:4px;margin-top:6px">
    <p><b>PC:</b> Mit „Google Drive für Desktop“ erscheint dein Drive als Laufwerk (z. B. „G:\\Meine Ablage“). Wähle dort den Export-Ordner.</p>
    <p><b>Android:</b> Im Auswahlfenster kann Google Drive fehlen, weil Drive keinen Ordnerzugriff anbietet. Dann den Ordner in der Drive-App „Offline verfügbar“ machen oder die Exporte in einen Ordner auf dem Handy (z. B. Download/Depotfokus) legen und diesen wählen.</p>
    <p>Der Zugriff ist nur lesend und bleibt auf diesem Gerät. Nach einem Neustart des Browsers fragt Chrome einmal nach, ob der Zugriff weiter gelten soll.</p></div></details></section>`}

/* ---------- Nachrichten-Knopf (GitHub workflow_dispatch) ---------- */
const GH=Object.assign({token:null,owner:null,repo:null},load(GH_KEY)||{});
const ghRepo=()=>{const h=location.hostname.match(/^([\w-]+)\.github\.io$/),seg=location.pathname.split('/').filter(Boolean)[0];
  return {owner:GH.owner||(h?h[1]:'fcal1986'),repo:GH.repo||(h&&seg?seg:'Depotfokus')}};
const NEWSRUN={state:null,msg:'',started:null,runId:null,timer:null,url:null};
async function ghApi(path,opt={}){const {owner,repo}=ghRepo();
  const r=await fetch(`https://api.github.com/repos/${owner}/${repo}${path}`,{...opt,headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',Authorization:`Bearer ${GH.token}`,...(opt.body?{'Content-Type':'application/json'}:{})}});
  if(r.status===204)return null;const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(j.message||('HTTP '+r.status)),{status:r.status});return j}
async function ghSaveToken(v){v=String(v||'').trim();if(!v){GH.token=null;store(GH_KEY,null);rerender();toast('Token entfernt');return}
  if(!/^(github_pat_|ghp_)[A-Za-z0-9_]{20,}$/.test(v)){toast('Das sieht nicht nach einem GitHub-Token aus.');return}
  GH.token=v;try{await ghApi('/actions/workflows/news.yml');store(GH_KEY,{token:v});toast('Token geprüft und gespeichert')}
  catch(e){GH.token=null;toast(e.status===401?'Token ungültig oder abgelaufen.':e.status===404?'Token hat keinen Zugriff auf dieses Repository.':'Prüfung fehlgeschlagen: '+e.message)}rerender()}
function newsRunSet(state,msg){NEWSRUN.state=state;NEWSRUN.msg=msg;const el=document.getElementById('newsRunStatus');if(el){el.textContent=msg;el.className='small '+(state==='error'?'err':'muted2')}else if(parse().r==='nachrichten')rerender()}
async function newsRunStart(){
  if(!GH.token){location.hash='#daten';setTimeout(()=>{const c=document.getElementById('ghCard');if(c)c.scrollIntoView({block:'start'})},60);return}
  if(NEWSRUN.state==='running'){toast('Läuft bereits');return}
  const before=NEWS&&NEWS.latest?NEWS.latest.generated_at:null;
  NEWSRUN.started=new Date();NEWSRUN.runId=null;newsRunSet('running','Wird gestartet …');rerender();
  try{await ghApi('/actions/workflows/news.yml/dispatches',{method:'POST',body:JSON.stringify({ref:'main',inputs:{erneut:'true'}})})}
  catch(e){newsRunSet('error',e.status===403?'Token darf den Lauf nicht starten (Berechtigung „Actions: Read and write“ fehlt).':e.status===401?'Token ungültig oder abgelaufen; bitte unter Einstellungen erneuern.':'Start fehlgeschlagen: '+e.message);rerender();return}
  newsRunSet('running','Gestartet. GitHub bereitet den Lauf vor …');
  const t0=Date.now();clearInterval(NEWSRUN.timer);
  NEWSRUN.timer=setInterval(async()=>{if(Date.now()-t0>25*60e3){clearInterval(NEWSRUN.timer);newsRunSet('error','Nach 25 Minuten noch nicht fertig. Stand auf GitHub prüfen.');rerender();return}
    try{
      if(NEWSRUN.state==='running'){const j=await ghApi(`/actions/workflows/news.yml/runs?event=workflow_dispatch&per_page=5`);
        const run=(j.workflow_runs||[]).find(x=>Date.parse(x.created_at)>=NEWSRUN.started.getTime()-60e3);
        if(run){NEWSRUN.runId=run.id;NEWSRUN.url=run.html_url;
          if(run.status!=='completed')newsRunSet('running',run.status==='queued'?'Wartet auf GitHub …':'Läuft: Quellen abrufen, aufbereiten und prüfen …');
          else if(run.conclusion==='success')newsRunSet('publishing','Fertig. Die Seite wird veröffentlicht …');
          else{clearInterval(NEWSRUN.timer);newsRunSet('error',`Lauf beendet mit „${run.conclusion}“. Details auf GitHub.`);rerender()}}}
      if(NEWSRUN.state==='publishing'){const r=await fetch('data/news/latest.json?v='+Date.now(),{cache:'no-store'});const L=r.ok?await r.json():null;
        const S0=await fetch('data/news/status.json?v='+Date.now(),{cache:'no-store'}).then(x=>x.ok?x.json():null).catch(()=>null);
        if(L&&(L.generated_at!==before||(S0&&S0.last_run_at&&Date.parse(S0.last_run_at)>=NEWSRUN.started.getTime()-60e3))){NEWS.latest=L;if(S0)NEWS.status=S0;clearInterval(NEWSRUN.timer);
          newsRunSet('done',L.result==='none'?'Aktualisiert: keine neue relevante Entwicklung.':`Aktualisiert: ${L.items.length} ${L.items.length===1?'Meldung':'Meldungen'}.`);updateBadges();rerender()}}
    }catch(e){if(e.status===401){clearInterval(NEWSRUN.timer);newsRunSet('error','Token ungültig oder abgelaufen.');rerender()}}
  },15000)}
function newsRunBox(){const t=!!GH.token,st=NEWSRUN.state;
  return `<section class="card col" style="gap:6px"><div class="row between" style="flex-wrap:nowrap;gap:10px"><span class="col" style="gap:2px;min-width:0"><span class="strong">Aktuelle Nachrichten abrufen</span><span class="small muted2">${t?'Startet den Abruf auf GitHub; dauert meist 5–10 Minuten.':'Einmal einrichten, dann mit einem Tipp.'}</span></span>
   <button type="button" class="btn ${t?'primary':''}" id="newsRun" style="min-height:44px;flex:none" ${st==='running'||st==='publishing'?'disabled':''}>${st==='running'||st==='publishing'?'Läuft …':t?'Jetzt abrufen':'Einrichten'}</button></div>
   <span id="newsRunStatus" class="small ${st==='error'?'err':'muted2'}" role="status" aria-live="polite">${esc(NEWSRUN.msg||'')}</span>${NEWSRUN.url?`<a class="src" href="${esc(NEWSRUN.url)}" target="_blank" rel="noopener">Lauf auf GitHub ansehen</a>`:''}</section>`}
function ghCard(){const {owner,repo}=ghRepo();
  return `<section class="card col" style="gap:8px" id="ghCard"><div class="row between"><h2 class="h2" style="margin:0">Nachrichten-Knopf</h2><span class="mode dev">nur dieses Gerät</span></div>
   <p class="small">Mit einem GitHub-Token startet der Knopf unter Welt › Nachrichten den Abruf direkt. ${GH.token?'<b class="pos-text">Eingerichtet.</b>':'Noch nicht eingerichtet.'}</p>
   <details ${GH.token?'':'open'}><summary>So legst du das Token an</summary><ol class="steps-list small">
    <li>Auf GitHub <a class="link" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Fine-grained Token anlegen</a>.</li>
    <li>Name z. B. „Depotfokus-Knopf“, Ablauf z. B. 1 Jahr.</li>
    <li>Repository access: <b>Only select repositories</b> › <b>${esc(owner)}/${esc(repo)}</b>.</li>
    <li>Permissions › Repository › <b>Actions: Read and write</b>. Sonst nichts.</li>
    <li>Token kopieren und hier einfügen.</li></ol></details>
   <label class="field" for="ghToken">Token<input type="password" id="ghToken" autocomplete="off" spellcheck="false" placeholder="${GH.token?'•••• gespeichert':'github_pat_…'}" class="numin" style="width:100%;text-align:left;font-family:var(--mono)"></label>
   <div class="row" style="gap:8px"><button type="button" class="btn primary" id="ghSave">Prüfen und speichern</button>${GH.token?'<button type="button" class="link" id="ghClear">Token entfernen</button>':''}</div>
   <p class="hint">Das Token liegt nur im Speicher dieses Browsers und wird nur an api.github.com gesendet. Es kann ausschließlich Abläufe in diesem Repository starten, keinen Code ändern. Jeder Abruf mit neuen Meldungen kostet rund 0,10 $ an Claude-Gebühren; unveränderte Meldungen werden nicht erneut bezahlt. Widerrufen: GitHub › Settings › Developer settings › Personal access tokens.</p></section>`}

/* Ereignisse und Start */
document.addEventListener('click',e=>{const t=e.target;
  if(t.closest('#folderConnect')){folderConnect();return}
  if(t.closest('#folderCheck')||t.closest('#folderAllow')){folderScan(true);return}
  if(t.closest('#folderReview')){folderReview();return}
  if(t.closest('#folderIgnore')){folderMarkSeen(FOLDER.found.map(x=>x.key));rerender();toast('Als bekannt markiert');return}
  if(t.closest('#folderForget')){folderForget();return}
  if(t.closest('#ghSave')){const el=document.getElementById('ghToken');ghSaveToken(el&&el.value);return}
  if(t.closest('#ghClear')){ghSaveToken('');return}
  if(t.closest('#newsRun')){newsRunStart();return}});
if(typeof window!=='undefined'&&canFolder()&&FOLDER.name){
  setTimeout(()=>folderScan(false),300);
  setInterval(()=>{if(!document.hidden)folderScan(false)},5*60*1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)folderScan(false)});
}
