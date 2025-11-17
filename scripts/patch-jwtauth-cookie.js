// Patch compiled backend middleware.js: jwtAuth reads token from auth_token cookie when Authorization header is missing
const fs = require('fs');
const path = '/app/dist/backend/src/routers/middleware.js';
let s = fs.readFileSync(path, 'utf8');
if (s.includes("const jwtAuth = async (req, res, next) => {") && s.includes("const authHeader = req.headers.authorization;") && s.includes("const token = authHeader && authHeader.split(' ')[1];")) {
  s = s.replace("const token = authHeader && authHeader.split(' ')[1];", "let token = authHeader && authHeader.split(' ')[1];\n        if (!token && req.headers && req.headers.cookie) {\n            try {\n                const parts = req.headers.cookie.split(';').map(s => s.trim());\n                const pair = parts.find(s => s.startsWith('auth_token='));\n                if (pair) { token = decodeURIComponent(pair.substring('auth_token='.length)); }\n            } catch (e) { console.error('Cookie parse failed:', e && e.message ? e.message : e); }\n        }");
  fs.writeFileSync(path, s);
  console.log('patched jwtAuth to support auth_token cookie');
} else {
  console.log('jwtAuth pattern not found or already patched');
}
