/**
 * Authentication middleware.
 *
 * Clients authenticate with one of:
 *   - Header:  X-Thanzi-Key: thanzi_<key>
 *   - Bearer:  Authorization: Bearer thanzi_<key>
 *
 * Valid keys are stored in the THANZI_KEYS KV namespace as:
 *   key:thanzi_<key>  →  JSON { clientId, name, active, createdAt }
 *
 * To add a key via Wrangler CLI:
 *   wrangler kv key put "key:thanzi_abc123" '{"clientId":"app-thanzi","name":"Thanzi PWA","active":true,"createdAt":"2026-01-01"}' --binding THANZI_KEYS
 *
 * BYPASS_AUTH=true in wrangler.toml [vars] disables auth for local dev only.
 */
export async function authenticate(request, env) {
  // Dev bypass — never enable in production
  if (env.BYPASS_AUTH === 'true') {
    console.warn('[auth] BYPASS_AUTH is enabled — disable in production!');
    return { ok: true, clientId: 'dev' };
  }

  const key = extractKey(request);
  if (!key) {
    return { ok: false, error: 'Missing API key. Provide X-Thanzi-Key header or Bearer token.' };
  }

  if (!key.startsWith('thanzi_')) {
    return { ok: false, error: 'Invalid API key format.' };
  }

  // Look up in KV
  const record = await env.THANZI_KEYS.get(`key:${key}`, { type: 'json' });
  if (!record) {
    return { ok: false, error: 'API key not found.' };
  }
  if (!record.active) {
    return { ok: false, error: 'API key is inactive.' };
  }

  return { ok: true, clientId: record.clientId, keyMeta: record };
}

function extractKey(request) {
  // Prefer X-Thanzi-Key header
  const header = request.headers.get('X-Thanzi-Key');
  if (header) return header.trim();

  // Fall back to Authorization: Bearer
  const auth = request.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();

  return null;
}
