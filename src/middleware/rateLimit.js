/**
 * Rate limiting middleware — sliding window counter stored in KV.
 *
 * KV key format: rl:{clientId}:{windowStart}
 * Default: 60 requests per 60-second window per clientId.
 *
 * Override per-client limits by storing in THANZI_KEYS:
 *   key:thanzi_<key> → { ..., rateLimit: { requests: 200, windowSec: 60 } }
 */

const DEFAULT_LIMIT = 60;      // requests
const DEFAULT_WINDOW = 60;     // seconds

export async function checkRateLimit(clientId, env, keyMeta = {}) {
  const limit = keyMeta?.rateLimit?.requests ?? DEFAULT_LIMIT;
  const windowSec = keyMeta?.rateLimit?.windowSec ?? DEFAULT_WINDOW;

  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % windowSec); // align to window boundary
  const kvKey = `rl:${clientId}:${windowStart}`;

  // Atomic read-increment pattern (best-effort; KV is eventually consistent)
  const current = parseInt((await env.THANZI_KEYS.get(kvKey)) ?? '0', 10);

  if (current >= limit) {
    return {
      ok: false,
      error: `Rate limit exceeded. Max ${limit} requests per ${windowSec}s window.`,
      retryAfter: windowSec - (now % windowSec),
      limit,
    };
  }

  // Increment and set TTL slightly beyond window to auto-clean
  await env.THANZI_KEYS.put(kvKey, String(current + 1), {
    expirationTtl: windowSec + 10,
  });

  return {
    ok: true,
    remaining: limit - current - 1,
    limit,
  };
}
