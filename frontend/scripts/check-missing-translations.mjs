#!/usr/bin/env node
/**
 * Check missing translation keys across languages by reading i18n.ts resources object.
 * Strategy:
 *  - Load the file as text (ESM import would execute initialization; we avoid that)
 *  - Extract the `const resources = { ... };` block via simple bracket matching
 *  - Evaluate the object in a sandbox (new Function) to get plain JS object
 *  - Flatten keys for each language (dot notation)
 *  - Produce report: union of all keys, then per-language missing keys
 *  - Exit with code 1 if any missing so CI can fail
 */

import fs from 'fs';
import path from 'path';
import url from 'url';

const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const i18nPath = path.join(root, 'src', 'lib', 'i18n.ts');

function extractResources(source) {
  const marker = 'const resources =';
  const idx = source.indexOf(marker);
  if (idx === -1) throw new Error('resources object not found');
  let start = source.indexOf('{', idx + marker.length);
  if (start === -1) throw new Error('opening { not found');
  let brace = 0;
  let end = -1;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') brace++;
    else if (ch === '}') {
      brace--;
      if (brace === 0) { end = i; break; }
    }
  }
  if (end === -1) throw new Error('closing } not found for resources');
  const objectLiteral = source.slice(start, end + 1);
  return objectLiteral;
}

function safeEvalObject(str) {
  // Strip line & block comments
  let cleaned = str
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/:\s*[^,}]+ as [^,}]+/g, '');
  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  // Wrap unquoted object keys (simple identifiers) with quotes to approach JSON
  cleaned = cleaned.replace(/([,{\s])([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
  // Convert single quotes to double (naive but okay for our controlled file)
  cleaned = cleaned.replace(/'([^']*)'/g, (m, g1) => '"' + g1.replace(/"/g, '\\"') + '"');
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Fallback to Function eval if JSON parse fails
    return (new Function('return ' + str))();
  }
}

function flatten(obj, prefix = '', out = {}) {
  if (typeof obj !== 'object' || obj === null) return out;
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null) flatten(v, key, out); else out[key] = v;
  }
  return out;
}

function color(txt, c) {
  const map = { red: '\u001b[31m', yellow: '\u001b[33m', green: '\u001b[32m', cyan: '\u001b[36m', reset: '\u001b[0m' };
  return map[c] + txt + map.reset;
}

(async () => {
  const source = fs.readFileSync(i18nPath, 'utf8');
  const literal = extractResources(source);
  const resources = safeEvalObject(literal);

  const langs = Object.keys(resources);
  const flattened = {};
  langs.forEach(l => { flattened[l] = flatten(resources[l].translation || {}); });

  const allKeys = new Set();
  for (const l of langs) Object.keys(flattened[l]).forEach(k => allKeys.add(k));

  const report = {};
  let missingTotal = 0;
  for (const l of langs) {
    const missing = [];
    for (const k of allKeys) if (!(k in flattened[l])) missing.push(k);
    report[l] = missing;
    missingTotal += missing.length;
  }

  // Print summary
  console.log(color(`\nTranslation Keys Audit`, 'cyan'));
  console.log('Languages:', langs.join(', '));
  console.log('Total distinct keys:', allKeys.size);
  for (const l of langs) {
    const miss = report[l];
    if (miss.length === 0) {
      console.log(color(` ✔ ${l}: no missing keys`, 'green'));
    } else {
      console.log(color(` ✖ ${l}: missing ${miss.length} keys`, 'red'));
      miss.slice(0, 20).forEach(k => console.log('    -', k));
      if (miss.length > 20) console.log(`    ... (${miss.length - 20} more)`);
    }
  }

  if (missingTotal > 0) {
    console.log('\nTo fill missing keys, you can run this helper (pseudo):');
    console.log('  # Example: copy from hy to ru when ru missing');
    console.log("  # (Implement auto-fill script if needed)\n");
    process.exitCode = 1;
  } else {
    console.log(color('\nAll languages are fully synchronized. ✅', 'green'));
  }
})();
