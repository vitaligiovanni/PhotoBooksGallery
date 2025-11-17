// Patches backend compiled auth-router.js to set HttpOnly auth_token cookie on successful login/register
const fs = require('fs');
const path = '/app/dist/backend/src/routers/auth-router.js';
let s = fs.readFileSync(path, 'utf8');
let changes = 0;
function injectAfterToken(line) {
  const cookieLine = 'res.cookie("auth_token", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 604800000, secure: true });';
  if (s.includes(cookieLine)) return;
  s = s.replace(line, line + '\n        ' + cookieLine);
  changes++;
}
// Register: const token = generateToken(...)
const regTokenLine = 'const token = generateToken(user.id, user.role || "user");';
if (s.includes(regTokenLine)) injectAfterToken(regTokenLine);
// Login admin path
const loginAdminTokenPrefix = 'const token = generateToken(admin.id, "admin")';
if (s.includes(loginAdminTokenPrefix)) {
  const full = s.match(/const token = generateToken\(admin\.id,\s*\"admin\"\);/);
  if (full) injectAfterToken(full[0]);
}
// Login user path
const loginUserTokenPrefix = 'const token = generateToken(userData.id, userData.role || "user")';
if (s.includes(loginUserTokenPrefix)) {
  const full = s.match(/const token = generateToken\(userData\.id,\s*userData\.role \|\| \"user\"\);/);
  if (full) injectAfterToken(full[0]);
}
if (changes > 0) {
  fs.writeFileSync(path, s);
  console.log('patched auth-router.js, changes:', changes);
} else {
  console.log('auth-router.js already patched or patterns not found');
}
