#!/usr/bin/env node
/**
 * Простой smoke test: проверяет health, список баннеров, настройки.
 * Usage: node scripts/smoke-test.mjs --base http://127.0.0.1:3000
 */
import https from 'https';
import http from 'http';

const args = process.argv.slice(2);
let base = 'http://127.0.0.1:3000';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--base' && args[i+1]) base = args[i+1];
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(data||'{}') }); }
        catch { resolve({ status: res.statusCode, raw: data }); }
      });
    });
    req.on('error', reject);
  });
}

async function main() {
  const results = {};
  results.health = await fetchJson(`${base}/api/health`);
  results.banners = await fetchJson(`${base}/api/banners`);
  results.settings = await fetchJson(`${base}/api/settings`);

  const summary = {
    healthStatus: results.health.status,
    dbOk: results.health.json?.database === 'up',
    bannersCount: Array.isArray(results.banners.json) ? results.banners.json.length : 'n/a',
    settingsKeys: results.settings.json ? Object.keys(results.settings.json).length : 'n/a'
  };
  console.log('Smoke summary:', summary);
  const fail = summary.healthStatus !== 200 || summary.dbOk !== true;
  if (fail) {
    console.log('Detailed:', JSON.stringify(results.health, null, 2));
    process.exit(1);
  }
}

main().catch(e => { console.error('Smoke test failed:', e); process.exit(2); });