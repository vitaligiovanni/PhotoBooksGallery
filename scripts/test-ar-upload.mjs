import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

// Config
const API_CANDIDATES = ['http://localhost:5002/api','http://localhost:5003/api'];
const PHOTO_JPG = path.resolve('./sample-data/ar/photo-sample.jpg');
const PHOTO_PNG = path.resolve('./sample-data/ar/photo-sample.png');
const PHOTO_PATH = fs.existsSync(PHOTO_PNG) ? PHOTO_PNG : PHOTO_JPG;
const VIDEO_PATH = path.resolve('./sample-data/ar/video-sample.mp4');

async function login(API_URL) {
  // Try to login to get JWT cookie if available; otherwise proceed unauthenticated
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@local.test', password: 'admin' })
    });
    const setCookie = res.headers.get('set-cookie');
    if (res.ok && setCookie) {
      console.log('[login] Got cookie');
      return setCookie;
    }
    console.log('[login] No cookie; status:', res.status);
  } catch (e) {
    console.log('[login] Failed:', e.message);
  }
  return null;
}

async function main() {
  // Check files
  if (!fs.existsSync(PHOTO_PATH) || !fs.existsSync(VIDEO_PATH)) {
    console.error('Provide sample files at sample-data/ar/photo-sample.jpg and video-sample.mp4');
    process.exit(1);
  }

  let API_URL = API_CANDIDATES[0];
  let cookie = null;
  for (const base of API_CANDIDATES) {
    try {
      // quick health ping
      await fetch(`${base.replace('/api','')}/health`).catch(()=>{});
      API_URL = base;
      cookie = await login(API_URL);
      break;
    } catch {}
  }

  const form = new FormData();
  form.append('photo', fs.createReadStream(PHOTO_PATH));
  form.append('video', fs.createReadStream(VIDEO_PATH));
  form.append('config', JSON.stringify({ autoPlay: true, loop: true }));

  const headers = form.getHeaders();
  if (cookie) headers['cookie'] = cookie;

  const res = await fetch(`${API_URL}/ar/create-automatic`, {
    method: 'POST',
    headers,
    body: form,
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', text);
  
  // If successful, parse and poll status
  if (res.status === 201) {
    try {
      const json = JSON.parse(text);
      const arId = json.data?.arId;
      if (arId) {
        console.log('\n[Polling] Waiting 5s before checking status...');
        await new Promise(r => setTimeout(r, 5000));
        const statusRes = await fetch(`${API_URL}/ar/status/${arId}`, { headers: cookie ? { cookie } : {} });
        const statusText = await statusRes.text();
        console.log('[Status Check]', statusRes.status, statusText);
      }
    } catch (pollErr) {
      console.log('[Polling error]', pollErr.message);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
