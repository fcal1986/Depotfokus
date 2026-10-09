#!/usr/bin/env python3
"""Setzt index.html aus src/shell.html und den Skriptteilen zusammen."""
import pathlib
root=pathlib.Path(__file__).resolve().parent.parent
parts=['tx.js','logic.js','parts.js','zeit.js','stadt.js','kalender.js','szenario.js','ui.js']
import json
data=json.loads((root/'data'/'info.json').read_text())
resolved=json.loads((root/'data'/'resolved.json').read_text())
world=json.loads((root/'data'/'world.json').read_text())
divs=json.loads((root/'data'/'dividends.json').read_text())
# Szenario-Monitor: Definitionen, schlanke Modellbeschreibung, Wochenindex, Prüfstatus und der jüngste Stand.
# Ältere Wochen lädt die App bei Bedarf aus data/scenarios/snapshots/ (wird nach _site kopiert).
sd=root/'data'/'scenarios'
def rj(p,d=None):
    try: return json.loads(p.read_text())
    except FileNotFoundError: return d
scen=None
if (sd/'scenario_set.json').exists():
    cfg=rj(sd/'model_config.json')
    index=rj(sd/'snapshots'/'index.json',{'snapshots':[]})
    snaps=sorted(index.get('snapshots',[]),key=lambda s:(s['week_id'],s['revision']))
    latest=rj(sd/'snapshots'/(snaps[-1]['snapshot_id']+'.json')) if snaps else None
    if latest:
        for i in latest.get('inputs',[]): i.pop('basis',None)
    scen={'set':rj(sd/'scenario_set.json'),
          'config':{k:cfg[k] for k in ('model_version','method_label','formula','beta','beta_reason','loadings_reason','signal_direction','missing_rule','correlation_rule')}|{'critical_rule':cfg['critical']['rule'],'groups':[{'id':g['id'],'name':g['name'],'weight':g['weight']} for g in cfg['groups']]},
          'index':[{k:s[k] for k in ('snapshot_id','week_id','revision','status','display','generated_at','model_version')} for s in snaps],
          'status':rj(sd/'status.json',{}),'latest':latest}
head='/* Einordnungen und Auflösungen aus data/*.json (beim Build eingebettet) */\nconst DATA='+json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')+';\nconst RESOLVED_DATA='+json.dumps(resolved,ensure_ascii=False,separators=(',',':'))+';\nconst WORLD='+json.dumps(world,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')+';\nconst DIVS='+json.dumps(divs,ensure_ascii=False,separators=(',',':'))+';\nconst SCEN='+json.dumps(scen,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')+';\n'
js=head+'\n'.join((root/'src'/p).read_text() for p in parts)
shell=(root/'src'/'shell.html').read_text()
assert '/*__SCRIPT__*/' in shell
(root/'index.html').write_text(shell.replace('/*__SCRIPT__*/',js))
print('index.html', len(shell)+len(js))
