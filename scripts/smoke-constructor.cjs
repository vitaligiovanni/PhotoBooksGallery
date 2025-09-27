#!/usr/bin/env node
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function main() {
  const base = 'http://localhost:3000/api/constructor';
  const slug = `page-verify-${Date.now()}`;
  const payload = {
    slug,
    title: { ru: 'Тестовая страница', en: 'Test Page', hy: 'Թեստային էջ' },
    description: { ru: '' }
  };

  const createRes = await fetch(`${base}/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const createText = await createRes.text();
  console.log('POST /pages', createRes.status, createText);
  if (!createRes.ok) process.exit(1);

  const listRes = await fetch(`${base}/pages`);
  const listText = await listRes.text();
  console.log('GET /pages', listRes.status, listText.substring(0, 200));
  if (!listRes.ok) process.exit(1);

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
