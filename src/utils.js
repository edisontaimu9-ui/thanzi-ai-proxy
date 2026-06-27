/**
 * Returns standard CORS headers allowing Thanzi PWA and dev origins.
 * Adjust ALLOWED_ORIGINS in wrangler.toml vars if you need stricter control.
 */
export function corsHeaders(origin = '*') {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Thanzi-Key',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Builds a JSON error response with CORS headers attached.
 */
export function errorResponse(status, message, extraHeaders = {}) {
  return Response.json(
    { error: { message, status } },
    {
      status,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json', ...extraHeaders },
    }
  );
}

/**
 * Strips hop-by-hop headers that must not be forwarded upstream.
 */
export function sanitizeRequestHeaders(headers, keysToRemove = []) {
  const clean = new Headers(headers);
  const hopByHop = [
    'host', 'connection', 'keep-alive', 'proxy-authenticate',
    'proxy-authorization', 'te', 'trailers', 'transfer-encoding', 'upgrade',
    'x-thanzi-key', // never forward our own auth header
    ...keysToRemove,
  ];
  hopByHop.forEach(h => clean.delete(h));
  return clean;
}
