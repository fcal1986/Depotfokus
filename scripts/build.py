#!/usr/bin/env python3
"""Setzt index.html aus src/shell.html und den Skriptteilen zusammen."""
import pathlib
root=pathlib.Path(__file__).resolve().parent.parent
parts=['tx.js','logic.js','parts.js','zeit.js','stadt.js','kalender.js','ui.js']
import json
data=json.loads((root/'data'/'info.json').read_text())
resolved=json.loads((root/'data'/'resolved.json').read_text())
world=json.loads((root/'data'/'world.json').read_text())
divs=json.loads((root/'data'/'dividends.json').read_text())
head='/* Einordnungen und Auflösungen aus data/*.json (beim Build eingebettet) */\nconst DATA='+json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')+';\nconst RESOLVED_DATA='+json.dumps(resolved,ensure_ascii=False,separators=(',',':'))+';\nconst WORLD='+json.dumps(world,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')+';\nconst DIVS='+json.dumps(divs,ensure_ascii=False,separators=(',',':'))+';\n'
js=head+'\n'.join((root/'src'/p).read_text() for p in parts)
shell=(root/'src'/'shell.html').read_text()
assert '/*__SCRIPT__*/' in shell
(root/'index.html').write_text(shell.replace('/*__SCRIPT__*/',js))
print('index.html', len(shell)+len(js))
