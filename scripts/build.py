#!/usr/bin/env python3
"""Setzt index.html aus src/shell.html und den Skriptteilen zusammen."""
import pathlib
root=pathlib.Path(__file__).resolve().parent.parent
parts=['tx.js','logic.js','parts.js','ui.js']
js='\n'.join((root/'src'/p).read_text() for p in parts)
shell=(root/'src'/'shell.html').read_text()
assert '/*__SCRIPT__*/' in shell
(root/'index.html').write_text(shell.replace('/*__SCRIPT__*/',js))
print('index.html', len(shell)+len(js))
