#!/usr/bin/env node
/**
 * diff-manifests.mjs
 * Usage: node scripts/diff-manifests.mjs <old> <new>
 * Показывает изменения по категориям и статус файлов: added / removed / changed / unchanged
 */
import fs from 'fs';

const [oldPath, newPath] = process.argv.slice(2);
if (!oldPath || !newPath) {
  console.error('Usage: node scripts/diff-manifests.mjs <oldManifest> <newManifest>');
  process.exit(1);
}

function load(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) {
    console.error('Cannot read manifest', p, e.message); process.exit(1);
  }
}

const oldM = load(oldPath);
const newM = load(newPath);

const oldIndex = new Map(oldM.files.map(f => [f.path, f]));
const newIndex = new Map(newM.files.map(f => [f.path, f]));

const added = [];
const removed = [];
const changed = [];
const unchanged = [];

for (const [p, nf] of newIndex) {
  const of = oldIndex.get(p);
  if (!of) added.push(nf);
  else if (of.hash !== nf.hash) changed.push({ old: of, new: nf });
  else unchanged.push(nf);
}
for (const [p, of] of oldIndex) {
  if (!newIndex.has(p)) removed.push(of);
}

function summarize(arr) {
  return arr.reduce((s, f) => s + (f.new?.size ?? f.size ?? 0), 0);
}

const summary = {
  added: { count: added.length, bytes: summarize(added) },
  removed: { count: removed.length, bytes: summarize(removed) },
  changed: { count: changed.length, bytes: changed.reduce((s, f) => s + f.new.size, 0) },
  unchanged: { count: unchanged.length }
};

console.log('Manifest diff summary');
console.log(JSON.stringify(summary, null, 2));

// Детализация по категориям изменённых
const catDelta = {};
function addCat(cat, type) {
  (catDelta[cat] ||= { added:0, removed:0, changed:0 });
  catDelta[cat][type] += 1;
}
for (const f of added) addCat(f.category, 'added');
for (const f of removed) addCat(f.category, 'removed');
for (const f of changed) addCat(f.new.category, 'changed');

console.log('Category changes:');
Object.entries(catDelta).forEach(([cat, v]) => {
  console.log(`  ${cat}: +${v.added} ~${v.changed} -${v.removed}`);
});

if (changed.length) {
  console.log('\nChanged files (first 20):');
  changed.slice(0,20).forEach(f => console.log(' *', f.new.path));
}
if (added.length) {
  console.log('\nAdded files (first 20):');
  added.slice(0,20).forEach(f => console.log(' +', f.path));
}
if (removed.length) {
  console.log('\nRemoved files (first 20):');
  removed.slice(0,20).forEach(f => console.log(' -', f.path));
}
