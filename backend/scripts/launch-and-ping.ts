// Launch the server programmatically and then call catalog endpoints.
import { spawn } from 'child_process';
import http from 'http';

function get(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(`${res.statusCode}: ${d.slice(0, 400)}`));
    }).on('error', reject);
  });
}

async function run() {
  console.log('Starting backend via tsx src/index.ts');
  const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['tsx', 'src/index.ts'], {
    cwd: __dirname + '/..',
    stdio: ['ignore','pipe','pipe']
  });
  child.stdout.on('data', b => process.stdout.write('[SERVER] '+b.toString()));
  child.stderr.on('data', b => process.stderr.write('[SERVER-ERR] '+b.toString()));

  // Wait until log "Сервер запущен" appears or timeout
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(()=>reject(new Error('Server start timeout')), 15000);
    child.stdout.on('data', (buf) => {
      const t = buf.toString();
      if (t.includes('Сервер запущен')) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });

  console.log('Server detected as running, performing requests...');
  const base = 'http://localhost:5002/api';
  const endpoints = [
    '/catalog/_debug/ping',
    '/catalog/_debug/roots',
    '/catalog',
    '/catalog/photobooks'
  ];
  for (const e of endpoints) {
    try {
      const r = await get(base + e);
      console.log('GET', e, '->', r);
    } catch (err) {
      console.error('Request failed', e, err);
    }
  }
  // Leave process running a bit
  setTimeout(()=>{
    console.log('Done. (Not killing server to allow manual attach)');
  }, 3000);
}

run().catch(e => { console.error(e); process.exit(1); });
