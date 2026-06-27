import { sanitizeRequestHeaders } from '../utils.js';

const OPENAI_BASE = 'https://api.openai.com';

/**
 * Forwards requests to OpenAI's API.
 *
 * Client usage:
 *   POST https://<worker>/v1/openai/v1/chat/completions
 *   Headers: X-Thanzi-Key: thanzi_xxx
 *   Body: { model: "gpt-4o-mini", messages: [...] }
 *
 * Requires OPENAI_API_KEY secret:
 *   wrangler secret put OPENAI_API_KEY
 */
export async function handleOpenAI(request, env, upstreamPath) {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY secret is not configured.');
  }

  const upstream = new URL(`${OPENAI_BASE}${upstreamPath}`);
  const clientUrl = new URL(request.url);
  clientUrl.searchParams.forEach((v, k) => upstream.searchParams.set(k, v));

  const headers = sanitizeRequestHeaders(request.headers);
  headers.set('Authorization', `Bearer ${env.OPENAI_API_KEY}`);
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
