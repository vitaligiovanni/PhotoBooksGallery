#!/usr/bin/env node
// Patch compiled backend index.js in-place to bridge cookie-based auth
// - Injects Authorization from auth_token cookie when header is missing
// - Sets auth_token cookie on /api/auth/login and /api/auth/register responses
// - Clears cookie on /api/auth/logout
// Idempotent: won't insert twice

const fs = require('fs');
const path = require('path');

const TARGET = process.env.PATCH_TARGET || '/app/dist/backend/src/index.js';

function read(file) {
  if (!fs.existsSync(file)) throw new Error('File not found: ' + file);
  return fs.readFileSync(file, 'utf8');
}

function writeBackup(file) {
  const bak = file + '.bak';
  if (!fs.existsSync(bak)) fs.writeFileSync(bak, fs.readFileSync(file));
}

function save(file, content) {
  fs.writeFileSync(file, content);
}

function hasMarker(src) {
  return src.includes('/*__COOKIE_AUTH_BRIDGE__*/');
}

function buildInjection() {
  return `\n\n/*__COOKIE_AUTH_BRIDGE__*/\n` +
`// Inject Authorization from auth_token cookie if missing\n` +
`app.use(function cookieAuthBridge(req, res, next) {\n` +
`  try {\n` +
`    if (!req.headers) req.headers = {};\n` +
`    if (!req.headers.authorization) {\n` +
`      const raw = (req.headers.cookie || '');\n` +
`      const parts = raw.split(';').map(s => s.trim());\n` +
`      for (const p of parts) {\n` +
`        if (p.startsWith('auth_token=')) {\n` +
`          const t = decodeURIComponent(p.slice('auth_token='.length));\n` +
`          if (t) { req.headers.authorization = 'Bearer ' + t; }\n` +
`          break;\n` +
`        }\n` +
`      }\n` +
`    }\n` +
`  } catch (e) { /* ignore */ }\n` +
`  next();\n` +
`});\n` +
`\n` +
`// Helper to set/clear auth cookie based on response body.token\n` +
`function __setAuthCookie(res, token) {\n` +
`  try {\n` +
`    const isProd = process.env.NODE_ENV === 'production';\n` +
`    const parts = [\n` +
`      'auth_token=' + encodeURIComponent(token),\n` +
`      'Path=/',\n` +
`      'HttpOnly',\n` +
`      'SameSite=Lax',\n` +
`      'Max-Age=' + (7*24*60*60)\n` +
`    ];\n` +
`    if (isProd) parts.push('Secure');\n` +
`    res.setHeader('Set-Cookie', parts.join('; '));\n` +
`  } catch {}\n` +
`}\n` +
`function __clearAuthCookie(res) {\n` +
`  try {\n` +
`    const isProd = process.env.NODE_ENV === 'production';\n` +
`    const parts = [\n` +
`      'auth_token=',\n` +
`      'Path=/',\n` +
`      'HttpOnly',\n` +
`      'SameSite=Lax',\n` +
`      'Max-Age=0'\n` +
`    ];\n` +
`    if (isProd) parts.push('Secure');\n` +
`    res.setHeader('Set-Cookie', parts.join('; '));\n` +
`  } catch {}\n` +
`}\n` +
`\n` +
`// Intercept auth responses to set/clear cookie without touching routers\n` +
`app.use('/api/auth/login', function cookieLoginBridge(req, res, next) {\n` +
`  const __orig = res.json.bind(res);\n` +
`  res.json = function (body) {\n` +
`    try { if (body && body.token) __setAuthCookie(res, body.token); } catch {}\n` +
`    return __orig(body);\n` +
`  };\n` +
`  next();\n` +
`});\n` +
`app.use('/api/auth/register', function cookieRegisterBridge(req, res, next) {\n` +
`  const __orig = res.json.bind(res);\n` +
`  res.json = function (body) {\n` +
`    try { if (body && body.token) __setAuthCookie(res, body.token); } catch {}\n` +
`    return __orig(body);\n` +
`  };\n` +
`  next();\n` +
`});\n` +
`app.use('/api/auth/logout', function cookieLogoutBridge(req, res, next) {\n` +
`  const __orig = res.json.bind(res);\n` +
`  res.json = function (body) {\n` +
`    try { __clearAuthCookie(res); } catch {}\n` +
`    return __orig(body);\n` +
`  };\n` +
`  next();\n` +
`});\n`;
}

function injectInto(src) {
  if (hasMarker(src)) return src; // already injected

  // Find a safe anchor after body parsers to ensure headers are accessible and before routes
  const anchor = /app\.use\(express\.urlencoded\([^)]*\)\);?/;
  const m = src.match(anchor);
  if (!m) {
    throw new Error('Could not find express.urlencoded(...) anchor in index.js');
  }
  const idx = m.index + m[0].length;
  const before = src.slice(0, idx);
  const after = src.slice(idx);
  return before + buildInjection() + after;
}

function main() {
  const file = TARGET;
  const source = read(file);
  if (hasMarker(source)) {
    console.log('Cookie auth bridge already present. Nothing to do.');
    return;
  }
  const patched = injectInto(source);
  writeBackup(file);
  save(file, patched);
  console.log('Patched:', file, 'Backup saved as', file + '.bak');
  console.log('Tip: restart backend container to apply changes.');
}

try { main(); } catch (e) { console.error('Patch failed:', e.message); process.exit(1); }
