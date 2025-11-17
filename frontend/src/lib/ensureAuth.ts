// Auto dev auth helper: tries to ensure a token exists by logging in with admin dev credentials
// Falls back silently if backend unavailable.

export async function ensureAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const existing = localStorage.getItem('token');
  if (existing) return existing;

  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@photobooks.local', password: 'PhotoAdmin2025!' })
    });
    if (!resp.ok) {
      console.warn('[ensureAuthToken] login failed', resp.status);
      return null;
    }
    const data = await resp.json();
    if (data?.token) {
      localStorage.setItem('token', data.token);
      return data.token as string;
    }
  } catch (e) {
    console.warn('[ensureAuthToken] error', e);
  }
  return null;
}
