// Patches backend compiled middleware.js to use auth_token cookie before admin mock
const fs = require('fs');
const path = '/app/dist/backend/src/routers/middleware.js';
let s = fs.readFileSync(path, 'utf8');
const marker = "isAuthenticated: () => true\n        };";
if (s.includes(marker) && !s.includes('[mockAuth] cookie auth')) {
  const injection = `isAuthenticated: () => true
        };
        // [injected] Try auth via auth_token cookie first
        try {
          if (req.headers && req.headers.cookie) {
            const parts = req.headers.cookie.split(';').map(s => s.trim());
            const pair = parts.find(s => s.startsWith('auth_token='));
            if (pair) {
              const token = decodeURIComponent(pair.substring('auth_token='.length));
              try {
                const decoded = require('jsonwebtoken').verify(token, JWT_SECRET);
                const userId = decoded.userId;
                const { db } = require('../db');
                const { users } = require('../../../shared/schema');
                const { eq } = require('drizzle-orm');
                const found = await db.select().from(users).where(eq(users.id, userId)).limit(1);
                if (found.length) {
                  req.user = { claims: { sub: userId }, isAuthenticated: () => true, userData: found[0] };
                  console.log('[mockAuth] cookie auth user:', userId);
                  return next();
                }
              } catch (e) {
                console.error('[mockAuth] cookie JWT verify failed:', e && e.message ? e.message : e);
              }
            }
          }
        } catch (e) { console.error('[mockAuth] cookie parse failed:', e); }`;
  s = s.replace(marker, injection);
  fs.writeFileSync(path, s);
  console.log('patched middleware.js');
} else {
  console.log('middleware.js already patched or pattern not found');
}
