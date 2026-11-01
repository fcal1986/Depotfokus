// Tests für Export-Ordner und Nachrichten-Knopf: node --test scripts/sync-test.mjs
// Prüft Datenschutz-Eigenschaften im Quelltext; der Ablauf selbst ist im Browser getestet (simulierter Ordner, simulierte GitHub-API).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = fs.readFileSync(path.join(ROOT, 'src/sync.js'), 'utf8');

test('Ordner wird nur gelesen; Dateien werden nirgendwohin gesendet', () => {
  assert.match(src, /showDirectoryPicker\(\{id:'depotfokus-exporte',mode:'read'\}\)/);
  assert.ok(!/createWritable|getFileHandle\([^)]*create/.test(src), 'kein Schreibzugriff');
  const targets = [...src.matchAll(/fetch\((`[^`]+`|'[^']+')/g)].map(m => m[1]);
  assert.deepEqual([...new Set(targets)].sort(), ["'data/news/latest.json?v='", "'data/news/status.json?v='", '`https://api.github.com/repos/${owner}/${repo}${path}`'].sort());
});

test('Token geht nur an api.github.com und nur der Nachrichten-Workflow wird gestartet', () => {
  assert.match(src, /Authorization:`Bearer \$\{GH\.token\}`/);
  assert.equal((src.match(/Authorization/g) || []).length, 1);
  assert.match(src, /\/actions\/workflows\/news\.yml\/dispatches/);
  assert.ok(!/workflows\/(pages|scenarios|assess)\.yml/.test(src));
});

test('Neue Dateien erst nach Bestätigung; als bekannt markiert nur, was übernommen oder ignoriert wurde', () => {
  assert.match(fs.readFileSync(path.join(ROOT, 'src/parts.js'), 'utf8'), /folderAccepted\('bestand'\)[\s\S]*folderAccepted\('tx'\)/);
  assert.match(src, /function folderReview\(\)[\s\S]*handleFiles\(list\)/);
});
