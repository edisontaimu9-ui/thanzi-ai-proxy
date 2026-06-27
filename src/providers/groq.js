import { sanitizeRequestHeaders } from '../utils.js';

const GROQ_BASE = 'https://api.groq.com/openai'; // Groq uses OpenAI-compatible paths

/**
 * Forwards requests to Groq's API, injecting the GROQ_API_KEY secret.
 *
 * Client usage:
 *   POST https://<worker>/v1/groq/v1/chat/completions
 *   Headers: X-Thanzi-Key: thanzi_xxx, Content-Type: application/json
 *   Body: { model: "llama3-8b-8192", messages: [...] }
 *
 * Supported Groq endpoints (all forwarded transparently):
 *   /v1/chat/completions
 *   /v1/models
 *   /v1/audio/transcriptions
 *   /v1/audio/translations
 */
export async function handleGroq(request, env, upstreamPath) {
  if (!env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY secret is not configured.');
  }

  const upstream = new URL(`${GROQ_BASE}${upstreamPath}`);

  // Preserve query params from client request
  const clientUrl = new URL(request.url);
  clientUrl.searchParams.forEach((v, k) => upstream.searchParams.set(k, v));

  const headers = sanitizeRequestHeaders(request.headers);
  headers.set('Authorization', `Bearer ${env.GROQ_API_KEY}`);
  headers.set('Content-Type', 'application/json');

  const upstreamRequest = new Request(upstream.toString(), {
    method: request.method,
    headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    // Required for streaming responses
    duplex: 'half',
  });

  const response = await fetch(upstreamRequest);
  return response; // stream passes through untouched
}
