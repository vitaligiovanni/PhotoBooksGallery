#!/usr/bin/env tsx
import 'dotenv/config';
import fetch from 'node-fetch';

const API = process.env.API_URL || 'http://localhost:3000/api';

async function main(){
  const payload = { title:{ ru:'Dbg' }, slug:'dbg-'+Date.now(), excerpt:{ ru:'ex' }, content:{ ru:'body' }, authorId:'local-admin', status:'draft' };
  const r = await fetch(`${API}/blog-posts`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(payload) });
  const text = await r.text();
  console.log('STATUS', r.status, r.statusText);
  console.log('CT', r.headers.get('content-type'));
  console.log('BODY_START', text.slice(0,300));
}
main();