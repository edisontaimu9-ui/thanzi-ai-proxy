import { sanitizeRequestHeaders } from '../utils.js';

const ANTHROPIC_BASE = 'https://api.anthropic.com';
const ANTHROPIC_VERSION = '2023-06-01';

/**
 * Forwards requests to Anthropic's Messages API.
 *
 * Client usage:
 *   POST https://<worker>/v1/anthropic/v1/messages
 *   Headers: X-Thanzi-Key: thanzi_xxx
 *   Body: { model: "claude-sonnet-4-6", max_tokens: 1024, messages: [...] }
 *
 * Note: Anthropic uses x-api-key + anthropic-version headers (not Bearer).
 * This handler translates automatically.
 *
 * Requires ANTHROPIC_API_KEY secret:
 *   wrangler secret put ANTHROPIC_API_KEY
 */
export async function handleAnthropic(request, env, upstreamPath) {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY secret is not configured.');
  }

  const upstream = new URL(`${ANTHROPIC_BASE}${upstreamPath}`);
  const clientUrl = new URL(request.url);
  clientUrl.searchParams.forEach((v, k) => upstream.searchParams.set(k, v));

  const headers = sanitizeRequestHeaders(request.headers, ['authorization']);
  headers.set('x-api-key', env.ANTHROPIC_API_KEY);
  headers.set('anthropic-version', ANTHROPIC_VERSION);
  headers.set('Content-Type', 'application/json');

  return fetch(
    new Request(upstream.toString(), {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      duplex: 'half',
    })
  );
}
