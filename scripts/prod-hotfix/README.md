# Production Hotfix: Cookie-based Auth Bridge

This hotfix patches the compiled backend inside the running Docker container to:
- Set an HttpOnly auth_token cookie on /api/auth/login and /api/auth/register responses
- Clear the cookie on /api/auth/logout
- Auto-inject Authorization: Bearer <token> header from the auth_token cookie for all API requests

Result: the old frontend (which doesn't send Authorization) will work via cookies. No frontend rebuild needed.

## What it does (zero-risk overview)
- Only edits compiled file: /app/dist/backend/src/index.js in the backend container
- Creates a .bak backup alongside the file
- Inserts a tiny middleware and small response interceptors (login/register/logout)
- Idempotent: if you run the patch twice, it won't duplicate code

## How to run

1) Copy the patch script into the backend container

```
# from your local repo root (where this README lives)
docker compose cp scripts/prod-hotfix/patch-index-cookie-auth.js backend:/app/tmp/patch-index-cookie-auth.js
```

2) Execute the patch inside the container and restart backend

```
docker compose exec backend node /app/tmp/patch-index-cookie-auth.js
# optional: show diff-size summary printed by the script
docker compose restart backend
```

3) Verify in browser
- Logout, then Login
- DevTools → Application → Cookies → your domain → should have auth_token (HttpOnly)
- Profile page: GET /api/orders returns 200
- Create order: POST /api/orders returns 201

## Rollback
- The script creates a backup /app/dist/backend/src/index.js.bak
- To revert:
```
docker compose exec backend sh -lc "cp /app/dist/backend/src/index.js.bak /app/dist/backend/src/index.js"
docker compose restart backend
```

## Notes
- This approach avoids touching other compiled files. It acts as a safe bridge until you rebuild the frontend or refactor routers.
- Cookie flags: HttpOnly, SameSite=Lax, Path=/, Max-Age=7 days, Secure in production.