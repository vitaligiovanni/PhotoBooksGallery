import 'node-fetch';

async function main() {
  const base = 'http://localhost:5002/api';
  const urls = [
    '/catalog/_debug/ping',
    '/catalog/_debug/roots',
    '/catalog',
    '/catalog/photobooks'
  ];
  for (const u of urls) {
    try {
      const res = await fetch(base + u);
      const text = await res.text();
      console.log('\n=== GET ' + u + ' -> ' + res.status + ' ===');
      console.log(text.slice(0, 500));
    } catch (e) {
      console.error('Request failed for', u, e);
    }
  }
}
main();
